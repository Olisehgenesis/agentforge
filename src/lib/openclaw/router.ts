/**
 * Channel Router
 *
 * Resolves which AgentHaus agent should handle an incoming message
 * from an OpenClaw channel.
 *
 * Resolution order:
 *   1. Dedicated bot match — if the message came from a per-agent bot
 *      (identified by meta.botId), look up that agent directly.
 *   2. Active binding — look up ChannelBinding by (channelType, senderId).
 *   3. Pairing code — if the message text contains a valid pairing code,
 *      create a new binding and return the paired agent.
 *   4. Unknown sender — return null (webhook handler will prompt for code).
 *
 * Also manages:
 *   - Binding lifecycle (create, deactivate, switch agent)
 *   - Session message loading and saving
 */

import { prisma } from "@/lib/db";
import { extractPairingCode, resolvePairingCode } from "./pairing";
import type { ChannelType } from "@/lib/channels/types";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface RouteResult {
  /** How the sender was resolved */
  type: "dedicated" | "paired_existing" | "paired_new" | "unknown";
  /** Agent to route to (null if unknown sender) */
  agentId: string | null;
  agentName?: string;
  /** The channel binding (null if unknown or dedicated) */
  bindingId?: string;
  /** Message to send back to the sender (for pairing flow) */
  systemReply?: string;
}

export interface SenderContext {
  channelType: ChannelType;
  senderId: string;
  senderName?: string;
  chatId: string;
  messageText: string;
  /** For dedicated bots: which bot received this (agentId or bot token hash) */
  dedicatedBotId?: string;
}

// ─── Main Router ───────────────────────────────────────────────────────────

/**
 * Route an incoming message to an agent.
 * This is the central dispatch for all OpenClaw webhook messages.
 */
