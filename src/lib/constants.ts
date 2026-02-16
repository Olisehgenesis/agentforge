import { type TemplateInfo } from "./types";

// ─── Chain Configuration ─────────────────────────────────────────────────────

// Celo Chain IDs
export const CELO_CHAIN_ID = 42220;
export const CELO_SEPOLIA_CHAIN_ID = 11142220;

// Active chain — determined by NEXT_PUBLIC_CHAIN_ID env var or defaults to Celo Mainnet
export const ACTIVE_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 42220; // Default: Celo Mainnet

// Block explorers per chain
export const BLOCK_EXPLORERS: Record<number, string> = {
  42220: "https://celoscan.io",
  11142220: "https://celo-sepolia.blockscout.com",
} as const;
export const BLOCK_EXPLORER = BLOCK_EXPLORERS[ACTIVE_CHAIN_ID] || "https://celoscan.io";

// Chain display names
export const CHAIN_NAMES: Record<number, string> = {
  42220: "Celo Mainnet",
  11142220: "Celo Sepolia (Testnet)",
} as const;

export const IS_TESTNET = ACTIVE_CHAIN_ID !== CELO_CHAIN_ID;

/** Deployment attribution — included in all agent metadata (ERC-8004 registration JSON) */
export const DEPLOYMENT_ATTRIBUTION = "Agent deployed by agenthaus.space";
export const DEPLOYMENT_URL = "https://agenthaus.space";

/** Agent Haus as ERC-8004 agent — deploy tx + user feedback attribute to its reputation */
export const AGENT_HAUS_AGENT_ID_MAINNET =
  process.env.NEXT_PUBLIC_AGENT_HAUS_AGENT_ID_MAINNET || null;
export const AGENT_HAUS_AGENT_ID_TESTNET =
  process.env.NEXT_PUBLIC_AGENT_HAUS_AGENT_ID_TESTNET || null;

/** Get Agent Haus on-chain agentId for a chain (Celo mainnet/testnet) */
export function getAgentHausAgentId(chainId: number): string | null {
  if (chainId === 42220) return AGENT_HAUS_AGENT_ID_MAINNET || null;
  if (chainId === 11142220) return AGENT_HAUS_AGENT_ID_TESTNET || null;
  return null;
}

/** Get human-readable chain name */
export function getChainName(chainId?: number): string {
  return CHAIN_NAMES[chainId ?? ACTIVE_CHAIN_ID] || `Chain ${chainId}`;
}

/** Get block explorer URL for a chain */
export function getBlockExplorer(chainId?: number): string {
  return BLOCK_EXPLORERS[chainId ?? ACTIVE_CHAIN_ID] || "https://celoscan.io";
}

// ERC-8004 Contract Addresses per chain
// Canonical deployments from https://github.com/erc-8004/erc-8004-contracts
export const ERC8004_CONTRACTS: Record<number, { identity: string; reputation: string }> = {
  // Celo Mainnet — official deployment
  42220: {
    identity: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    reputation: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
  },
  // BSC Testnet — official deployment
  97: {
    identity: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    reputation: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
  },
  // Celo Sepolia Testnet — official deployment
  11142220: {
    identity: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    reputation: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
  },
} as const;

// Legacy aliases (for backward compatibility)
export const ERC8004_IDENTITY_REGISTRY = ERC8004_CONTRACTS[42220]?.identity ?? "" as string;
export const ERC8004_REPUTATION_REGISTRY = ERC8004_CONTRACTS[42220]?.reputation ?? "" as string;

/** Default Identity Registry (mainnet vanity) — same on Ethereum, Base, Celo, etc. */
const ERC8004_IDENTITY_MAINNET = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
const ERC8004_IDENTITY_TESTNET = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

/** Block explorers for chains beyond Celo (for ERC-8004 scan links) */
const BLOCK_EXPLORERS_EXT: Record<number, string> = {
  ...BLOCK_EXPLORERS,
  1: "https://etherscan.io",
  11155111: "https://sepolia.etherscan.io",
  8453: "https://basescan.org",
  137: "https://polygonscan.com",
  42161: "https://arbiscan.io",
};

