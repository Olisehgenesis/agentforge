/**
 * SelfClaw API Client
 *
 * Interfaces with https://selfclaw.ai for agent verification
 * using Self.xyz passport-based zero-knowledge proofs.
 *
 * Flow:
 *   1. Generate Ed25519 key pair for the agent
 *   2. POST /start-verification → get sessionId + challenge + QR config
 *   3. Sign challenge with agent's private key
 *   4. POST /sign-challenge → submit signature
 *   5. User scans QR with Self app → verification completes
 *   6. GET /agent?publicKey=... → check verification status
 */

const SELFCLAW_BASE_URL =
  process.env.SELFCLAW_API_URL || "https://selfclaw.ai/api/selfclaw/v1";

/** Parse response as JSON; if HTML or invalid, throw a clear error. */
async function safeParseJson(res: Response, path: string): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    const preview = text.slice(0, 80).replace(/\s+/g, " ");
    throw new Error(
      `SelfClaw API returned non-JSON (status ${res.status}) for ${path}. ` +
        `The server may be down or the endpoint changed. Response preview: ${preview}...`
    );
  }
}

const SELFCLAW_FETCH_TIMEOUT_MS =
  Number(process.env.SELFCLAW_FETCH_TIMEOUT_MS) || 25_000;

function formatNetworkError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  const name = err instanceof Error ? err.name : "";
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : "";
  if (name === "TimeoutError" || code === "ABORT_ERR" || msg.includes("aborted"))
    return "Request to SelfClaw timed out. Try again or check your network.";
  if (code === "ECONNREFUSED" || msg.includes("ECONNREFUSED"))
    return "SelfClaw server unreachable. The service may be down.";
  if (code === "ETIMEDOUT" || msg.includes("timed out"))
    return "Request to SelfClaw timed out. Try again.";
  if (code === "ENOTFOUND" || msg.includes("ENOTFOUND"))
    return "Could not reach SelfClaw. Check your internet connection.";
  if (msg === "fetch failed" || msg.includes("fetch failed"))
    return "Could not reach SelfClaw. Check your internet connection and try again.";
  if (msg) return msg;
  return "Network error. Check your connection and try again.";
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StartVerificationRequest {
  agentPublicKey: string; // Ed25519 SPKI base64
  agentName?: string;
}

export interface StartVerificationResponse {
  success: boolean;
  sessionId: string;
  agentKeyHash: string;
  challenge: string; // The exact string to sign
  signatureRequired: boolean;
  signatureVerified: boolean;
  selfApp?: Record<string, unknown>; // Self.xyz QR code config
  config?: Record<string, unknown>; // SelfClaw app config
  error?: string;
}

export interface SignChallengeRequest {
  sessionId: string;
  signature: string; // hex or base64
}

export interface SignChallengeResponse {
  success: boolean;
  message?: string;
  selfApp?: Record<string, unknown>; // Self.xyz QR config (returned after signing)
  error?: string;
}

export interface AgentVerificationStatus {
  verified: boolean;
  publicKey?: string;
  agentName?: string;
  humanId?: string;
  swarm?: string;
  tokenAddress?: string;
  walletAddress?: string;
  selfxyz?: {
    verified: boolean;
    registeredAt?: string;
  };
  reputation?: {
    hasErc8004: boolean;
    erc8004TokenId?: string;
    endpoint?: string;
    registryAddress?: string;
  };
  error?: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────

/**
 * Step 1: Start verification — sends the agent's public key to SelfClaw.
 * Returns a session with a challenge to sign + QR code configuration.
 */
export async function startVerification(
  req: StartVerificationRequest
): Promise<StartVerificationResponse> {
  let res: Response;
  try {
    res = await fetch(`${SELFCLAW_BASE_URL}/start-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(SELFCLAW_FETCH_TIMEOUT_MS),
    });
  } catch (networkError) {
    throw new Error(formatNetworkError(networkError));
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`SelfClaw returned non-JSON response (status ${res.status})`);
  }

  if (!res.ok) {
    console.error("[SelfClaw] start-verification error:", res.status, data);
    throw new Error(data.error || data.message || `SelfClaw API error: ${res.status}`);
  }

  return data;
}

/**
 * Step 2: Submit the signed challenge to prove key ownership.
 */
export async function signChallenge(
  req: SignChallengeRequest
): Promise<SignChallengeResponse> {
  let res: Response;
  try {
    res = await fetch(`${SELFCLAW_BASE_URL}/sign-challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(SELFCLAW_FETCH_TIMEOUT_MS),
    });
  } catch (networkError) {
    throw new Error(formatNetworkError(networkError));
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`SelfClaw returned non-JSON response (status ${res.status})`);
  }

  if (!res.ok) {
    console.error("[SelfClaw] sign-challenge error:", res.status, data);
    throw new Error(data.error || data.message || `SelfClaw API error: ${res.status}`);
  }

  return data;
}

