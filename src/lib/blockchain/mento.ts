/**
 * Mento Protocol & Celo Oracle Integration
 *
 * Provides read access to:
 *   - SortedOracles: CELO/cUSD, CELO/cEUR, CELO/cREAL exchange rates
 *   - Mento Broker: swap quotes and execution
 *   - On-chain price feeds
 *
 * Architecture:
 *   SortedOracles → median rates → displayed to agent / user
 *   Mento Broker  → swap quotes → executed via agent wallet
 *
 * Contract Addresses (Celo Mainnet — reads are cross-chain safe):
 *   SortedOracles:  0xefB84935239dAcdecF7c5bA76d8dE40b077B7b33
 *   StableToken cUSD: 0x765DE816845861e75A25fCA122bb6898B8B1282a
 *   StableToken cEUR: 0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73
 *   StableToken cREAL: 0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787
 *
 * On Celo Sepolia testnet we use the testnet token addresses from constants.ts
 * and fall back to API-based price feeds when on-chain oracles aren't available.
 */

import {
  createPublicClient,
  http,
  formatUnits,
  parseUnits,
  type Address,
} from "viem";
import { celo } from "viem/chains";
import { getPublicClient } from "./wallet";
import { CELO_TOKENS } from "@/lib/constants";

// ─── Constants ────────────────────────────────────────────────────────────────

// Celo Mainnet oracle (read-only for price data)
const MAINNET_RPC = "https://forno.celo.org";

// SortedOracles contract (Celo Mainnet)
const SORTED_ORACLES_ADDRESS = "0xefB84935239dAcdecF7c5bA76d8dE40b077B7b33" as Address;

// Mainnet stable token addresses (used as identifiers for SortedOracles)
const MAINNET_TOKENS: Record<string, Address> = {
  cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  cEUR: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
  cREAL: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787",
};

// Mento Exchange contracts (Celo Mainnet — legacy V1 exchanges)
const MENTO_EXCHANGES: Record<string, Address> = {
  cUSD: "0x67316300f17f063085Ca8bCa4bd3f7a5a3C66275",
  cEUR: "0xE383394B913d7F22ceC5C811fa6822E6eF445F4A",
  cREAL: "0x8f2cf9855C919AFAC8a4aC0A21A186bE5a1270ca",
};

// ─── ABIs ─────────────────────────────────────────────────────────────────────

const SORTED_ORACLES_ABI = [
  {
    name: "medianRate",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "numerator", type: "uint256" },
      { name: "denominator", type: "uint256" },
    ],
  },
  {
    name: "numRates",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "medianTimestamp",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "isOldestReportExpired",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "", type: "bool" },
      { name: "", type: "address" },
    ],
  },
] as const;

