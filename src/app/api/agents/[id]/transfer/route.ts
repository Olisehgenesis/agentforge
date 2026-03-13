import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/agents/:id/transfer
// Body: { walletAddress: string, newOwnerWalletAddress: string }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const walletAddress = (body.walletAddress as string | undefined)?.toLowerCase();
    const newOwnerWallet = (body.newOwnerWalletAddress as string | undefined)?.toLowerCase();

    if (!walletAddress || !newOwnerWallet) {
      return NextResponse.json({ error: "Missing addresses" }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { owner: { select: { walletAddress: true } } },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const ownerWallet = agent.owner?.walletAddress?.toLowerCase();
    if (ownerWallet !== walletAddress) {
      return NextResponse.json(
        { error: "Only the agent owner can transfer ownership" },
        { status: 403 }
      );
    }

    const newOwner = await prisma.user.findUnique({
      where: { walletAddress: newOwnerWallet },
    });
    if (!newOwner) {
      return NextResponse.json({ error: "Target user not found" }, { status: 400 });
    }

    await prisma.agent.update({
      where: { id },
      data: { ownerId: newOwner.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("transfer ownership error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transfer failed" },
      { status: 500 }
    );
  }
}
