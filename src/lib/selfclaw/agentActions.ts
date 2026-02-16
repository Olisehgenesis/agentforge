/**
 * SelfClaw agent actions — shared logic for skills and API routes.
 * Allows agents to do all SelfClaw operations via chat (no dashboard needed).
 */

import { prisma } from "@/lib/db";
import {
  checkAgentStatus,
  confirmErc8004,
  createWallet as createWalletSelfClaw,
  deployToken as getDeployTx,
  registerTokenWithRetry,
  logRevenue as logRevenueSelfClaw,
  logCost as logCostSelfClaw,
  getAgentEconomics,
  getPools,
  getSponsorshipInfo,
  requestSelfClawSponsorship,
  signAuthenticatedPayload,
} from "./client";
import { decryptPrivateKey } from "./keys";
import {
  getAgentWalletClient,
  getPublicClient,
  deriveAccount,
  getActiveChain,
  getWalletBalance,
} from "@/lib/blockchain/wallet";
import { getTokenBalanceWei } from "@/lib/blockchain/celoData";
import { parseUnits } from "viem";

const COST_CATEGORIES = ["infra", "compute", "ai_credits", "bandwidth", "storage", "other"] as const;

/** Sanitize supply string: remove commas, validate decimal, default to 1B for SelfClaw sponsorship + wallet buffer. */
function sanitizeSupply(s: string): string {
  const cleaned = String(s).replace(/,/g, "").trim();
  if (!cleaned) return "10000000000";
  const num = parseFloat(cleaned);
  if (Number.isNaN(num) || num <= 0 || !Number.isFinite(num)) return "10000000000";
  return String(Math.floor(num));
}

export interface AgentIdentityBriefing {
  name: string;
  pipeline: {
    identity: boolean;
    wallet: boolean;
    gas: boolean;
    erc8004: boolean;
    token: boolean;
    liquidity: boolean;
  };
  walletAddress?: string;
  chainId: number;
  nextSteps: string[];
}

/**
 * Get agent identity briefing — pipeline status and next steps.
 * Aligns with SelfClaw: Identity → Wallet → Gas → ERC-8004 → Token → Liquidity.
 */
export async function getAgentIdentity(agentId: string): Promise<AgentIdentityBriefing> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      name: true,
      agentWalletAddress: true,
      walletDerivationIndex: true,
      erc8004AgentId: true,
      erc8004ChainId: true,
      verification: { select: { publicKey: true, selfxyzVerified: true } },
      agentDeployedTokens: true,
    },
  });

  if (!agent) {
    return {
      name: "Unknown",
      pipeline: { identity: false, wallet: false, gas: false, erc8004: false, token: false, liquidity: false },
      chainId: 42220,
      nextSteps: ["Agent not found."],
    };
  }

  const identity = !!(agent.verification?.publicKey && agent.verification.selfxyzVerified);
  const wallet = !!agent.agentWalletAddress;
  let gas = false;
  if (wallet) {
    try {
      const bal = await getWalletBalance(agent.agentWalletAddress as `0x${string}`);
      gas = parseFloat(bal.nativeBalance) > 0 || bal.tokens.some((t) => parseFloat(t.balance) > 0.01);
    } catch {
      gas = false;
    }
  }
  const erc8004 = !!agent.erc8004AgentId;
  const chainId = agent.erc8004ChainId ?? 42220;

  let deployedTokens: Array<{ address: string; name: string; symbol: string }> = [];
  try {
    if (agent.agentDeployedTokens) {
      deployedTokens = JSON.parse(agent.agentDeployedTokens) as typeof deployedTokens;
    }
  } catch {
    deployedTokens = [];
  }
  const token = deployedTokens.length > 0;

  const tokenInfo = await getAgentTokenInfo(agentId).catch(() => null);
  const liquidity = !!(tokenInfo?.pools && tokenInfo.pools.length > 0);

  const nextSteps: string[] = [];
  if (!identity) nextSteps.push("Verify with SelfClaw (Verify → Scan QR).");
  if (!wallet) nextSteps.push("Initialize wallet (Settings or ask me to register with SelfClaw).");
  if (wallet && !gas) nextSteps.push("Fund the agent wallet with CELO or stablecoins for gas.");
  if (!erc8004 && identity) nextSteps.push("Register on-chain (ERC-8004) — required for sponsorship.");
  if (!token && identity && wallet) nextSteps.push("Deploy token via [[SELFCLAW_DEPLOY_TOKEN|name|symbol|10000000000]].");
  if (token && !liquidity) nextSteps.push("Request sponsorship via [[REQUEST_SELFCLAW_SPONSORSHIP]].");

  return {
    name: agent.name,
    pipeline: { identity, wallet, gas, erc8004, token, liquidity },
    walletAddress: agent.agentWalletAddress ?? undefined,
    chainId,
    nextSteps: nextSteps.length > 0 ? nextSteps : ["All set. You can deploy more tokens, log revenue, or trade."],
  };
}

