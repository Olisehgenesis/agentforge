/**
 * Channel Bindings API
 *
 * Manage channel bindings and pairing codes for agents.
 *
 * GET    /api/openclaw/channels?agent=ID   — list bindings for an agent
 * POST   /api/openclaw/channels            — generate pairing code or create binding
 * DELETE  /api/openclaw/channels            — deactivate a binding or revoke pairing code
 *
 * Used by the AgentHaus dashboard to:
 *   - Show connected users per channel
 *   - Generate/refresh pairing codes
 *   - Kick/disconnect users
 *   - View conversation stats
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreatePairingCode, revokePairingCode } from "@/lib/openclaw/pairing";
import { getAgentBindings } from "@/lib/openclaw/router";

// ─── GET — List bindings for an agent ──────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agent");

    if (!agentId) {
      return NextResponse.json(
        { error: "agent query parameter is required" },
        { status: 400 }
      );
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        pairingCode: true,
        pairingCodeExpiresAt: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const bindings = await getAgentBindings(agentId);

    // Pairing code status
    const pairingCodeValid =
      agent.pairingCode &&
      agent.pairingCodeExpiresAt &&
      agent.pairingCodeExpiresAt > new Date();

    return NextResponse.json({
      agentId: agent.id,
      agentName: agent.name,
      pairing: {
        code: pairingCodeValid ? agent.pairingCode : null,
        expiresAt: pairingCodeValid ? agent.pairingCodeExpiresAt : null,
      },
      bindings: bindings.map((b) => ({
        id: b.id,
        channel: b.channelType,
        sender: b.senderIdentifier,
        senderName: b.senderName,
        type: b.bindingType,
        pairedAt: b.pairedAt,
        lastActive: b.lastMessageAt,
        messageCount: b._count.sessionMessages,
      })),
      total: bindings.length,
    });
  } catch (error) {
    console.error("Channel bindings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bindings" },
      { status: 500 }
    );
  }
}

// ─── POST — Generate pairing code or manual binding ────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    switch (action) {
      // Generate or refresh a pairing code
      case "generate_code": {
        const result = await getOrCreatePairingCode(agentId);
        return NextResponse.json({
          code: result.code,
          expiresAt: result.expiresAt,
          isNew: result.isNew,
          instructions: [
            `Share this code with users who want to connect to your agent:`,
            ``,
            `📱 WhatsApp: Send "${result.code}" to the AgentHaus number`,
            `💬 Telegram: Send "${result.code}" to @AgentHausBot`,
            `🎮 Discord: Send "${result.code}" in DM to AgentHaus bot`,
            ``,
            `Code expires in 24 hours. Refresh anytime from the dashboard.`,
          ].join("\n"),
        });
      }

      // Revoke the current pairing code
      case "revoke_code": {
        await revokePairingCode(agentId);
        return NextResponse.json({ success: true, message: "Pairing code revoked" });
      }

      // Create a manual binding (for testing or admin use)
      case "create_binding": {
        const { channelType, senderId, senderName } = body;

        if (!channelType || !senderId) {
          return NextResponse.json(
            { error: "channelType and senderId are required" },
            { status: 400 }
          );
        }

        // Deactivate existing bindings for this sender+channel
        await prisma.channelBinding.updateMany({
          where: {
            channelType,
            senderIdentifier: senderId,
            isActive: true,
          },
          data: { isActive: false },
        });

        const binding = await prisma.channelBinding.create({
          data: {
            agentId,
            channelType,
            senderIdentifier: senderId,
            senderName: senderName || null,
            bindingType: "direct",
            isActive: true,
          },
        });

        return NextResponse.json({
          binding: {
            id: binding.id,
            channel: binding.channelType,
            sender: binding.senderIdentifier,
            type: binding.bindingType,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid: generate_code, revoke_code, create_binding` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Channel bindings POST error:", error);
    const msg = error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── DELETE — Deactivate a binding ─────────────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { bindingId, agentId, disconnectAll } = body;

    if (disconnectAll && agentId) {
      // Disconnect all bindings for an agent
      const result = await prisma.channelBinding.updateMany({
        where: { agentId, isActive: true },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        disconnected: result.count,
        message: `Disconnected ${result.count} user(s)`,
      });
    }

    if (!bindingId) {
      return NextResponse.json(
        { error: "bindingId is required (or pass disconnectAll + agentId)" },
        { status: 400 }
      );
    }

    const binding = await prisma.channelBinding.findUnique({
      where: { id: bindingId },
      include: { agent: { select: { name: true } } },
    });

    if (!binding) {
      return NextResponse.json({ error: "Binding not found" }, { status: 404 });
    }

    await prisma.channelBinding.update({
      where: { id: bindingId },
      data: { isActive: false },
    });

    // Log disconnection
    await prisma.activityLog.create({
      data: {
        agentId: binding.agentId,
        type: "action",
        message: `🔓 Disconnected ${binding.senderName || binding.senderIdentifier} from ${binding.channelType}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Disconnected ${binding.senderName || binding.senderIdentifier} from ${binding.agent.name}`,
    });
  } catch (error) {
    console.error("Channel bindings DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}

