/**
 * OpenClaw Status Endpoint
 *
 * GET  /api/openclaw/status          — overall gateway status
 * GET  /api/openclaw/status?agent=ID — per-agent connection status
 *
 * Used by:
 *   - OpenClaw Gateway to health-check the backend
 *   - AgentHaus dashboard to show channel connection status
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agent");

    if (agentId) {
      return await agentStatus(agentId);
    }

    return await overallStatus();
  } catch (error) {
    console.error("OpenClaw status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}

// ─── Overall Platform Status ───────────────────────────────────────────────

async function overallStatus() {
  const [
    totalAgents,
    activeAgents,
    totalBindings,
    activeBindings,
    recentMessages,
  ] = await Promise.all([
    prisma.agent.count(),
    prisma.agent.count({ where: { status: "active" } }),
    prisma.channelBinding.count(),
    prisma.channelBinding.count({ where: { isActive: true } }),
    prisma.sessionMessage.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  // Channel breakdown
  const channelBreakdown = await prisma.channelBinding.groupBy({
    by: ["channelType"],
    where: { isActive: true },
    _count: { id: true },
  });

  return NextResponse.json({
    status: "ok",
    service: "agenthaus",
    timestamp: new Date().toISOString(),
    gateway: {
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/openclaw/webhook`,
      secretConfigured: !!process.env.OPENCLAW_WEBHOOK_SECRET,
    },
    stats: {
      totalAgents,
      activeAgents,
      totalBindings,
      activeBindings,
      messagesLast24h: recentMessages,
      channels: Object.fromEntries(
        channelBreakdown.map((c) => [c.channelType, c._count.id])
      ),
    },
  });
}

// ─── Per-Agent Status ──────────────────────────────────────────────────────

async function agentStatus(agentId: string) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      name: true,
      status: true,
      pairingCode: true,
      pairingCodeExpiresAt: true,
      telegramBotToken: true,
      discordBotToken: true,
      channels: true,
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Get bindings for this agent
  const bindings = await prisma.channelBinding.findMany({
    where: { agentId, isActive: true },
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
    orderBy: { lastMessageAt: "desc" },
  });

  // Pairing code status
  const pairingCodeValid =
    agent.pairingCode &&
    agent.pairingCodeExpiresAt &&
    agent.pairingCodeExpiresAt > new Date();

  // Channel configurations
  let channelConfigs: unknown[] = [];
  try {
    channelConfigs = agent.channels ? JSON.parse(agent.channels) : [];
  } catch {
    channelConfigs = [];
  }

  return NextResponse.json({
    agentId: agent.id,
    agentName: agent.name,
    agentStatus: agent.status,
    pairing: {
      code: pairingCodeValid ? agent.pairingCode : null,
      expiresAt: pairingCodeValid ? agent.pairingCodeExpiresAt : null,
      isActive: !!pairingCodeValid,
    },
    dedicatedBots: {
      telegram: !!agent.telegramBotToken,
      discord: !!agent.discordBotToken,
    },
    channels: channelConfigs,
    bindings: bindings.map((b) => ({
      id: b.id,
      channel: b.channelType,
      sender: b.senderName || b.senderIdentifier,
      type: b.bindingType,
      pairedAt: b.pairedAt,
      lastActive: b.lastMessageAt,
      messageCount: b._count.sessionMessages,
    })),
    stats: {
      activeConnections: bindings.length,
      channelBreakdown: bindings.reduce(
        (acc, b) => {
          acc[b.channelType] = (acc[b.channelType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    },
  });
}