export interface AgentTokenInfo {
  verified: boolean;
  tokenAddress?: string;
  deployedTokens?: Array<{ address: string; name: string; symbol: string; supply?: string; deployedAt: string }>;
  walletAddress?: string;
  economics?: {
    totalRevenue: string;
    totalCosts: string;
    profitLoss: string;
    runway?: { months: number; status: string };
  };
  pools?: Array<{
    agentName?: string;
    tokenAddress?: string;
    price?: number;
    volume24h?: number;
    marketCap?: number;
  }>;
  error?: string;
}

/**
 * Get this agent's token info from SelfClaw (economics, pools, token address).
 */
export async function getAgentTokenInfo(agentId: string): Promise<AgentTokenInfo> {
  const verification = await prisma.agentVerification.findUnique({
    where: { agentId },
    select: { publicKey: true, selfxyzVerified: true },
  });

  if (!verification?.publicKey) {
    return {
      verified: false,
      error: "Agent is not SelfClaw verified. Complete verification first (Verify → Scan QR).",
    };
  }

  if (!verification.selfxyzVerified) {
    return {
      verified: false,
      error: "Agent verification not complete. Scan the QR code with the Self app to finish.",
    };
  }

  try {
    const [agentStatus, economics, poolsData] = await Promise.all([
      checkAgentStatus(verification.publicKey),
      getAgentEconomics(verification.publicKey).catch(() => null),
      getPools().catch(() => ({ pools: [] })),
    ]);

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { name: true, agentDeployedTokens: true },
    });

    const allPools = poolsData.pools || [];
    const agentPools = agent?.name
      ? allPools.filter(
          (p) => p.agentName?.toLowerCase() === agent.name?.toLowerCase()
        )
      : allPools;

    const econ = economics as Record<string, unknown> | null;
    const toStr = (v: unknown) =>
      typeof v === "string" ? v : typeof v === "number" ? String(v) : "0";

    let deployedTokens: Array<{ address: string; name: string; symbol: string; supply?: string; deployedAt: string }> = [];
    try {
      if (agent?.agentDeployedTokens) {
        deployedTokens = JSON.parse(agent.agentDeployedTokens) as typeof deployedTokens;
      }
    } catch {
      deployedTokens = [];
    }

    const primaryToken = agentStatus.tokenAddress ?? deployedTokens[deployedTokens.length - 1]?.address;

    return {
      verified: true,
      tokenAddress: primaryToken,
      deployedTokens: deployedTokens.length > 0 ? deployedTokens : undefined,
      walletAddress: agentStatus.walletAddress,
      economics: econ
        ? {
            totalRevenue: toStr(econ.totalRevenue ?? econ.totalRevenueUsd ?? "0"),
            totalCosts: toStr(econ.totalCosts ?? econ.totalCostUsd ?? "0"),
            profitLoss: toStr(econ.profitLoss ?? econ.netUsd ?? "0"),
            runway:
              econ.runway && typeof econ.runway === "object"
                ? (econ.runway as { months: number; status: string })
                : undefined,
          }
        : undefined,
      pools: agentPools,
    };
  } catch (err) {
    return {
      verified: true,
      error: err instanceof Error ? err.message : "Failed to fetch SelfClaw data",
    };
  }
}

export interface RequestSponsorshipResult {
  success: boolean;
  error?: string;
  tokenAddress?: string;
  sponsorWallet?: string;
  amountNeeded?: string;
  agentBalanceWei?: string;
}

