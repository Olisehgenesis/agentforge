/**
 * OpenClaw Configuration Generator
 * 
 * Generates openclaw.json for the unified Gateway mode.
 *
 * Architecture:
 *   OpenClaw Gateway is a single process that bridges ALL channels
 *   (WhatsApp, Telegram, Discord, iMessage) to AgentHaus's webhook.
 *
 *   The gateway doesn't run its own LLM — it forwards every message to:
 *     POST {AGENTHAUS_URL}/api/openclaw/webhook
 *
 *   AgentHaus handles routing (via ChannelBinding), LLM, skills, and transactions,
 *   then returns the reply in the response body. OpenClaw relays it back.
 *
 * Two modes:
 *   1. Shared Bot — one bot per channel for the whole platform.
 *      All messages → webhook → AgentHaus routes by pairing code.
 *   2. Dedicated Bot — per-agent bots (existing Telegram/Discord setup).
 *      OpenClaw manages multiple bot accounts, tags each with meta.botId = agentId.
 *
 * Config reference: https://docs.openclaw.ai/
 */

// ─── Per-Agent Config (for dedicated bot mode) ─────────────────────────────

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
    timeout: number;
    maxHistory: number;
  };
  tools: {
    celoTransfer: boolean;
    priceQuery: boolean;
    contractInteraction: boolean;
    customEndpoints: string[];
  };
  skills: string[];
  safety: {
    spendingLimit: number;
    maxTransactionAmount: number;
    requireConfirmation: boolean;
    blockedAddresses: string[];
  };
}

// ─── Unified Gateway Config ────────────────────────────────────────────────

export interface OpenClawGatewayConfig {
  /** Gateway identification */
  gateway: {
    name: string;
    version: string;
  };

  /** Where to forward all messages */
  webhook: {
    url: string;
    secret: string;
    timeout: number;   // seconds
    retries: number;
  };

  /** Shared bot channels — one per channel, all messages → webhook */
  channels: {
    telegram?: {
      enabled: boolean;
      botToken: string;                  // shared @AgentHausBot token
      allowedUpdates: string[];          // ["message", "callback_query"]
    };
    discord?: {
      enabled: boolean;
      botToken: string;                  // shared Discord bot token
      applicationId: string;
    };
    whatsapp?: {
      enabled: boolean;
      sessionName: string;               // OpenClaw WhatsApp session name
      phoneNumber?: string;
    };
    imessage?: {
      enabled: boolean;
      applescriptBridge: boolean;        // macOS only
    };
    web?: {
      enabled: boolean;
      port: number;
      corsOrigins: string[];
    };
  };

  /** Dedicated bots — per-agent Telegram/Discord accounts */
  dedicatedBots?: {
    telegram?: Array<{
      botToken: string;
      agentId: string;                   // maps to meta.botId in webhook payload
      label: string;                     // human-readable name
    }>;
    discord?: Array<{
      botToken: string;
      agentId: string;
      applicationId: string;
      label: string;
    }>;
  };

  /** Session management (OpenClaw side — lightweight, real history in AgentHaus) */
  sessions: {
    isolation: "per-sender";
    timeout: number;
    maxHistory: number;                  // keep minimal on gateway side
  };

  /** Rate limiting */
  rateLimit: {
    maxPerMinute: number;
    maxPerHour: number;
    cooldownMessage: string;
  };
}

