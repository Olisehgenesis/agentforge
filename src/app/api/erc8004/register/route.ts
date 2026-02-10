import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateRegistrationJSON } from "@/lib/blockchain/erc8004";
import { ERC8004_CONTRACTS } from "@/lib/constants";

/**
 * GET /api/erc8004/register?agentId=...
 *
 * Returns the registration data needed for the client to call
 * register() on the IdentityRegistry.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json({ error: "agentId query param required" }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        description: true,
        templateType: true,
        agentWalletAddress: true,
        erc8004AgentId: true,
        erc8004ChainId: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.erc8004AgentId) {
      return NextResponse.json({
        error: "Agent is already registered on-chain",
        erc8004AgentId: agent.erc8004AgentId,
      }, { status: 409 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const agentURI = `${appUrl}/api/agents/${agent.id}/registration.json`;
    const serviceUrl = `${appUrl}/api/agents/${agent.id}/chat`;

    // Return everything the client needs for the on-chain call
    return NextResponse.json({
      agentURI, // This URL goes into register(owner, agentURI)
      registrationJSON: generateRegistrationJSON(
        agent.name,
        agent.description || `${agent.templateType} agent`,
        serviceUrl,
        agent.agentWalletAddress || undefined,
      ),
      contracts: ERC8004_CONTRACTS,
    });
  } catch (error) {
    console.error("Failed to prepare registration:", error);
    return NextResponse.json({ error: "Failed to prepare registration" }, { status: 500 });
  }
}

/**
 * POST /api/erc8004/register
 *
 * Called by the client AFTER the on-chain transaction succeeds.
 * Records the on-chain data in the database.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId, erc8004AgentId, erc8004TxHash, erc8004ChainId, erc8004URI } = body;

    if (!agentId || !erc8004AgentId || !erc8004TxHash) {
      return NextResponse.json(
        { error: "agentId, erc8004AgentId, and erc8004TxHash are required" },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Update agent with real on-chain data
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        erc8004AgentId: String(erc8004AgentId),
        erc8004TxHash,
        erc8004ChainId: erc8004ChainId ? Number(erc8004ChainId) : null,
        erc8004URI: erc8004URI || null,
      },
    });

    // Log
    await prisma.activityLog.create({
      data: {
        agentId,
        type: "action",
        message: `Registered on ERC-8004 IdentityRegistry — on-chain agentId #${erc8004AgentId}`,
        metadata: JSON.stringify({ txHash: erc8004TxHash, chainId: erc8004ChainId }),
      },
    });

    // Record registration tx
    await prisma.transaction.create({
      data: {
        agentId,
        type: "register",
        status: "confirmed",
        txHash: erc8004TxHash,
        description: `ERC-8004 registration (agentId #${erc8004AgentId})`,
      },
    });

    return NextResponse.json({
      success: true,
      erc8004AgentId: String(erc8004AgentId),
      erc8004TxHash,
    });
  } catch (error) {
    console.error("Failed to record registration:", error);
    return NextResponse.json({ error: "Failed to record registration" }, { status: 500 });
  }
}
