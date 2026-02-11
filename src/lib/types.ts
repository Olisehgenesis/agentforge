export type AgentTemplate = "payment" | "trading" | "forex" | "social" | "custom";

export type AgentStatus = "draft" | "deploying" | "active" | "paused" | "stopped";

export type LLMProvider = "openrouter" | "openai" | "groq" | "grok" | "gemini" | "deepseek" | "zai";

export type TransactionType = "send" | "swap" | "register" | "tip";

export type TransactionStatus = "pending" | "confirmed" | "failed";

export type ActivityType = "action" | "error" | "info" | "warning";

export interface AgentConfig {
  // Payment Agent
  supportedCurrencies?: string[];
  maxTransactionAmount?: number;
  requireConfirmation?: boolean;
  
  // Trading Agent
  tradingPairs?: string[];
  maxSlippage?: number;
  stopLossPercentage?: number;
  
  // Social Agent
  platforms?: string[];
  autoReply?: boolean;
  tipAmount?: number;
  
  // Forex Trader Agent
  forexPairs?: string[];
  autoTrade?: boolean;
  maxPositionSize?: number;
  monitorInterval?: number; // minutes between rate checks

  // Custom Agent
  tools?: string[];
  customEndpoints?: string[];
}

export interface AgentFormData {
  name: string;
  description: string;
  templateType: AgentTemplate;
  systemPrompt: string;
  llmProvider: LLMProvider;
  llmModel: string;
  spendingLimit: number;
  configuration: AgentConfig;
}

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  templateType: string;
  status: AgentStatus;
  systemPrompt: string | null;
  llmProvider: string;
  llmModel: string;
  spendingLimit: number;
  spendingUsed: number;
  agentWalletAddress: string | null;
  erc8004AgentId: string | null;
  erc8004URI: string | null;
  erc8004TxHash: string | null;
  erc8004ChainId: number | null;
  reputationScore: number;
  configuration: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deployedAt: string | null;
}

export interface Transaction {
  id: string;
  agentId: string;
  txHash: string | null;
  type: TransactionType;
  status: TransactionStatus;
  fromAddress: string | null;
  toAddress: string | null;
  amount: number | null;
  currency: string | null;
  gasUsed: number | null;
  blockNumber: number | null;
  description: string | null;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  agentId: string;
  type: ActivityType;
  message: string;
  metadata: string | null;
  createdAt: string;
}

export interface TemplateInfo {
  id: AgentTemplate;
  name: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  defaultPrompt: string;
  defaultConfig: AgentConfig;
}

/**
 * ERC-8004 Agent Registration File shape.
 * The `agentURI` on the IdentityRegistry resolves to this JSON.
 *
 * @see https://github.com/erc-8004/erc-8004-contracts#agent-registration-file-recommended-shape
 */
export interface ERC8004Registration {
  type: string; // "agent-registration-v1"
  name: string;
  description: string;
  image: string;
  services: {
    type: string;
    url: string;
    description?: string;
  }[];
  registrations: {
    agentRegistry: string; // e.g. "eip155:42220:0x8004..."
    agentId: string;       // on-chain token ID or "pending"
  }[];
  supportedTrust: string[];
  // Extended AgentHaus fields
  agentWallet?: string;
  chainId?: number;
  framework?: string;
}

export interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  totalTransactions: number;
  totalValueTransferred: number;
  averageReputation: number;
  totalGasSpent: number;
}