/**
 * Request SelfClaw liquidity sponsorship for this agent.
 * Requires a deployed and registered token.
 * Uses the agent's actual token balance as tokenAmount — SelfClaw requires the agent wallet
 * to hold the tokens it will provide to the pool. Never requests more than the wallet holds.
 * tokenAddressOverride: use this if provided (e.g. from recent deploy); else check stored tokens, then SelfClaw.
 */
export async function requestSponsorshipForAgent(
  agentId: string,
  tokenAmountOverride?: string,
  tokenAddressOverride?: string
): Promise<RequestSponsorshipResult> {
  const [verification, agent] = await Promise.all([
    prisma.agentVerification.findUnique({
      where: { agentId },
      select: { publicKey: true, encryptedPrivateKey: true, selfxyzVerified: true },
    }),
    prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        agentWalletAddress: true,
        walletDerivationIndex: true,
        agentDeployedTokens: true,
        erc8004AgentId: true,
        name: true,
      },
    }),
  ]);

  if (!verification?.encryptedPrivateKey || !verification.selfxyzVerified) {
    return {
      success: false,
      error: "Agent must be SelfClaw verified first. Complete verification (Verify → Scan QR).",
    };
  }

  if (!agent?.agentWalletAddress || agent.walletDerivationIndex === null) {
    return {
      success: false,
      error: "Agent has no wallet. Initialize wallet and register with SelfClaw first.",
    };
  }

  if (!agent.erc8004AgentId) {
    return {
      success: false,
      error:
        "ERC-8004 onchain identity is required before requesting sponsorship. " +
        "Register on-chain first using the button below (or the Register On-Chain quick action), then retry sponsorship.",
    };
  }

  const agentWallet = agent.agentWalletAddress as `0x${string}`;

  let tokenAddress = tokenAddressOverride?.trim();
  let storedSupply: string | undefined;
  let tokenSymbol: string | undefined;

  // Resolve token: when no override, pick the one where sponsor has most (or agent if sponsor empty).
  // This fixes: user deploys A, sends tokens to sponsor, deploys B — "latest" was B but sponsor has A.
  const sponsorshipInfo = await getSponsorshipInfo();
  const sponsorWalletAddr = sponsorshipInfo.sponsorWallet as `0x${string}` | undefined;

  if (agent.agentDeployedTokens) {
    try {
      const tokens = JSON.parse(agent.agentDeployedTokens) as Array<{
        address: string;
        symbol?: string;
        supply?: string;
      }>;
      if (tokens.length > 0) {
        if (tokenAddress) {
          const match = tokens.find((t) => t.address?.toLowerCase() === tokenAddress?.toLowerCase());
          tokenSymbol = match?.symbol;
          storedSupply = match?.supply;
        } else {
          // No override: pick token where sponsor has most (ready for pool), else agent has most
          let bestAddr = tokens[tokens.length - 1].address;
          let bestPoolWei = BigInt(0);
          for (const t of tokens) {
            const agentBal = await getTokenBalanceWei(t.address as `0x${string}`, agentWallet);
            const agentPool = (BigInt(agentBal) * BigInt(10)) / BigInt(11);
            let sponsorPool = BigInt(0);
            if (sponsorWalletAddr) {
              const sponsorBal = await getTokenBalanceWei(t.address as `0x${string}`, sponsorWalletAddr);
              sponsorPool = (BigInt(sponsorBal) * BigInt(10)) / BigInt(11);
            }
            const poolWei = sponsorPool > agentPool ? sponsorPool : agentPool;
            if (poolWei > bestPoolWei) {
              bestPoolWei = poolWei;
              bestAddr = t.address;
            }
          }
          tokenAddress = bestAddr;
          const match = tokens.find((t) => t.address?.toLowerCase() === tokenAddress?.toLowerCase());
          storedSupply = match?.supply;
          tokenSymbol = match?.symbol;
        }
      }
    } catch {
      /* ignore */
    }
  }
  if (!tokenSymbol) tokenSymbol = agent.name?.replace(/\s+/g, "").slice(0, 8).toUpperCase() || "AGENT";
  if (!tokenAddress) {
    const agentStatus = await checkAgentStatus(verification.publicKey);
    tokenAddress = agentStatus.tokenAddress ?? undefined;
  }
  if (!tokenAddress) {
    return {
      success: false,
      error: "Deploy a token first. Ask me to deploy one (e.g. 'deploy a token named MyAgent symbol MAT') then request sponsorship.",
    };
  }

  // Use agent's actual balance so we never request more than they hold.
  // SelfClaw checks: "Sponsor wallet does not hold enough of your agent token."
  const agentBalanceWei = await getTokenBalanceWei(tokenAddress as `0x${string}`, agentWallet);
  const sponsorBalanceWei = sponsorWalletAddr
    ? await getTokenBalanceWei(tokenAddress as `0x${string}`, sponsorWalletAddr)
    : "0";

  if (agentBalanceWei === "0" && sponsorBalanceWei === "0") {
    return {
      success: false,
      error:
        "Neither your wallet nor the sponsor holds this token. Ensure (1) the token was deployed with your agent wallet, (2) your wallet is registered with SelfClaw before deploying, and (3) you've sent tokens to the sponsor if you already transferred them.",
    };
  }

  // SelfClaw requires 10% slippage buffer: we must SEND poolAmount * 1.1 to sponsor.
  // Cap pool amount to balance/1.1 so we can send our full balance and meet the buffer.
  const agentBalanceBig = BigInt(agentBalanceWei);
  let maxPoolWei = (agentBalanceBig * BigInt(10)) / BigInt(11); // floor(agentBalance / 1.1)

  // If agent already sent tokens to sponsor, sponsor may have more — use the larger.
  if (sponsorWalletAddr) {
    const sponsorBalanceWei = await getTokenBalanceWei(tokenAddress as `0x${string}`, sponsorWalletAddr);
    const sponsorBalanceBig = BigInt(sponsorBalanceWei);
    const sponsorPoolWei = (sponsorBalanceBig * BigInt(10)) / BigInt(11);
    if (sponsorPoolWei > maxPoolWei) {
      maxPoolWei = sponsorPoolWei;
    }
  }

  let amountWei: string;
  if (tokenAmountOverride?.trim()) {
    try {
      const requestedBig = BigInt(tokenAmountOverride.trim());
      amountWei = String(requestedBig <= maxPoolWei ? requestedBig : maxPoolWei);
    } catch {
      amountWei = String(maxPoolWei);
    }
  } else if (storedSupply) {
    try {
      const supplyWei = parseUnits(sanitizeSupply(storedSupply), 18);
      const supplyBig = BigInt(supplyWei);
      amountWei = String(supplyBig <= maxPoolWei ? supplyBig : maxPoolWei);
    } catch {
      amountWei = String(maxPoolWei);
    }
  } else {
    amountWei = String(maxPoolWei);
  }

  try {
    const privateKeyHex = decryptPrivateKey(verification.encryptedPrivateKey);
    const signed = await signAuthenticatedPayload(verification.publicKey, privateKeyHex);
    const result = await requestSelfClawSponsorship(signed, tokenAddress, amountWei, tokenSymbol);

    if (result.success) {
      return { success: true };
    }

    let sponsorWallet = result.sponsorWallet;
    if (!sponsorWallet && result.error) {
      const match = result.error.match(/0x[a-fA-F0-9]{40}/);
      if (match) sponsorWallet = match[0];
    }

    const amountNeeded = result.needs ?? amountWei;
    const isSponsorWalletError =
      /sponsor|hold|enough|transfer/i.test(result.error ?? "") && sponsorWallet;

    if (isSponsorWalletError && sponsorWallet) {
      const sponsorBalanceWei = await getTokenBalanceWei(
        tokenAddress as `0x${string}`,
        sponsorWallet as `0x${string}`
      );
      const neededBig = BigInt(amountNeeded);
      const hasBig = BigInt(sponsorBalanceWei);
      if (hasBig >= neededBig) {
        const signedRetry = await signAuthenticatedPayload(verification.publicKey, privateKeyHex);
        const retry = await requestSelfClawSponsorship(signedRetry, tokenAddress, amountWei, tokenSymbol);
        if (retry.success) {
          return { success: true };
        }
      }
    }

    return {
      success: false,
      error: result.error ?? "Failed to request sponsorship",
      tokenAddress,
      sponsorWallet: sponsorWallet ?? undefined,
      amountNeeded,
      agentBalanceWei: agentBalanceWei,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to request sponsorship";
    const match = msg.match(/0x[a-fA-F0-9]{40}/);
    return {
      success: false,
      error: msg,
      sponsorWallet: match ? match[0] : undefined,
      amountNeeded: undefined,
    };
  }
}

