import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deriveAccount } from "@/lib/blockchain/wallet";

// POST /api/agents/:id/export
// Requires body: { walletAddress: string, confirmationName: string }
// Responds with a JSON file download containing agent data + private key.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const walletAddress = (body.walletAddress as string | undefined)?.toLowerCase();
    const confirmationName = body.confirmationName as string | undefined;

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { owner: { select: { walletAddress: true } } },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const ownerWallet = agent.owner?.walletAddress?.toLowerCase();
    if (!walletAddress || ownerWallet !== walletAddress) {
      return NextResponse.json(
        { error: "Only the agent owner can export" },
        { status: 403 }
      );
    }

    if (confirmationName !== agent.name) {
      return NextResponse.json(
        { error: "Name confirmation mismatch" },
        { status: 400 }
      );
    }

    if (agent.walletDerivationIndex == null) {
      return NextResponse.json(
        { error: "Agent has no derived wallet" },
        { status: 400 }
      );
    }

    // derive private key
    // `deriveAccount` returns an HDAccount; its typings don't expose
    // `privateKey` even though the object includes it at runtime, so cast
    // to any here.
    const account = deriveAccount(agent.walletDerivationIndex) as any;

    const exportObject = {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      agentWallet: {
        address: account.address,
        privateKey: account.privateKey,
      },
      erc8004AgentId: agent.erc8004AgentId || undefined,
      erc8004URI: agent.erc8004URI || undefined,
      exportedAt: new Date().toISOString(),
    } as const;

    // mark exported
    await prisma.agent.update({
      where: { id },
      data: { exported: true, exportedAt: new Date() },
    });

    const json = JSON.stringify(exportObject, null, 2);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition":
          `attachment; filename="${agent.name}-export.json"`,
      },
    });
  } catch (error) {
    console.error("agent export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
