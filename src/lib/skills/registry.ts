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

import type {
  SkillHandler,
  SkillDefinition,
  SkillContext,
  SkillCategory,
  ParsedSkillCommand,
} from "./types";

import SKILL_DEFINITIONS from "./definitions";
import {
  executeQueryRate,
  executeQueryAllRates,
  executeMentoQuote,
  executeMentoSwap,
  executeCheckBalance,
  executeGasPrice,
  executeForexAnalysis,
  executePortfolioStatus,
  executePriceTrack,
  executePriceTrend,
  executePricePredict,
  executePriceAlerts,
  executeGetNetworkStatus,
  executeGetBlock,
  executeGetLatestBlocks,
  executeGetTransaction,
  executeGetTokenInfo,
  executeGetTokenBalance,
  executeGetNftInfo,
  executeGetNftBalance,
  executeEstimateGas,
  executeGetGasFeeData,
  executeGetGovernanceProposals,
  executeGetProposalDetails,
  executeGenerateQR,
  executeListQRHistory,
  executeRequestFeedback,
  executeSynthesisRegister,
  executeCreatePriceTrigger,
  executeCreateTimeTrigger,
  executeCheckPrice,
} from "./handlers";

// ─── Handler Registry ─────────────────────────────────────────────────────────

const HANDLERS: Map<string, SkillHandler> = new Map();

function registerHandler(def: SkillDefinition, execute: (params: string[], ctx: SkillContext) => Promise<import("./types").SkillResult>) {
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
    case "price_track": registerHandler(def, executePriceTrack); break;
    case "price_trend": registerHandler(def, executePriceTrend); break;
    case "price_predict": registerHandler(def, executePricePredict); break;
    case "price_alerts": registerHandler(def, executePriceAlerts); break;
    case "network_status": registerHandler(def, executeGetNetworkStatus); break;
    case "get_block": registerHandler(def, executeGetBlock); break;
    case "get_latest_blocks": registerHandler(def, executeGetLatestBlocks); break;
    case "get_transaction": registerHandler(def, executeGetTransaction); break;
    case "get_token_info": registerHandler(def, executeGetTokenInfo); break;
    case "get_token_balance": registerHandler(def, executeGetTokenBalance); break;
    case "get_nft_info": registerHandler(def, executeGetNftInfo); break;
    case "get_nft_balance": registerHandler(def, executeGetNftBalance); break;
    case "estimate_gas": registerHandler(def, executeEstimateGas); break;
    case "get_gas_fee_data": registerHandler(def, executeGetGasFeeData); break;
    case "get_governance_proposals": registerHandler(def, executeGetGovernanceProposals); break;
    case "get_proposal_details": registerHandler(def, executeGetProposalDetails); break;
    case "generate_qr": registerHandler(def, executeGenerateQR); break;
    case "list_qr_history": registerHandler(def, executeListQRHistory); break;
    case "request_feedback": registerHandler(def, executeRequestFeedback); break;
    case "synthesis_register": registerHandler(def, executeSynthesisRegister); break;
    case "create_price_trigger": registerHandler(def, executeCreatePriceTrigger); break;
    case "create_time_trigger": registerHandler(def, executeCreateTimeTrigger); break;
    case "check_token_price": registerHandler(def, executeCheckPrice); break;
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
export function getSkillsForTemplate(templateId: string, disabledSkills: string[] = []): SkillDefinition[] {
  const FEEDBACK_SKILLS = ["request_feedback"];

  const CELO_MCP_SKILLS = [
    "network_status",
    "get_block",
    "get_latest_blocks",
    "get_transaction",
    "get_token_info",
    "get_token_balance",
    "get_nft_info",
    "get_nft_balance",
    "estimate_gas",
    "get_gas_fee_data",
    "get_governance_proposals",
    "get_proposal_details",
  ];

  const QR_SKILLS = ["generate_qr", "list_qr_history"];

  const TEMPLATE_SKILLS: Record<string, string[]> = {
    payment: ["send_celo", "send_token", "check_balance", "query_rate", "check_token_price", "synthesis_register", "gas_price", ...CELO_MCP_SKILLS, ...QR_SKILLS, ...FEEDBACK_SKILLS],
    trading: ["send_celo", "send_token", "check_balance", "query_rate", "check_token_price", "synthesis_register", "query_all_rates", "mento_quote", "mento_swap", "gas_price", "forex_analysis", "portfolio_status", "price_track", "price_trend", "price_predict", "price_alerts", "create_price_trigger", "create_time_trigger", ...CELO_MCP_SKILLS, ...QR_SKILLS, ...FEEDBACK_SKILLS],
    forex: ["send_celo", "send_token", "check_balance", "query_rate", "check_token_price", "synthesis_register", "query_all_rates", "mento_quote", "mento_swap", "gas_price", "forex_analysis", "portfolio_status", "price_track", "price_trend", "price_predict", "price_alerts", "create_price_trigger", "create_time_trigger", ...CELO_MCP_SKILLS, ...QR_SKILLS, ...FEEDBACK_SKILLS],
    social: ["send_celo", "send_token", "check_balance", "synthesis_register", ...CELO_MCP_SKILLS, ...QR_SKILLS, ...FEEDBACK_SKILLS],
    custom: ["send_celo", "send_token", "check_balance", "query_rate", "check_token_price", "synthesis_register", "query_all_rates", "mento_quote", "gas_price", "create_price_trigger", "create_time_trigger", ...CELO_MCP_SKILLS, ...QR_SKILLS, ...FEEDBACK_SKILLS],
  };

  const skillIds = TEMPLATE_SKILLS[templateId] || TEMPLATE_SKILLS.custom;
  return SKILL_DEFINITIONS.filter((s) => skillIds.includes(s.id) && !disabledSkills.includes(s.id));
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
 * Only includes skills that are assigned to the agent's template and not disabled.
 */
export function generateSkillPrompt(templateId: string, walletAddress: string | null, disabledSkills: string[] = []): string {
  const skills = getSkillsForTemplate(templateId, disabledSkills);
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
  lines.push("");
  lines.push("**RESPONSE FORMAT (Markdown):** Your chat is rendered with markdown. Format responses for readability:");
  lines.push("- Use **bold** for important values (amounts, addresses, status).");
  lines.push("- Use bullet lists (-) for multiple items.");
  lines.push("- Use `backticks` for addresses, hashes, and command tags.");
  lines.push("- Skill outputs are already markdown-formatted — keep that formatting when you summarize or quote them.");
  lines.push("");
  lines.push("**FEEDBACK:** After completing a task the user asked for (payment sent, swap done, question answered, etc.), include [[REQUEST_FEEDBACK]] at the end of your response. This shows an inline rating widget so the user can rate you on-chain (ERC-8004). Do NOT ask verbally — just include the tag.");

  return lines.join("\n");
}