/**
 * Sync ERC-8004 registration to SelfClaw after on-chain registration.
 * Calls POST /confirm-erc8004 so SelfClaw updates verifiedBots.metadata.erc8004TokenId.
 * Required for sponsorship to work. Non-blocking — call .catch() to log failures.
 */
export async function syncErc8004ToSelfClaw(
  agentId: string,
  txHash: string
): Promise<{ success: boolean; error?: string }> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      verification: {
        select: { publicKey: true, encryptedPrivateKey: true, selfxyzVerified: true },
      },
    },
  });

  if (
    !agent?.verification?.encryptedPrivateKey ||
    !agent.verification.selfxyzVerified
  ) {
    return { success: false, error: "Agent not SelfClaw verified — sync skipped" };
  }

  try {
    const privateKeyHex = decryptPrivateKey(agent.verification.encryptedPrivateKey);
    const signed = await signAuthenticatedPayload(agent.verification.publicKey, privateKeyHex);
    const result = await confirmErc8004(signed, txHash);

    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "SelfClaw confirm failed",
    };
  }
}

/** Save the SelfClaw API key (sclaw_...) when user provides it in chat. Used for agent-api (feed, skills, briefing). */
export async function saveSelfClawApiKeyForAgent(
  agentId: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  const trimmed = apiKey?.trim();
  if (!trimmed || !trimmed.startsWith("sclaw_")) {
    return { success: false, error: "Invalid key. Must start with sclaw_." };
  }

  const verification = await prisma.agentVerification.findUnique({
    where: { agentId },
    select: { id: true },
  });
  if (!verification) {
    return { success: false, error: "Agent must be SelfClaw verified first." };
  }

  try {
    const { encrypt } = await import("@/lib/crypto");
    const encrypted = encrypt(trimmed);
    await prisma.agentVerification.update({
      where: { agentId },
      data: { encryptedSelfclawApiKey: encrypted },
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save key",
    };
  }
}

/** Register the agent's EVM wallet with SelfClaw (create-wallet). */
export async function registerWalletForAgent(
  agentId: string
): Promise<{ success: boolean; walletAddress?: string; error?: string }> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      agentWalletAddress: true,
      verification: {
        select: { publicKey: true, encryptedPrivateKey: true, selfxyzVerified: true },
      },
    },
  });

  if (!agent?.verification?.encryptedPrivateKey || !agent.verification.selfxyzVerified) {
    return { success: false, error: "Agent must be SelfClaw verified first." };
  }
  if (!agent.agentWalletAddress) {
    return { success: false, error: "Agent has no wallet. Initialize wallet first." };
  }

  try {
    const privateKeyHex = decryptPrivateKey(agent.verification.encryptedPrivateKey);
    const signed = await signAuthenticatedPayload(agent.verification.publicKey, privateKeyHex);
    await createWalletSelfClaw(signed, agent.agentWalletAddress, "celo");
    return { success: true, walletAddress: agent.agentWalletAddress };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to register wallet",
    };
  }
}

