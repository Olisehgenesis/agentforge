"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bot, Loader2 } from "lucide-react";
import { useAgentDetail } from "@/hooks/useAgentDetail";
import { useVerification } from "@/hooks/useVerification";

import {
  AgentHeader,
  StatsCards,
  WalletCard,
  AgentIdentityCard,
  SkillsCard,
  ChannelsCard,
  ContentTabs,
  VerifyModal,
  IdentityModal,
} from "./_components";

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string | undefined;

  /* ── Core agent data & actions ────────────────────────────────────── */
  const ad = useAgentDetail(agentId);

  /* ── SelfClaw verification ────────────────────────────────────────── */
  const vf = useVerification(agentId);

  /* ── Local UI state ───────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = React.useState("chat");
  const [identityModalOpen, setIdentityModalOpen] = React.useState(false);

  /* ── Loading / empty states ───────────────────────────────────────── */
  if (ad.loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-forest animate-spin" />
      </div>
    );
  }

  if (!ad.agent) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Bot className="w-16 h-16 text-forest-faint mb-4" />
        <h2 className="text-xl font-bold text-forest mb-2">Agent Not Found</h2>
        <p className="text-forest-muted mb-4">
          This agent doesn&apos;t exist or has been deleted.
        </p>
        <Button variant="secondary" onClick={() => router.push("/dashboard/agents")}>
          Back to Agents
        </Button>
      </div>
    );
  }

  const agent = ad.agent;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <AgentHeader
        agent={agent}
        verificationStatus={vf.verificationStatus}
        isConnected={ad.isConnected}
        isCeloMainnet={ad.isCeloMainnet}
        isQrReady={vf.isQrReady}
        isSessionActive={vf.isSessionActive}
        verifyLoading={vf.verifyLoading}
        onBack={() => router.back()}
        onToggleStatus={ad.handleToggleStatus}
        onOpenIdentityModal={() => setIdentityModalOpen(true)}
        onOpenVerifyModal={vf.openVerifyModal}
        onSwitchToCelo={() => ad.switchChain({ chainId: ad.CELO_MAINNET_CHAIN_ID })}
      />

      {/* ── Stats Cards ── */}
      <StatsCards
        agent={agent}
        verificationStatus={vf.verificationStatus}
        isConnected={ad.isConnected}
        isCeloMainnet={ad.isCeloMainnet}
        transactions={ad.transactions}
        confirmedCount={ad.confirmedCount}
        totalGas={ad.totalGas}
        onOpenVerify={vf.openVerifyModal}
        onSwitchToCelo={() => ad.switchChain({ chainId: ad.CELO_MAINNET_CHAIN_ID })}
      />

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Wallet */}
          <WalletCard
            agent={agent}
            walletBalance={ad.walletBalance}
            balanceLoading={ad.balanceLoading}
            fetchBalance={ad.fetchBalance}
            walletIniting={ad.walletIniting}
            handleInitWallet={ad.handleInitWallet}
            connectedChainId={ad.connectedChainId}
            showSendForm={ad.showSendForm}
            setShowSendForm={ad.setShowSendForm}
            sendTo={ad.sendTo}
            setSendTo={ad.setSendTo}
            sendAmount={ad.sendAmount}
            setSendAmount={ad.setSendAmount}
            sendCurrency={ad.sendCurrency}
            setSendCurrency={ad.setSendCurrency}
            sendLoading={ad.sendLoading}
            sendResult={ad.sendResult}
            setSendResult={ad.setSendResult}
            handleSendTx={ad.handleSendTx}
          />

          {/* Agent Identity (ERC-8004) */}
          <AgentIdentityCard
            agent={agent}
            connectedChainId={ad.connectedChainId}
            userAddress={ad.userAddress as string | undefined}
            isRegistering={ad.isRegistering}
            erc8004Error={ad.erc8004Error}
            erc8004Deployed={ad.erc8004Deployed}
            currentChainId={ad.currentChainId}
            erc8004Contracts={ad.erc8004Contracts}
            registrationResult={ad.registrationResult}
            handleRegisterOnChain={ad.handleRegisterOnChain}
          />
              </div>

        {/* Right column (1/3) */}
        <div className="space-y-6">
          <SkillsCard templateType={agent.templateType} />

          <ChannelsCard
            agentId={agent.id}
            channelData={ad.channelData}
            fetchChannels={ad.fetchChannels}
            showTelegramForm={ad.showTelegramForm}
            setShowTelegramForm={ad.setShowTelegramForm}
            telegramToken={ad.telegramToken}
            setTelegramToken={ad.setTelegramToken}
            telegramConnecting={ad.telegramConnecting}
            setTelegramConnecting={ad.setTelegramConnecting}
            showScheduleForm={ad.showScheduleForm}
            setShowScheduleForm={ad.setShowScheduleForm}
            scheduleForm={ad.scheduleForm}
            setScheduleForm={ad.setScheduleForm}
          />
                  </div>
        </div>

      {/* ── Chat / Activity / Transactions tabs ── */}
      <ContentTabs
        agent={agent}
                activeTab={activeTab}
        setActiveTab={setActiveTab}
        chatMessages={ad.chatMessages}
        chatInput={ad.chatInput}
        setChatInput={ad.setChatInput}
        isSending={ad.isSending}
        chatEndRef={ad.chatEndRef}
        handleSendMessage={ad.handleSendMessage}
        activityLogs={ad.activityLogs}
        transactions={ad.transactions}
      />

      {/* ── SelfClaw Verification Modal ── */}
      <VerifyModal
        open={vf.verifyModalOpen}
        onClose={() => { vf.setVerifyModalOpen(false); vf.setVerifyPolling(false); }}
        agent={agent}
        verificationStatus={vf.verificationStatus}
        isConnected={ad.isConnected}
        isCeloMainnet={ad.isCeloMainnet}
        connectedChainId={ad.connectedChainId}
        verifyLoading={vf.verifyLoading}
        qrSessionExpired={vf.qrSessionExpired}
        proofError={vf.proofError}
        isSessionActive={vf.isSessionActive}
        showVerifyDebug={vf.showVerifyDebug}
        handleStartVerification={vf.handleStartVerification}
        handleRestartVerification={vf.handleRestartVerification}
        handleQrSuccess={vf.handleQrSuccess}
        handleQrError={vf.handleQrError}
        setQrSessionExpired={vf.setQrSessionExpired}
        setProofError={vf.setProofError}
        setShowVerifyDebug={vf.setShowVerifyDebug}
        onSwitchToCelo={() => ad.switchChain({ chainId: ad.CELO_MAINNET_CHAIN_ID })}
        CELO_MAINNET_CHAIN_ID={ad.CELO_MAINNET_CHAIN_ID}
      />

      {/* ── ERC-8004 Identity Modal ── */}
      <IdentityModal
        open={identityModalOpen}
        onClose={() => setIdentityModalOpen(false)}
        agent={agent}
        verificationStatus={vf.verificationStatus}
      />
    </div>
  );
}
