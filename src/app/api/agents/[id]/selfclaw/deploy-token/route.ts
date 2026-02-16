import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptPrivateKey } from "@/lib/selfclaw/keys";
import {
  deployToken as getDeployTx,
  registerTokenWithRetry,
  signAuthenticatedPayload,
} from "@/lib/selfclaw/client";
import {
  getAgentWalletClient,
  getPublicClient,
  deriveAccount,
  getActiveChain,
} from "@/lib/blockchain/wallet";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;

  try {
    const body = await request.json();
    let { name, symbol, initialSupply = "10000000000" } = body;
    const cleaned = String(initialSupply).replace(/,/g, "").trim();
    const num = parseFloat(cleaned);
    initialSupply =
      !cleaned || Number.isNaN(num) || num <= 0 ? "10000000000" : String(Math.floor(num));

    if (!name || !symbol) {
      return NextResponse.json(
        { error: "name and symbol are required" },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        walletDerivationIndex: true,
        agentWalletAddress: true,
        agentDeployedTokens: true,
        verification: {
          select: { publicKey: true, encryptedPrivateKey: true, selfxyzVerified: true },
        },
      },
    });

    if (
      !agent?.verification?.encryptedPrivateKey ||
      !agent.verification.selfxyzVerified ||
      agent.walletDerivationIndex === null
    ) {
      return NextResponse.json(
        { error: "Agent must be verified and have a wallet" },
        { status: 400 }
      );
    }

    // Don't deploy if agent already has token(s)
    const force = body.force === true;
    if (!force && agent.agentDeployedTokens) {
      try {
        const tokens = JSON.parse(agent.agentDeployedTokens) as Array<{ address: string; name: string; symbol: string }>;
        if (tokens.length > 0) {
          return NextResponse.json(
            {
              error: `Agent already has a deployed token (${tokens[0].name} / ${tokens[0].symbol}). Use REQUEST_SELFCLAW_SPONSORSHIP for liquidity.`,
            },
            { status: 400 }
          );
        }
      } catch {
        // ignore parse errors
      }
    }

    const privateKeyHex = decryptPrivateKey(agent.verification.encryptedPrivateKey);
    const signed = await signAuthenticatedPayload(
      agent.verification.publicKey,
      privateKeyHex
    );

    const result = await getDeployTx(signed, name, symbol, String(initialSupply));
    const unsignedTx = result.unsignedTx as Record<string, unknown> | undefined;

    if (!unsignedTx) {
      return NextResponse.json(
        { error: "SelfClaw did not return deployment transaction" },
        { status: 502 }
      );
    }

    const walletClient = getAgentWalletClient(agent.walletDerivationIndex);
    const account = walletClient.account ?? deriveAccount(agent.walletDerivationIndex);

    // SelfClaw may return tx in different formats; normalize for viem
    const txParams = {
      account,
      chain: getActiveChain(),
      to: unsignedTx.to as `0x${string}`,
      data: unsignedTx.data as `0x${string}`,
      value: BigInt((unsignedTx.value as string | number) ?? 0),
      gas: unsignedTx.gas ? BigInt(unsignedTx.gas as string | number) : undefined,
      gasPrice: unsignedTx.gasPrice ? BigInt(unsignedTx.gasPrice as string | number) : undefined,
    };

    const hash = await walletClient.sendTransaction(txParams);
    const publicClient = getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    let tokenAddress = receipt.contractAddress;
    if (!tokenAddress && receipt.logs?.length) {
      const factoryAddr = receipt.to?.toLowerCase();
      const seen = new Set<string>();
      for (const log of receipt.logs) {
        const addr = log.address?.toLowerCase();
        if (addr && addr !== factoryAddr && !seen.has(addr)) {
          seen.add(addr);
          tokenAddress = log.address;
          break;
        }
      }
    }
    if (!tokenAddress) {
      return NextResponse.json(
        { error: "Deploy succeeded but no contract address in receipt" },
        { status: 500 }
      );
    }

    const publicKey = agent.verification!.publicKey;
    const getSignedPayload = () =>
      signAuthenticatedPayload(publicKey, privateKeyHex);
    await registerTokenWithRetry(getSignedPayload, tokenAddress, hash);

    return NextResponse.json({
      success: true,
      tokenAddress,
      txHash: hash,
    });
  } catch (error) {
    console.error("SelfClaw deploy-token failed:", error);
    const msg = error instanceof Error ? error.message : "Failed to deploy token";
    const isKeyError = msg.includes("could not be decrypted") || msg.includes("re-verify");
    return NextResponse.json({ error: msg }, { status: isKeyError ? 400 : 500 });
  }
}