/** 8004scan — ERC-8004 agent explorer (shows score, feedback, leaderboard). */
export const ERC8004_SCAN_BASE = "https://www.8004scan.io";

/** Chain ID → 8004scan URL slug (same format as https://www.8004scan.io/agents/celo/15) */
const CHAIN_SLUGS: Record<number, string> = {
  1: "ethereum",
  11155111: "sepolia",
  42220: "celo",
  11142220: "celo-sepolia",
  8453: "base",
  84532: "base-sepolia",
  137: "polygon",
  80002: "polygon-amoy",
  42161: "arbitrum",
  421614: "arbitrum-sepolia",
  10: "optimism",
  11155420: "optimism-sepolia",
  59144: "linea",
  43114: "avalanche",
  56: "bsc",
  97: "bsc-testnet",
  534352: "scroll",
  100: "gnosis",
  167000: "taiko",
};

/** Get 8004scan agent page URL (Browse Agents — shows score, feedback, AI, etc.). */
export function get8004ScanAgentUrl(chainId: number, agentId: string): string {
  const slug = CHAIN_SLUGS[chainId] ?? String(chainId);
  return `${ERC8004_SCAN_BASE}/agents/${slug}/${agentId}`;
}

/** Get ERC-8004 scan URL (block explorer token/NFT view) for an agent. */
export function getERC8004ScanUrl(
  chainId: number,
  agentId: string
): string {
  const explorer = BLOCK_EXPLORERS_EXT[chainId] || BLOCK_EXPLORER;
  const identity =
    ERC8004_CONTRACTS[chainId]?.identity ??
    (chainId === 42220 || chainId === 1 || chainId === 8453 ? ERC8004_IDENTITY_MAINNET : ERC8004_IDENTITY_TESTNET);
  return `${explorer}/token/${identity}?a=${agentId}`;
}