/**
 * Check if an agent name is available on SelfClaw.
 * Returns true if available, false if already taken by another verified agent.
 */
export async function checkAgentNameAvailable(
  agentName: string
): Promise<{ available: boolean; suggestion?: string }> {
  if (!agentName?.trim()) return { available: true };

  let res: Response;
  try {
    res = await fetch(
      `${SELFCLAW_BASE_URL}/agent?name=${encodeURIComponent(agentName.trim())}`,
      { signal: AbortSignal.timeout(SELFCLAW_FETCH_TIMEOUT_MS) }
    );
  } catch (networkError) {
    return { available: true }; // Assume available on network error
  }

  if (!res.ok || res.status === 404) return { available: true };

  const data = (await res.json()) as AgentVerificationStatus;
  if (data.verified) {
    return {
      available: false,
      suggestion: `${agentName}-${Date.now().toString(36)}`,
    };
  }
  return { available: true };
}

/**
 * Check if an agent is verified on SelfClaw.
 * Can pass either a public key or agent name as identifier.
 */
export async function checkAgentStatus(
  publicKey: string
): Promise<AgentVerificationStatus> {
  let res: Response;
  try {
    res = await fetch(
      `${SELFCLAW_BASE_URL}/agent?publicKey=${encodeURIComponent(publicKey)}`,
      { signal: AbortSignal.timeout(SELFCLAW_FETCH_TIMEOUT_MS) }
    );
  } catch (networkError) {
    throw new Error(formatNetworkError(networkError));
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`SelfClaw returned non-JSON response (status ${res.status})`);
  }

  if (!res.ok && res.status !== 404) {
    console.error("[SelfClaw] agent status error:", res.status, data);
    throw new Error(data.error || data.message || `SelfClaw API error: ${res.status}`);
  }

  return data;
}

/**
 * Get all agents (swarm) owned by a specific human.
 */
export async function getHumanSwarm(
  humanId: string
): Promise<{ agents: AgentVerificationStatus[] }> {
  const res = await fetch(`${SELFCLAW_BASE_URL}/human/${humanId}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `SelfClaw API error: ${res.status}`);
  }

  return data;
}

// ─── Economy API (authenticated) ──────────────────────────────────────────────

export interface SignedPayload {
  agentPublicKey: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

async function authenticatedFetch(
  path: string,
  method: "POST" | "GET",
  signedPayload: SignedPayload,
  extraBody?: Record<string, unknown>
): Promise<unknown> {
  const body = { ...signedPayload, ...extraBody };
  const res = await fetch(`${SELFCLAW_BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(SELFCLAW_FETCH_TIMEOUT_MS),
  });
  const data = (await safeParseJson(res, path)) as Record<string, unknown>;
  if (!res.ok) {
    console.error(`[SelfClaw] ${path} error:`, res.status, data);
    throw new Error(
      (data.error as string) || (data.message as string) || `SelfClaw API error: ${res.status}`
    );
  }
  return data;
}

/**
 * Register agent's EVM wallet with SelfClaw.
 */
