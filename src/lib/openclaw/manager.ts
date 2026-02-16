/**
 * Agent Runtime Manager
 *
 * Core message processing pipeline for all channels:
 *   Web Chat / Telegram / OpenClaw Gateway / Cron
 *
 * Architecture:
 *   Channel → route (pairing/binding) → processMessage() → LLM → Skills → Transactions → Reply
 *
 * Two entry points:
 *   1. processMessage()        — raw pipeline, caller provides history (web chat, cron, direct)
 *   2. processChannelMessage() — session-aware wrapper, loads history from ChannelBinding
 */

import { prisma } from "@/lib/db";
import { loadSessionHistory, saveSessionMessages } from "./router";

// OpenRouter free model fallback order for rate-limit / provider-error retries.
// Only models that reliably support system prompts on the free tier.
// Gemma models excluded — Google AI Studio doesn't allow system instructions on free tier.
const OPENROUTER_FALLBACK_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "qwen/qwen3-4b:free",
  "deepseek/deepseek-r1-0528:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
];

/**
 * Process a chat message through an agent's OpenClaw runtime
 * This is the core function that routes messages to the LLM
 * 
 * Uses the agent owner's per-user API key (stored encrypted in DB).
 * For OpenRouter, if a free model is rate-limited (429), automatically
 * retries with alternative free models.
 */
export interface ProcessMessageOptions {
  /** When false, agent wallet is NOT used: no tx execution, no agent-wallet skills. For external/public users. */
  canUseAgentWallet?: boolean;
}

