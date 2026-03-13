/**
 * Skill Definitions
 *
 * Declarative metadata for every skill the agent system knows about.
 * Each entry describes id, name, command tag, params, examples, and flags.
 *
 * Imported by the registry (registry.ts) which wires each definition to
 * its handler and exposes the public API.
 */

import { z } from "zod";
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
    zodSchema: z.object({
      to: z.string().describe("Recipient 0x address"),
      amount: z.string().describe("Amount in CELO (e.g. 1.5)"),
    }),
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
  {
    id: "check_token_price",
    name: "Check Token Price",
    description: "Get the current USD price for any Celo token (UGXm, KESm, cUSD, etc.) with fallback API support",
    category: "oracle",
    commandTag: "CHECK_PRICE",
    params: [
      { name: "token", description: "Token symbol or address", required: true, example: "UGXm" },
    ],
    zodSchema: z.object({
      token: z.string().describe("Token symbol or address (e.g. UGXm, cUSD)"),
    }),
    examples: [
      { input: "what is the price of UGXm?", output: "[[CHECK_PRICE|UGXm]]" },
      { input: "check price for 0xcebA93...118C", output: "[[CHECK_PRICE|0xcebA9300f2b948710d2653dD7B07f33A8B32118C]]" },
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

  {
    id: "synthesis_register",
    name: "Synthesis Hackathon Register",
    description: "Register this agent with the Synthesis hackathon API and store the returned apiKey + on-chain identity.",
    category: "data",
    commandTag: "SYNTHESIS_REGISTER",
    params: [
      { name: "name", description: "Agent name", required: true, example: "My Agent" },
      { name: "description", description: "What the agent does", required: true, example: "A trading assistant for Celo" },
      { name: "agentHarness", description: "Agent harness (openclaw, copilot, etc.)", required: true, example: "openclaw" },
      { name: "model", description: "Primary model name (e.g. gpt-4o)", required: true, example: "gpt-4o" },
      { name: "humanName", description: "Your full name", required: true, example: "Jane Doe" },
      { name: "humanEmail", description: "Your email", required: true, example: "jane@example.com" },
      { name: "problemToSolve", description: "What problem you are solving", required: true, example: "Helping users trade better on Celo" },
      { name: "social", description: "Social handle (optional)", required: false, example: "@jane" },
      { name: "background", description: "Background (Builder/Product/Designer/etc.)", required: false, example: "Builder" },
      { name: "cryptoExperience", description: "Crypto experience (yes/no/a little)", required: false, example: "a little" },
      { name: "aiAgentExperience", description: "AI agent experience (yes/no/a little)", required: false, example: "yes" },
      { name: "codingComfort", description: "Coding comfort 1-10", required: false, example: "7" },
    ],
    examples: [
      {
        input: "register this agent for the Synthesis hackathon",
        output: "[[SYNTHESIS_REGISTER|My Agent|A trading assistant on Celo|openclaw|gpt-4o|Jane Doe|jane@example.com|Helping users trade better on Celo|@jane|Builder|a little|yes|7]]",
      },
      {
        input: "I only know my email so far",
        output: "[[SYNTHESIS_REGISTER|humanEmail=jane@example.com]]",
      },
    ],
    requiresWallet: false,
    mutatesState: true,
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
  {
    id: "create_price_trigger",
    name: "Create Price Trigger",
    description: "Create an automated task triggered by token price movements (e.g. buy when UGX increases 10%)",
    category: "trading",
    commandTag: "CREATE_PRICE_TRIGGER",
    params: [
      { name: "token", description: "Token symbol (e.g. UGXm, KESm, cUSD)", required: true, example: "UGXm" },
      { name: "condition", description: "Condition: price_above, price_below, percentage_increase, percentage_decrease", required: true, example: "percentage_increase" },
      { name: "target", description: "Target value or percentage (e.g. 10.0 for 10%)", required: true, example: "10.0" },
      { name: "action", description: "The skill command to run (e.g. [[MENTO_SWAP|cUSD|KESm|50]])", required: true, example: "[[MENTO_SWAP|cUSD|KESm|50]]" },
    ],
    examples: [
      { input: "swap 100 cUSD for KESm if KESm increases 10%", output: "[[CREATE_PRICE_TRIGGER|KESm|percentage_increase|10.0|[[MENTO_SWAP|cUSD|KESm|100]]]]" },
    ],
    requiresWallet: true,
    mutatesState: true,
  },
  {
    id: "create_time_trigger",
    name: "Create Time Trigger",
    description: "Create an automated task triggered at a specific time or recurring schedule (CRON)",
    category: "trading",
    commandTag: "CREATE_TIME_TRIGGER",
    params: [
      { name: "trigger", description: "ISO date-time or CRON expression (e.g. '2024-12-01T15:00:00Z' or '0 0 * * 5')", required: true, example: "0 0 * * 5" },
      { name: "action", description: "The skill command to run (e.g. [[MENTO_SWAP|cUSD|KESm|50]])", required: true, example: "[[MENTO_SWAP|cUSD|KESm|50]]" },
    ],
    examples: [
      { input: "buy 50 UGXm at 3:00 PM today", output: "[[CREATE_TIME_TRIGGER|2026-03-09T15:00:00.000Z|[[MENTO_SWAP|cUSD|UGXm|50]]]]" },
      { input: "stake 10% of my cUSD every Friday", output: "[[CREATE_TIME_TRIGGER|0 0 * * 5|[[EXECUTE_STAKE|cUSD|0.1]]]]" },
    ],
    requiresWallet: true,
    mutatesState: true,
  },
];

export default SKILL_DEFINITIONS;