/** Deploy an ERC20 token for the agent and register with SelfClaw. */
export async function deployTokenForAgent(
  agentId: string,
  name: string,
  symbol: string,
  initialSupply: string = "10000000000", // 10B default — plenty for SelfClaw sponsorship + wallet buffer
  force = false
): Promise<{ success: boolean; tokenAddress?: string; txHash?: string; error?: string }> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      walletDerivationIndex: true,
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
    return { success: false, error: "Agent must be verified and have a wallet." };
  }

  // Don't deploy if agent already has token(s) — prevents duplicate registrations
  if (!force && agent.agentDeployedTokens) {
    try {
      const tokens = JSON.parse(agent.agentDeployedTokens) as Array<{ address: string; name: string; symbol: string }>;
      if (tokens.length > 0) {
        const existing = tokens[0];
        return {
          success: false,
          error: `Agent already has a deployed token (${existing.name} / ${existing.symbol}). Use [[AGENT_TOKENS]] to see it. Request sponsorship with [[REQUEST_SELFCLAW_SPONSORSHIP]].`,
        };
      }
    } catch {
      // ignore parse errors
    }
  }

  try {
    const supply = sanitizeSupply(initialSupply);
    const privateKeyHex = decryptPrivateKey(agent.verification.encryptedPrivateKey);
    const signed = await signAuthenticatedPayload(agent.verification.publicKey, privateKeyHex);

    const result = await getDeployTx(signed, name, symbol, supply);
    const unsignedTx = result.unsignedTx as Record<string, unknown> | undefined;

    if (!unsignedTx) {
      return {
        success: false,
        error: "SelfClaw API did not return a deployment transaction. Check SELFCLAW_API_URL and that the agent is verified.",
      };
    }

    const walletClient = getAgentWalletClient(agent.walletDerivationIndex);
    const account = walletClient.account ?? deriveAccount(agent.walletDerivationIndex);

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
      return { success: false, error: "Deploy succeeded but no contract address in receipt." };
    }

    const publicKey = agent.verification!.publicKey;
    const getSignedPayload = () =>
      signAuthenticatedPayload(publicKey, privateKeyHex);
    await registerTokenWithRetry(getSignedPayload, tokenAddress, hash);

    // Persist so sponsorship works before SelfClaw indexes; supports multiple tokens
    const tokenEntry = { address: tokenAddress, name, symbol, supply, deployedAt: new Date().toISOString() };
    const existing = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { agentDeployedTokens: true },
    });
    let tokens: Array<{ address: string; name: string; symbol: string; supply?: string; deployedAt: string }> = [];
    try {
      if (existing?.agentDeployedTokens) {
        tokens = JSON.parse(existing.agentDeployedTokens) as typeof tokens;
      }
    } catch {
      tokens = [];
    }
    tokens.push(tokenEntry);
    await prisma.agent.update({
      where: { id: agentId },
      data: { agentDeployedTokens: JSON.stringify(tokens) },
    });

    return { success: true, tokenAddress, txHash: hash };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to deploy token",
    };
  }
}