export async function routeMessage(ctx: SenderContext): Promise<RouteResult> {
  // ── 1. Dedicated bot (per-agent Telegram/Discord) ──────────────────
  if (ctx.dedicatedBotId) {
    const agent = await prisma.agent.findFirst({
      where: {
        id: ctx.dedicatedBotId,
        status: "active",
      },
      select: { id: true, name: true },
    });

    if (agent) {
      // Auto-create binding for tracking (if not exists)
      await ensureBinding({
        agentId: agent.id,
        channelType: ctx.channelType,
        senderId: ctx.senderId,
        senderName: ctx.senderName,
        chatId: ctx.chatId,
        bindingType: "dedicated",
      });

      return {
        type: "dedicated",
        agentId: agent.id,
        agentName: agent.name,
      };
    }
  }

  // ── 2. Existing active binding ────────────────────────────────────
  const existingBinding = await prisma.channelBinding.findFirst({
    where: {
      channelType: ctx.channelType,
      senderIdentifier: ctx.senderId,
      isActive: true,
    },
    include: {
      agent: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  if (existingBinding && existingBinding.agent.status === "active") {
    // Update last message timestamp
    await prisma.channelBinding.update({
      where: { id: existingBinding.id },
      data: { lastMessageAt: new Date() },
    });

    // Check if the message is a re-pair command (/pair NEWCODE)
    const rePairCode = extractRePairCommand(ctx.messageText);
    if (rePairCode) {
      return await handlePairing(rePairCode, ctx, existingBinding.id);
    }

    // Check if it's an unpair command
    if (isUnpairCommand(ctx.messageText)) {
      await deactivateBinding(existingBinding.id);
      return {
        type: "paired_existing",
        agentId: null,
        systemReply: `🔓 Disconnected from **${existingBinding.agent.name}**. Send a new pairing code to connect to another agent.`,
      };
    }

    return {
      type: "paired_existing",
      agentId: existingBinding.agentId,
      agentName: existingBinding.agent.name,
      bindingId: existingBinding.id,
    };
  }

  // ── 3. Try pairing code from message text ─────────────────────────
  const pairingCode = extractPairingCode(ctx.messageText);
  if (pairingCode) {
    return await handlePairing(pairingCode, ctx, null);
  }

  // ── 4. Unknown sender ─────────────────────────────────────────────
  return {
    type: "unknown",
    agentId: null,
    systemReply: [
      `👋 Welcome to **AgentHaus**!`,
      ``,
      `To connect to an AI agent, send your **pairing code** (e.g. \`AF7X2K\`).`,
      ``,
      `You can get a pairing code from your agent's dashboard at agenthaus.app`,
      ``,
      `Commands:`,
      `• Send a code to pair → \`AF7X2K\``,
      `• Switch agent → \`/pair NEWCODE\``,
      `• Disconnect → \`/unpair\``,
      `• Help → \`/help\``,
    ].join("\n"),
  };
}

// ─── Pairing Logic ─────────────────────────────────────────────────────────

async function handlePairing(
  code: string,
  ctx: SenderContext,
  existingBindingId: string | null
): Promise<RouteResult> {
  const resolved = await resolvePairingCode(code);

  if (!resolved) {
    return {
      type: "unknown",
      agentId: null,
      systemReply: `❌ Invalid or expired pairing code: \`${code}\`\n\nPlease check the code on your agent dashboard and try again. Codes expire after 24 hours.`,
    };
  }

  // Deactivate old binding if switching
  if (existingBindingId) {
    await deactivateBinding(existingBindingId);
  }

  // Also deactivate any other active bindings for this sender+channel
  await prisma.channelBinding.updateMany({
    where: {
      channelType: ctx.channelType,
      senderIdentifier: ctx.senderId,
      isActive: true,
    },
    data: { isActive: false },
  });

  // Create new binding
  const binding = await prisma.channelBinding.create({
    data: {
      agentId: resolved.agentId,
      channelType: ctx.channelType,
      senderIdentifier: ctx.senderId,
      senderName: ctx.senderName || null,
      chatIdentifier: ctx.chatId,
      pairingCode: code,
      bindingType: "pairing",
      isActive: true,
    },
  });

  // Log the pairing
  await prisma.activityLog.create({
    data: {
      agentId: resolved.agentId,
      type: "action",
      message: `🔗 Paired via ${ctx.channelType}: ${ctx.senderName || ctx.senderId} (code: ${code})`,
      metadata: JSON.stringify({
        channel: ctx.channelType,
        senderId: ctx.senderId,
        senderName: ctx.senderName,
        bindingId: binding.id,
      }),
    },
  });

  return {
    type: "paired_new",
    agentId: resolved.agentId,
    agentName: resolved.agentName,
    bindingId: binding.id,
    systemReply: [
      `✅ **Paired with ${resolved.agentName}!**`,
      ``,
      `You're now connected to your ${resolved.templateType} agent.`,
      `Send any message to start chatting.`,
      ``,
      `• Switch agent → \`/pair NEWCODE\``,
      `• Disconnect → \`/unpair\``,
    ].join("\n"),
  };
}

// ─── Binding Management ────────────────────────────────────────────────────

/**
 * Ensure a binding exists for a dedicated bot sender.
 * Creates one if it doesn't exist. Idempotent.
 */
async function ensureBinding(params: {
  agentId: string;
  channelType: string;
  senderId: string;
  senderName?: string;
  chatId: string;
  bindingType: string;
}): Promise<string> {
  const existing = await prisma.channelBinding.findFirst({
    where: {
      agentId: params.agentId,
      channelType: params.channelType,
      senderIdentifier: params.senderId,
      isActive: true,
    },
  });

  if (existing) {
    await prisma.channelBinding.update({
      where: { id: existing.id },
      data: { lastMessageAt: new Date() },
    });
    return existing.id;
  }

  // Deactivate any old bindings for this sender+channel
  await prisma.channelBinding.updateMany({
    where: {
      channelType: params.channelType,
      senderIdentifier: params.senderId,
      isActive: true,
    },
    data: { isActive: false },
  });

  const binding = await prisma.channelBinding.create({
    data: {
      agentId: params.agentId,
      channelType: params.channelType,
      senderIdentifier: params.senderId,
      senderName: params.senderName || null,
      chatIdentifier: params.chatId,
      bindingType: params.bindingType,
      isActive: true,
    },
  });

  return binding.id;
}

async function deactivateBinding(bindingId: string): Promise<void> {
  await prisma.channelBinding.update({
    where: { id: bindingId },
    data: { isActive: false },
  });
}

// ─── Session Messages ──────────────────────────────────────────────────────

/**
 * Load recent conversation history for a binding.
 * Returns messages in chronological order, limited to maxMessages.
 */
export async function loadSessionHistory(
  bindingId: string,
  maxMessages: number = 20
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const messages = await prisma.sessionMessage.findMany({
    where: { bindingId },
    orderBy: { createdAt: "desc" },
    take: maxMessages,
    select: {
      role: true,
      content: true,
    },
  });

  // Reverse to chronological order and filter to user/assistant roles
  return messages
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}

/**
 * Save a user message and assistant reply to session history.
 */
export async function saveSessionMessages(
  bindingId: string,
  userMessage: string,
  assistantReply: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.sessionMessage.createMany({
    data: [
      {
        bindingId,
        role: "user",
        content: userMessage,
      },
      {
        bindingId,
        role: "assistant",
        content: assistantReply,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    ],
  });

  // Prune old messages (keep last 100 per binding)
  const count = await prisma.sessionMessage.count({
    where: { bindingId },
  });

  if (count > 100) {
    const oldest = await prisma.sessionMessage.findMany({
      where: { bindingId },
      orderBy: { createdAt: "asc" },
      take: count - 100,
      select: { id: true },
    });

    if (oldest.length > 0) {
      await prisma.sessionMessage.deleteMany({
        where: { id: { in: oldest.map((m) => m.id) } },
      });
    }
  }
}

/**
 * Get all active bindings for an agent.
 */
export async function getAgentBindings(agentId: string) {
  return prisma.channelBinding.findMany({
    where: { agentId, isActive: true },
    orderBy: { lastMessageAt: "desc" },
    select: {
      id: true,
      channelType: true,
      senderIdentifier: true,
      senderName: true,
      bindingType: true,
      pairedAt: true,
      lastMessageAt: true,
      _count: { select: { sessionMessages: true } },
    },
  });
}

// ─── Command Detection ─────────────────────────────────────────────────────

/**
 * Check if message is a re-pair command: /pair AF7X2K
 */
function extractRePairCommand(text: string): string | null {
  const match = text.trim().match(/^\/pair\s+(.+)$/i);
  if (!match) return null;
  return extractPairingCode(match[1]);
}

/**
 * Check if message is an unpair command.
 */
function isUnpairCommand(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized === "/unpair" || normalized === "/disconnect";
}

