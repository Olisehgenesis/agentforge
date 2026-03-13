/**
 * Shared types for the Agent Detail page and its sub-components.
 */

export interface AgentData {
  id: string;
  name: string;
  owner?: { walletAddress?: string | null };
  description: string | null;
  imageUrl: string | null;
  templateType: string;
  status: string;
  systemPrompt: string | null;
  llmProvider: string;
  llmModel: string;
  spendingLimit: number;
  spendingUsed: number;
  agentWalletAddress: string | null;
  walletDerivationIndex?: number | null;
  erc8004AgentId: string | null;
  erc8004URI: string | null;
  erc8004TxHash: string | null;
  erc8004ChainId: number | null;
  reputationScore: number;
  exported: boolean;
  exportedAt: string | null;
  createdAt: string;
  deployedAt: string | null;
  transactions: TransactionData[];
  activityLogs: ActivityLogData[];
  verification?: { publicKey: string } | null;
  disabledSkills?: string | null;
  externalSocials?: string | null;
  configuration?: any;
}

export interface TransactionData {
  id: string;
  type: string;
  status: string;
  amount: number | null;
  currency: string | null;
  toAddress: string | null;
  txHash: string | null;
  gasUsed: number | null;
  createdAt: string;
}

export interface ActivityLogData {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface WalletBalanceData {
  address: string;
  nativeBalance: string;
  tokens: {
    symbol: string;
    balance: string;
  }[];
}

export interface VerificationStatus {
  status: string;
  verified: boolean;
  publicKey?: string;
  humanId?: string;
  agentKeyHash?: string;
  swarmUrl?: string;
  verifiedAt?: string;
  selfAppConfig?: Record<string, unknown>;
  hasSession?: boolean;
  message?: string;
  sessionId?: string;
  challengeExpiresAt?: number; // unix ms — when the Self verification session expires
}

export interface ChannelData {
  channels: Array<{
    type: string;
    enabled: boolean;
    connectedAt?: string;
    botUsername?: string;
  }>;
  cronJobs: Array<{
    id: string;
    name: string;
    cron: string;
    skillPrompt: string;
    enabled: boolean;
    lastRun?: string;
    lastResult?: string;
  }>;
  hasTelegramBot: boolean;
  externalSocials?: {
    telegram?: string;
    twitter?: string;
    website?: string;
  } | null;
}

export interface SendResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface RegistrationResult {
  agentId: string;
  txHash: string;
  explorerUrl: string;
}

