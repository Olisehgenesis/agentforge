/**
 * ERC-8004 (Trustless Agents) — On-chain Integration
 *
 * Reference: https://github.com/erc-8004/erc-8004-contracts
 *
 * Three registries:
 *   1. IdentityRegistry   — ERC-721 per agent, stores agentURI (registration JSON)
 *   2. ReputationRegistry — Signed fixed-point feedback signals
 *   3. ValidationRegistry — TEE / zkTLS / crypto-economic validation hooks
 *
 * Deployed on 20+ chains with vanity addresses (0x8004…):
 *   Mainnets: Identity 0x8004A169…, Reputation 0x8004BAa1…
 *   Testnets: Identity 0x8004A818…, Reputation 0x8004B663…
 *
 * Supported chains: Celo, Ethereum, Base, Polygon, Arbitrum, Optimism,
 *   Linea, Avalanche, BSC, Scroll, Gnosis, Taiko, MegaETH, Monad
 */

import {
  type Address,
  type PublicClient,
  type WalletClient,
  encodeFunctionData,
  decodeEventLog,
  type Hash,
  type TransactionReceipt,
  getAddress,
} from "viem";
import { type ERC8004Registration } from "@/lib/types";
import { IDENTITY_REGISTRY_ABI, REPUTATION_REGISTRY_ABI } from "./erc8004-abis";

// ─── Per-chain contract addresses ──────────────────────────────────────────────
// Source: https://github.com/erc-8004/erc-8004-contracts#contract-addresses
//
// Mainnet vanity addresses: Identity 0x8004A169…, Reputation 0x8004BAa1…
// Testnet vanity addresses: Identity 0x8004A818…, Reputation 0x8004B663…
const MAINNET_CONTRACTS = {
  identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as Address,
  reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as Address,
};
const TESTNET_CONTRACTS = {
  identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e" as Address,
  reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713" as Address,
};

export const ERC8004_ADDRESSES: Record<
  number,
  { identityRegistry: Address; reputationRegistry: Address } | undefined
> = {
  // ── Celo ──
  42220: MAINNET_CONTRACTS,       // Celo Mainnet
  11142220: TESTNET_CONTRACTS,    // Celo Testnet (Alfajores / Sepolia)

  // ── Ethereum ──
  1: MAINNET_CONTRACTS,           // Ethereum Mainnet
  11155111: TESTNET_CONTRACTS,    // Ethereum Sepolia

  // ── Base ──
  8453: MAINNET_CONTRACTS,        // Base Mainnet
  84532: TESTNET_CONTRACTS,       // Base Sepolia

  // ── Polygon ──
  137: MAINNET_CONTRACTS,         // Polygon Mainnet
  80002: TESTNET_CONTRACTS,       // Polygon Amoy

  // ── Arbitrum ──
  42161: MAINNET_CONTRACTS,       // Arbitrum One
  421614: TESTNET_CONTRACTS,      // Arbitrum Sepolia

  // ── Optimism ──
  10: MAINNET_CONTRACTS,          // Optimism Mainnet
  11155420: TESTNET_CONTRACTS,    // Optimism Sepolia

  // ── Linea ──
  59144: MAINNET_CONTRACTS,       // Linea Mainnet
  59141: TESTNET_CONTRACTS,       // Linea Sepolia

  // ── Avalanche ──
  43114: MAINNET_CONTRACTS,       // Avalanche C-Chain
  43113: TESTNET_CONTRACTS,       // Avalanche Fuji

  // ── BSC ──
  56: MAINNET_CONTRACTS,          // BSC Mainnet
  97: TESTNET_CONTRACTS,          // BSC Testnet

  // ── Scroll ──
  534352: MAINNET_CONTRACTS,      // Scroll Mainnet
  534351: TESTNET_CONTRACTS,      // Scroll Sepolia

  // ── Gnosis ──
  100: MAINNET_CONTRACTS,         // Gnosis Mainnet

  // ── Taiko ──
  167000: MAINNET_CONTRACTS,      // Taiko Mainnet

  // ── MegaETH ──
  // 6342: MAINNET_CONTRACTS,     // MegaETH Mainnet (uncomment when chain ID confirmed)
  // 6342001: TESTNET_CONTRACTS,  // MegaETH Testnet

  // ── Monad ──
  // 10143: TESTNET_CONTRACTS,    // Monad Testnet (uncomment when chain ID confirmed)
};