export async function processMessage(
  agentId: string,
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[] = [],
  options: ProcessMessageOptions = {}
): Promise<string> {
  const { canUseAgentWallet = true } = options;
  // Load agent config from DB
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      templateType: true,
      systemPrompt: true,
      llmProvider: true,
      llmModel: true,
      ownerId: true,
      agentWalletAddress: true,
      walletDerivationIndex: true,
    },
  });

  if (!agent) throw new Error(`Agent ${agentId} not found`);

  let systemPrompt = agent.systemPrompt || "You are a helpful AI agent on the Celo blockchain.";

  // Markdown formatting — chat UI renders markdown for better readability
  systemPrompt += `

[RESPONSE FORMAT — Markdown]
Your messages are displayed with markdown support. Format responses for clarity:
- Use **bold** for key values (amounts, addresses, status, important numbers).
- Use bullet lists (-) when listing multiple items.
- Use \`backticks\` for addresses (0x...), tx hashes, and command tags.
- Use _italic_ for secondary notes or caveats.
- Skill/tool outputs are already markdown-formatted — preserve that when summarizing.`;

  const llmProvider = agent.llmProvider;
  const llmModel = agent.llmModel;

  // ─── Inject transaction execution instructions ──────────────────────
  // Only when caller is admin (canUseAgentWallet): agent can execute from its wallet.
  // External users: AI prepares tx details, user signs with own wallet.
  if (agent.agentWalletAddress && canUseAgentWallet) {
    systemPrompt += `

[TRANSACTION EXECUTION — CRITICAL INSTRUCTIONS]
Your wallet address: ${agent.agentWalletAddress} (Celo Sepolia testnet, funded with real test tokens).

You MUST use the following command tags to execute REAL on-chain transactions.
DO NOT fabricate transaction hashes, block numbers, or receipts.
DO NOT pretend a transaction was executed — only the command tags below trigger real execution.

To send native CELO:
  [[SEND_CELO|<recipient_0x_address>|<amount>]]

To send ERC-20 tokens (cUSD, cEUR, cREAL):
  [[SEND_TOKEN|<currency>|<recipient_0x_address>|<amount>]]

To send an agent token (custom ERC20 by address, e.g. for sponsorship recovery):
  [[SEND_AGENT_TOKEN|<token_0x_address>|<recipient_0x_address>|<amount>]]

FEE ABSTRACTION:
- Gas fees are AUTOMATICALLY paid using the best available currency.
- If the wallet has CELO, gas is paid in CELO (default).
- If the wallet has NO CELO but has cUSD/cEUR/cREAL, gas is paid from that stablecoin.
- This means you can execute transactions even with 0 CELO, as long as stablecoins are available.
- The user does NOT need to do anything special — fee abstraction is automatic.

RULES:
- The command tag MUST appear in your response text exactly as shown (with double square brackets).
- The recipient MUST be a valid 0x address (42 hex characters). If the user gives an ENS or non-0x name, ask for the real address.
- After you include the tag, the system will execute the transaction and replace the tag with a real receipt (tx hash, block number, explorer link).
- Always ask the user to confirm before including the command tag for amounts over 10.
- Never reveal private keys.

Example — user says "send 2 CELO to 0xABC...123":
  Your response: "Sending 2 CELO now. [[SEND_CELO|0xABC...123|2]]"

Example — user says "send 5 cUSD to 0xDEF...456":
  Your response: "Sending 5 cUSD now. [[SEND_TOKEN|cUSD|0xDEF...456|5]]"
`;
  } else if (agent.agentWalletAddress && !canUseAgentWallet) {
    systemPrompt += `

[TRANSACTION CONTEXT — EXTERNAL USER]
The connected user is NOT the agent owner. You CANNOT execute transactions from the agent's wallet.
- Do NOT use [[SEND_CELO]], [[SEND_TOKEN]], or [[SEND_AGENT_TOKEN]] — they will not execute.
- Instead: prepare transaction details (recipient, amount, currency) and tell the user they can sign with their own wallet, or the agent owner must connect to execute.
- You can still provide quotes, check public data, and advise.`;
  } else {
    systemPrompt += `\n\n[WALLET CONTEXT] This agent does not have a wallet initialized yet. You CANNOT execute any transactions. Tell the user to click "Initialize Wallet" on the agent dashboard first.`;
  }

  // ─── Inject skill instructions ─────────────────────────────────────
  // When not admin: don't expose agent wallet to skills (no balance, no swaps from agent wallet)
  const { generateSkillPrompt, getSkillsForTemplate } = await import("@/lib/skills/registry");
  const effectiveAgentWallet = canUseAgentWallet ? agent.agentWalletAddress : null;
  const skillPrompt = generateSkillPrompt(
    agent.templateType || "custom",
    effectiveAgentWallet
  );
  if (skillPrompt) {
    systemPrompt += skillPrompt;
  }

  // Remind agent to mention SelfClaw when users ask about capabilities
  const skills = getSkillsForTemplate(agent.templateType || "custom");
  const hasSelfClawSkills = skills.some((s) =>
    s.id.startsWith("agent_tokens") || s.id.startsWith("selfclaw_") || s.id.startsWith("request_selfclaw") || s.id === "save_selfclaw_api_key"
  );
  if (hasSelfClawSkills) {
    systemPrompt += `\n\n[SELFCLAW — Agent Economy] Base URL: https://selfclaw.ai/api/selfclaw/v1

PUBLIC (no auth): GET /agent, GET /agent/{id}/economics, GET /pools — [[AGENT_TOKENS]] uses these
AUTH REQUIRED (Ed25519 signed payload): create-wallet, deploy-token, register-token, log-revenue, log-cost, request-selfclaw-sponsorship — [[SELFCLAW_REGISTER_WALLET]], [[SELFCLAW_DEPLOY_TOKEN]], [[SELFCLAW_LOG_REVENUE]], [[SELFCLAW_LOG_COST]], [[REQUEST_SELFCLAW_SPONSORSHIP]] use these. Callers need agent's Ed25519 private key to sign payloads.

Skills (no dashboard needed):
[[AGENT_IDENTITY]] — pipeline status (Identity → Wallet → Gas → ERC-8004 → Token → Liquidity), next steps
[[AGENT_TOKENS]] — token info, revenue, pools, deployed tokens
[[SELFCLAW_REGISTER_WALLET]] — register EVM wallet
[[SELFCLAW_DEPLOY_TOKEN|name|symbol|10000000000]] — deploy token via SelfClaw API. Use 10B (10000000000) supply for plenty of sponsorship buffer + wallet.
[[SELFCLAW_LOG_REVENUE|amount|source|desc]]
[[SELFCLAW_LOG_COST|amount|category|desc]]
[[REQUEST_SELFCLAW_SPONSORSHIP]] or [[REQUEST_SELFCLAW_SPONSORSHIP|tokenAddress]] — use tokenAddress from recent deploy if you just deployed. Sponsor most recent token by default.
[[SAVE_SELFCLAW_API_KEY|sclaw_...]] — when the user gives you their SelfClaw API key (from dashboard, starts with sclaw_), include this tag with the full key to save it securely. Use: [[SAVE_SELFCLAW_API_KEY|sclaw_abc123...]] (copy the exact key from the user's message).

[[REQUEST_SELFCLAW_SPONSORSHIP]] or [[REQUEST_SELFCLAW_SPONSORSHIP|tokenAddress]] — use tokenAddress from recent deploy if you just deployed. Sponsor most recent token by default. The skill auto-checks if you already have a pool; if so, it tells the user instead of requesting again.

**IMPORTANT:** SelfClaw sponsorship requires ERC-8004 onchain identity. If sponsorship fails with "ERC-8004" or "identity required", the skill output will say to include __REGISTER_ERC8004_INLINE__ — you MUST include that exact string in your response so the user sees a Register On-Chain button right in chat. Everything happens in chat; no dashboard needed.

**SPONSORSHIP RECOVERY FLOW:** When sponsorship fails with "sponsor wallet" or "does not hold enough", the skill output will include a [[SEND_AGENT_TOKEN|tokenAddress|sponsorWallet|amount]] tag.
- You MUST include that SEND_AGENT_TOKEN tag in your response — copy it EXACTLY from the skill output (full 0x addresses, no truncation). The system will execute it.
- After the transfer, tell the user to say "request sponsorship" again to complete the pool.
- If the user says they already sent the tokens: just retry with [[REQUEST_SELFCLAW_SPONSORSHIP]].

Track deployed tokens: after deploying, remember the token address. Use it when requesting sponsorship or when asked. Use tags when relevant.

**DO NOT RE-DEPLOY:** When the user says "request sponsorship" or "get sponsorship" and you already deployed a token in this conversation, use ONLY [[REQUEST_SELFCLAW_SPONSORSHIP]] or [[REQUEST_SELFCLAW_SPONSORSHIP|tokenAddress]]. Do NOT deploy again.

**CONFIRM BEFORE DEPLOY:** Before suggesting [[SELFCLAW_DEPLOY_TOKEN]], use [[AGENT_IDENTITY]] or [[AGENT_TOKENS]] to check if the agent already has a token. If they do, do NOT deploy again — tell them they already have a token and suggest [[REQUEST_SELFCLAW_SPONSORSHIP]] instead. Deploy only when the agent has no tokens.

**DEPLOY FOR SPONSORSHIP:** Use supply 10 billion (10000000000) for plenty of buffer (e.g. [[SELFCLAW_DEPLOY_TOKEN|Firebird|FIREBIRD|10000000000]]). Deploy ALWAYS uses SelfClaw API — never fabricate token addresses or tx hashes.

**DEPLOY + SPONSORSHIP FLOW:** When user asks to "deploy and sponsor" or "deploy and get it tradable":
1. Deploy first: [[SELFCLAW_DEPLOY_TOKEN|Name|SYMBOL|10000000000]]
2. Then immediately request sponsorship: [[REQUEST_SELFCLAW_SPONSORSHIP]]
3. If sponsorship fails with "sponsor wallet needs tokens" — the skill output will include [[SEND_AGENT_TOKEN|...]]. Include it in your response; the system will execute it. Then retry [[REQUEST_SELFCLAW_SPONSORSHIP]].
4. If send fails with "Insufficient balance" — the agent wallet may not hold the token (wrong deployer). Tell the user to redeploy with this agent. Or if the agent already sent tokens to the sponsor, just retry [[REQUEST_SELFCLAW_SPONSORSHIP]] — the sponsor may have them now.

**CRITICAL — NEVER FABRICATE:** You MUST NOT invent token addresses, transaction hashes, or block numbers. Only the skill output contains real data. If deploy or sponsorship fails, say it failed and show the actual error. Do NOT pretend success or make up 0x... addresses or tx hashes.`;
  }

  // Fetch the owner's API key — fallback to another provider if selected one has no key
  const { getUserApiKey, getFirstAvailableProviderAndKey } = await import("@/lib/api-keys");
  const { getDefaultModel } = await import("@/lib/llm");

  let apiKey: string;
  let effectiveProvider = llmProvider as import("@/lib/types").LLMProvider;
  let effectiveModel = llmModel;

  try {
    apiKey = await getUserApiKey(
      agent.ownerId,
      llmProvider as import("@/lib/types").LLMProvider
    );
  } catch (keyErr) {
    const msg = keyErr instanceof Error ? keyErr.message : "";
    if (!msg.includes("API key") && !msg.includes("configured")) {
      throw keyErr;
    }
    const fallback = await getFirstAvailableProviderAndKey(agent.ownerId);
    if (fallback) {
      apiKey = fallback.apiKey;
      effectiveProvider = fallback.provider;
      effectiveModel = getDefaultModel(fallback.provider);
      console.warn(
        `[OpenClaw] No key for ${llmProvider}; using fallback ${effectiveProvider}/${effectiveModel}`
      );
    } else {
      throw keyErr;
    }
  }

  // Build messages array
  const { chat } = await import("@/lib/llm");
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  // For OpenRouter free models: retry with fallback models on 429/400/502
  let response: Awaited<ReturnType<typeof chat>> | undefined;
  let usedModel = effectiveModel;

  const attemptChat = async (provider: typeof effectiveProvider, model: string, key: string) =>
    chat(messages, provider, model, key);

  try {
    if (effectiveProvider === "openrouter" && effectiveModel.endsWith(":free")) {
      // Build fallback list: requested model first, then others
      const fallbacks = [
        effectiveModel,
        ...OPENROUTER_FALLBACK_MODELS.filter((m) => m !== effectiveModel),
      ];

      let lastError: Error | null = null;

      for (const fallbackModel of fallbacks) {
        try {
          response = await attemptChat(effectiveProvider, fallbackModel, apiKey);
          usedModel = fallbackModel;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const msg = lastError.message;
          // Retry on 429, 400, 502 (Clerk auth, rate limit, provider errors)
          const isRetryable = msg.includes("429") || msg.includes("400") || msg.includes("502");
          if (!isRetryable) {
            throw lastError;
          }
          console.warn(`OpenRouter error on ${fallbackModel}, trying next model...`);
        }
      }

      if (!response) {
        throw lastError || new Error("All OpenRouter models failed. Please try again shortly.");
      }
    } else {
      // Non-OpenRouter or paid model — single attempt
      response = await attemptChat(effectiveProvider, effectiveModel, apiKey);
    }
  } catch (firstErr) {
    // When OpenRouter fails (502 Clerk auth, etc.), try Groq as fallback
    const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
    const isOpenRouterFailure = msg.includes("502") || msg.includes("Clerk") || msg.includes("OpenRouter");
    if (isOpenRouterFailure) {
      const fallback = await getFirstAvailableProviderAndKey(agent.ownerId);
      if (fallback && fallback.provider !== "openrouter") {
        const fallbackModel = getDefaultModel(fallback.provider);
        console.warn(`[OpenClaw] OpenRouter failed, falling back to ${fallback.provider}/${fallbackModel}`);
        try {
          response = await attemptChat(fallback.provider, fallbackModel, fallback.apiKey);
          effectiveProvider = fallback.provider;
          usedModel = fallbackModel;
        } catch {
          throw firstErr;
        }
      } else {
        throw firstErr;
      }
    } else {
      throw firstErr;
    }
  }

  if (!response) {
    throw new Error("Failed to get LLM response");
  }

  // Log the interaction
  await prisma.activityLog.create({
    data: {
      agentId,
      type: "action",
      message: `Processed message via ${effectiveProvider}/${usedModel}`,
      metadata: JSON.stringify({
        userMessage: userMessage.slice(0, 100),
        responseLength: response.content.length,
        usage: response.usage,
        fallbackUsed: usedModel !== effectiveModel ? usedModel : undefined,
      }),
    },
  });

  // ─── Skill Execution (BEFORE transactions) ────────────────────────────
  // Skills run first because SEND_AGENT_TOKEN is produced BY the REQUEST_SELFCLAW_SPONSORSHIP
  // skill when it fails (sponsor needs tokens). Transactions must run on the text that includes
  // that skill output, so they can execute SEND_AGENT_TOKEN.
  const { executeSkillCommands } = await import("@/lib/skills/registry");
  const skillResult = await executeSkillCommands(response.content, {
    agentId,
    walletDerivationIndex: canUseAgentWallet ? agent.walletDerivationIndex : null,
    agentWalletAddress: effectiveAgentWallet,
  });

  if (skillResult.executedCount > 0) {
    await prisma.activityLog.create({
      data: {
        agentId,
        type: "action",
        message: `Executed ${skillResult.executedCount} skill(s): ${agent.templateType} template`,
      },
    });
  }

  // ─── Transaction Execution ───────────────────────────────────────────
  // Run on skillResult.text so SEND_AGENT_TOKEN (from sponsorship failure output) gets executed.
  const { executeTransactionsInResponse } = await import("@/lib/blockchain/executor");
  const txResult = await executeTransactionsInResponse(
    skillResult.text,
    agentId,
    canUseAgentWallet ? agent.walletDerivationIndex : null,
    canUseAgentWallet ? undefined : "Transaction execution requires the agent owner to be connected. Only the agent owner can sign transactions from this agent's wallet. You can prepare the transaction and sign it with your own wallet instead."
  );

  if (txResult.executedCount > 0) {
    await prisma.activityLog.create({
      data: {
        agentId,
        type: "action",
        message: `Executed ${txResult.executedCount} on-chain transaction(s) from chat`,
      },
    });
  }

  return txResult.text;
}

// ─── Session-Aware Channel Processing ──────────────────────────────────────

/**
 * Process a message with automatic session history management.
 * Used by the OpenClaw webhook and Telegram webhook.
 *
 * - Loads conversation history from the ChannelBinding's SessionMessages
 * - Runs the full pipeline (LLM → Skills → Transactions)
 * - Saves the user message + assistant reply back to session
 *
 * @param agentId     - Agent to process with
 * @param bindingId   - ChannelBinding ID (null for web chat / cron)
 * @param userMessage - The user's message text
 * @param metadata    - Optional metadata to store with the session message
 */
export async function processChannelMessage(
  agentId: string,
  bindingId: string | null,
  userMessage: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  // Load session history (empty if no binding)
  let history: { role: "user" | "assistant"; content: string }[] = [];

  if (bindingId) {
    history = await loadSessionHistory(bindingId, 20);
  }

  // Run the main pipeline — processChannelMessage is only used for owner sessions
  const response = await processMessage(agentId, userMessage, history, {
    canUseAgentWallet: true,
  });

  // Persist the exchange
  if (bindingId) {
    await saveSessionMessages(bindingId, userMessage, response, metadata);
  }

  return response;
}

