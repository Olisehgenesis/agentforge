/**
 * OpenClaw Gateway Webhook
 *
 * POST /api/openclaw/webhook
 *
 * Central entry point for ALL messages arriving via OpenClaw Gateway.
 * Handles both shared-bot (pairing code) and dedicated-bot routing.
 *
 * Flow:
 *   1. Validate webhook secret (shared between AgentHaus and OpenClaw)
 *   2. Parse the OpenClaw payload → SenderContext
 *   3. Route via routeMessage() → find or pair the agent
 *   4. If agent found → processMessage() → skills + transactions
 *   5. Save session messages → return reply to OpenClaw
 *
 * OpenClaw relays the reply back to the originating channel.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processMessage } from "@/lib/openclaw/manager";
import {
  routeMessage,
  loadSessionHistory,
  saveSessionMessages,
  type SenderContext,
} from "@/lib/openclaw/router";
import type {
  ChannelType,
  OpenClawWebhookPayload,
  OpenClawWebhookResponse,
} from "@/lib/channels/types";

// ─── Webhook Secret Validation ─────────────────────────────────────────────

const WEBHOOK_SECRET = process.env.OPENCLAW_WEBHOOK_SECRET || "";

function verifyWebhookAuth(request: Request): boolean {
  if (!WEBHOOK_SECRET) return true; // No secret configured = accept all (dev mode)

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${WEBHOOK_SECRET}`) return true;

  const secretHeader = request.headers.get("x-openclaw-secret");
  if (secretHeader === WEBHOOK_SECRET) return true;

  return false;
}

// ─── POST Handler ──────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // ── 1. Auth ─────────────────────────────────────────────────────
    if (!verifyWebhookAuth(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ── 2. Parse payload ────────────────────────────────────────────
    const payload: OpenClawWebhookPayload = await request.json();

    if (!payload.channel || !payload.sender?.id || !payload.message?.text) {
      return NextResponse.json(
        { error: "Invalid payload: channel, sender.id, and message.text are required" },
        { status: 400 }
      );
    }

    const channelType = normalizeChannel(payload.channel);
    const senderId = normalizeSenderId(channelType, payload.sender);
    const messageText = payload.message.text.trim();

    if (!messageText) {
      return NextResponse.json(
        { reply: "", agentId: "", agentName: "", action: "chat" } satisfies OpenClawWebhookResponse
      );
    }

    // ── 3. Route to agent ───────────────────────────────────────────
    const senderCtx: SenderContext = {
      channelType,
      senderId,
      senderName: payload.sender.name || payload.sender.username,
      chatId: payload.chat?.id || senderId,
      messageText,
      dedicatedBotId: payload.meta?.botId || undefined,
    };

    const route = await routeMessage(senderCtx);

    // If routing produced a system reply (pairing, unknown, unpair) → return it
    if (route.systemReply && !route.agentId) {
      return NextResponse.json({
        reply: route.systemReply,
        agentId: "",
        agentName: "",
        action: route.type === "paired_new" ? "paired" : "unknown_sender",
      } satisfies OpenClawWebhookResponse);
    }

    // If just paired → send the pairing confirmation AND also process the first message?
    // No: pairing message IS the code, so just confirm. Next message will be the real one.
    if (route.type === "paired_new" && route.systemReply) {
      return NextResponse.json({
        reply: route.systemReply,
        agentId: route.agentId || "",
        agentName: route.agentName || "",
        action: "paired",
      } satisfies OpenClawWebhookResponse);
    }

    if (!route.agentId) {
      return NextResponse.json({
        reply: "Sorry, I couldn't determine which agent to route your message to. Please send a pairing code.",
        agentId: "",
        agentName: "",
        action: "unknown_sender",
      } satisfies OpenClawWebhookResponse);
    }

    // ── 4. Load session history ─────────────────────────────────────
    let conversationHistory: { role: "user" | "assistant"; content: string }[] = [];

    if (route.bindingId) {
      conversationHistory = await loadSessionHistory(route.bindingId, 20);
    }

    // ── 5. Process through agent pipeline ───────────────────────────
    const response = await processMessage(
      route.agentId,
      messageText,
      conversationHistory
    );

    // ── 6. Save session messages ────────────────────────────────────
    if (route.bindingId) {
      await saveSessionMessages(route.bindingId, messageText, response, {
        channel: channelType,
        senderId,
        senderName: senderCtx.senderName,
      });
    }

    // ── 7. Log interaction ──────────────────────────────────────────
    await prisma.activityLog.create({
      data: {
        agentId: route.agentId,
        type: "action",
        message: `🌐 ${channelType.toUpperCase()} ${senderCtx.senderName || senderId}: ${messageText.slice(0, 60)}`,
        metadata: JSON.stringify({
          channel: channelType,
          senderId,
          senderName: senderCtx.senderName,
          chatId: senderCtx.chatId,
          bindingId: route.bindingId,
          bindingType: route.type,
          userMessage: messageText.slice(0, 200),
          response: response.slice(0, 200),
        }),
      },
    });

    // ── 8. Return reply ─────────────────────────────────────────────
    return NextResponse.json({
      reply: response,
      agentId: route.agentId,
      agentName: route.agentName || "",
      action: "chat",
    } satisfies OpenClawWebhookResponse);

  } catch (error) {
    console.error("OpenClaw webhook error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const isMissingKey = errorMessage.includes("API key");

    // Log error
    try {
      await prisma.activityLog.create({
        data: {
          agentId: "system",
          type: "error",
          message: `OpenClaw webhook error: ${errorMessage.slice(0, 180)}`,
        },
      });
    } catch {
      // Logging failed
    }

    return NextResponse.json({
      reply: isMissingKey
        ? "⚠️ The agent owner hasn't configured their API key yet. Please ask them to set it up on the AgentHaus dashboard."
        : "❌ Something went wrong processing your message. Please try again.",
      agentId: "",
      agentName: "",
      action: "error",
    } satisfies OpenClawWebhookResponse);
  }
}

// ─── Health check (OpenClaw can ping this) ─────────────────────────────────

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "agenthaus-openclaw-webhook",
    timestamp: new Date().toISOString(),
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function normalizeChannel(channel: string): ChannelType {
  const ch = channel.toLowerCase().trim();
  const map: Record<string, ChannelType> = {
    whatsapp: "whatsapp",
    telegram: "telegram",
    discord: "discord",
    imessage: "imessage",
    web: "web",
    // OpenClaw-specific names
    wa: "whatsapp",
    tg: "telegram",
    dc: "discord",
    im: "imessage",
  };
  return map[ch] || "web";
}

function normalizeSenderId(
  channel: ChannelType,
  sender: OpenClawWebhookPayload["sender"]
): string {
  // Prefix sender IDs by channel to avoid collisions
  // e.g. Telegram user 12345 ≠ Discord user 12345
  switch (channel) {
    case "whatsapp":
      return `wa:${sender.phone || sender.id}`;
    case "telegram":
      return `tg:${sender.id}`;
    case "discord":
      return `dc:${sender.id}`;
    case "imessage":
      return `im:${sender.phone || sender.id}`;
    case "web":
    default:
      return `web:${sender.id}`;
  }
}