/** Log a revenue event to SelfClaw. */
export async function logRevenueForAgent(
  agentId: string,
  amount: string,
  source: string,
  currency: string = "USD",
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const verification = await prisma.agentVerification.findUnique({
    where: { agentId },
    select: { publicKey: true, encryptedPrivateKey: true, selfxyzVerified: true },
  });

  if (!verification?.encryptedPrivateKey || !verification.selfxyzVerified) {
    return { success: false, error: "Agent must be SelfClaw verified." };
  }

  try {
    const privateKeyHex = decryptPrivateKey(verification.encryptedPrivateKey);
    const signed = await signAuthenticatedPayload(verification.publicKey, privateKeyHex);
    await logRevenueSelfClaw(signed, String(amount), currency, source, description);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to log revenue",
    };
  }
}

/** Log a cost event to SelfClaw. Categories: infra, compute, ai_credits, bandwidth, storage, other */
export async function logCostForAgent(
  agentId: string,
  amount: string,
  category: string,
  currency: string = "USD",
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const verification = await prisma.agentVerification.findUnique({
    where: { agentId },
    select: { publicKey: true, encryptedPrivateKey: true, selfxyzVerified: true },
  });

  if (!verification?.encryptedPrivateKey || !verification.selfxyzVerified) {
    return { success: false, error: "Agent must be SelfClaw verified." };
  }

  const validCategory = COST_CATEGORIES.includes(category as (typeof COST_CATEGORIES)[number])
    ? category
    : "other";

  try {
    const privateKeyHex = decryptPrivateKey(verification.encryptedPrivateKey);
    const signed = await signAuthenticatedPayload(verification.publicKey, privateKeyHex);
    await logCostSelfClaw(signed, String(amount), currency, validCategory, description);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to log cost",
    };
  }
}

export { COST_CATEGORIES };