export async function createWallet(
  signedPayload: SignedPayload,
  walletAddress: string,
  chain: string = "celo"
): Promise<{ success?: boolean }> {
  return authenticatedFetch("/create-wallet", "POST", signedPayload, {
    walletAddress,
    chain,
  }) as Promise<{ success?: boolean }>;
}

/**
 * Get unsigned ERC20 deployment transaction.
 */
export async function deployToken(
  signedPayload: SignedPayload,
  name: string,
  symbol: string,
  initialSupply: string
): Promise<{ success?: boolean; unsignedTx?: Record<string, unknown> }> {
  return authenticatedFetch("/deploy-token", "POST", signedPayload, {
    name,
    symbol,
    initialSupply,
  }) as Promise<{ success?: boolean; unsignedTx?: Record<string, unknown> }>;
}

/**
 * Register a deployed token address with SelfClaw.
 */
export async function registerToken(
  signedPayload: SignedPayload,
  tokenAddress: string,
  txHash: string
): Promise<{ success?: boolean }> {
  return authenticatedFetch("/register-token", "POST", signedPayload, {
    tokenAddress,
    txHash,
  }) as Promise<{ success?: boolean }>;
}

/**
 * Register token with retries — SelfClaw may need time to verify on-chain.
 * Each retry MUST use a fresh signed payload (unique nonce). Pass a callback
 * that returns a new SignedPayload on each call.
 */
export async function registerTokenWithRetry(
  getSignedPayload: () => Promise<SignedPayload>,
  tokenAddress: string,
  txHash: string,
  maxRetries = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const signed = await getSignedPayload();
      await registerToken(signed, tokenAddress, txHash);
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Already registered — idempotent success
      if (/already registered|already exists|409|duplicate/i.test(msg)) {
        return;
      }
      const isVerifyError = /verify|confirmed|index/i.test(msg);
      const isNonceError = /nonce already used/i.test(msg);
      if (attempt < maxRetries && (isVerifyError || isNonceError)) {
        // SelfClaw indexer may need 3–5s to verify Celo tx; fresh nonce on each retry
        await new Promise((r) => setTimeout(r, 3000 * attempt));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Log revenue event.
 * @see https://selfclaw.ai — API: amount, token (CELO/USD/SELFCLAW), source, description?, txHash?, chain?
 */
export async function logRevenue(
  signedPayload: SignedPayload,
  amount: string,
  currency: string = "USD",
  source: string,
  description?: string,
  txHash?: string
): Promise<{ success?: boolean }> {
  return authenticatedFetch("/log-revenue", "POST", signedPayload, {
    amount,
    token: currency,
    currency,
    source,
    description,
    txHash,
    chain: "celo",
  }) as Promise<{ success?: boolean }>;
}

/**
 * Log cost event.
 * @see https://selfclaw.ai — API: costType (infra|compute|ai_credits|bandwidth|storage|other), amount, currency, description?
 */
export async function logCost(
  signedPayload: SignedPayload,
  amount: string,
  currency: string = "USD",
  costType: string,
  description?: string
): Promise<{ success?: boolean }> {
  return authenticatedFetch("/log-cost", "POST", signedPayload, {
    amount,
    currency,
    costType,
    description,
  }) as Promise<{ success?: boolean }>;
}

/**
 * Request SELFCLAW liquidity sponsorship (one per human).
 * Requires tokenAddress, tokenSymbol, tokenAmount (agent token amount in wei).
 * @see https://selfclaw.ai — API: tokenAddress, tokenSymbol, tokenAmount
 */
export async function requestSelfClawSponsorship(
  signedPayload: SignedPayload,
  tokenAddress: string,
  tokenAmount: string,
  tokenSymbol?: string
): Promise<{ success?: boolean; error?: string; sponsorWallet?: string; has?: string; needs?: string }> {
  const body = { ...signedPayload, tokenAddress, tokenAmount, ...(tokenSymbol && { tokenSymbol }) };
  const res = await fetch(`${SELFCLAW_BASE_URL}/request-selfclaw-sponsorship`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(SELFCLAW_FETCH_TIMEOUT_MS),
  });
  const data = (await safeParseJson(res, "/request-selfclaw-sponsorship")) as Record<string, unknown>;
  if (!res.ok) {
    const errMsg = String(data.error ?? data.message ?? `SelfClaw API error: ${res.status}`);
    return {
      success: false,
      error: errMsg,
      sponsorWallet: data.sponsorWallet as string | undefined,
      has: data.has as string | undefined,
      needs: data.needs as string | undefined,
    };
  }
  return { success: true };
}

/**
 * Get agent economics (public — use publicKey or humanId as identifier).
 */
export async function getAgentEconomics(
  identifier: string
): Promise<{
  totalRevenue?: string;
  totalCosts?: string;
  profitLoss?: string;
  runway?: { months: number; status: string };
}> {
  const res = await fetch(
    `${SELFCLAW_BASE_URL}/agent/${encodeURIComponent(identifier)}/economics`
  );
  const data = (await safeParseJson(res, "/agent/.../economics")) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(data.error ?? data.message ?? `SelfClaw API error: ${res.status}`));
  }
  return data;
}

