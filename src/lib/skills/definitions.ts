/**
 * Skill Definitions
 *
 * Declarative metadata for every skill the agent system knows about.
 * Each entry describes id, name, command tag, params, examples, and flags.
 *
 * Imported by the registry (registry.ts) which wires each definition to
 * its handler and exposes the public API.
 */

import type { SkillDefinition } from "./types";

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
  {
    id: "price_track",
    name: "Record & Show Prices",
    description: "Record current Mento asset prices and show recent price history",
    category: "forex",
    commandTag: "PRICE_TRACK",
    params: [
      { name: "pair", description: "Pair to track (e.g. cUSD) or 'all'", required: false, example: "all" },
    ],
    examples: [
      { input: "track all prices", output: "[[PRICE_TRACK|all]]" },
      { input: "record cUSD price", output: "[[PRICE_TRACK|cUSD]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "price_trend",
    name: "Price Trend Analysis",
    description: "Analyze price trends for Mento assets: direction, change %, momentum",
    category: "forex",
    commandTag: "PRICE_TREND",
    params: [
      { name: "pair", description: "Pair to analyze (e.g. CELO/cUSD) or 'all'", required: false, example: "CELO/cUSD" },
      { name: "period", description: "Period in minutes (default 60)", required: false, example: "60" },
    ],
    examples: [
      { input: "what's the cUSD trend?", output: "[[PRICE_TREND|CELO/cUSD|60]]" },
      { input: "show all trends for the last hour", output: "[[PRICE_TREND|all|60]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "price_predict",
    name: "Price Prediction",
    description: "Momentum-based price prediction for Mento assets with confidence levels",
    category: "forex",
    commandTag: "PRICE_PREDICT",
    params: [
      { name: "pair", description: "Pair to predict (e.g. CELO/cUSD) or 'all'", required: false, example: "CELO/cUSD" },
    ],
    examples: [
      { input: "predict CELO/cUSD price", output: "[[PRICE_PREDICT|CELO/cUSD]]" },
      { input: "give me predictions for all pairs", output: "[[PRICE_PREDICT|all]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  // ── SelfClaw / Agent Token Skills ─────────────────────────────────────
  {
    id: "agent_identity",
    name: "Agent Identity & Pipeline",
    description: "Show agent identity briefing: pipeline status (Identity → Wallet → Gas → ERC-8004 → Token → Liquidity) and next steps. Aligns with SelfClaw.",
    category: "defi",
    commandTag: "AGENT_IDENTITY",
    params: [],
    examples: [
      { input: "who are you? show your identity", output: "[[AGENT_IDENTITY]]" },
      { input: "what's your pipeline status?", output: "[[AGENT_IDENTITY]]" },
      { input: "what can I do next? show briefing", output: "[[AGENT_IDENTITY]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "agent_tokens",
    name: "Agent Token Info",
    description: "Show token, revenue, pools. PUBLIC — no auth. GET /agent, /economics, /pools",
    category: "defi",
    commandTag: "AGENT_TOKENS",
    params: [],
    examples: [
      { input: "what are your tokens?", output: "[[AGENT_TOKENS]]" },
      { input: "show me your revenue and pools", output: "[[AGENT_TOKENS]]" },
      { input: "do you have a token? what's your token address?", output: "[[AGENT_TOKENS]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "request_selfclaw_sponsorship",
    name: "Request SELFCLAW Sponsorship",
    description: "Request liquidity sponsorship (one per human). Requires ERC-8004 onchain identity first. Optional: pass tokenAddress if you just deployed. AUTH: Ed25519",
    category: "defi",
    commandTag: "REQUEST_SELFCLAW_SPONSORSHIP",
    params: [
      { name: "tokenAddress", description: "Optional — use if you just deployed (e.g. 0xcca2...)", required: false, example: "0xcca2c585368a65e0ae2a9a142520a238f8c87c14" },
    ],
    examples: [
      { input: "request SELFCLAW sponsorship", output: "[[REQUEST_SELFCLAW_SPONSORSHIP]]" },
      { input: "apply for sponsorship for the Genesis token I just deployed", output: "[[REQUEST_SELFCLAW_SPONSORSHIP|0xcca2c585368a65e0ae2a9a142520a238f8c87c14]]" },
    ],
    requiresWallet: false,
    mutatesState: true,
  },
  {
    id: "selfclaw_register_wallet",
    name: "Register Wallet with SelfClaw",
    description: "Register EVM wallet. AUTH: Ed25519 signed payload",
    category: "defi",
    commandTag: "SELFCLAW_REGISTER_WALLET",
    params: [],
    examples: [
      { input: "register your wallet with SelfClaw", output: "[[SELFCLAW_REGISTER_WALLET]]" },
      { input: "register with SelfClaw", output: "[[SELFCLAW_REGISTER_WALLET]]" },
    ],
    requiresWallet: true,
    mutatesState: true,
  },
  {
    id: "selfclaw_deploy_token",
    name: "Deploy Agent Token",
    description: "Deploy ERC20 and register with SelfClaw. Use 1B+ supply (billions) for sponsorship + wallet buffer. Skips if agent already has a token — use REQUEST_SELFCLAW_SPONSORSHIP instead.",
    category: "defi",
    commandTag: "SELFCLAW_DEPLOY_TOKEN",
    params: [
      { name: "name", description: "Token name", required: true, example: "MyAgent" },
      { name: "symbol", description: "Token symbol", required: true, example: "MAT" },
      { name: "supply", description: "Initial supply (default 10000000000 = 10B for sponsorship buffer)", required: false, example: "10000000000" },
    ],
    examples: [
      { input: "deploy a token named MyAgent symbol MAT", output: "[[SELFCLAW_DEPLOY_TOKEN|MyAgent|MAT|10000000000]]" },
      { input: "create a token for me", output: "[[SELFCLAW_DEPLOY_TOKEN|AgentToken|ATK|10000000000]]" },
      { input: "deploy FiRe and get it sponsored", output: "[[SELFCLAW_DEPLOY_TOKEN|FiRe|FIRE|10000000000]] then [[REQUEST_SELFCLAW_SPONSORSHIP]]" },
    ],
    requiresWallet: true,
    mutatesState: true,
  },
  {
    id: "selfclaw_log_revenue",
    name: "Log Revenue",
    description: "Log revenue. AUTH: Ed25519. Sources: api_fees, subscription, one_time, other",
    category: "defi",
    commandTag: "SELFCLAW_LOG_REVENUE",
    params: [
      { name: "amount", description: "Amount in USD", required: true, example: "100" },
      { name: "source", description: "Revenue source", required: true, example: "api_fees" },
      { name: "description", description: "Optional description", required: false, example: "Monthly API" },
    ],
    examples: [
      { input: "log $50 revenue from api fees", output: "[[SELFCLAW_LOG_REVENUE|50|api_fees|API revenue]]" },
      { input: "record $100 subscription revenue", output: "[[SELFCLAW_LOG_REVENUE|100|subscription]]" },
    ],
    requiresWallet: false,
    mutatesState: true,
  },
  {
    id: "selfclaw_log_cost",
    name: "Log Cost",
    description: "Log cost. AUTH: Ed25519. Categories: infra, compute, ai_credits, bandwidth, storage, other",
    category: "defi",
    commandTag: "SELFCLAW_LOG_COST",
    params: [
      { name: "amount", description: "Amount in USD", required: true, example: "25" },
      { name: "category", description: "Cost category", required: true, example: "compute" },
      { name: "description", description: "Optional description", required: false, example: "GPU usage" },
    ],
    examples: [
      { input: "log $25 compute cost", output: "[[SELFCLAW_LOG_COST|25|compute|GPU usage]]" },
      { input: "record $10 infra cost", output: "[[SELFCLAW_LOG_COST|10|infra]]" },
    ],
    requiresWallet: false,
    mutatesState: true,
  },
  {
    id: "save_selfclaw_api_key",
    name: "Save SelfClaw API Key",
    description: "Save the SelfClaw API key (sclaw_...) when the user provides it in chat. Use for agent-api (feed, skills, briefing).",
    category: "defi",
    commandTag: "SAVE_SELFCLAW_API_KEY",
    params: [
      { name: "apiKey", description: "Full SelfClaw API key (sclaw_...) from user", required: true, example: "sclaw_abc123..." },
    ],
    examples: [
      { input: "here's my SelfClaw API key: sclaw_abc123...", output: "[[SAVE_SELFCLAW_API_KEY|sclaw_abc123...]]" },
      { input: "save this key sclaw_xyz789", output: "[[SAVE_SELFCLAW_API_KEY|sclaw_xyz789]]" },
    ],
    requiresWallet: false,
    mutatesState: true,
  },
  // ── Celo MCP-Equivalent (Blockchain Data) Skills ────────────────────────────
  {
    id: "network_status",
    name: "Network Status",
    description: "Get Celo network status: chain ID, latest block, gas price",
    category: "data",
    commandTag: "GET_NETWORK_STATUS",
    params: [],
    examples: [
      { input: "what's the network status?", output: "[[GET_NETWORK_STATUS]]" },
      { input: "is Celo up? latest block?", output: "[[GET_NETWORK_STATUS]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "get_block",
    name: "Get Block",
    description: "Fetch block info by number, hash, or 'latest'",
    category: "data",
    commandTag: "GET_BLOCK",
    params: [
      { name: "blockId", description: "Block number, hash, or 'latest'", required: true, example: "latest" },
    ],
    examples: [
      { input: "show me the latest block", output: "[[GET_BLOCK|latest]]" },
      { input: "block 58900000", output: "[[GET_BLOCK|58900000]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "get_latest_blocks",
    name: "Latest Blocks",
    description: "Get recent blocks (up to 100)",
    category: "data",
    commandTag: "GET_LATEST_BLOCKS",
    params: [
      { name: "count", description: "Number of blocks (default 10)", required: false, example: "10" },
    ],
    examples: [
      { input: "show last 5 blocks", output: "[[GET_LATEST_BLOCKS|5]]" },
      { input: "recent blocks", output: "[[GET_LATEST_BLOCKS]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "get_transaction",
    name: "Get Transaction",
    description: "Get transaction details by hash",
    category: "data",
    commandTag: "GET_TRANSACTION",
    params: [
      { name: "txHash", description: "Transaction hash (0x...)", required: true, example: "0x1234..." },
    ],
    examples: [
      { input: "status of tx 0xabc...", output: "[[GET_TRANSACTION|0xabc...]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "get_token_info",
    name: "Token Info",
    description: "Get ERC20 token metadata: name, symbol, decimals, supply",
    category: "data",
    commandTag: "GET_TOKEN_INFO",
    params: [
      { name: "tokenAddress", description: "Token contract address", required: true, example: "0x765DE816845861e75A25fCA122bb6898B8B1282a" },
    ],
    examples: [
      { input: "info on cUSD token", output: "[[GET_TOKEN_INFO|0x765DE816845861e75A25fCA122bb6898B8B1282a]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "get_token_balance",
    name: "Token Balance",
    description: "Get ERC20 token balance for an address",
    category: "data",
    commandTag: "GET_TOKEN_BALANCE",
    params: [
      { name: "tokenAddress", description: "Token contract address", required: true, example: "0x765DE816845861e75A25fCA122bb6898B8B1282a" },
      { name: "address", description: "Owner address", required: true, example: "0xABC...123" },
    ],
    examples: [
      { input: "how much cUSD does 0xABC have?", output: "[[GET_TOKEN_BALANCE|0x765DE816845861e75A25fCA122bb6898B8B1282a|0xABC...]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "get_nft_info",
    name: "NFT Info",
    description: "Get NFT contract metadata (ERC721/ERC1155)",
    category: "data",
    commandTag: "GET_NFT_INFO",
    params: [
      { name: "contractAddress", description: "NFT contract address", required: true, example: "0x..." },
      { name: "tokenId", description: "Optional token ID for URI", required: false, example: "1" },
    ],
    examples: [
      { input: "info on this NFT", output: "[[GET_NFT_INFO|0x...|1]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "get_nft_balance",
    name: "NFT Balance",
    description: "Get NFT balance for an address (ERC721 or ERC1155)",
    category: "data",
    commandTag: "GET_NFT_BALANCE",
    params: [
      { name: "contractAddress", description: "NFT contract address", required: true, example: "0x..." },
      { name: "ownerAddress", description: "Owner address", required: true, example: "0xABC..." },
      { name: "tokenId", description: "Token ID (required for ERC1155)", required: false, example: "1" },
    ],
    examples: [
      { input: "how many NFTs does 0xABC hold?", output: "[[GET_NFT_BALANCE|0x...|0xABC...]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "estimate_gas",
    name: "Estimate Gas",
    description: "Estimate gas for a contract call",
    category: "data",
    commandTag: "ESTIMATE_GAS",
    params: [
      { name: "contractAddress", description: "Contract address", required: true, example: "0x..." },
      { name: "functionName", description: "Function to call", required: true, example: "balanceOf" },
      { name: "args", description: "Comma-separated args (optional)", required: false, example: "0xABC..." },
    ],
    examples: [
      { input: "estimate gas for balanceOf", output: "[[ESTIMATE_GAS|0x...|balanceOf|0xABC...]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "get_gas_fee_data",
    name: "Gas Fee Data",
    description: "Get EIP-1559 gas fee data (baseFee, maxFee, priorityFee)",
    category: "data",
    commandTag: "GET_GAS_FEE_DATA",
    params: [],
    examples: [
      { input: "current gas fees?", output: "[[GET_GAS_FEE_DATA]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "get_governance_proposals",
    name: "Governance Proposals",
    description: "List Celo governance proposals (requires CELO_GOVERNANCE_API_URL)",
    category: "data",
    commandTag: "GET_GOVERNANCE_PROPOSALS",
    params: [
      { name: "limit", description: "Max proposals (default 10)", required: false, example: "5" },
    ],
    examples: [
      { input: "active governance proposals?", output: "[[GET_GOVERNANCE_PROPOSALS|5]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "get_proposal_details",
    name: "Proposal Details",
    description: "Get details for a governance proposal by ID",
    category: "data",
    commandTag: "GET_PROPOSAL_DETAILS",
    params: [
      { name: "proposalId", description: "Proposal ID", required: true, example: "277" },
    ],
    examples: [
      { input: "details of proposal 277", output: "[[GET_PROPOSAL_DETAILS|277]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  // ── QR Code Skills ────────────────────────────────────────────────────────
  {
    id: "generate_qr",
    name: "Generate QR Code",
    description: "Generate a QR code from text or URL. Returns an image the user can scan. Tracks generation in activity log.",
    category: "data",
    commandTag: "GENERATE_QR",
    params: [
      { name: "content", description: "Text or URL to encode (e.g. https://example.com, payment address)", required: true, example: "https://agenthaus.space" },
    ],
    examples: [
      { input: "generate a QR code for https://example.com", output: "[[GENERATE_QR|https://example.com]]" },
      { input: "create a QR for my payment address 0xABC...", output: "[[GENERATE_QR|0xABC...]]" },
      { input: "make a QR code and send it", output: "[[GENERATE_QR|<content>]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "list_qr_history",
    name: "List QR History",
    description: "Show recently generated QR codes for this agent (tracking).",
    category: "data",
    commandTag: "LIST_QR_HISTORY",
    params: [
      { name: "limit", description: "Max items (default 10)", required: false, example: "10" },
    ],
    examples: [
      { input: "show my QR history", output: "[[LIST_QR_HISTORY]]" },
      { input: "what QRs have I generated?", output: "[[LIST_QR_HISTORY|5]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  // ── Reputation / Feedback ─────────────────────────────────────────────
  {
    id: "request_feedback",
    name: "Request Feedback",
    description: "Show an inline rating widget so the user can rate this agent on-chain (ERC-8004 Reputation Registry). Use after completing a task the user asked for.",
    category: "social",
    commandTag: "REQUEST_FEEDBACK",
    params: [],
    examples: [
      { input: "user asked for payment and you sent it", output: "[[REQUEST_FEEDBACK]]" },
      { input: "you completed a swap or answered a question", output: "[[REQUEST_FEEDBACK]]" },
      { input: "task done, user satisfied", output: "[[REQUEST_FEEDBACK]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
  {
    id: "price_alerts",
    name: "Price Alerts",
    description: "Check for significant price movements, volatility spikes, and crossovers",
    category: "forex",
    commandTag: "PRICE_ALERTS",
    params: [
      { name: "threshold", description: "Minimum % change to alert (default 2)", required: false, example: "2" },
    ],
    examples: [
      { input: "any price alerts?", output: "[[PRICE_ALERTS|2]]" },
      { input: "check for big moves", output: "[[PRICE_ALERTS|1]]" },
    ],
    requiresWallet: false,
    mutatesState: false,
  },
];

export default SKILL_DEFINITIONS;

