export type AgentTemplate = "payment" | "trading" | "forex" | "social" | "custom";

export type AgentStatus = "draft" | "deploying" | "active" | "paused" | "stopped";

export type LLMProvider = "openrouter" | "openai" | "groq" | "grok" | "gemini" | "deepseek" | "zai" | "anthropic";

export type TransactionType = "send" | "swap" | "register" | "tip";

export type TransactionStatus = "pending" | "confirmed" | "failed";

export type ActivityType = "action" | "error" | "info" | "warning";

export interface AgentConfig {
  // ERC-8004 human-facing (best practices: web, email)
  webUrl?: string;
  contactEmail?: string;

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
  imageUrl: string | null;
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
 * ERC-8004 service/endpoint entry.
 * Spec: name + endpoint (not type/url).
 *
 * All agents deployed via agenthaus.space include a "deployedBy" service
 * with endpoint https://agenthaus.space for attribution.
 */
export interface ERC8004Service {
  name: string;
  endpoint: string;
  version?: string;
  skills?: string[];
  domains?: string[];
}

/**
 * ERC-8004 registration entry (on-chain identity link).
 */
export interface ERC8004RegistrationEntry {
  agentRegistry: string; // CAIP-10: eip155:{chainId}:{contractAddress}
  agentId: number | null; // ERC-721 tokenId, null for first-time
}

/**
 * ERC-8004 Agent Registration File shape.
 * @see https://eips.ethereum.org/EIPS/eip-8004
 * @see https://best-practices.8004scan.io/docs/01-agent-metadata-standard.html
 *
 * Deployment attribution: All agents deployed via agenthaus.space include
 * - description suffix: "Agent deployed by agenthaus.space"
 * - services: { name: "deployedBy", endpoint: "https://agenthaus.space" }
 */
export interface ERC8004Registration {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1";
  name: string;
  description: string;
  image: string;
  services: ERC8004Service[];
  registrations: ERC8004RegistrationEntry[];
  supportedTrust: string[];
  active?: boolean;
  x402Support?: boolean;
  updatedAt?: number;
}

export interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  totalTransactions: number;
  totalValueTransferred: number;
  averageReputation: number;
  totalGasSpent: number;
}

