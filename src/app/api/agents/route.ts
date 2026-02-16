import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getNextDerivationIndex, deriveAddress } from "@/lib/blockchain/wallet";

// GET /api/agents - List all agents for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerAddress = searchParams.get("ownerAddress");

    if (!ownerAddress) {
      return NextResponse.json({ error: "Owner address required" }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { walletAddress: ownerAddress },
    });

    if (!user) {
      return NextResponse.json({ agents: [] });
    }

    const agents = await prisma.agent.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        verification: {
          select: {
            selfxyzVerified: true,
            humanId: true,
            verifiedAt: true,
            publicKey: true,
          },
        },
      },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

// POST /api/agents - Create a new agent
// Agent is immediately usable (active). ERC-8004 on-chain registration is a separate step.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      templateType,
      systemPrompt,
      llmProvider,
      llmModel,
      spendingLimit,
      configuration,
      ownerAddress,
      walletOption,
    } = body;

    if (!name || !templateType || !ownerAddress) {
      return NextResponse.json(
        { error: "Name, template type, and owner address are required" },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress: ownerAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress: ownerAddress,
        },
      });
    }

    // Wallet assignment based on walletOption
    let agentWalletAddress: string | null = null;
    let walletDerivationIndex: number | null = null;

    const effectiveWalletOption = walletOption || "dedicated";
    if (effectiveWalletOption === "dedicated") {
      try {
        walletDerivationIndex = await getNextDerivationIndex();
        agentWalletAddress = deriveAddress(walletDerivationIndex);
      } catch (walletErr) {
        console.warn("Could not derive agent wallet (AGENT_MNEMONIC not set?):", walletErr);
      }
    } else if (effectiveWalletOption === "owner") {
      agentWalletAddress = ownerAddress;
      walletDerivationIndex = null;
    }
    // walletOption === "later" → both remain null

    // Create agent in database with status "deploying".
    // The client will trigger ERC-8004 on-chain registration (wallet signature),
    // then call /api/agents/{id}/deploy to activate once the tx confirms.
    const agent = await prisma.agent.create({
      data: {
        name,
        description,
        templateType,
        systemPrompt,
        llmProvider: llmProvider || "groq",
        llmModel: llmModel || "llama-3.3-70b-versatile",
        spendingLimit: spendingLimit || 100,
        configuration: configuration ? JSON.stringify(configuration) : null,
        ownerId: user.id,
        agentWalletAddress,
        walletDerivationIndex,
        status: "deploying",
        deployedAt: null,
      },
    });

    // Log creation
    await prisma.activityLog.create({
      data: {
        agentId: agent.id,
        type: "info",
        message: `Agent "${name}" created with ${llmProvider || "groq"}/${llmModel || "default"}`,
      },
    });

    if (agentWalletAddress) {
      await prisma.activityLog.create({
        data: {
          agentId: agent.id,
          type: "info",
          message:
            effectiveWalletOption === "owner"
              ? `Using owner wallet: ${agentWalletAddress}`
              : `HD wallet derived: ${agentWalletAddress}`,
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        agentId: agent.id,
        type: "info",
        message: "Agent created — awaiting on-chain ERC-8004 registration to activate.",
      },
    });

    // Return the created agent
    const createdAgent = await prisma.agent.findUnique({
      where: { id: agent.id },
      include: {
        activityLogs: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    return NextResponse.json(createdAgent, { status: 201 });
  } catch (error) {
    console.error("Failed to create agent:", error);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
