/**
 * OpenClaw Configuration Generator
 * 
 * Generates openclaw.json configuration files for agent instances.
 * Config reference: ~/.openclaw/openclaw.json
 * 
 * OpenClaw config structure:
 * - channels: WhatsApp, Telegram, Discord settings
 * - messages: routing and mention patterns
 * - agent: LLM provider, model, system prompt
 * - sessions: per-sender isolation
 */

export interface OpenClawAgentConfig {
  agent: {
    name: string;
    systemPrompt: string;
    llmProvider: string;
    llmModel: string;
    templateType: string;
    spendingLimit: number;
    walletAddress?: string;
  };
  channels: {
    telegram?: {
      enabled: boolean;
      botToken?: string;
      allowFrom?: string[];
      groups?: Record<string, { requireMention: boolean }>;
    };
    discord?: {
      enabled: boolean;
      botToken?: string;
      allowFrom?: string[];
    };
    whatsapp?: {
      enabled: boolean;
      allowFrom?: string[];
      groups?: Record<string, { requireMention: boolean }>;
    };
    web?: {
      enabled: boolean;
      port: number;
    };
  };
  messages: {
    groupChat: {
      mentionPatterns: string[];
    };
    maxLength: number;
  };
  sessions: {
    isolation: "per-sender" | "per-channel" | "global";
    timeout: number; // minutes
    maxHistory: number;
  };
  tools: {
    celoTransfer: boolean;
    priceQuery: boolean;
    contractInteraction: boolean;
    customEndpoints: string[];
  };
  skills: string[]; // skill IDs enabled for this agent
  safety: {
    spendingLimit: number;
    maxTransactionAmount: number;
    requireConfirmation: boolean;
    blockedAddresses: string[];
  };
}

interface GenerateConfigParams {
  agentId: string;
  agentName: string;
  systemPrompt: string;
  llmProvider: string;
  llmModel: string;
  templateType: string;
  spendingLimit: number;
  agentWalletAddress?: string;
  configuration: Record<string, unknown>;
}

/**
 * Generate a full OpenClaw configuration for an agent
 */
export function generateOpenClawConfig(params: GenerateConfigParams): OpenClawAgentConfig {
  const {
    agentName,
    systemPrompt,
    llmProvider,
    llmModel,
    templateType,
    spendingLimit,
    agentWalletAddress,
    configuration,
  } = params;

  // Base config
  const config: OpenClawAgentConfig = {
    agent: {
      name: agentName,
      systemPrompt,
      llmProvider,
      llmModel,
      templateType,
      spendingLimit,
      walletAddress: agentWalletAddress,
    },
    channels: {
      web: {
        enabled: true,
        port: 0, // Will be assigned by the runtime manager
      },
    },
    messages: {
      groupChat: {
        mentionPatterns: [`@${agentName.toLowerCase().replace(/\s+/g, "")}`, "@agent"],
      },
      maxLength: 4096,
    },
    sessions: {
      isolation: "per-sender",
      timeout: 30,
      maxHistory: 50,
    },
    tools: {
      celoTransfer: false,
      priceQuery: false,
      contractInteraction: false,
      customEndpoints: [],
    },
    skills: [], // populated below from template
    safety: {
      spendingLimit,
      maxTransactionAmount: (configuration.maxTransactionAmount as number) || 1000,
      requireConfirmation: (configuration.requireConfirmation as boolean) ?? true,
      blockedAddresses: [],
    },
  };

  // Template-specific tool and skill configuration
  switch (templateType) {
    case "payment":
      config.tools.celoTransfer = true;
      config.tools.priceQuery = true;
      config.skills = ["send_celo", "send_token", "check_balance", "query_rate", "gas_price"];
      break;

    case "trading":
      config.tools.priceQuery = true;
      config.tools.celoTransfer = true;
      config.tools.contractInteraction = true;
      config.skills = ["send_celo", "send_token", "check_balance", "query_rate", "query_all_rates", "mento_quote", "mento_swap", "gas_price", "forex_analysis", "portfolio_status"];
      break;

    case "forex":
      config.tools.priceQuery = true;
      config.tools.celoTransfer = true;
      config.tools.contractInteraction = true;
      config.skills = ["send_celo", "send_token", "check_balance", "query_rate", "query_all_rates", "mento_quote", "mento_swap", "gas_price", "forex_analysis", "portfolio_status"];
      break;

    case "social":
      // Enable social channels
      config.channels.telegram = {
        enabled: true,
        groups: { "*": { requireMention: true } },
      };
      config.channels.discord = {
        enabled: false,
      };
      config.tools.celoTransfer = true; // For tips
      config.skills = ["send_celo", "send_token", "check_balance"];
      break;

    case "custom":
      config.tools.celoTransfer = true;
      config.tools.priceQuery = true;
      config.tools.contractInteraction = true;
      config.skills = ["send_celo", "send_token", "check_balance", "query_rate", "query_all_rates", "mento_quote", "gas_price"];
      if (Array.isArray(configuration.customEndpoints)) {
        config.tools.customEndpoints = configuration.customEndpoints as string[];
      }
      break;
  }

  return config;
}

/**
 * Generate OpenClaw CLI command for an agent
 */
export function generateOpenClawCommand(
  configPath: string,
  port: number
): string {
  return `openclaw gateway --port ${port} --config ${configPath}`;
}

/**
 * Generate the openclaw.json file content for writing to disk
 */
export function serializeConfig(config: OpenClawAgentConfig): string {
  return JSON.stringify(config, null, 2);
}

