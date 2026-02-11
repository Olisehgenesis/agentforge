import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateRegistrationJSON } from "@/lib/blockchain/erc8004";

/**
 * GET /api/agents/[id]/registration.json
 *
 * Serves the ERC-8004 registration JSON for an agent.
 * This URL is what gets set as the `agentURI` on the IdentityRegistry.
 *
 * The JSON follows the ERC-8004 spec's recommended registration file shape:
 * - type, name, description, image
 * - services (endpoints like chat API)
 * - registrations (on-chain identity references)
 * - supportedTrust
 *
 * @see https://github.com/erc-8004/erc-8004-contracts#agent-registration-file-recommended-shape
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        templateType: true,
        agentWalletAddress: true,
        erc8004AgentId: true,
        erc8004ChainId: true,
        status: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const serviceUrl = `${appUrl}/api/agents/${agent.id}/chat`;

    const registrationJSON = generateRegistrationJSON(
      agent.name,
      agent.description || `${agent.templateType} agent powered by AgentHaus`,
      serviceUrl,
      agent.agentWalletAddress || undefined,
      agent.erc8004ChainId || 42220,
      agent.erc8004AgentId || undefined
    );

    return new NextResponse(JSON.stringify(registrationJSON, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Failed to serve registration JSON:", error);
    return NextResponse.json(
      { error: "Failed to generate registration JSON" },
      { status: 500 }
    );
  }
}

