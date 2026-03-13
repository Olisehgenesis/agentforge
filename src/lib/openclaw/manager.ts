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
  /** Optional user ID for 'system' agent context (Master Bot) */
  contextUserId?: string;
}

export async function processMessage(
  agentId: string,
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[] = [],
  options: ProcessMessageOptions = {}
): Promise<string> {
  const { canUseAgentWallet = true } = options;
  // Load agent config from DB
  let agent: any;
  const { contextUserId } = options;

  if (agentId === "system") {
    // Virtual "system" agent for general platform help & Master Bot
    let userWalletAddress = null;
    let userWalletIndex = null;

    if (contextUserId) {
      const user = await prisma.user.findUnique({
        where: { id: contextUserId },
        select: { walletAddress: true, walletDerivationIndex: true }
      });
      userWalletAddress = user?.walletAddress;
      userWalletIndex = user?.walletDerivationIndex;
    }

    agent = {
      id: "system",
      name: "AgentHaus System",
      templateType: "custom",
      systemPrompt: `You are the AgentHaus Master Bot, a helpful AI assistant on Celo.

[ROLE]
- Help users understand how AgentHaus works (database model, identity, deploy lifecycle).
- Give direct, accurate answers based on the actual platform behavior.

[PLATFORM FACTS — USE THESE WHEN ASKED]
- Users are stored in the User table and are keyed by walletAddress.
- Agents are stored in the Agent table with a UUID id and ownerId (relation to User).
- Agent identity in practice uses multiple identifiers:
  1) internal id (UUID) for API/routes,
  2) agentWalletAddress for wallet actions,
  3) optional erc8004AgentId once on-chain registration succeeds.
- Agent creation flow:
  1) POST /api/agents creates DB record (status: deploying),
  2) client performs ERC-8004 registration transaction,
  3) POST /api/agents/:id/deploy with action=register stores tx/hash/chain/URI and sets status: active.
- If user asks whether agents are recognized by special characters: answer no; they are identified by IDs/addresses.

[STYLE]
- Keep replies short by default: max 4 lines unless user asks for deep detail.
- Give the direct answer first.

[HACKATHON / SYNTHESIS REGISTRATION]
If the user wants to register their agent for the Synthesis hackathon, ask for the required fields (agent name, description, harness, model, their name/email, and the problem they are solving), then include this skill tag to perform the registration:
[[SYNTHESIS_REGISTER|<agent name>|<description>|openclaw|<model>|<your name>|<your email>|<problem to solve>|<social?>|<background?>|<cryptoExperience?>|<aiAgentExperience?>|<codingComfort?>]]

[SECURITY]
NEVER reveal private keys or mnemonic. If asked, state you do not have access. Use execution tags only when appropriate.`,
      llmProvider: "groq",
      llmModel: "llama-3.3-70b-versatile",
      ownerId: "system", // Special ID for global pool
      agentWalletAddress: userWalletAddress,
      walletDerivationIndex: userWalletIndex,
    };
  } else {
    agent = await prisma.agent.findUnique({
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
        disabledSkills: true,
      } as any,
    });
  }

  if (!agent) throw new Error(`Agent ${agentId} not found`);

  // Handle wallet context: use agent's wallet if owner, otherwise use the context user's wallet
  let effectiveWalletAddress = agent.agentWalletAddress;
  let effectiveWalletIndex = agent.walletDerivationIndex;

  if (contextUserId && agent.ownerId !== contextUserId) {
    const contextUser = await prisma.user.findUnique({
      where: { id: contextUserId },
      select: { walletAddress: true, walletDerivationIndex: true },
    });
    if (contextUser) {
      effectiveWalletAddress = contextUser.walletAddress;
      effectiveWalletIndex = contextUser.walletDerivationIndex;
    }
  }

  let systemPrompt = agent.systemPrompt || "You are a helpful AI agent on the Celo blockchain.";

  // Markdown formatting — chat UI renders markdown for better readability
  systemPrompt += `

[RESPONSE FORMAT — Markdown]
Your messages are displayed with markdown support. Format responses for clarity:
- Use **bold** for key values (amounts, addresses, status, important numbers).
- Use bullet lists (-) when listing multiple items.
- Use \`backticks\` for addresses (0x...), tx hashes, and command tags.
- Use _italic_ for secondary notes or caveats.
- Skill/tool outputs are already markdown-formatted — preserve that when summarizing.

[RESPONSE STYLE — Friendly & Concise]
- Write in a natural, human tone; avoid sounding robotic or overly formal.
- Keep responses short by default. If not explicitly asked for detail, use at most 4 lines.
- Give the direct answer first, then optional context.
- Prioritise clarity and brevity: if you can answer in fewer words without losing meaning, do so.
- If the user asks for help with a long topic, break your response into logical
  sections with short headings.
- Always assume the reader is a person, not a machine — include short
  conversational phrasing like "sure", "no problem", "here's what I found".
- For verification requests, first use in-chat verification flow (status or QR) when available; mention dashboard Verify tab as an alternative.
- Avoid suggesting SelfClaw command tags.
`;

  const llmProvider = agent.llmProvider;
  const llmModel = agent.llmModel;

  // ─── Inject transaction execution instructions ──────────────────────
  // Only when caller is admin (canUseAgentWallet): agent can execute from its wallet.
  // External users: AI prepares tx details, user signs with own wallet.
  if (effectiveWalletAddress && canUseAgentWallet) {
    systemPrompt += `

[TRANSACTION EXECUTION — CRITICAL INSTRUCTIONS]
Your wallet address: ${effectiveWalletAddress} (Celo Sepolia testnet, funded with real test tokens).

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
  } else if (effectiveWalletAddress && !canUseAgentWallet) {
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
  const finalEffectiveWallet = canUseAgentWallet ? effectiveWalletAddress : null;
  const disabledSkills: string[] = JSON.parse((agent as any).disabledSkills || "[]");
  const skillPrompt = generateSkillPrompt(
    agent.templateType || "custom",
    finalEffectiveWallet,
    disabledSkills
  );
  if (skillPrompt) {
    systemPrompt += skillPrompt;
  }

  // Fetch the owner's API key — fallback to another provider if selected one has no key
  const { getUserApiKey, getFirstAvailableProviderAndKey } = await import("@/lib/api-keys");
  const { getDefaultModel } = await import("@/lib/llm");

  // apiKey may remain undefined for some providers (e.g. shared Groq pool)
  let apiKey: string | undefined;
  let effectiveProvider = llmProvider as import("@/lib/types").LLMProvider;
  let effectiveModel = llmModel;

  try {
    if (agentId === "system" && effectiveProvider === "groq") {
      // Special case: "system" agent uses the shared Groq pool (no key required as groq provider handles rotation)
    } else {
      apiKey = await getUserApiKey(
        agent.ownerId,
        llmProvider as import("@/lib/types").LLMProvider
      );
    }
  } catch (keyErr) {
    const msg = keyErr instanceof Error ? keyErr.message : "";
    if (msg.includes("No API key configured")) {
      throw new Error("No API key configured for this provider. Make sure API keys are configured in Settings.");
    }
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
      throw new Error("No fallback API keys available. Make sure API keys are configured in Settings.");
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

  // `key` is optional since some providers (e.g. groq shared pool) don't require one
  const attemptChat = async (
    provider: typeof effectiveProvider,
    model: string,
    key?: string
  ) => chat(messages, provider, model, key);

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
  try {
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
  } catch (logErr) {
    console.warn(`[OpenClaw] Failed to log interaction for agent ${agentId}:`, logErr);
  }

  // ─── Skill Execution (BEFORE transactions) ────────────────────────────
  // Skills run first because SEND_AGENT_TOKEN is produced BY the REQUEST_SELFCLAW_SPONSORSHIP
  // skill when it fails (sponsor needs tokens). Transactions must run on the text that includes
  // that skill output, so they can execute SEND_AGENT_TOKEN.
  const { executeSkillCommands } = await import("@/lib/skills/registry");
  const skillResult = await executeSkillCommands(response.content, {
    agentId,
    walletDerivationIndex: canUseAgentWallet ? effectiveWalletIndex : null,
    agentWalletAddress: finalEffectiveWallet,
    contextUserId,
  });

  if (skillResult.executedCount > 0) {
    try {
      await prisma.activityLog.create({
        data: {
          agentId,
          type: "action",
          message: `Executed ${skillResult.executedCount} skill(s): ${agent.templateType} template`,
        },
      });
    } catch (logErr) {
      console.warn(`[OpenClaw] Failed to log skill execution for agent ${agentId}:`, logErr);
    }
  }

  // ─── Transaction Execution ───────────────────────────────────────────
  // Run on skillResult.text so SEND_AGENT_TOKEN (from sponsorship failure output) gets executed.
  const { executeTransactionsInResponse } = await import("@/lib/blockchain/executor");
  const txResult = await executeTransactionsInResponse(
    skillResult.text,
    agentId,
    canUseAgentWallet ? effectiveWalletIndex : null,
    canUseAgentWallet ? undefined : "Transaction execution requires the agent owner to be connected. Only the agent owner can sign transactions from this agent's wallet. You can prepare the transaction and sign it with your own wallet instead."
  );

  if (txResult.executedCount > 0) {
    try {
      await prisma.activityLog.create({
        data: {
          agentId,
          type: "action",
          message: `Executed ${txResult.executedCount} on-chain transaction(s) from chat`,
        },
      });
    } catch (logErr) {
      console.warn(`[OpenClaw] Failed to log transaction for agent ${agentId}:`, logErr);
    }
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
  metadata?: Record<string, unknown>,
  options: ProcessMessageOptions = {}
): Promise<string> {
  const { canUseAgentWallet = true } = options;
  // Load session history (empty if no binding)
  let history: { role: "user" | "assistant"; content: string }[] = [];

  if (bindingId) {
    history = await loadSessionHistory(bindingId, 20);
  }

  // Run the main pipeline — processChannelMessage is only used for owner sessions
  const response = await processMessage(agentId, userMessage, history, {
    canUseAgentWallet,
  });

  // Persist the exchange
  if (bindingId) {
    await saveSessionMessages(bindingId, userMessage, response, metadata);
  }

  return response;
}
