"use client";

import React from "react";
import type {
  AgentData,
  WalletBalanceData,
  ChatMessage,
  ChannelData,
  SendResult,
  RegistrationResult,
} from "@/app/dashboard/agents/[id]/_types";
import { useERC8004 } from "@/hooks/useERC8004";
import { useAccount, useSwitchChain } from "wagmi";
import { type Address } from "viem";

/**
 * Hook that encapsulates all agent-detail data fetching, wallet, chat,
 * channel, and ERC-8004 on-chain registration logic.
 */
export function useAgentDetail(agentId: string | undefined) {
  const { address: userAddress, chainId: connectedChainId, isConnected } = useAccount();

  /* ── Core agent data ─────────────────────────────────────────────── */
  const [agent, setAgent] = React.useState<AgentData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/agents/${agentId}`);
        if (res.ok && !cancelled) setAgent(await res.json());
      } catch (err) {
        console.error("Failed to load agent:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [agentId]);

  /** Refresh agent data from the API */
  const refreshAgent = React.useCallback(async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      if (res.ok) setAgent(await res.json());
    } catch { /* ignore */ }
  }, [agentId]);

  /* ── Wallet balance ──────────────────────────────────────────────── */
  const [walletBalance, setWalletBalance] = React.useState<WalletBalanceData | null>(null);
  const [balanceLoading, setBalanceLoading] = React.useState(false);

  const fetchBalance = React.useCallback(async () => {
    if (!agentId) return;
    setBalanceLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/balance`);
      if (res.ok) setWalletBalance(await res.json());
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    } finally {
      setBalanceLoading(false);
    }
  }, [agentId]);

  React.useEffect(() => {
    if (agent?.agentWalletAddress) fetchBalance();
  }, [agent?.agentWalletAddress, fetchBalance]);

  /* ── Wallet init ─────────────────────────────────────────────────── */
  const [walletIniting, setWalletIniting] = React.useState(false);

  const handleInitWallet = React.useCallback(async () => {
    if (!agent) return;
    setWalletIniting(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}/wallet`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setAgent((prev) =>
          prev ? { ...prev, agentWalletAddress: data.address, walletDerivationIndex: data.derivationIndex } : prev
        );
        fetchBalance();
        await refreshAgent();
      } else {
        alert(data.error || "Failed to initialize wallet");
      }
    } catch {
      alert("Network error initializing wallet");
    } finally {
      setWalletIniting(false);
    }
  }, [agent, fetchBalance, refreshAgent]);

  /* ── Send / Withdraw ─────────────────────────────────────────────── */
  const [showSendForm, setShowSendForm] = React.useState(false);
  const [sendTo, setSendTo] = React.useState("");
  const [sendAmount, setSendAmount] = React.useState("");
  const [sendCurrency, setSendCurrency] = React.useState("CELO");
  const [sendLoading, setSendLoading] = React.useState(false);
  const [sendResult, setSendResult] = React.useState<SendResult | null>(null);

  const handleSendTx = React.useCallback(async () => {
    if (!agent || !sendTo || !sendAmount) return;
    setSendLoading(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/agents/${agent.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: sendTo,
          amount: sendAmount,
          currency: sendCurrency,
          walletAddress: userAddress,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ success: true, txHash: data.txHash });
        setSendTo("");
        setSendAmount("");
        fetchBalance();
        refreshAgent();
      } else {
        setSendResult({ success: false, error: data.error });
      }
    } catch {
      setSendResult({ success: false, error: "Network error" });
    } finally {
      setSendLoading(false);
    }
  }, [agent, sendTo, sendAmount, sendCurrency, userAddress, fetchBalance, refreshAgent]);

  /* ── Toggle agent status ─────────────────────────────────────────── */
  const handleToggleStatus = React.useCallback(async () => {
    if (!agent) return;
    if (agent.status === "active") {
      await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paused" }),
      });
      setAgent((prev) => prev ? { ...prev, status: "paused" } : prev);
    } else {
      await fetch(`/api/agents/${agent.id}/deploy`, { method: "POST" });
      setAgent((prev) => prev ? { ...prev, status: "active", deployedAt: new Date().toISOString() } : prev);
    }
  }, [agent]);

  /* ── Chat ────────────────────────────────────────────────────────── */
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [chatHistoryLoaded, setChatHistoryLoaded] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Load persisted chat history when wallet is connected (web chat binding)
  React.useEffect(() => {
    if (!agentId || !userAddress || chatHistoryLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/agents/${agentId}/chat?walletAddress=${encodeURIComponent(userAddress)}`
        );
        if (res.ok && !cancelled) {
          const data = await res.json();
          const msgs = (data.messages ?? []).map(
            (m: { role: "user" | "assistant"; content: string }) => ({
              role: m.role,
              content: m.content,
              timestamp: new Date(),
            })
          );
          setChatMessages(msgs);
        }
      } catch {
        // Ignore — fall back to empty chat
      } finally {
        if (!cancelled) setChatHistoryLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [agentId, userAddress, chatHistoryLoaded]);

  React.useEffect(() => {
    if (!userAddress) setChatHistoryLoaded(false);
  }, [userAddress]);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const welcomeRequestedRef = React.useRef(false);

  const fetchWelcomeMessage = React.useCallback(async () => {
    if (!agentId || !agent || agent.status !== "active" || welcomeRequestedRef.current || isSending) return;
    welcomeRequestedRef.current = true;
    setIsSending(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ welcome: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response, timestamp: new Date() },
        ]);
      }
    } catch {
      welcomeRequestedRef.current = false;
    } finally {
      setIsSending(false);
    }
  }, [agentId, agent, isSending]);

  React.useEffect(() => {
    if (chatMessages.length === 0 && chatHistoryLoaded && agent?.status === "active") {
      fetchWelcomeMessage();
    }
  }, [chatMessages.length, chatHistoryLoaded, agent?.status, fetchWelcomeMessage]);

  const handleSendMessage = React.useCallback(async (override?: string) => {
    const text = (override ?? chatInput).trim();
    if (!text || isSending || !agent) return;
    if (!override) setChatInput("");
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: text, timestamp: new Date() },
    ]);
    setIsSending(true);
    try {
      const body: Record<string, unknown> = {
        message: text,
        conversationHistory: chatMessages.map((m) => ({ role: m.role, content: m.content })),
      };
      if (userAddress) body.walletAddress = userAddress;

      const response = await fetch(`/api/agents/${agentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const data = await response.json();
        // if backend tells us to clear the last user message (e.g. it contained
        // an API key) then remove it from history before adding assistant reply.
        if (data.clearMessage) {
          setChatMessages((prev) => prev.slice(0, -1));
        }
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response, timestamp: new Date() },
        ]);
      } else {
        const error = await response.json();
        const errorMessage = error.error || "Failed to process message";
        const actionMessage = error.action ? ` ${error.action}` : "";
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ Error: ${errorMessage}${actionMessage}`, timestamp: new Date() },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Network error. Please check your connection and try again.", timestamp: new Date() },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [chatInput, isSending, agent, agentId, chatMessages, userAddress]);

  const handleClearChat = React.useCallback(async () => {
    setChatMessages([]);
    setChatInput("");
    setChatHistoryLoaded(false);
    welcomeRequestedRef.current = false;

    if (agentId && userAddress && agent?.owner?.walletAddress?.toLowerCase() === userAddress.toLowerCase()) {
      try {
        await fetch(
          `/api/agents/${agentId}/chat?walletAddress=${encodeURIComponent(userAddress)}`,
          { method: "DELETE" }
        );
      } catch {
        // Ignore — local state is already cleared
      }
    }
  }, [agentId, userAddress, agent?.owner?.walletAddress]);

  /* ── Channels & Cron ─────────────────────────────────────────────── */
  const [channelData, setChannelData] = React.useState<ChannelData | null>(null);
  const [showScheduleForm, setShowScheduleForm] = React.useState(false);
  const [scheduleForm, setScheduleForm] = React.useState({ name: "", cron: "", skillPrompt: "" });
  const [showTelegramForm, setShowTelegramForm] = React.useState(false);
  const [telegramToken, setTelegramToken] = React.useState("");
  const [telegramConnecting, setTelegramConnecting] = React.useState(false);

  const fetchChannels = React.useCallback(async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/agents/${agentId}/channels`);
      if (res.ok) setChannelData(await res.json());
    } catch { /* ignore */ }
  }, [agentId]);

  React.useEffect(() => { fetchChannels(); }, [fetchChannels]);

  /* ── ERC-8004 On-Chain ───────────────────────────────────────────── */
  const { switchChain } = useSwitchChain();
  const {
    register: registerOnChain,
    updateMetadata: updateMetadataOnChain,
    checkDeployed,
    isRegistering,
    error: erc8004Error,
    clearError: clearERC8004Error,
    chainId: currentChainId,
    contractAddresses: erc8004Contracts,
    blockExplorerUrl,
  } = useERC8004();

  const CELO_MAINNET_CHAIN_ID = 42220;
  const isCeloMainnet = connectedChainId === CELO_MAINNET_CHAIN_ID;

  const [erc8004Deployed, setErc8004Deployed] = React.useState<boolean | null>(null);
  const [registrationResult, setRegistrationResult] = React.useState<RegistrationResult | null>(null);

  React.useEffect(() => {
    checkDeployed().then(setErc8004Deployed);
  }, [checkDeployed, currentChainId]);

  const handleRegisterOnChain = React.useCallback(async () => {
    if (!agent || !userAddress) return;
    clearERC8004Error();
    setRegistrationResult(null);
    try {
      const result = await registerOnChain(userAddress as Address, agent.id, agent.name);
      setRegistrationResult({
        agentId: result.agentId,
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
      });
      await refreshAgent();
    } catch (err) {
      console.error("On-chain registration failed:", err);
    }
  }, [agent, userAddress, registerOnChain, clearERC8004Error, refreshAgent]);

  const [isUpdatingMetadata, setIsUpdatingMetadata] = React.useState(false);
  const [updateMetadataError, setUpdateMetadataError] = React.useState<string | null>(null);
  const handleUpdateMetadata = React.useCallback(async () => {
    if (!agent || !userAddress || !agent.erc8004AgentId) return;
    clearERC8004Error();
    setUpdateMetadataError(null);
    setIsUpdatingMetadata(true);
    try {
      const prepRes = await fetch(`/api/agents/${agent.id}/erc8004/update-metadata`);
      if (!prepRes.ok) {
        const err = await prepRes.json();
        throw new Error(err.error || "Failed to prepare metadata update");
      }
      const { agentURI } = await prepRes.json();
      const result = await updateMetadataOnChain(
        userAddress as Address,
        BigInt(agent.erc8004AgentId!),
        agentURI
      );
      await fetch(`/api/agents/${agent.id}/erc8004/update-metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          erc8004URI: agentURI,
          erc8004TxHash: result.txHash,
        }),
      });
      await refreshAgent();
    } catch (err) {
      console.error("Metadata update failed:", err);
      setUpdateMetadataError(err instanceof Error ? err.message : "Metadata update failed");
    } finally {
      setIsUpdatingMetadata(false);
    }
  }, [agent, userAddress, updateMetadataOnChain, clearERC8004Error, refreshAgent]);

  /* ── Computed values ─────────────────────────────────────────────── */
  const transactions = agent?.transactions || [];
  const activityLogs = agent?.activityLogs || [];
  const totalGas = transactions.reduce((sum, t) => sum + (t.gasUsed || 0), 0);
  const confirmedCount = transactions.filter((t) => t.status === "confirmed").length;

  return {
    // Core
    agent,
    loading,
    refreshAgent,

    // Wallet
    walletBalance,
    balanceLoading,
    fetchBalance,
    walletIniting,
    handleInitWallet,

    // Send form
    showSendForm,
    setShowSendForm,
    sendTo,
    setSendTo,
    sendAmount,
    setSendAmount,
    sendCurrency,
    setSendCurrency,
    sendLoading,
    sendResult,
    setSendResult,
    handleSendTx,

    // Status toggle
    handleToggleStatus,

    // Chat
    chatMessages,
    chatInput,
    setChatInput,
    isSending,
    chatEndRef,
    handleSendMessage,
    handleClearChat,

    // Channels
    channelData,
    fetchChannels,
    showScheduleForm,
    setShowScheduleForm,
    scheduleForm,
    setScheduleForm,
    showTelegramForm,
    setShowTelegramForm,
    telegramToken,
    setTelegramToken,
    telegramConnecting,
    setTelegramConnecting,

    // ERC-8004
    userAddress,
    connectedChainId,
    isConnected,
    switchChain,
    isCeloMainnet,
    CELO_MAINNET_CHAIN_ID,
    registerOnChain,
    isRegistering,
    erc8004Error,
    clearERC8004Error,
    currentChainId,
    erc8004Contracts,
    blockExplorerUrl,
    erc8004Deployed,
    registrationResult,
    handleRegisterOnChain,
    isUpdatingMetadata,
    updateMetadataError,
    handleUpdateMetadata,

    // Computed
    transactions,
    activityLogs,
    totalGas,
    confirmedCount,
  };
}