// ─── Generate Per-Agent Config (existing — for backward compat) ────────────

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
      web: { enabled: true, port: 0 },
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
    skills: [],
    safety: {
      spendingLimit,
      maxTransactionAmount: (configuration.maxTransactionAmount as number) || 1000,
      requireConfirmation: (configuration.requireConfirmation as boolean) ?? true,
      blockedAddresses: [],
    },
  };

  switch (templateType) {
    case "payment":
      config.tools.celoTransfer = true;
      config.tools.priceQuery = true;
      config.skills = ["send_celo", "send_token", "check_balance", "query_rate", "gas_price"];
      break;
    case "trading":
    case "forex":
      config.tools.priceQuery = true;
      config.tools.celoTransfer = true;
      config.tools.contractInteraction = true;
      config.skills = ["send_celo", "send_token", "check_balance", "query_rate", "query_all_rates", "mento_quote", "mento_swap", "gas_price", "forex_analysis", "portfolio_status"];
      break;
    case "social":
      config.channels.telegram = { enabled: true, groups: { "*": { requireMention: true } } };
      config.channels.discord = { enabled: false };
      config.tools.celoTransfer = true;
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

// ─── Generate Unified Gateway Config ───────────────────────────────────────

interface GatewayConfigParams {
  /** AgentHaus public URL (where OpenClaw can reach the webhook) */
  appUrl: string;
  /** Shared secret for webhook auth */
  webhookSecret: string;
  /** Shared Telegram bot token (for @AgentHausBot) */
  telegramBotToken?: string;
  /** Shared Discord bot token */
  discordBotToken?: string;
  discordApplicationId?: string;
  /** WhatsApp session */
  whatsappEnabled?: boolean;
  whatsappPhone?: string;
  /** iMessage */
  imessageEnabled?: boolean;
  /** Web widget */
  webEnabled?: boolean;
  webPort?: number;
  webCorsOrigins?: string[];
  /** Dedicated per-agent bots to also manage */
  dedicatedTelegramBots?: Array<{ botToken: string; agentId: string; label: string }>;
  dedicatedDiscordBots?: Array<{ botToken: string; agentId: string; applicationId: string; label: string }>;
}

export function generateGatewayConfig(params: GatewayConfigParams): OpenClawGatewayConfig {
  const config: OpenClawGatewayConfig = {
    gateway: {
      name: "agenthaus-gateway",
      version: "1.0.0",
    },
    webhook: {
      url: `${params.appUrl}/api/openclaw/webhook`,
      secret: params.webhookSecret,
      timeout: 30,
      retries: 2,
    },
    channels: {},
    sessions: {
      isolation: "per-sender",
      timeout: 60,
      maxHistory: 5, // minimal on gateway — real history lives in AgentHaus DB
    },
    rateLimit: {
      maxPerMinute: 30,
      maxPerHour: 500,
      cooldownMessage: "⏳ You're sending messages too quickly. Please wait a moment.",
    },
  };

  // Shared Telegram bot
  if (params.telegramBotToken) {
    config.channels.telegram = {
      enabled: true,
      botToken: params.telegramBotToken,
      allowedUpdates: ["message", "callback_query"],
    };
  }

  // Shared Discord bot
  if (params.discordBotToken && params.discordApplicationId) {
    config.channels.discord = {
      enabled: true,
      botToken: params.discordBotToken,
      applicationId: params.discordApplicationId,
    };
  }

  // WhatsApp
  if (params.whatsappEnabled) {
    config.channels.whatsapp = {
      enabled: true,
      sessionName: "agenthaus-wa",
      phoneNumber: params.whatsappPhone,
    };
  }

  // iMessage (macOS only)
  if (params.imessageEnabled) {
    config.channels.imessage = {
      enabled: true,
      applescriptBridge: true,
    };
  }

  // Web widget
  if (params.webEnabled !== false) {
    config.channels.web = {
      enabled: true,
      port: params.webPort || 3100,
      corsOrigins: params.webCorsOrigins || [params.appUrl],
    };
  }

  // Dedicated bots (per-agent)
  if (params.dedicatedTelegramBots?.length || params.dedicatedDiscordBots?.length) {
    config.dedicatedBots = {};

    if (params.dedicatedTelegramBots?.length) {
      config.dedicatedBots.telegram = params.dedicatedTelegramBots;
    }
    if (params.dedicatedDiscordBots?.length) {
      config.dedicatedBots.discord = params.dedicatedDiscordBots;
    }
  }

  return config;
}

// ─── Serialization ─────────────────────────────────────────────────────────

export function generateOpenClawCommand(configPath: string, port: number): string {
  return `openclaw gateway --port ${port} --config ${configPath}`;
}

export function serializeConfig(config: OpenClawAgentConfig | OpenClawGatewayConfig): string {
  return JSON.stringify(config, null, 2);
}