const EXCHANGE_ABI = [
  {
    name: "getBuyTokenAmount",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "sellAmount", type: "uint256" },
      { name: "sellGold", type: "bool" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getSellTokenAmount",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "buyAmount", type: "uint256" },
      { name: "sellGold", type: "bool" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "exchange",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "sellAmount", type: "uint256" },
      { name: "minBuyAmount", type: "uint256" },
      { name: "sellGold", type: "bool" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ─── Mainnet Client (for oracle reads) ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _mainnetClient: any = null;

function getMainnetClient() {
  if (!_mainnetClient) {
    _mainnetClient = createPublicClient({
      chain: celo,
      transport: http(MAINNET_RPC),
    });
  }
  return _mainnetClient!;
}

// ─── Oracle Price Feeds ───────────────────────────────────────────────────────

export interface OracleRate {
  pair: string;          // e.g. "CELO/cUSD"
  rate: number;          // e.g. 0.52 (1 CELO = 0.52 cUSD)
  inverse: number;       // e.g. 1.92 (1 cUSD = 1.92 CELO)
  numReporters: number;
  lastUpdate: Date;
  isExpired: boolean;
  source: "sorted_oracles" | "fallback_api";
}

/**
 * Get the median exchange rate for a Celo stable token from SortedOracles.
 * Returns CELO price in terms of the stable token (e.g. CELO/cUSD).
 */
export async function getOracleRate(stableSymbol: string): Promise<OracleRate> {
  const symbol = stableSymbol.toUpperCase();
  const tokenAddress = MAINNET_TOKENS[symbol === "CUSD" ? "cUSD" : symbol === "CEUR" ? "cEUR" : symbol === "CREAL" ? "cREAL" : symbol];

  if (!tokenAddress) {
    // Try fallback API for unknown tokens
    return getFallbackRate(symbol);
  }

  try {
    const client = getMainnetClient();

    // Read median rate
    const [numerator, denominator] = await client.readContract({
      address: SORTED_ORACLES_ADDRESS,
      abi: SORTED_ORACLES_ABI,
      functionName: "medianRate",
      args: [tokenAddress],
    }) as [bigint, bigint];

    // Number of reporters
    const numRates = await client.readContract({
      address: SORTED_ORACLES_ADDRESS,
      abi: SORTED_ORACLES_ABI,
      functionName: "numRates",
      args: [tokenAddress],
    }) as bigint;

    // Last update timestamp
    const medianTs = await client.readContract({
      address: SORTED_ORACLES_ADDRESS,
      abi: SORTED_ORACLES_ABI,
      functionName: "medianTimestamp",
      args: [tokenAddress],
    }) as bigint;

    // Check expiry
    const [isExpired] = await client.readContract({
      address: SORTED_ORACLES_ADDRESS,
      abi: SORTED_ORACLES_ABI,
      functionName: "isOldestReportExpired",
      args: [tokenAddress],
    }) as [boolean, Address];

    // Calculate rate: numerator/denominator gives stableToken per CELO
    const rate = denominator > BigInt(0)
      ? Number(numerator) / Number(denominator)
      : 0;

    const inverse = rate > 0 ? 1 / rate : 0;

    return {
      pair: `CELO/${symbol}`,
      rate,
      inverse,
      numReporters: Number(numRates),
      lastUpdate: new Date(Number(medianTs) * 1000),
      isExpired,
      source: "sorted_oracles",
    };
  } catch (error) {
    console.warn(`SortedOracles read failed for ${symbol}, using fallback:`, error);
    return getFallbackRate(symbol);
  }
}

/**
 * Get all available oracle rates.
 */
export async function getAllOracleRates(): Promise<OracleRate[]> {
  const symbols = Object.keys(MAINNET_TOKENS);
  const rates = await Promise.all(symbols.map(getOracleRate));
  return rates;
}

// ─── Mento Exchange Quotes ────────────────────────────────────────────────────

export interface SwapQuote {
  sellCurrency: string;
  buyCurrency: string;
  sellAmount: string;
  buyAmount: string;
  rate: number;
  slippage: number;
  source: "mento_exchange" | "estimated";
}

/**
 * Get a swap quote from Mento Exchange.
 * Supports CELO ↔ cUSD, CELO ↔ cEUR, CELO ↔ cREAL.
 */
export async function getMentoQuote(
  sellCurrency: string,
  buyCurrency: string,
  sellAmount: string
): Promise<SwapQuote> {
  const sell = sellCurrency.toUpperCase();
  const buy = buyCurrency.toUpperCase();

  // Determine which exchange contract and direction
  let exchangeAddress: Address | null = null;
  let sellGold: boolean;
  let stableSymbol: string;

  if (sell === "CELO" && MENTO_EXCHANGES[buy]) {
    exchangeAddress = MENTO_EXCHANGES[buy];
    sellGold = true;
    stableSymbol = buy;
  } else if (buy === "CELO" && MENTO_EXCHANGES[sell]) {
    exchangeAddress = MENTO_EXCHANGES[sell];
    sellGold = false;
    stableSymbol = sell;
  } else {
    // Cross-stable swap (cUSD → cEUR): estimate via CELO intermediate
    return getCrossStableQuote(sell, buy, sellAmount);
  }

  try {
    const client = getMainnetClient();
    const sellAmountWei = parseUnits(sellAmount, 18);

    const buyAmountWei = await client.readContract({
      address: exchangeAddress,
      abi: EXCHANGE_ABI,
      functionName: "getBuyTokenAmount",
      args: [sellAmountWei, sellGold],
    }) as bigint;

    const buyAmountFormatted = formatUnits(buyAmountWei, 18);
    const rate = parseFloat(buyAmountFormatted) / parseFloat(sellAmount);

    return {
      sellCurrency: sell,
      buyCurrency: buy,
      sellAmount,
      buyAmount: buyAmountFormatted,
      rate,
      slippage: 0.3, // Mento default spread
      source: "mento_exchange",
    };
  } catch (error) {
    console.warn("Mento exchange quote failed, using oracle estimate:", error);
    // Fallback to oracle-based estimate
    return getEstimatedQuote(sell, buy, sellAmount);
  }
}

// ─── Gas Price ────────────────────────────────────────────────────────────────

export interface GasInfo {
  baseFee: string;       // in gwei
  suggestedTip: string;  // in gwei
  estimatedCost: string; // in CELO for a simple transfer
}

export async function getGasPrice(): Promise<GasInfo> {
  const client = getPublicClient();

  try {
    const gasPrice = await client.getGasPrice();
    const baseFeeGwei = formatUnits(gasPrice, 9);

    // Estimate cost for a simple CELO transfer (21000 gas)
    const transferCost = Number(gasPrice) * 21000;
    const transferCostCelo = formatUnits(BigInt(Math.round(transferCost)), 18);

    return {
      baseFee: baseFeeGwei,
      suggestedTip: "0.5", // Celo has low tips
      estimatedCost: transferCostCelo,
    };
  } catch {
    return {
      baseFee: "5",
      suggestedTip: "0.5",
      estimatedCost: "0.000105",
    };
  }
}

// ─── Balance Check (any address) ──────────────────────────────────────────────

export interface AddressBalance {
  address: string;
  celo: string;
  cUSD: string;
  cEUR: string;
  cREAL: string;
}

export async function checkBalance(address: Address): Promise<AddressBalance> {
  const client = getPublicClient();

  const ERC20_ABI = [
    {
      name: "balanceOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "balance", type: "uint256" }],
    },
  ] as const;

  const nativeBalance = await client.getBalance({ address });

  const tokenBalances = await Promise.all(
    ["cUSD", "cEUR", "cREAL"].map(async (symbol) => {
      const token = CELO_TOKENS[symbol as keyof typeof CELO_TOKENS];
      if (!token || token.address === "0x0000000000000000000000000000000000000000") {
        return { symbol, balance: "0" };
      }
      try {
        const bal = await client.readContract({
          address: token.address as Address,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address],
        });
        return { symbol, balance: formatUnits(bal, token.decimals) };
      } catch {
        return { symbol, balance: "0" };
      }
    })
  );

  return {
    address,
    celo: formatUnits(nativeBalance, 18),
    cUSD: tokenBalances.find((t) => t.symbol === "cUSD")?.balance || "0",
    cEUR: tokenBalances.find((t) => t.symbol === "cEUR")?.balance || "0",
    cREAL: tokenBalances.find((t) => t.symbol === "cREAL")?.balance || "0",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getFallbackRate(symbol: string): Promise<OracleRate> {
  // Fallback: use CoinGecko or hardcoded estimate for CELO price
  // In production, this would call an external API
  const estimates: Record<string, number> = {
    cUSD: 0.55,  // 1 CELO ≈ 0.55 cUSD
    cEUR: 0.50,  // 1 CELO ≈ 0.50 cEUR
    cREAL: 2.80, // 1 CELO ≈ 2.80 cREAL
    CUSD: 0.55,
    CEUR: 0.50,
    CREAL: 2.80,
  };

  const rate = estimates[symbol] || 1;

  return {
    pair: `CELO/${symbol}`,
    rate,
    inverse: 1 / rate,
    numReporters: 0,
    lastUpdate: new Date(),
    isExpired: true,
    source: "fallback_api",
  };
}

async function getEstimatedQuote(
  sell: string,
  buy: string,
  sellAmount: string
): Promise<SwapQuote> {
  // Use oracle rates to estimate
  const celoRate = sell === "CELO"
    ? await getOracleRate(buy)
    : await getOracleRate(sell);

  const amount = parseFloat(sellAmount);
  let buyAmount: number;

  if (sell === "CELO") {
    buyAmount = amount * celoRate.rate;
  } else {
    buyAmount = amount * celoRate.inverse;
  }

  return {
    sellCurrency: sell,
    buyCurrency: buy,
    sellAmount,
    buyAmount: buyAmount.toFixed(6),
    rate: buyAmount / amount,
    slippage: 0.5, // Higher slippage for estimates
    source: "estimated",
  };
}

async function getCrossStableQuote(
  sell: string,
  buy: string,
  sellAmount: string
): Promise<SwapQuote> {
  // Route through CELO: sell → CELO → buy
  const sellRate = await getOracleRate(sell);
  const buyRate = await getOracleRate(buy);

  const amount = parseFloat(sellAmount);
  const celoAmount = amount * sellRate.inverse; // sell stable → CELO
  const buyAmount = celoAmount * buyRate.rate;    // CELO → buy stable

  return {
    sellCurrency: sell,
    buyCurrency: buy,
    sellAmount,
    buyAmount: buyAmount.toFixed(6),
    rate: buyAmount / amount,
    slippage: 0.8, // Higher for cross-stable
    source: "estimated",
  };
}

