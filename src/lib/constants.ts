import { type TemplateInfo } from "./types";

// ─── Celo Sepolia Testnet ────────────────────────────────────────────────────
// All contract addresses & chain IDs point to the testnet for now.
// Switch to mainnet values when ready for production.

// ERC-8004 Contract Addresses on Celo Sepolia Testnet
export const ERC8004_IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;
export const ERC8004_REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as const;

// Using Celo Sepolia testnet
export const ACTIVE_CHAIN_ID = 11142220; // Celo Sepolia
export const BLOCK_EXPLORER = "https://celo-sepolia.blockscout.com";

// Celo Chain IDs
export const CELO_CHAIN_ID = 42220;
export const CELO_SEPOLIA_CHAIN_ID = 11142220;

// Stablecoins on Celo Sepolia Testnet
// Note: Native CELO uses the zero address on Celo Sepolia
export const CELO_TOKENS = {
  CELO: { address: "0x0000000000000000000000000000000000000000", symbol: "CELO", decimals: 18 },
  cUSD: { address: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", symbol: "cUSD", decimals: 18 },
  cEUR: { address: "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F", symbol: "cEUR", decimals: 18 },
  cREAL: { address: "0xE4D517785D091D3c54818832dB6094bcc2744545", symbol: "cREAL", decimals: 18 },
} as const;

// LLM Models — OpenRouter (free-only), Groq, OpenAI, Grok, Gemini, DeepSeek, Z.AI
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
} as const;

// Agent Templates
export const AGENT_TEMPLATES: TemplateInfo[] = [
  {
    id: "payment",
    name: "Payment Agent",
    description: "Process natural language payments with multi-currency support on Celo. Handle stablecoin transfers, generate receipts, and manage transaction confirmations.",
    icon: "💳",
    color: "from-emerald-500 to-teal-600",
    features: [
      "Natural language payment processing",
      "Multi-currency support (cUSD, cEUR, USDC)",
      "Transaction confirmation flows",
      "Receipt generation",
      "Spending limit enforcement",
    ],
    defaultPrompt: `You are a Payment Agent operating on the Celo blockchain (Celo Sepolia testnet). You have a real on-chain wallet and can execute real transactions.

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
- After including the command tag, the system will execute the transaction and replace the tag with a receipt`,
    defaultConfig: {
      supportedCurrencies: ["cUSD", "cEUR"],
      maxTransactionAmount: 1000,
      requireConfirmation: true,
    },
  },
  {
    id: "trading",
    name: "Trading Agent",
    description: "Monitor prices and execute conditional swaps on Celo DEXes. Set up automated trading strategies with risk management controls.",
    icon: "📈",
    color: "from-blue-500 to-indigo-600",
    features: [
      "Price monitoring across DEXes",
      "Conditional swap execution",
      "Risk management rules",
      "Portfolio tracking",
      "Stop-loss automation",
    ],
    defaultPrompt: `You are a Trading Agent operating on the Celo blockchain (Celo Sepolia testnet). You have a real on-chain wallet and can execute real transactions.

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
- Never reveal private keys or sensitive wallet information`,
    defaultConfig: {
      tradingPairs: ["CELO/cUSD"],
      maxSlippage: 1.0,
      stopLossPercentage: 5.0,
    },
  },
  {
    id: "forex",
    name: "Forex Trader",
    description: "Monitor Mento stablecoin exchange rates, execute swaps between CELO and cUSD/cEUR/cREAL, analyze market conditions, and manage a forex trading portfolio on Celo.",
    icon: "💹",
    color: "from-yellow-500 to-amber-600",
    features: [
      "Live Mento exchange rate monitoring",
      "SortedOracles price feeds (on-chain)",
      "CELO ↔ cUSD/cEUR/cREAL swaps via Mento",
      "Portfolio valuation & tracking",
      "Forex analysis & trading signals",
      "Automated rate alerts (via OpenClaw cron)",
    ],
    defaultPrompt: `You are a Forex Trader Agent operating on the Celo blockchain (Celo Sepolia testnet). You specialize in Mento stablecoin trading — monitoring exchange rates, executing swaps, and managing a multi-currency portfolio.

Your expertise:
1. Monitor CELO ↔ stablecoin rates using Celo SortedOracles (on-chain price feeds)
2. Execute swaps between CELO, cUSD, cEUR, and cREAL via the Mento Protocol
3. Analyze market conditions and provide trading signals
4. Track portfolio performance across all Celo assets
5. Alert on significant rate movements

Trading strategy:
- Always check current rates before recommending or executing trades
- Consider spread and slippage when quoting swaps
- Track position sizes and enforce risk limits
- Provide clear reasoning for trade recommendations
- Never exceed configured position size limits

When users ask about prices, rates, or market conditions, use your skills to fetch REAL on-chain data — never guess or fabricate numbers.

When users want to swap, always:
1. Get a quote first using MENTO_QUOTE
2. Show them the rate and expected output
3. Ask for confirmation on amounts > 10
4. Execute the swap

Supported pairs: CELO/cUSD, CELO/cEUR, CELO/cREAL, cUSD/cEUR (cross-stable via CELO)`,
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
    description: "Engage with communities across Telegram and Twitter. Automate responses, distribute tips, and manage social interactions.",
    icon: "💬",
    color: "from-purple-500 to-pink-600",
    features: [
      "Telegram bot integration",
      "Twitter/X automation",
      "Community engagement",
      "Tip distribution",
      "Automated responses",
    ],
    defaultPrompt: `You are a Social Agent representing a project on the Celo blockchain (Celo Sepolia testnet). You have a real on-chain wallet and can send tips.

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
- The recipient MUST be a valid 0x address (42 characters)`,
    defaultConfig: {
      platforms: ["telegram"],
      autoReply: true,
      tipAmount: 0.5,
    },
  },
  {
    id: "custom",
    name: "Custom Agent",
    description: "Start from scratch with a blank canvas. Define your own prompts, tools, and configuration for any use case on Celo.",
    icon: "🔧",
    color: "from-orange-500 to-red-600",
    features: [
      "Blank canvas with OpenClaw base",
      "User-defined system prompts",
      "Flexible tool configuration",
      "Custom API endpoints",
      "Full Celo blockchain access",
    ],
    defaultPrompt: `You are a custom AI agent operating on the Celo blockchain (Celo Sepolia testnet). You have a real on-chain wallet and can execute real transactions.

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

Customize this prompt to define your agent's specific role and behavior.`,
    defaultConfig: {
      tools: [],
      customEndpoints: [],
    },
  },
];

// Navigation items
export const NAV_ITEMS = [
  { name: "Overview", href: "/dashboard", icon: "LayoutDashboard" },
  { name: "My Agents", href: "/dashboard/agents", icon: "Bot" },
  { name: "Create Agent", href: "/dashboard/agents/new", icon: "PlusCircle" },
  { name: "Analytics", href: "/dashboard/analytics", icon: "BarChart3" },
  { name: "Settings", href: "/dashboard/settings", icon: "Settings" },
] as const;
