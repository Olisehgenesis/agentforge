import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/agents/[id]/deploy
 *
 * Two modes:
 * 1. Activate agent (no body or { action: "activate" })
 *    → Sets agent status to "active"
 *
 * 2. Record on-chain ERC-8004 registration (body: { action: "register", ... })
 *    → Called AFTER the client-side wagmi tx succeeds
 *    → Stores the real on-chain agentId, txHash, chainId, and URI
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Parse body (may be empty for simple activation)
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // No body = simple activation
    }

    const action = (body.action as string) || "activate";

    // ── Mode 1: Simple activation ──────────────────────────────────────────
    if (action === "activate") {
      if (agent.status === "active") {
        return NextResponse.json({ error: "Agent is already active" }, { status: 400 });
      }

      await prisma.agent.update({
        where: { id },
        data: {
          status: "active",
          deployedAt: agent.deployedAt || new Date(),
        },
      });

      await prisma.activityLog.create({
        data: {
          agentId: id,
          type: "info",
          message: "Agent activated",
        },
      });

      return NextResponse.json({ success: true, message: "Agent activated" });
    }

    // ── Mode 2: Record on-chain ERC-8004 registration ──────────────────────
    if (action === "register") {
      const {
        erc8004AgentId,
        erc8004TxHash,
        erc8004ChainId,
        erc8004URI,
      } = body as {
        erc8004AgentId: string;
        erc8004TxHash: string;
        erc8004ChainId: number;
        erc8004URI: string;
      };

      if (!erc8004AgentId || !erc8004TxHash) {
        return NextResponse.json(
          { error: "erc8004AgentId and erc8004TxHash are required" },
          { status: 400 }
        );
      }

      // Update agent with real on-chain data
      await prisma.agent.update({
        where: { id },
        data: {
          erc8004AgentId,
          erc8004TxHash,
          erc8004ChainId: erc8004ChainId || null,
          erc8004URI: erc8004URI || null,
          status: "active",
          deployedAt: agent.deployedAt || new Date(),
        },
      });

      // Log the on-chain registration
      await prisma.activityLog.create({
        data: {
          agentId: id,
          type: "action",
          message: `Registered on ERC-8004 IdentityRegistry — agentId #${erc8004AgentId}`,
          metadata: JSON.stringify({
            txHash: erc8004TxHash,
            chainId: erc8004ChainId,
            agentURI: erc8004URI,
          }),
        },
      });

      // Record the registration transaction
      await prisma.transaction.create({
        data: {
          agentId: id,
          type: "register",
          status: "confirmed",
          txHash: erc8004TxHash,
          description: `ERC-8004 IdentityRegistry registration (agentId #${erc8004AgentId})`,
        },
      });

      return NextResponse.json({
        success: true,
        message: "On-chain registration recorded",
        erc8004: {
          agentId: erc8004AgentId,
          txHash: erc8004TxHash,
          chainId: erc8004ChainId,
          agentURI: erc8004URI,
        },
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("Failed to deploy/register agent:", error);
    return NextResponse.json({ error: "Failed to deploy agent" }, { status: 500 });
  }
}
