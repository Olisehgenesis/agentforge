"use client";

import { useCallback, useState } from "react";
import { usePublicClient, useWalletClient, useChainId } from "wagmi";
import { type Address } from "viem";
import {
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
  registerAgent,
  parseAgentRegisteredEvent,
  isRegistryDeployed,
  getOnChainAgentWallet,
  getAgentTokenURI,
  getAgentOwner,
  getERC8004Addresses,
} from "@/lib/blockchain/erc8004";
import { BLOCK_EXPLORERS } from "@/lib/constants";

interface RegistrationResult {
  agentId: string;
  txHash: string;
  chainId: number;
  agentURI: string;
  explorerUrl: string;
}

interface UseERC8004Return {
  // Registration
  register: (
    ownerAddress: Address,
    internalAgentId: string // Our DB agent ID
  ) => Promise<RegistrationResult>;

  // Read operations
  getAgent: (agentId: bigint) => Promise<{
    owner: string;
    wallet: string;
    tokenURI: string;
  } | null>;
  checkDeployed: () => Promise<boolean>;

  // Chain info
  chainId: number;
  contractAddresses: { identityRegistry: Address; reputationRegistry: Address } | null;
  blockExplorerUrl: string;

  // State
  isRegistering: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * React hook for real ERC-8004 on-chain registration.
 *
 * Flow:
 * 1. Call `checkDeployed()` to verify contracts exist on current chain
 * 2. Call `register(ownerAddress, internalAgentId)`:
 *    a. Fetches registration data from /api/erc8004/register?agentId=...
 *    b. Calls register() on the IdentityRegistry (user pays gas)
 *    c. Waits for tx receipt, parses AgentRegistered event
 *    d. Saves on-chain data back to our API
 * 3. Returns { agentId, txHash, chainId, agentURI, explorerUrl }
 */
export function useERC8004(): UseERC8004Return {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractAddresses = getERC8004Addresses(chainId);
  const blockExplorerUrl = BLOCK_EXPLORERS[chainId] || "https://celo-sepolia.blockscout.com";

  /**
   * Check if the ERC-8004 IdentityRegistry is deployed on the current chain.
   */
  const checkDeployed = useCallback(async (): Promise<boolean> => {
    if (!publicClient || !contractAddresses) return false;

    try {
      return await isRegistryDeployed(
        publicClient,
        contractAddresses.identityRegistry
      );
    } catch {
      return false;
    }
  }, [publicClient, contractAddresses]);

  /**
   * Register an agent on-chain via ERC-8004 IdentityRegistry.
   *
   * This is the main function: it handles the full flow from
   * preparing data → on-chain tx → recording result in our DB.
   */
  const register = useCallback(
    async (
      ownerAddress: Address,
      internalAgentId: string
    ): Promise<RegistrationResult> => {
      if (!walletClient) throw new Error("Wallet not connected");
      if (!publicClient) throw new Error("Public client not available");
      if (!contractAddresses) {
        throw new Error(
          `ERC-8004 contracts not deployed on chain ${chainId}. ` +
          `Switch to Celo Mainnet (42220) or deploy contracts to your testnet.`
        );
      }

      setIsRegistering(true);
      setError(null);

      try {
        // 1. Get registration data from our API
        const prepRes = await fetch(`/api/erc8004/register?agentId=${internalAgentId}`);
        if (!prepRes.ok) {
          const err = await prepRes.json();
          throw new Error(err.error || "Failed to prepare registration");
        }
        const prepData = await prepRes.json();
        const agentURI: string = prepData.agentURI;

        // 2. Call register() on the IdentityRegistry
        // The user's wallet signs and pays gas
        const txHash = await registerAgent(
          walletClient,
          contractAddresses.identityRegistry,
          ownerAddress,
          agentURI
        );

        // 3. Wait for the transaction to be confirmed
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 1,
        });

        if (receipt.status === "reverted") {
          throw new Error("Transaction reverted on-chain. Check your CELO balance for gas.");
        }

        // 4. Parse the AgentRegistered event to get the on-chain agentId
        const eventData = parseAgentRegisteredEvent(receipt);
        if (!eventData) {
          throw new Error(
            "Transaction succeeded but AgentRegistered event not found. " +
            `Tx: ${txHash}`
          );
        }

        const onChainAgentId = eventData.agentId.toString();

        // 5. Record the on-chain data in our database
        const recordRes = await fetch("/api/erc8004/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: internalAgentId,
            erc8004AgentId: onChainAgentId,
            erc8004TxHash: txHash,
            erc8004ChainId: chainId,
            erc8004URI: agentURI,
          }),
        });

        if (!recordRes.ok) {
          // Tx succeeded but DB write failed — not critical, user can retry
          console.error("Failed to record registration in DB:", await recordRes.text());
        }

        const explorerUrl = `${blockExplorerUrl}/tx/${txHash}`;

        return {
          agentId: onChainAgentId,
          txHash,
          chainId,
          agentURI,
          explorerUrl,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Registration failed";
        setError(message);
        throw err;
      } finally {
        setIsRegistering(false);
      }
    },
    [walletClient, publicClient, contractAddresses, chainId, blockExplorerUrl]
  );

  /**
   * Get agent details from the on-chain IdentityRegistry.
   */
  const getAgent = useCallback(
    async (agentId: bigint) => {
      if (!publicClient || !contractAddresses) return null;

      try {
        const [owner, wallet, tokenURI] = await Promise.all([
          getAgentOwner(publicClient, contractAddresses.identityRegistry, agentId),
          getOnChainAgentWallet(publicClient, contractAddresses.identityRegistry, agentId).catch(() => "0x0000000000000000000000000000000000000000"),
          getAgentTokenURI(publicClient, contractAddresses.identityRegistry, agentId).catch(() => ""),
        ]);

        return {
          owner: owner as string,
          wallet: wallet as string,
          tokenURI: tokenURI as string,
        };
      } catch {
        return null;
      }
    },
    [publicClient, contractAddresses]
  );

  return {
    register,
    getAgent,
    checkDeployed,
    chainId,
    contractAddresses,
    blockExplorerUrl,
    isRegistering,
    error,
    clearError: () => setError(null),
  };
}
