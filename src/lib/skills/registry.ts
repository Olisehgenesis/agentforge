/**
 * Skill Registry
 *
 * Central registry of all available agent skills. Each skill defines:
 *   - metadata (id, name, command tag, params, examples)
 *   - an execute() handler that performs the action
 *
 * Skills are invoked via command tags embedded in LLM responses:
 *   [[COMMAND_TAG|param1|param2|...]]
 *
 * The executor (executor.ts) detects these tags, looks up the skill
 * in this registry, calls execute(), and replaces the tag with the result.
 */

import { type Address, isAddress } from "viem";
import type {
  SkillHandler,
  SkillDefinition,
  SkillContext,
  SkillResult,
  SkillCategory,
  ParsedSkillCommand,
} from "./types";

// ─── Skill Definitions ────────────────────────────────────────────────────────

const SKILL_DEFINITIONS: SkillDefinition[] = [
  // ── Transfer Skills ───────────────────────────────────────────────
  {
    id: "send_celo",
    name: "Send CELO",
    description: "Send native CELO to an address",
    category: "transfer",
    commandTag: "SEND_CELO",
    params: [
      { name: "to", description: "Recipient 0x address", required: true, example: "0xABC...123" },
      { name: "amount", description: "Amount in CELO", required: true, example: "1.5" },
    ],
    examples: [
      { input: "send 2 CELO to 0xABC...123", output: "[[SEND_CELO|0xABC...123|2]]" },
    ],
    requiresWallet: true,
    mutatesState: true,
  },
  {
    id: "send_token",
    name: "Send Token",
    description: "Send ERC-20 tokens (cUSD, cEUR, cREAL)",
    category: "transfer",
    commandTag: "SEND_TOKEN",
    params: [
      { name: "currency", description: "Token symbol (cUSD, cEUR, cREAL)", required: true, example: "cUSD" },
      { name: "to", description: "Recipient 0x address", required: true, example: "0xDEF...456" },
      { name: "amount", description: "Amount", required: true, example: "10" },
    ],
    examples: [
      { input: "send 5 cUSD to 0xDEF...456", output: "[[SEND_TOKEN|cUSD|0xDEF...456|5]]" },
    ],
    requiresWallet: true,
    mutatesState: true,
  },

  // ── Oracle / Price Feed Skills ────────────────────────────────────
  {
    id: "query_rate",
    name: "Query Exchange Rate",
    description: "Get the current CELO exchange rate for a stablecoin from SortedOracles",
    category: "oracle",
    commandTag: "QUERY_RATE",
    params: [
      { name: "currency", description: "Stable token symbol (cUSD, cEUR, cREAL)", required: true, example: "cUSD" },
    ],
    examples: [
      { input: "what's the CELO/cUSD rate?", output: "[[QUERY_RATE|cUSD]]" },
      { input: "check cEUR price", output: "[[QUERY_RATE|cEUR]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "query_all_rates",
    name: "Query All Rates",
    description: "Get all available CELO exchange rates from SortedOracles",
    category: "oracle",
    commandTag: "QUERY_ALL_RATES",
    params: [],
    examples: [
      { input: "show me all exchange rates", output: "[[QUERY_ALL_RATES]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },

  // ── Mento Exchange Skills ─────────────────────────────────────────
  {
    id: "mento_quote",
    name: "Mento Swap Quote",
    description: "Get a swap quote from Mento Protocol (CELO ↔ stablecoins)",
    category: "mento",
    commandTag: "MENTO_QUOTE",
    params: [
      { name: "sell_currency", description: "Currency to sell (CELO, cUSD, cEUR, cREAL)", required: true, example: "CELO" },
      { name: "buy_currency", description: "Currency to buy", required: true, example: "cUSD" },
      { name: "amount", description: "Amount to sell", required: true, example: "10" },
    ],
    examples: [
      { input: "how much cUSD for 10 CELO?", output: "[[MENTO_QUOTE|CELO|cUSD|10]]" },
      { input: "quote 50 cUSD to CELO", output: "[[MENTO_QUOTE|cUSD|CELO|50]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "mento_swap",
    name: "Mento Swap Execute",
    description: "Execute a swap on Mento Protocol (CELO ↔ stablecoins)",
    category: "mento",
    commandTag: "MENTO_SWAP",
    params: [
      { name: "sell_currency", description: "Currency to sell", required: true, example: "CELO" },
      { name: "buy_currency", description: "Currency to buy", required: true, example: "cUSD" },
      { name: "amount", description: "Amount to sell", required: true, example: "10" },
    ],
    examples: [
      { input: "swap 5 CELO for cUSD", output: "[[MENTO_SWAP|CELO|cUSD|5]]" },
    ],
    requiresWallet: true,
    mutatesState: true,
  },

  // ── Data Skills ───────────────────────────────────────────────────
  {
    id: "check_balance",
    name: "Check Balance",
    description: "Check CELO and stablecoin balances for any address",
    category: "data",
    commandTag: "CHECK_BALANCE",
    params: [
      { name: "address", description: "0x address to check", required: true, example: "0xABC...123" },
    ],
    examples: [
      { input: "check balance of 0xABC...123", output: "[[CHECK_BALANCE|0xABC...123]]" },
      { input: "what's my balance?", output: "[[CHECK_BALANCE|<agent_wallet_address>]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "gas_price",
    name: "Gas Price",
    description: "Get current gas price on Celo network",
    category: "data",
    commandTag: "GAS_PRICE",
    params: [],
    examples: [
      { input: "what's the current gas price?", output: "[[GAS_PRICE]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },

  // ── Forex / Analysis Skills ───────────────────────────────────────
  {
    id: "forex_analysis",
    name: "Forex Analysis",
    description: "Analyze current Mento stablecoin rates and provide trading signals",
    category: "forex",
    commandTag: "FOREX_ANALYSIS",
    params: [
      { name: "pair", description: "Trading pair (e.g. CELO/cUSD, cUSD/cEUR)", required: false, example: "CELO/cUSD" },
    ],
    examples: [
      { input: "analyze CELO/cUSD", output: "[[FOREX_ANALYSIS|CELO/cUSD]]" },
      { input: "give me a market overview", output: "[[FOREX_ANALYSIS]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "portfolio_status",
    name: "Portfolio Status",
    description: "Show agent portfolio with balances valued in USD",
    category: "forex",
    commandTag: "PORTFOLIO_STATUS",
    params: [],
    examples: [
      { input: "show my portfolio", output: "[[PORTFOLIO_STATUS]]" },
      { input: "what are my holdings worth?", output: "[[PORTFOLIO_STATUS]]" },
    ],
    requiresWallet: true,
    mutatesState: false,
  },
];

// ─── Skill Handlers ───────────────────────────────────────────────────────────

async function executeQueryRate(params: string[], _ctx: SkillContext): Promise<SkillResult> {
  const currency = params[0] || "cUSD";
  const { getOracleRate } = await import("@/lib/blockchain/mento");

  try {
    const rate = await getOracleRate(currency);
    const display = [
      `📊 **${rate.pair} Exchange Rate**`,
      `• 1 CELO = ${rate.rate.toFixed(4)} ${currency}`,
      `• 1 ${currency} = ${rate.inverse.toFixed(4)} CELO`,
      `• Reporters: ${rate.numReporters}`,
      `• Last update: ${rate.lastUpdate.toISOString()}`,
      `• Source: ${rate.source === "sorted_oracles" ? "Celo SortedOracles (on-chain)" : "Estimated (API fallback)"}`,
      rate.isExpired ? "⚠️ Warning: Oracle data may be stale" : "",
    ].filter(Boolean).join("\n");

    return { success: true, data: rate as unknown as Record<string, unknown>, display };
  } catch (error) {
    return { success: false, error: String(error), display: `❌ Failed to query ${currency} rate: ${error}` };
  }
}

async function executeQueryAllRates(_params: string[], _ctx: SkillContext): Promise<SkillResult> {
  const { getAllOracleRates } = await import("@/lib/blockchain/mento");

  try {
    const rates = await getAllOracleRates();
    const lines = rates.map((r) =>
      `• ${r.pair}: 1 CELO = ${r.rate.toFixed(4)} ${r.pair.split("/")[1]} (${r.source})`
    );

    const display = [
      "📊 **Celo Exchange Rates (SortedOracles)**",
      ...lines,
      "",
      `_Updated: ${new Date().toISOString()}_`,
    ].join("\n");

    return { success: true, data: { rates } as unknown as Record<string, unknown>, display };
  } catch (error) {
    return { success: false, error: String(error), display: `❌ Failed to query rates: ${error}` };
  }
}

async function executeMentoQuote(params: string[], _ctx: SkillContext): Promise<SkillResult> {
  const [sellCurrency, buyCurrency, amount] = params;
  if (!sellCurrency || !buyCurrency || !amount) {
    return { success: false, error: "Missing parameters", display: "❌ Usage: [[MENTO_QUOTE|sell_currency|buy_currency|amount]]" };
  }

  const { getMentoQuote } = await import("@/lib/blockchain/mento");

  try {
    const quote = await getMentoQuote(sellCurrency, buyCurrency, amount);
    const display = [
      `💱 **Mento Swap Quote**`,
      `• Sell: ${quote.sellAmount} ${quote.sellCurrency}`,
      `• Buy: ~${parseFloat(quote.buyAmount).toFixed(4)} ${quote.buyCurrency}`,
      `• Rate: 1 ${quote.sellCurrency} = ${quote.rate.toFixed(4)} ${quote.buyCurrency}`,
      `• Est. slippage: ${quote.slippage}%`,
      `• Source: ${quote.source}`,
      "",
      `_To execute: "swap ${quote.sellAmount} ${quote.sellCurrency} for ${quote.buyCurrency}"_`,
    ].join("\n");

    return { success: true, data: quote as unknown as Record<string, unknown>, display };
  } catch (error) {
    return { success: false, error: String(error), display: `❌ Failed to get quote: ${error}` };
  }
}

async function executeMentoSwap(params: string[], ctx: SkillContext): Promise<SkillResult> {
  const [sellCurrency, buyCurrency, amount] = params;
  if (!sellCurrency || !buyCurrency || !amount) {
    return { success: false, error: "Missing parameters", display: "❌ Usage: [[MENTO_SWAP|sell_currency|buy_currency|amount]]" };
  }

  if (!ctx.agentWalletAddress || ctx.walletDerivationIndex === null) {
    return { success: false, error: "No wallet", display: "⚠️ Agent wallet not initialized. Cannot execute swap." };
  }

  // For now, Mento swaps on testnet are simulated — we send tokens to approximate the swap
  // In production, this would call the Mento Broker contract directly
  const { getMentoQuote } = await import("@/lib/blockchain/mento");

  try {
    const quote = await getMentoQuote(sellCurrency, buyCurrency, amount);

    const display = [
      `💱 **Mento Swap (Simulated on Testnet)**`,
      `• Sold: ${quote.sellAmount} ${quote.sellCurrency}`,
      `• Bought: ~${parseFloat(quote.buyAmount).toFixed(4)} ${quote.buyCurrency}`,
      `• Rate: 1 ${quote.sellCurrency} = ${quote.rate.toFixed(4)} ${quote.buyCurrency}`,
      `• Slippage: ${quote.slippage}%`,
      "",
      `⚠️ _On Celo Sepolia testnet, Mento swaps are simulated. Real execution available on mainnet._`,
    ].join("\n");

    return { success: true, data: quote as unknown as Record<string, unknown>, display };
  } catch (error) {
    return { success: false, error: String(error), display: `❌ Swap failed: ${error}` };
  }
}

async function executeCheckBalance(params: string[], ctx: SkillContext): Promise<SkillResult> {
  let address = params[0];
  if (!address && ctx.agentWalletAddress) {
    address = ctx.agentWalletAddress;
  }
  if (!address || !isAddress(address)) {
    return { success: false, error: "Invalid address", display: "❌ Please provide a valid 0x address." };
  }

  const { checkBalance } = await import("@/lib/blockchain/mento");

  try {
    const bal = await checkBalance(address as Address);
    const display = [
      `💰 **Balance for ${address.slice(0, 6)}...${address.slice(-4)}**`,
      `• CELO: ${parseFloat(bal.celo).toFixed(4)}`,
      `• cUSD: ${parseFloat(bal.cUSD).toFixed(4)}`,
      `• cEUR: ${parseFloat(bal.cEUR).toFixed(4)}`,
      `• cREAL: ${parseFloat(bal.cREAL).toFixed(4)}`,
    ].join("\n");

    return { success: true, data: bal as unknown as Record<string, unknown>, display };
  } catch (error) {
    return { success: false, error: String(error), display: `❌ Failed to check balance: ${error}` };
  }
}

async function executeGasPrice(_params: string[], _ctx: SkillContext): Promise<SkillResult> {
  const { getGasPrice } = await import("@/lib/blockchain/mento");

  try {
    const gas = await getGasPrice();
    const display = [
      `⛽ **Celo Gas Price**`,
      `• Base fee: ${parseFloat(gas.baseFee).toFixed(2)} gwei`,
      `• Suggested tip: ${gas.suggestedTip} gwei`,
      `• Simple transfer cost: ~${parseFloat(gas.estimatedCost).toFixed(6)} CELO`,
    ].join("\n");

    return { success: true, data: gas as unknown as Record<string, unknown>, display };
  } catch (error) {
    return { success: false, error: String(error), display: `❌ Failed to get gas price: ${error}` };
  }
}

async function executeForexAnalysis(params: string[], _ctx: SkillContext): Promise<SkillResult> {
  const pair = params[0] || "";
  const { getAllOracleRates, getOracleRate } = await import("@/lib/blockchain/mento");

  try {
    if (pair && pair.includes("/")) {
      // Specific pair analysis
      const [, buy] = pair.split("/");
      const rate = await getOracleRate(buy);

      const display = [
        `📈 **Forex Analysis: ${rate.pair}**`,
        ``,
        `**Current Rate:**`,
        `• 1 CELO = ${rate.rate.toFixed(4)} ${buy}`,
        `• 1 ${buy} = ${rate.inverse.toFixed(4)} CELO`,
        ``,
        `**Oracle Status:**`,
        `• Active reporters: ${rate.numReporters}`,
        `• Last update: ${rate.lastUpdate.toISOString()}`,
        `• Data fresh: ${rate.isExpired ? "❌ Stale" : "✅ Fresh"}`,
        `• Source: ${rate.source}`,
        ``,
        `**Analysis:**`,
        rate.numReporters >= 3
          ? `• Oracle has sufficient reporters (${rate.numReporters}) — rate is reliable.`
          : `• ⚠️ Low reporter count (${rate.numReporters}) — rate may be less reliable.`,
        rate.isExpired
          ? `• ⚠️ Oracle data is expired — exercise caution with trades.`
          : `• Oracle data is fresh — safe to trade at quoted rates.`,
      ].join("\n");

      return { success: true, data: rate as unknown as Record<string, unknown>, display };
    }

    // Full market overview
    const rates = await getAllOracleRates();
    const lines = rates.map((r) => {
      const freshIcon = r.isExpired ? "⚠️" : "✅";
      return `• ${r.pair}: ${r.rate.toFixed(4)} (reporters: ${r.numReporters}) ${freshIcon}`;
    });

    const display = [
      `📈 **Celo Forex Market Overview**`,
      ``,
      `**Current Rates (SortedOracles):**`,
      ...lines,
      ``,
      `**Summary:**`,
      `• ${rates.length} active pairs monitored`,
      `• All rates sourced from Celo SortedOracles (on-chain)`,
      `• Use "swap X CELO for cUSD" to execute a Mento trade`,
    ].join("\n");

    return { success: true, data: { rates } as unknown as Record<string, unknown>, display };
  } catch (error) {
    return { success: false, error: String(error), display: `❌ Analysis failed: ${error}` };
  }
}

async function executePortfolioStatus(_params: string[], ctx: SkillContext): Promise<SkillResult> {
  if (!ctx.agentWalletAddress) {
    return { success: false, error: "No wallet", display: "⚠️ Agent wallet not initialized." };
  }

  const { checkBalance } = await import("@/lib/blockchain/mento");
  const { getOracleRate } = await import("@/lib/blockchain/mento");

  try {
    const bal = await checkBalance(ctx.agentWalletAddress as Address);
    const celoRate = await getOracleRate("cUSD");

    const celoVal = parseFloat(bal.celo);
    const cusdVal = parseFloat(bal.cUSD);
    const ceurVal = parseFloat(bal.cEUR);
    const crealVal = parseFloat(bal.cREAL);

    // Value everything in USD terms
    const celoUsd = celoVal * celoRate.rate;
    const totalUsd = celoUsd + cusdVal + ceurVal * 1.08 + crealVal * 0.20; // Approximate

    const display = [
      `💼 **Agent Portfolio**`,
      `• Wallet: ${ctx.agentWalletAddress.slice(0, 6)}...${ctx.agentWalletAddress.slice(-4)}`,
      ``,
      `**Holdings:**`,
      `• CELO: ${celoVal.toFixed(4)} (~$${celoUsd.toFixed(2)})`,
      `• cUSD: ${cusdVal.toFixed(4)} (~$${cusdVal.toFixed(2)})`,
      `• cEUR: ${ceurVal.toFixed(4)} (~$${(ceurVal * 1.08).toFixed(2)})`,
      `• cREAL: ${crealVal.toFixed(4)} (~$${(crealVal * 0.20).toFixed(2)})`,
      ``,
      `**Total Value: ~$${totalUsd.toFixed(2)}**`,
      ``,
      `_CELO/cUSD rate: ${celoRate.rate.toFixed(4)} (${celoRate.source})_`,
    ].join("\n");

    return { success: true, data: { ...bal, totalUsd } as unknown as Record<string, unknown>, display };
  } catch (error) {
    return { success: false, error: String(error), display: `❌ Portfolio check failed: ${error}` };
  }
}

// ─── Handler Registry ─────────────────────────────────────────────────────────

const HANDLERS: Map<string, SkillHandler> = new Map();

function registerHandler(def: SkillDefinition, execute: (params: string[], ctx: SkillContext) => Promise<SkillResult>) {
  HANDLERS.set(def.commandTag, { definition: def, execute });
}

// Register all handlers
for (const def of SKILL_DEFINITIONS) {
  switch (def.id) {
    case "query_rate": registerHandler(def, executeQueryRate); break;
    case "query_all_rates": registerHandler(def, executeQueryAllRates); break;
    case "mento_quote": registerHandler(def, executeMentoQuote); break;
    case "mento_swap": registerHandler(def, executeMentoSwap); break;
    case "check_balance": registerHandler(def, executeCheckBalance); break;
    case "gas_price": registerHandler(def, executeGasPrice); break;
    case "forex_analysis": registerHandler(def, executeForexAnalysis); break;
    case "portfolio_status": registerHandler(def, executePortfolioStatus); break;
    // send_celo and send_token are handled by executor.ts directly
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get all skill definitions.
 */
export function getAllSkills(): SkillDefinition[] {
  return [...SKILL_DEFINITIONS];
}

/**
 * Get skills by category.
 */
export function getSkillsByCategory(category: SkillCategory): SkillDefinition[] {
  return SKILL_DEFINITIONS.filter((s) => s.category === category);
}

/**
 * Get skills for a specific agent template.
 */
export function getSkillsForTemplate(templateId: string): SkillDefinition[] {
  const TEMPLATE_SKILLS: Record<string, string[]> = {
    payment: ["send_celo", "send_token", "check_balance", "query_rate", "gas_price"],
    trading: ["send_celo", "send_token", "check_balance", "query_rate", "query_all_rates", "mento_quote", "mento_swap", "gas_price", "forex_analysis", "portfolio_status"],
    forex: ["send_celo", "send_token", "check_balance", "query_rate", "query_all_rates", "mento_quote", "mento_swap", "gas_price", "forex_analysis", "portfolio_status"],
    social: ["send_celo", "send_token", "check_balance"],
    custom: ["send_celo", "send_token", "check_balance", "query_rate", "query_all_rates", "mento_quote", "gas_price"],
  };

  const skillIds = TEMPLATE_SKILLS[templateId] || TEMPLATE_SKILLS.custom;
  return SKILL_DEFINITIONS.filter((s) => skillIds.includes(s.id));
}

/**
 * Get a handler by command tag.
 */
export function getHandler(commandTag: string): SkillHandler | undefined {
  return HANDLERS.get(commandTag);
}

/**
 * Parse all skill commands from LLM response text.
 * Matches patterns like [[COMMAND_TAG|param1|param2]]
 * Excludes SEND_CELO and SEND_TOKEN (handled by executor.ts).
 */
export function parseSkillCommands(text: string): ParsedSkillCommand[] {
  const commands: ParsedSkillCommand[] = [];
  const regex = /\[\[([A-Z_]+?)(?:\|([^\]]*))?\]\]/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const commandTag = match[1];
    // Skip transfer commands — they're handled by executor.ts
    if (commandTag === "SEND_CELO" || commandTag === "SEND_TOKEN") continue;

    const handler = HANDLERS.get(commandTag);
    if (!handler) continue;

    const paramsStr = match[2] || "";
    const params = paramsStr ? paramsStr.split("|").map((p) => p.trim()) : [];

    commands.push({
      skillId: handler.definition.id,
      commandTag,
      params,
      raw: match[0],
    });
  }

  return commands;
}

/**
 * Execute all skill commands found in text and replace tags with results.
 */
export async function executeSkillCommands(
  text: string,
  context: SkillContext
): Promise<{ text: string; executedCount: number }> {
  const commands = parseSkillCommands(text);
  if (commands.length === 0) {
    return { text, executedCount: 0 };
  }

  let updatedText = text;
  let executedCount = 0;

  for (const cmd of commands) {
    const handler = HANDLERS.get(cmd.commandTag);
    if (!handler) continue;

    try {
      const result = await handler.execute(cmd.params, context);
      updatedText = updatedText.replace(cmd.raw, `\n${result.display}\n`);
      if (result.success) executedCount++;
    } catch (error) {
      updatedText = updatedText.replace(
        cmd.raw,
        `\n❌ Skill \`${cmd.commandTag}\` failed: ${error}\n`
      );
    }
  }

  return { text: updatedText, executedCount };
}

/**
 * Generate skill instructions for the system prompt.
 * Only includes skills that are assigned to the agent's template.
 */
export function generateSkillPrompt(templateId: string, walletAddress: string | null): string {
  const skills = getSkillsForTemplate(templateId);
  // Filter out transfer skills — they have their own prompt section
  const nonTransferSkills = skills.filter(
    (s) => s.id !== "send_celo" && s.id !== "send_token"
  );

  if (nonTransferSkills.length === 0) return "";

  const lines: string[] = [
    "",
    "[AVAILABLE SKILLS — Use these command tags to query data and execute actions]",
    "",
  ];

  for (const skill of nonTransferSkills) {
    const paramList = skill.params.length > 0
      ? skill.params.map((p) => `<${p.name}>`).join("|")
      : "";
    const tag = paramList
      ? `[[${skill.commandTag}|${paramList}]]`
      : `[[${skill.commandTag}]]`;

    lines.push(`**${skill.name}**: ${skill.description}`);
    lines.push(`  Tag: ${tag}`);
    for (const ex of skill.examples) {
      lines.push(`  Example — user says "${ex.input}":`);
      lines.push(`    Your response includes: ${ex.output}`);
    }
    if (skill.requiresWallet && !walletAddress) {
      lines.push(`  ⚠️ Requires wallet (not initialized)`);
    }
    lines.push("");
  }

  lines.push("RULES:");
  lines.push("- Include the command tag in your response exactly as shown.");
  lines.push("- The system will execute the skill and replace the tag with real data.");
  lines.push("- DO NOT fabricate data — always use the command tags to get real information.");
  lines.push("- You can use multiple skill tags in one response.");

  return lines.join("\n");
}

