/**
 * Agent Skills System
 *
 * Skills are discrete capabilities that agents can invoke via structured
 * command tags in their LLM responses. The executor parses these tags
 * and runs the corresponding skill handler.
 *
 * Each skill defines:
 *   - A unique ID and command tag pattern
 *   - Parameters it accepts
 *   - An execute() function that performs the action
 *   - Prompt instructions so the LLM knows how to use it
 *
 * Skills are grouped into categories and assigned to agent templates.
 * When an agent runs, only its assigned skills are injected into the
 * system prompt and handled by the executor.
 */

// ─── Skill Categories ─────────────────────────────────────────────────────────

export type SkillCategory =
  | "transfer"      // Send CELO / tokens
  | "mento"         // Mento protocol exchange/swap
  | "oracle"        // Price feeds & oracle data
  | "data"          // Balance checks, gas prices, token info
  | "defi"          // DeFi interactions (Ubeswap, etc.)
  | "social"        // Social / tipping
  | "forex";        // Forex trading / analysis

// ─── Skill Definition ─────────────────────────────────────────────────────────

export interface SkillParam {
  name: string;
  description: string;
  required: boolean;
  example: string;
}

export interface SkillDefinition {
  /** Unique skill identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Short description */
  description: string;
  /** Category for grouping */
  category: SkillCategory;
  /** The command tag format: e.g. "QUERY_RATE" → [[QUERY_RATE|param1|param2]] */
  commandTag: string;
  /** Parameters the skill accepts (in order) */
  params: SkillParam[];
  /** Example usages for the system prompt */
  examples: { input: string; output: string }[];
  /** Whether this skill requires an agent wallet */
  requiresWallet: boolean;
  /** Whether this skill modifies on-chain state (vs read-only) */
  mutatesState: boolean;
}

// ─── Skill Execution Context ──────────────────────────────────────────────────

export interface SkillContext {
  agentId: string;
  walletDerivationIndex: number | null;
  agentWalletAddress: string | null;
}

export interface SkillResult {
  success: boolean;
  data?: Record<string, unknown>;
  display: string; // Human-readable result to replace the command tag
  error?: string;
}

// ─── Skill Handler ────────────────────────────────────────────────────────────

export interface SkillHandler {
  definition: SkillDefinition;
  execute: (params: string[], context: SkillContext) => Promise<SkillResult>;
}

// ─── Skill Set (assigned to an agent) ─────────────────────────────────────────

export interface SkillSet {
  /** Template this skill set belongs to */
  templateId: string;
  /** Skill IDs enabled for this template */
  skillIds: string[];
}

// ─── Parsed Skill Command ─────────────────────────────────────────────────────

export interface ParsedSkillCommand {
  skillId: string;
  commandTag: string;
  params: string[];
  raw: string; // full matched text including [[ ]]
}