/** Resolve contract addresses for a given chain, with env-var overrides */
export function getERC8004Addresses(chainId: number): {
  identityRegistry: Address;
  reputationRegistry: Address;
} | null {
  // Check env overrides first (useful for testnet deployments)
  const envIdentity = process.env.NEXT_PUBLIC_ERC8004_IDENTITY;
  const envReputation = process.env.NEXT_PUBLIC_ERC8004_REPUTATION;

  if (envIdentity && envReputation) {
    return {
      identityRegistry: getAddress(envIdentity),
      reputationRegistry: getAddress(envReputation),
    };
  }

  return ERC8004_ADDRESSES[chainId] ?? null;
}

// Re-export ABIs for consumers that import from this file
export { IDENTITY_REGISTRY_ABI, REPUTATION_REGISTRY_ABI } from "./erc8004-abis";

// ─── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Generate ERC-8004 agent registration JSON.
 * This follows the spec's recommended registration file shape.
 *
 * @see https://github.com/erc-8004/erc-8004-contracts#agent-registration-file-recommended-shape
 */
export function generateRegistrationJSON(
  name: string,
  description: string,
  serviceUrl: string,
  agentWalletAddress?: string,
  chainId: number = 42220,
  erc8004AgentId?: string
): ERC8004Registration {
  const addresses = getERC8004Addresses(chainId);
  const identityRegistry = addresses?.identityRegistry ?? "0x0000000000000000000000000000000000000000";

  return {
    type: "agent-registration-v1",
    name,
    description,
    image: `${serviceUrl.replace(/\/api\/.*/, "")}/icon.png`,
    services: [
      {
        type: "agenthaus-chat",
        url: serviceUrl,
        description: "AgentHaus agent chat endpoint",
      },
    ],
    registrations: [
      {
        agentRegistry: `eip155:${chainId}:${identityRegistry}`,
        agentId: erc8004AgentId ?? "pending",
      },
    ],
    supportedTrust: ["reputation"],
    // Extended fields
    agentWallet: agentWalletAddress,
    chainId,
    framework: "agenthaus",
  };
}

/**
 * Register an agent on-chain via the ERC-8004 IdentityRegistry.
 * Called from the client via the user's wagmi wallet.
 *
 * The contract's register(string agentURI) mints the identity NFT
 * to msg.sender, so the connected wallet becomes the agent owner on-chain.
 *
 * If `agentName` is provided, uses the register(agentURI, metadata[]) overload
 * to store the name on-chain as a "name" metadata entry.
 *
 * @returns Transaction hash
 */
export async function registerAgent(
  walletClient: WalletClient,
  identityRegistryAddress: Address,
  ownerAddress: Address,
  agentURI: string,
  agentName?: string
): Promise<Hash> {
  let data: `0x${string}`;

  if (agentName) {
    // Use the register(agentURI, metadata[]) overload to store name on-chain
    // metadata is tuple[]: [{ metadataKey: string, metadataValue: bytes }]
    // Encode the name as UTF-8 bytes for the metadataValue
    const nameBytes = `0x${Buffer.from(agentName, "utf-8").toString("hex")}` as `0x${string}`;
    data = encodeFunctionData({
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "register",
      args: [
        agentURI,
        [{ metadataKey: "name", metadataValue: nameBytes }],
      ],
    });
  } else {
    data = encodeFunctionData({
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [agentURI],
  });
  }

  const hash = await walletClient.sendTransaction({
    to: identityRegistryAddress,
    data,
    account: ownerAddress,
    chain: walletClient.chain,
  });

  return hash;
}

/**
 * Parse the Registered event from a tx receipt to extract the on-chain agentId.
 *
 * The ERC-8004 IdentityRegistry emits:
 *   event Registered(uint256 indexed agentId, string agentURI, address indexed owner)
 */