// Stablecoins on Celo Sepolia Testnet
// Note: Native CELO uses the zero address on Celo Sepolia
export const CELO_TOKENS = {
  CELO: { address: "0x0000000000000000000000000000000000000000", symbol: "CELO", decimals: 18 },
  cUSD: { address: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", symbol: "cUSD", decimals: 18 },
  cEUR: { address: "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F", symbol: "cEUR", decimals: 18 },
  cREAL: { address: "0xE4D517785D091D3c54818832dB6094bcc2744545", symbol: "cREAL", decimals: 18 },
} as const;

// ─── Fee Currency Addresses ──────────────────────────────────────────────────
// Celo's fee abstraction: pay gas in ERC-20 tokens instead of CELO.
// For 18-decimal tokens (cUSD, cEUR, cREAL) the token address IS the fee currency.
// For 6-decimal tokens (USDC, USDT) we need an adapter that normalises to 18 decimals.
//
// Docs: https://docs.celo.org/protocol/transaction/erc20-transaction-fees

export const FEE_CURRENCIES: Record<number, Record<string, { feeCurrency: string; token: string; symbol: string; decimals: number }>> = {
  // Celo Mainnet
  42220: {
    cUSD:  { feeCurrency: "0x765DE816845861e75A25fCA122bb6898B8B1282a", token: "0x765DE816845861e75A25fCA122bb6898B8B1282a", symbol: "cUSD",  decimals: 18 },
    cEUR:  { feeCurrency: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73", token: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73", symbol: "cEUR",  decimals: 18 },
    cREAL: { feeCurrency: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787", token: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787", symbol: "cREAL", decimals: 18 },
    USDC:  { feeCurrency: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B", token: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", symbol: "USDC",  decimals: 6 },  // adapter
    USDT:  { feeCurrency: "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72", token: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e", symbol: "USDT",  decimals: 6 },  // adapter
  },
  // Celo Sepolia Testnet
  11142220: {
    cUSD:  { feeCurrency: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", token: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", symbol: "cUSD",  decimals: 18 },
    cEUR:  { feeCurrency: "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F", token: "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F", symbol: "cEUR",  decimals: 18 },
    cREAL: { feeCurrency: "0xE4D517785D091D3c54818832dB6094bcc2744545", token: "0xE4D517785D091D3c54818832dB6094bcc2744545", symbol: "cREAL", decimals: 18 },
    USDC:  { feeCurrency: "0x4822e58de6f5e485eF90df51C41CE01721331dC0", token: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B", symbol: "USDC",  decimals: 6 },  // adapter
  },
} as const;

// LLM Models — OpenRouter (free-only), Groq, OpenAI, Grok, Gemini, DeepSeek, Z.AI, Anthropic (Claude)
export const LLM_MODELS = {
  openrouter: [
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)" },
    { id: "meta-llama/llama-3.2-3b-instruct:free", name: "Llama 3.2 3B (Free)" },
    { id: "qwen/qwen3-4b:free", name: "Qwen3 4B (Free)" },
    { id: "mistralai/mistral-small-3.1-24b-instruct:free", name: "Mistral Small 3.1 24B (Free)" },
    { id: "deepseek/deepseek-r1-0528:free", name: "DeepSeek R1 (Free)" },
    { id: "nousresearch/hermes-3-llama-3.1-405b:free", name: "Hermes 3 405B (Free)" },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    { id: "o1", name: "o1" },
    { id: "o1-mini", name: "o1 Mini" },
    { id: "o3-mini", name: "o3 Mini" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile" },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant" },
    { id: "llama-3.2-90b-vision-preview", name: "Llama 3.2 90B Vision" },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
    { id: "gemma2-9b-it", name: "Gemma 2 9B" },
    { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill 70B" },
  ],
  grok: [
    { id: "grok-3", name: "Grok 3" },
    { id: "grok-3-fast", name: "Grok 3 Fast" },
    { id: "grok-3-mini", name: "Grok 3 Mini" },
    { id: "grok-3-mini-fast", name: "Grok 3 Mini Fast" },
    { id: "grok-2", name: "Grok 2" },
  ],
  gemini: [
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  ],
  deepseek: [
    { id: "deepseek-chat", name: "DeepSeek V3 (Chat)" },
    { id: "deepseek-reasoner", name: "DeepSeek R1 (Reasoner)" },
  ],
  zai: [
    { id: "glm-4-flash", name: "GLM-4 Flash (Free)" },
    { id: "glm-4-air", name: "GLM-4 Air" },
    { id: "glm-4-airx", name: "GLM-4 AirX" },
    { id: "glm-4-long", name: "GLM-4 Long" },
    { id: "glm-4", name: "GLM-4" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
    { id: "claude-opus-4-20250514", name: "Claude Opus 4" },
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
  ],
} as const;

// Provider display info
export const LLM_PROVIDER_INFO = {
  openrouter: {
    label: "OpenRouter (Free Models)",
    description: "Access free open-source models via OpenRouter",
    keyPlaceholder: "sk-or-v1-...",
    keyUrl: "https://openrouter.ai/keys",
    hasFreeModels: true,
  },
  openai: {
    label: "OpenAI (ChatGPT)",
    description: "GPT-4o, GPT-4 Turbo, and more from OpenAI",
    keyPlaceholder: "sk-...",
    keyUrl: "https://platform.openai.com/api-keys",
    hasFreeModels: false,
  },
  groq: {
    label: "Groq (Fast Inference)",
    description: "Ultra-fast inference — Llama 3.3, Mixtral, Gemma, DeepSeek",
    keyPlaceholder: "gsk_...",
    keyUrl: "https://console.groq.com/keys",
    hasFreeModels: true,
  },
  grok: {
    label: "Grok (xAI)",
    description: "Grok 3, Grok 2 models from xAI",
    keyPlaceholder: "xai-...",
    keyUrl: "https://console.x.ai/",
    hasFreeModels: false,
  },
  gemini: {
    label: "Google Gemini",
    description: "Gemini 2.0 Flash, 1.5 Pro from Google AI",
    keyPlaceholder: "AIza...",
    keyUrl: "https://aistudio.google.com/apikey",
    hasFreeModels: true,
  },
  deepseek: {
    label: "DeepSeek",
    description: "DeepSeek V3 Chat and R1 Reasoner models",
    keyPlaceholder: "sk-...",
    keyUrl: "https://platform.deepseek.com/api_keys",
    hasFreeModels: false,
  },
  zai: {
    label: "Z.AI (Zhipu GLM-4)",
    description: "GLM-4 series models with free tier",
    keyPlaceholder: "...",
    keyUrl: "https://open.bigmodel.cn/",
    hasFreeModels: true,
  },
  anthropic: {
    label: "Anthropic (Claude)",
    description: "Claude Sonnet, Opus, Haiku from Anthropic",
    keyPlaceholder: "sk-ant-...",
    keyUrl: "https://console.anthropic.com/settings/keys",
    hasFreeModels: false,
  },
} as const;

// Agent Templates
export const AGENT_TEMPLATES: TemplateInfo[] = [
  {
    id: "payment",
    name: "Payment Agent",
    description: "Process natural language payments on Celo with multi-currency support (cUSD, cEUR, USDC). Execute stablecoin transfers, generate receipts, enforce spending limits. Interact via chat — deploy at agenthaus.space, connect wallet, send payment requests. Supports fee abstraction (pay gas in cUSD).",
    icon: "💳",
    color: "from-forest to-forest-light",
    features: [
      "Natural language payment processing",
      "Multi-currency support (cUSD, cEUR, USDC)",
      "Transaction confirmation flows",
      "Receipt generation",
      "Spending limit enforcement",
      "ERC-8004 on-chain identity & SelfClaw agent economy",
    ],
    defaultPrompt: `You are a Payment Agent operating on the Celo blockchain. You have a real on-chain wallet and can execute real transactions.

When a user requests a payment:
1. Parse the recipient address (must be a valid 0x... address), amount, and currency
2. Validate the transaction against spending limits
3. Ask the user to confirm before executing
4. Once confirmed, execute the transfer by including the appropriate command tag in your response

**To execute transactions, include these EXACT tags in your response:**
- Send CELO: [[SEND_CELO|<recipient_address>|<amount>]]
- Send tokens: [[SEND_TOKEN|<currency>|<recipient_address>|<amount>]]

Examples:
- "Sending 1 CELO now. [[SEND_CELO|0xabc...def|1]]"
- "Sending 5 cUSD now. [[SEND_TOKEN|cUSD|0xabc...def|5]]"

Rules:
- Always confirm with the user before executing transactions over $10
- Supported currencies: CELO, cUSD, cEUR, cREAL
- The recipient MUST be a valid 0x address (42 characters). If the user provides an ENS name, ask for the actual address.
- Never reveal private keys or sensitive wallet information
- After including the command tag, the system will execute the transaction and replace the tag with a receipt

**SelfClaw (Agent Economy):** You can do all SelfClaw actions via chat — no dashboard needed. Show pipeline [[AGENT_IDENTITY]], register wallet [[SELFCLAW_REGISTER_WALLET]], deploy token [[SELFCLAW_DEPLOY_TOKEN|name|symbol|supply]], log revenue [[SELFCLAW_LOG_REVENUE|amount|source]], log cost [[SELFCLAW_LOG_COST|amount|category]], show token info [[AGENT_TOKENS]], request sponsorship [[REQUEST_SELFCLAW_SPONSORSHIP]]. Token deploy uses SelfClaw API: get unsigned tx → sign → register. Mention these when describing what you can do.`,
    defaultConfig: {
      supportedCurrencies: ["cUSD", "cEUR"],
      maxTransactionAmount: 1000,
      requireConfirmation: true,
    },
  },
  {
    id: "trading",
    name: "Trading Agent",
    description: "Monitor token prices across Celo DEXes (Ubeswap, Mento) and execute conditional swaps. Set stop-loss, take-profit, and risk rules. Track portfolio performance. Interact via chat — request trades, check prices, set strategies. ERC-8004 on-chain identity for trust.",
    icon: "📈",
    color: "from-blue-500 to-indigo-600",
    features: [
      "Price monitoring across DEXes",
      "Conditional swap execution",
      "Risk management rules",
      "Portfolio tracking",
      "Stop-loss automation",
      "ERC-8004 on-chain identity & SelfClaw agent economy",
    ],
    defaultPrompt: `You are a Trading Agent operating on the Celo blockchain. You have a real on-chain wallet and can execute real transactions.

Capabilities:
1. Monitor token prices across Celo DEXes (Ubeswap, Mento)
2. Execute swaps when conditions are met
3. Enforce stop-loss and take-profit rules
4. Track portfolio performance

**To execute transactions, include these EXACT tags in your response:**
- Send CELO: [[SEND_CELO|<recipient_address>|<amount>]]
- Send tokens: [[SEND_TOKEN|<currency>|<recipient_address>|<amount>]]

Safety rules:
- Never exceed the configured maximum slippage
- Always respect stop-loss percentages
- Report all trades to the owner
- Pause trading if unusual market conditions detected
- The recipient MUST be a valid 0x address (42 characters)
- Never reveal private keys or sensitive wallet information

**SelfClaw (Agent Economy):** You can do all SelfClaw actions via chat — no dashboard needed. Show pipeline [[AGENT_IDENTITY]], register wallet [[SELFCLAW_REGISTER_WALLET]], deploy token [[SELFCLAW_DEPLOY_TOKEN|name|symbol|supply]], log revenue [[SELFCLAW_LOG_REVENUE|amount|source]], log cost [[SELFCLAW_LOG_COST|amount|category]], show token info [[AGENT_TOKENS]], request sponsorship [[REQUEST_SELFCLAW_SPONSORSHIP]]. Token deploy uses SelfClaw API: get unsigned tx → sign → register. Mention these when describing what you can do.`,
    defaultConfig: {
      tradingPairs: ["CELO/cUSD"],
      maxSlippage: 1.0,
      stopLossPercentage: 5.0,
    },
  },
  {
    id: "forex",
    name: "Forex Trader",
    description: "Monitor Mento stablecoin exchange rates, execute CELO ↔ cUSD/cEUR/cREAL swaps, analyze trends and momentum. Track portfolio, get price alerts. Interact via chat — request quotes, execute swaps, view analysis. Fee abstraction: pay gas in cUSD instead of CELO. On-chain SortedOracles data.",
    icon: "💹",
    color: "from-yellow-500 to-amber-600",
    features: [
      "Live Mento exchange rate monitoring",
      "SortedOracles price feeds (on-chain)",
      "CELO ↔ cUSD/cEUR/cREAL swaps via Mento",
      "Periodic price tracking & trend analysis",
      "Momentum-based price predictions",
      "Portfolio valuation & tracking",
      "Forex analysis & trading signals",
      "Price alerts on significant moves",
      "Fee abstraction — pay gas in cUSD/cEUR",
      "Automated rate monitoring (via cron)",
      "ERC-8004 on-chain identity & SelfClaw agent economy",
    ],
    defaultPrompt: `You are a Forex Trader Agent operating on the Celo blockchain. You specialize in Mento stablecoin trading — monitoring exchange rates, executing swaps, analyzing trends, predicting price movements, and managing a multi-currency portfolio.

Your expertise:
1. Monitor CELO ↔ stablecoin rates using Celo SortedOracles (on-chain price feeds)
2. Execute swaps between CELO, cUSD, cEUR, and cREAL via the Mento Protocol
3. Track price history over time and detect trends (up/down/flat)
4. Generate momentum-based price predictions with confidence levels
5. Alert on significant price movements and volatility spikes
6. Track portfolio performance across all Celo assets
7. Pay gas fees in cUSD/cEUR via Celo fee abstraction — no CELO needed for gas!

Fee abstraction:
- Your wallet can pay transaction gas fees in cUSD or cEUR instead of CELO.
- If your wallet has no CELO but has stablecoins, gas is automatically paid from stablecoins.
- This means you can trade even when your CELO balance is zero, as long as you hold cUSD/cEUR.

Price tracking workflow:
1. Use PRICE_TRACK to record snapshots (run periodically via cron or manually).
2. Use PRICE_TREND to analyze direction and percentage change over a period.
3. Use PRICE_PREDICT to get momentum-based predictions with confidence levels.
4. Use PRICE_ALERTS to check for big moves above a threshold.
5. Combine these with FOREX_ANALYSIS for a comprehensive market view.

Trading strategy:
- Always check current rates before recommending or executing trades
- Use trend and prediction data to time entries and exits
- Consider spread and slippage when quoting swaps
- Track position sizes and enforce risk limits
- Provide clear reasoning for trade recommendations
- Never exceed configured position size limits
- Alert users to significant moves (>2% change)

When users ask about prices, rates, or market conditions, use your skills to fetch REAL on-chain data — never guess or fabricate numbers.

When users want to swap, always:
1. Get a quote first using MENTO_QUOTE
2. Show them the rate and expected output
3. Check trend and prediction for timing advice
4. Ask for confirmation on amounts > 10
5. Execute the swap

Supported pairs: CELO/cUSD, CELO/cEUR, CELO/cREAL, cUSD/cEUR (cross-stable via CELO)

**SelfClaw (Agent Economy):** You can do all SelfClaw actions via chat — no dashboard needed. Show pipeline [[AGENT_IDENTITY]], register wallet [[SELFCLAW_REGISTER_WALLET]], deploy token [[SELFCLAW_DEPLOY_TOKEN|name|symbol|supply]], log revenue [[SELFCLAW_LOG_REVENUE|amount|source]], log cost [[SELFCLAW_LOG_COST|amount|category]], show token info [[AGENT_TOKENS]], request sponsorship [[REQUEST_SELFCLAW_SPONSORSHIP]]. Token deploy uses SelfClaw API: get unsigned tx → sign → register. Mention these when describing what you can do.`,
    defaultConfig: {
      forexPairs: ["CELO/cUSD", "CELO/cEUR", "CELO/cREAL"],
      autoTrade: false,
      maxPositionSize: 100,
      monitorInterval: 5,
      maxTransactionAmount: 1000,
      requireConfirmation: true,
    },
  },
  {
    id: "social",
    name: "Social Agent",
    description: "Engage communities on Telegram and Twitter. Automate responses, distribute tips, share updates. Real on-chain wallet for CELO/cUSD tips. Interact via chat or connected channels. Configure platforms, tip amounts, auto-reply. ERC-8004 identity for verified presence.",
    icon: "💬",
    color: "from-purple-500 to-pink-600",
    features: [
      "Telegram bot integration",
      "Twitter/X automation",
      "Community engagement",
      "Tip distribution",
      "Automated responses",
      "ERC-8004 on-chain identity & SelfClaw agent economy",
    ],
    defaultPrompt: `You are a Social Agent representing a project on the Celo blockchain. You have a real on-chain wallet and can send tips.

Guidelines:
1. Respond helpfully to community questions
2. Distribute tips to valuable community contributions
3. Share relevant updates and news
4. Maintain a friendly, professional tone
5. Never share private information or financial advice

**To send tips, include these EXACT tags in your response:**
- Send CELO: [[SEND_CELO|<recipient_address>|<amount>]]
- Send tokens: [[SEND_TOKEN|<currency>|<recipient_address>|<amount>]]

Tip distribution rules:
- Reward helpful answers and quality content
- Maximum tip per interaction: configured amount
- Track tip recipients to prevent abuse
- The recipient MUST be a valid 0x address (42 characters)

**SelfClaw (Agent Economy):** You can do all SelfClaw actions via chat — no dashboard needed. Show pipeline [[AGENT_IDENTITY]], register wallet [[SELFCLAW_REGISTER_WALLET]], deploy token [[SELFCLAW_DEPLOY_TOKEN|name|symbol|supply]], log revenue [[SELFCLAW_LOG_REVENUE|amount|source]], log cost [[SELFCLAW_LOG_COST|amount|category]], show token info [[AGENT_TOKENS]], request sponsorship [[REQUEST_SELFCLAW_SPONSORSHIP]]. Token deploy uses SelfClaw API: get unsigned tx → sign → register. Mention these when describing what you can do.`,
    defaultConfig: {
      platforms: ["telegram"],
      autoReply: true,
      tipAmount: 0.5,
    },
  },
  {
    id: "custom",
    name: "Custom Agent",
    description: "Blank canvas for any use case on Celo. Define prompts, tools, LLM config. Execute token transfers, query prices, interact with contracts. Interact via chat — customize system prompt and skills. Full Celo blockchain access. ERC-8004 on-chain identity.",
    icon: "🔧",
    color: "from-orange-500 to-red-600",
    features: [
      "Blank canvas with OpenClaw base",
      "User-defined system prompts",
      "Flexible tool configuration",
      "Custom API endpoints",
      "Full Celo blockchain access",
      "ERC-8004 on-chain identity & SelfClaw agent economy",
    ],
    defaultPrompt: `You are a custom AI agent operating on the Celo blockchain. You have a real on-chain wallet and can execute real transactions.

Available tools:
- Token transfers (cUSD, cEUR, CELO)
- Smart contract interactions
- Price queries
- Transaction history lookup

**To execute transactions, include these EXACT tags in your response:**
- Send CELO: [[SEND_CELO|<recipient_address>|<amount>]]
- Send tokens: [[SEND_TOKEN|<currency>|<recipient_address>|<amount>]]

Rules:
- The recipient MUST be a valid 0x address (42 characters)
- Never reveal private keys or sensitive wallet information

**SelfClaw (Agent Economy):** You can do all SelfClaw actions via chat — no dashboard needed. Show pipeline [[AGENT_IDENTITY]], register wallet [[SELFCLAW_REGISTER_WALLET]], deploy token [[SELFCLAW_DEPLOY_TOKEN|name|symbol|supply]], log revenue [[SELFCLAW_LOG_REVENUE|amount|source]], log cost [[SELFCLAW_LOG_COST|amount|category]], show token info [[AGENT_TOKENS]], request sponsorship [[REQUEST_SELFCLAW_SPONSORSHIP]]. Token deploy uses SelfClaw API: get unsigned tx → sign → register. Mention these when describing what you can do.

Customize this prompt to define your agent's specific role and behavior.`,
    defaultConfig: {
      tools: [],
      customEndpoints: [],
    },
  },
];

/** Get template description for ERC-8004 metadata when agent has no custom description */
export function getTemplateDescription(templateType: string): string {
  const t = AGENT_TEMPLATES.find((x) => x.id === templateType);
  return t?.description ?? `${templateType} agent powered by AgentHaus`;
}

// Navigation items (sidebar order — Create Agent is a separate bottom action)
export const NAV_ITEMS = [
  { name: "Overview", href: "/dashboard", icon: "LayoutDashboard" },
  { name: "My Agents", href: "/dashboard/agents", icon: "Bot" },
  { name: "Verify", href: "/dashboard/verify", icon: "ShieldCheck" },
  { name: "Analytics", href: "/dashboard/analytics", icon: "BarChart3" },
  { name: "Settings", href: "/dashboard/settings", icon: "Settings" },
] as const;
