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
 * Deployed addresses (vanity 0x8004…):
 *   Celo Mainnet:
 *     Identity:   0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
 *     Reputation: 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
 *   BSC Testnet:
 *     Identity:   0x8004A818BFB912233c491871b3d84c89A494BD9e
 *     Reputation: 0x8004B663056A597Dffe9eCcC1965A193B7388713
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

// ─── Per-chain contract addresses ──────────────────────────────────────────────
export const ERC8004_ADDRESSES: Record<
  number,
  { identityRegistry: Address; reputationRegistry: Address } | undefined
> = {
  // Celo Mainnet (42220)
  42220: {
    identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
  },
  // BSC Testnet (97)
  97: {
    identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
  },
  // Celo Sepolia Testnet (11142220) — same vanity addresses if deployed;
  // falls back to undefined → UI shows "Not deployed on this network"
  // You can override via env: NEXT_PUBLIC_ERC8004_IDENTITY, NEXT_PUBLIC_ERC8004_REPUTATION
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

// ─── IdentityRegistry ABI (IdentityRegistryUpgradeable.sol) ────────────────────
// Based on the ERC-8004 spec: https://github.com/erc-8004/erc-8004-contracts
export const IDENTITY_REGISTRY_ABI = [
  // ── Registration ──
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      { name: "agentURI", type: "string" },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  // ── URI Management ──
  {
    name: "setAgentURI",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "newURI", type: "string" },
    ],
    outputs: [],
  },
  // ── Agent Wallet ──
  // setAgentWallet requires proof of control of the new wallet (EIP-712 signature)
  {
    name: "setAgentWallet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "newWallet", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "getAgentWallet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "wallet", type: "address" }],
  },
  {
    name: "unsetAgentWallet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [],
  },
  // ── On-chain Metadata ──
  {
    name: "getMetadata",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "metadataKey", type: "bytes32" },
    ],
    outputs: [{ name: "value", type: "bytes" }],
  },
  {
    name: "setMetadata",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "metadataKey", type: "bytes32" },
      { name: "metadataValue", type: "bytes" },
    ],
    outputs: [],
  },
  // ── ERC-721 reads ──
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // ── Events ──
  {
    name: "AgentRegistered",
    type: "event",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "agentURI", type: "string", indexed: false },
    ],
  },
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
] as const;

// ─── ReputationRegistry ABI (ReputationRegistryUpgradeable.sol) ──────────────
// Feedback signals use signed fixed-point: value (int128) + valueDecimals (uint8)
// e.g. value=9977, decimals=2 → 99.77
export const REPUTATION_REGISTRY_ABI = [
  // ── Give Feedback ──
  {
    name: "giveFeedback",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "bytes32" },
      { name: "tag2", type: "bytes32" },
      { name: "endpointURI", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
  // ── Read Feedback ──
  {
    name: "readFeedback",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" },
      { name: "feedbackIndex", type: "uint256" },
    ],
    outputs: [
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "bytes32" },
      { name: "tag2", type: "bytes32" },
      { name: "endpointURI", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
      { name: "revoked", type: "bool" },
      { name: "timestamp", type: "uint256" },
    ],
  },
  // ── Aggregation ──
  {
    name: "getSummary",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "bytes32" },
      { name: "tag2", type: "bytes32" },
    ],
    outputs: [
      { name: "count", type: "uint256" },
      { name: "summaryValue", type: "int128" },
      { name: "summaryValueDecimals", type: "uint8" },
    ],
  },
  // ── Revocation ──
  {
    name: "revokeFeedback",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "feedbackIndex", type: "uint256" },
    ],
    outputs: [],
  },
  // ── Responses ──
  {
    name: "appendResponse",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" },
      { name: "feedbackIndex", type: "uint256" },
      { name: "responseURI", type: "string" },
      { name: "responseHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

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
        type: "agentforge-chat",
        url: serviceUrl,
        description: "AgentForge agent chat endpoint",
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
    framework: "agentforge",
  };
}

/**
 * Register an agent on-chain via the ERC-8004 IdentityRegistry.
 * Called from the client via the user's wagmi wallet.
 *
 * @returns Transaction hash
 */
export async function registerAgent(
  walletClient: WalletClient,
  identityRegistryAddress: Address,
  ownerAddress: Address,
  agentURI: string
): Promise<Hash> {
  const data = encodeFunctionData({
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [ownerAddress, agentURI],
  });

  const hash = await walletClient.sendTransaction({
    to: identityRegistryAddress,
    data,
    account: ownerAddress,
    chain: walletClient.chain,
  });

  return hash;
}

/**
 * Parse the AgentRegistered event from a tx receipt to extract the on-chain agentId.
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

      if (decoded.eventName === "AgentRegistered") {
        const args = decoded.args as {
          agentId: bigint;
          owner: Address;
          agentURI: string;
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
  tag1: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000",
  tag2: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000"
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

