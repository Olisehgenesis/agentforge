"use client";

import React, { useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Loader2, ArrowLeft, Send, Info, Shield, Zap, Wallet, HandCoins, Coins, BadgeCheck, ShieldCheck, Trash2 } from "lucide-react";
import { useAgentDetail } from "@/hooks/useAgentDetail";
import { getTemplateIcon } from "@/lib/utils";
import { ipfsToPublicGatewayUrl } from "@/lib/ipfs-url";
import { VerifyModal } from "./_components/VerifyModal";
import { InfoModal } from "./_components/InfoModal";
import { AdminModal } from "./_components/AdminModal";
import { InlineFeedbackWidget } from "./_components/InlineFeedbackWidget";
import { InlineRegisterWidget } from "./_components/InlineRegisterWidget";
import { ChatMessageContent } from "@/components/chat/ChatMessageContent";
import { FEEDBACK_INLINE_MARKER, REGISTER_ERC8004_INLINE_MARKER } from "@/lib/skills/feedback-marker";
import type { ChatMessage } from "./_types";
import type { VerificationStatus } from "./_types";

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string | undefined;
  const ad = useAgentDetail(agentId);

  const [infoOpen, setInfoOpen] = React.useState(false);
  const [adminOpen, setAdminOpen] = React.useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [verificationStatus, setVerificationStatus] = React.useState<VerificationStatus | null>(null);
  const [verifyLoading, setVerifyLoading] = React.useState(false);
  const [verifyPolling, setVerifyPolling] = React.useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = React.useState(false);
  const [showVerifyDebug, setShowVerifyDebug] = React.useState(false);
  const [qrSessionExpired, setQrSessionExpired] = React.useState(false);
  const [proofError, setProofError] = React.useState<string | null>(null);

  const isSessionActive = React.useMemo(() => {
    if (!verificationStatus?.challengeExpiresAt) return false;
    return Date.now() < verificationStatus.challengeExpiresAt;
  }, [verificationStatus?.challengeExpiresAt]);

  const isQrReady =
    verificationStatus != null &&
    !verificationStatus.verified &&
    ["qr_ready", "challenge_signed", "pending"].includes(verificationStatus.status) &&
    !!verificationStatus.selfAppConfig;

  const fetchVerification = React.useCallback(async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/agents/${agentId}/verify`);
      if (res.ok) {
        const data = await res.json();
        setVerificationStatus((prev) => {
          if (prev?.selfAppConfig && prev?.sessionId && !data.verified) {
            return { ...prev, status: data.status, verified: data.verified, humanId: data.humanId };
          }
          return data;
        });
      }
    } catch {
      // ignore
    }
  }, [agentId]);

  React.useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  React.useEffect(() => {
    if (!verifyPolling || !agentId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/agents/${agentId}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check" }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.verified) {
            setVerificationStatus((prev) => ({
              ...prev,
              ...data,
              selfAppConfig: prev?.selfAppConfig || data.selfAppConfig,
            }));
            setVerifyPolling(false);
          }
        }
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [verifyPolling, agentId]);

  const handleStartVerification = React.useCallback(async () => {
    if (!agentId) return;
    setVerifyLoading(true);
    setQrSessionExpired(false);
    setProofError(null);
    try {
      const startRes = await fetch(`/api/agents/${agentId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          agentWalletAddress: ad.agent?.agentWalletAddress || undefined,
          connectedWalletAddress: ad.userAddress || undefined,
        }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error);

      const signRes = await fetch(`/api/agents/${agentId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sign" }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error);

      setVerificationStatus({
        ...startData,
        ...signData,
        selfAppConfig: signData.selfAppConfig || startData.selfAppConfig,
        sessionId: signData.sessionId || startData.sessionId,
        challengeExpiresAt: signData.challengeExpiresAt || startData.challengeExpiresAt,
      });
      setVerifyPolling(true);
    } catch (err) {
      setVerificationStatus({
        status: "failed",
        verified: false,
        message: err instanceof Error ? err.message : "Verification failed",
      });
    } finally {
      setVerifyLoading(false);
    }
  }, [agentId, ad.userAddress, ad.agent?.agentWalletAddress]);

  const handleRestartVerification = React.useCallback(async () => {
    if (!agentId) return;
    setVerifyLoading(true);
    setVerifyPolling(false);
    setQrSessionExpired(false);
    setProofError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restart",
          agentWalletAddress: ad.agent?.agentWalletAddress || undefined,
          connectedWalletAddress: ad.userAddress || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const signRes = await fetch(`/api/agents/${agentId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sign" }),
      });
      const signData = await signRes.json();

      setVerificationStatus({
        ...data,
        ...signData,
        selfAppConfig: signData.selfAppConfig || data.selfAppConfig,
        sessionId: signData.sessionId || data.sessionId,
        challengeExpiresAt: signData.challengeExpiresAt || data.challengeExpiresAt,
      });
      setVerifyPolling(true);
    } catch (err) {
      setVerificationStatus({
        status: "failed",
        verified: false,
        message: err instanceof Error ? err.message : "Failed to restart verification. Check your network.",
      });
    } finally {
      setVerifyLoading(false);
    }
  }, [agentId, ad.userAddress, ad.agent?.agentWalletAddress]);

  const handleQrSuccess = React.useCallback(async () => {
    setVerificationStatus((prev) => (prev ? { ...prev, status: "verified", verified: true } : null));
    setVerifyPolling(false);

    const maxRetries = 12;
    for (let i = 0; i < maxRetries; i++) {
      await new Promise((r) => setTimeout(r, i < 3 ? 2000 : 5000));
      try {
        const res = await fetch(`/api/agents/${agentId}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check" }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.verified) {
            setVerificationStatus((prev) => ({
              ...prev,
              ...data,
              selfAppConfig: prev?.selfAppConfig || data.selfAppConfig,
            }));
            return;
          }
        }
      } catch {
        // ignore
      }
    }
  }, [agentId, ad.userAddress, ad.agent?.agentWalletAddress]);

  const handleQrError = React.useCallback((err: unknown) => {
    const errObj = err as Record<string, unknown> | null;
    const status = errObj?.status as string | undefined;
    const reason = errObj?.reason as string | undefined;
    if (status === "proof_generation_failed") {
      setProofError(
        reason && reason !== "error"
          ? `Proof generation failed: ${reason}`
          : "Proof generation failed on your device. Please try again — hold your passport flat against your phone's NFC reader for 5+ seconds."
      );
      return;
    }
    setQrSessionExpired(true);
    setVerifyPolling(false);
  }, []);

  const handleSyncVerification = React.useCallback(async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/agents/${agentId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.verified) {
          setVerificationStatus((prev) => (prev ? { ...prev, ...data, verified: true } : data));
        }
        await fetchVerification();
      }
    } catch {
      // ignore
    }
  }, [agentId, fetchVerification]);

  const openVerifyModal = React.useCallback(() => {
    setVerifyModalOpen(true);
    if (isQrReady && isSessionActive) {
      setVerifyPolling(true);
      return;
    }
    const status = verificationStatus?.status;
    if (!status || status === "not_started" || status === "failed") {
      handleStartVerification();
    } else {
      handleRestartVerification();
    }
  }, [isQrReady, isSessionActive, verificationStatus?.status, handleStartVerification, handleRestartVerification]);

  const randomAvatarSeed = useMemo(() => Date.now() + Math.random(), []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ad.chatMessages]);

  const agentWithOwner = ad.agent as typeof ad.agent & { owner?: { walletAddress?: string } };
  const isOwner = ad.userAddress && agentWithOwner?.owner?.walletAddress?.toLowerCase() === ad.userAddress.toLowerCase();

  if (ad.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gypsum">
        <Loader2 className="w-8 h-8 text-forest animate-spin" />
      </div>
    );
  }

  if (!ad.agent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gypsum p-6 text-center">
        <Bot className="w-16 h-16 text-forest-faint mb-4" />
        <h2 className="text-xl font-bold text-forest mb-2">Agent Not Found</h2>
        <p className="text-forest-muted mb-4">This agent doesn&apos;t exist or has been deleted.</p>
        <Button variant="secondary" onClick={() => router.push("/dashboard/profile")}>
          Back to Profile
        </Button>
      </div>
    );
  }

  const agent = ad.agent;

  const QUICK_ACTIONS: Array<{ label: string; prompt?: string; action?: "register"; icon: React.ComponentType<{ className?: string }> }> = [
    { label: "Send CELO", prompt: "Send 0.1 CELO to...", icon: Zap },
    { label: "Check balance", prompt: "What is my balance?", icon: Wallet },
    { label: "Deploy token", prompt: "I want to deploy a token for this agent", icon: Coins },
    { label: "Sponsorship", prompt: "Request sponsorship for my agent", icon: HandCoins },
    ...(isOwner && !agent.erc8004AgentId ? [{ label: "Register On-Chain", action: "register" as const, icon: ShieldCheck }] : []),
  ];

  const handleQuickAction = (item: (typeof QUICK_ACTIONS)[0]) => {
    if (item.action === "register") {
      ad.handleRegisterOnChain();
    } else if (item.prompt) {
      ad.handleSendMessage(item.prompt);
    }
  };

  const avatarSrc = agent.imageUrl
    ? ipfsToPublicGatewayUrl(agent.imageUrl)
    : `/api/random-avatar?t=${randomAvatarSeed}`;

  return (
    <div className="min-h-screen flex flex-col bg-gypsum">
      {/* ── Mobilised header (beta/create style) — circular agent avatar ── */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-forest/10 bg-gypsum/95 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/profile")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gypsum border border-forest/15 shrink-0">
            <Image
              src={avatarSrc}
              alt={agent.name}
              width={40}
              height={40}
              className="object-cover w-full h-full"
              unoptimized={agent.imageUrl?.startsWith("ipfs://") || !agent.imageUrl}
            />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-forest truncate">{agent.name}</div>
            <div className="flex items-center gap-2">
              <Badge variant={agent.status === "active" ? "default" : "warning"} className="text-[10px] h-5">
                {agent.status}
              </Badge>
              {verificationStatus?.verified && (
                <span
                  title="Verified and backed by human"
                  className="inline-flex items-center gap-1 rounded-full bg-forest-light/20 px-2 py-0.5 text-[10px] font-medium text-forest-light cursor-help"
                >
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setInfoOpen(true)}>
            <Info className="w-5 h-5 text-forest-muted" />
          </Button>
          {isOwner && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setAdminOpen(true)}>
              <Shield className="w-5 h-5 text-forest-muted" />
            </Button>
          )}
        </div>
      </header>

      {/* ── Content (chat only) ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden max-w-2xl mx-auto w-full">
          <div className="flex-1 overflow-auto p-4 space-y-3 mb-4">
            {ad.chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gypsum border-2 border-forest/15 mb-4 shrink-0">
                  <Image
                    src={avatarSrc}
                    alt={agent.name}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                    unoptimized={agent.imageUrl?.startsWith("ipfs://") || !agent.imageUrl}
                  />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-forest font-medium">Chat with {agent.name}</h3>
                  {verificationStatus?.verified && (
                    <span
                      title="Verified and backed by human"
                      className="inline-flex items-center gap-1 rounded-full bg-forest-light/20 px-2 py-0.5 text-xs font-medium text-forest-light cursor-help"
                    >
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-forest-muted max-w-xs mb-6">
                  {agent.agentWalletAddress
                    ? isOwner
                      ? "You're the owner — the agent can execute transactions from its wallet."
                      : "Chat to get help. Only the agent owner can execute transactions."
                    : "Chat only — no on-chain transactions."}
                </p>
                {agent.status !== "active" && (
                  <Badge variant="warning" className="mb-6">Deploy first to chat</Badge>
                )}
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_ACTIONS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.label}
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-forest/20 text-forest hover:bg-forest/5"
                        onClick={() => handleQuickAction(item)}
                        disabled={ad.isSending || agent.status !== "active"}
                      >
                        <Icon className="w-3.5 h-3.5 mr-1.5" />
                        {item.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
            {ad.chatMessages.map((msg: ChatMessage, i: number) => {
              const hasFeedbackMarker = msg.role === "assistant" && msg.content.includes(FEEDBACK_INLINE_MARKER);
              const hasRegisterMarker = msg.role === "assistant" && msg.content.includes(REGISTER_ERC8004_INLINE_MARKER);
              const displayText = msg.content
                .replace(FEEDBACK_INLINE_MARKER, "")
                .replace(REGISTER_ERC8004_INLINE_MARKER, "")
                .replace(/\n\n+/g, "\n\n")
                .trim();

              return (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-3 ${msg.role === "user"
                        ? "bg-forest text-white rounded-br-md"
                        : "bg-white border border-forest/10 shadow-sm rounded-bl-md"
                      }`}
                  >
                    <ChatMessageContent content={displayText} variant={msg.role === "user" ? "user" : "assistant"} />
                    {hasFeedbackMarker && (
                      <InlineFeedbackWidget
                        erc8004AgentId={agent.erc8004AgentId}
                        erc8004ChainId={agent.erc8004ChainId}
                        isOwner={!!isOwner}
                        agentName={agent.name}
                      />
                    )}
                    {hasRegisterMarker && isOwner && (
                      <InlineRegisterWidget
                        onRegister={ad.handleRegisterOnChain}
                        isRegistering={ad.isRegistering}
                        erc8004Error={ad.erc8004Error}
                        erc8004Deployed={ad.erc8004Deployed}
                        hasUserAddress={!!ad.userAddress}
                        isOwner={!!isOwner}
                      />
                    )}
                    <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-white/80" : "text-forest-muted/70"}`}>
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
            {ad.isSending && (
              <div className="flex justify-start">
                <div className="bg-white border border-forest/10 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-forest-muted">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span className="text-sm">
                      <span className="typing-dots">...</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          {/* Input bar — beta/create style */}
          <div className="flex flex-col gap-2 px-4 pb-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ad.chatInput}
                onChange={(e) => ad.setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && ad.handleSendMessage()}
                placeholder={`Message ${agent.name}...`}
                className="flex-1 h-12 px-4 bg-white border border-forest/20 rounded-xl text-sm text-forest placeholder:text-forest-muted/70 focus:outline-none focus:ring-2 focus:ring-forest/20"
                disabled={ad.isSending || agent.status !== "active"}
              />
              <Button
                size="icon"
                variant="glow"
                onClick={() => ad.handleSendMessage()}
                disabled={!ad.chatInput.trim() || ad.isSending || agent.status !== "active"}
                className="rounded-xl h-12 w-12 shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {ad.chatMessages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                {QUICK_ACTIONS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleQuickAction(item)}
                      disabled={ad.isSending || agent.status !== "active"}
                      className="text-xs px-2 py-1 rounded-md text-forest-muted hover:text-forest hover:bg-forest/5 transition-colors"
                    >
                      <Icon className="w-3 h-3 inline mr-1 align-middle" />
                      {item.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => ad.handleClearChat()}
                  disabled={ad.isSending}
                  className="text-xs px-2 py-1 rounded-md text-forest-muted hover:text-red-600 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3 inline mr-1 align-middle" />
                  Clear chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Info Modal ── */}
      <InfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        agent={agent}
        verificationStatus={verificationStatus}
        channelData={ad.channelData}
      />

      {/* ── Admin Modal ── */}
      <AdminModal
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        agent={agent}
        verificationStatus={verificationStatus}
        channelData={ad.channelData}
        fetchChannels={ad.fetchChannels}
        onSocialsUpdated={ad.fetchChannels}
        onOpenVerifyModal={() => { setAdminOpen(false); openVerifyModal(); }}
        onRegisterOnChain={ad.handleRegisterOnChain}
        isRegistering={ad.isRegistering}
        erc8004Error={ad.erc8004Error}
        erc8004Deployed={ad.erc8004Deployed}
        hasUserAddress={!!ad.userAddress}
        onUpdateMetadata={ad.handleUpdateMetadata}
        isUpdatingMetadata={ad.isUpdatingMetadata}
        updateMetadataError={ad.updateMetadataError}
        connectedChainId={ad.connectedChainId}
      />

      {/* ── Verify Modal ── */}
      <VerifyModal
        open={verifyModalOpen}
        onClose={() => { setVerifyModalOpen(false); setVerifyPolling(false); }}
        agent={agent}
        verificationStatus={verificationStatus}
        isConnected={ad.isConnected}
        isCeloMainnet={ad.isCeloMainnet}
        connectedChainId={ad.connectedChainId}
        verifyLoading={verifyLoading}
        qrSessionExpired={qrSessionExpired}
        proofError={proofError}
        isSessionActive={isSessionActive}
        showVerifyDebug={showVerifyDebug}
        handleStartVerification={handleStartVerification}
        handleRestartVerification={handleRestartVerification}
        handleSyncVerification={handleSyncVerification}
        handleQrSuccess={handleQrSuccess}
        handleQrError={handleQrError}
        setQrSessionExpired={setQrSessionExpired}
        setProofError={setProofError}
        setShowVerifyDebug={setShowVerifyDebug}
        onSwitchToCelo={() => ad.switchChain({ chainId: ad.CELO_MAINNET_CHAIN_ID })}
        CELO_MAINNET_CHAIN_ID={ad.CELO_MAINNET_CHAIN_ID}
      />
    </div>
  );
}