export function parseAgentRegisteredEvent(
  receipt: TransactionReceipt
): { agentId: bigint; owner: Address; agentURI: string } | null {
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: IDENTITY_REGISTRY_ABI,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === "Registered") {
        const args = decoded.args as {
          agentId: bigint;
          agentURI: string;
          owner: Address;
        };
        return {
          agentId: args.agentId,
          owner: args.owner,
          agentURI: args.agentURI,
        };
      }
    } catch {
      // Not our event, skip
    }
  }

  // Fallback: try to extract from Transfer event (ERC-721 mint from 0x0)
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: IDENTITY_REGISTRY_ABI,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === "Transfer") {
        const args = decoded.args as {
          from: Address;
          to: Address;
          tokenId: bigint;
        };
        // Mint = transfer from 0x0
        if (args.from === "0x0000000000000000000000000000000000000000") {
          return {
            agentId: args.tokenId,
            owner: args.to,
            agentURI: "",
          };
        }
      }
    } catch {
      // Not our event, skip
    }
  }

  return null;
}

/**
 * Update agent URI on-chain.
 */
export async function updateAgentURI(
  walletClient: WalletClient,
  identityRegistryAddress: Address,
  agentId: bigint,
  newURI: string,
  ownerAddress: Address
): Promise<Hash> {
  const data = encodeFunctionData({
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "setAgentURI",
    args: [agentId, newURI],
  });

  return walletClient.sendTransaction({
    to: identityRegistryAddress,
    data,
    account: ownerAddress,
    chain: walletClient.chain,
  });
}

/**
 * Get the on-chain agent wallet for a given agentId.
 */
export async function getOnChainAgentWallet(
  publicClient: PublicClient,
  identityRegistryAddress: Address,
  agentId: bigint
): Promise<Address> {
  const result = await publicClient.readContract({
    address: identityRegistryAddress,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "getAgentWallet",
    args: [agentId],
  });

  return result as Address;
}

/**
 * Get the tokenURI (agent registration JSON URL) for a given agentId.
 */
export async function getAgentTokenURI(
  publicClient: PublicClient,
  identityRegistryAddress: Address,
  agentId: bigint
): Promise<string> {
  const result = await publicClient.readContract({
    address: identityRegistryAddress,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "tokenURI",
    args: [agentId],
  });

  return result as string;
}

/**
 * Get the owner of an agent NFT.
 */
export async function getAgentOwner(
  publicClient: PublicClient,
  identityRegistryAddress: Address,
  agentId: bigint
): Promise<Address> {
  const result = await publicClient.readContract({
    address: identityRegistryAddress,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "ownerOf",
    args: [agentId],
  });

  return result as Address;
}

/**
 * Get reputation summary for an agent.
 */
export async function getReputationSummary(
  publicClient: PublicClient,
  reputationRegistryAddress: Address,
  agentId: bigint,
  clientAddresses: Address[],
  tag1: string = "",
  tag2: string = ""
): Promise<{ count: number; value: number; decimals: number }> {
  const result = await publicClient.readContract({
    address: reputationRegistryAddress,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "getSummary",
    args: [agentId, clientAddresses, tag1, tag2],
  });

  const [count, summaryValue, summaryValueDecimals] = result as [bigint, bigint, number];

  return {
    count: Number(count),
    value: Number(summaryValue) / Math.pow(10, summaryValueDecimals),
    decimals: summaryValueDecimals,
  };
}

/**
 * Check if the ERC-8004 IdentityRegistry is deployed on a given chain.
 * Calls `balanceOf(0x0)` as a low-cost check.
 */
export async function isRegistryDeployed(
  publicClient: PublicClient,
  identityRegistryAddress: Address
): Promise<boolean> {
  try {
    await publicClient.readContract({
      address: identityRegistryAddress,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "balanceOf",
      args: ["0x0000000000000000000000000000000000000001"],
    });
    return true;
  } catch {
    return false;
  }
}