/**
 * Get all tracked pools (public).
 */
export async function getPools(): Promise<{
  pools?: Array<{
    agentName?: string;
    tokenAddress?: string;
    price?: number;
    volume24h?: number;
    marketCap?: number;
  }>;
}> {
  const res = await fetch(`${SELFCLAW_BASE_URL}/pools`);
  const data = (await safeParseJson(res, "/pools")) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(data.error ?? data.message ?? `SelfClaw API error: ${res.status}`));
  }
  return data;
}

/**
 * Get sponsor wallet and SELFCLAW availability (public, no auth).
 * Used to check sponsor balance when agent has already sent tokens.
 */
export async function getSponsorshipInfo(): Promise<{
  sponsorWallet?: string;
  available?: string;
  sponsorableAmount?: string;
}> {
  const res = await fetch(`${SELFCLAW_BASE_URL}/selfclaw-sponsorship`);
  const data = (await safeParseJson(res, "/selfclaw-sponsorship")) as Record<string, unknown>;
  if (!res.ok) {
    return {};
  }
  return {
    sponsorWallet: data.sponsorWallet as string | undefined,
    available: data.available as string | undefined,
    sponsorableAmount: data.sponsorableAmount as string | undefined,
  };
}

/**
 * Check available SELFCLAW for sponsorship (authenticated).
 * Uses POST with signed payload since auth params are required.
 */
export async function getSelfClawSponsorship(
  signedPayload: SignedPayload
): Promise<{ available?: string }> {
  const res = await fetch(`${SELFCLAW_BASE_URL}/selfclaw-sponsorship`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signedPayload),
  });
  const data = (await safeParseJson(res, "/selfclaw-sponsorship")) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(data.error ?? data.message ?? `SelfClaw API error: ${res.status}`));
  }
  return data;
}

/**
 * Confirm ERC-8004 registration with SelfClaw after the agent has signed and submitted
 * the IdentityRegistry.register() transaction. SelfClaw parses the tx to get the tokenId
 * and updates verifiedBots.metadata.erc8004TokenId — required for sponsorship.
 * @see https://selfclaw.app/developers
 */
export async function confirmErc8004(
  signedPayload: SignedPayload,
  txHash: string
): Promise<{ success?: boolean; tokenId?: string; error?: string }> {
  const body = { ...signedPayload, txHash };
  const res = await fetch(`${SELFCLAW_BASE_URL}/confirm-erc8004`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await safeParseJson(res, "/confirm-erc8004")) as Record<string, unknown>;
  if (!res.ok) {
    return {
      success: false,
      error: String(data.error ?? data.message ?? `SelfClaw API error: ${res.status}`),
    };
  }
  return {
    success: true,
    tokenId: data.tokenId as string | undefined,
  };
}

export { signAuthenticatedPayload } from "./auth";

