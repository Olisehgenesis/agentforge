"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Shield, Wallet, Zap, Send, Key, Copy, Check } from "lucide-react";
import { getTemplateIcon } from "@/lib/utils";
import { ipfsToPublicGatewayUrl } from "@/lib/ipfs-url";
import type { AgentData, VerificationStatus, ChannelData } from "../_types";

const TEMPLATE_SKILLS: Record<string, string[]> = {
  payment: ["Send CELO", "Send Tokens", "Check Balance", "Query Rate", "Gas Price"],
  trading: ["Send CELO", "Send Tokens", "Oracle Rates", "Mento Quote", "Mento Swap", "Forex Analysis", "Portfolio"],
  forex: ["Oracle Rates", "Mento Quote", "Mento Swap", "Forex Analysis", "Portfolio", "Send CELO", "Balance Check", "Gas Price"],
  social: ["Send CELO", "Send Tokens", "Check Balance"],
  custom: ["Send CELO", "Send Tokens", "Oracle Rates", "Mento Quote", "Gas Price"],
};

export function PublicKeyDisplay({ publicKey }: { publicKey: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-start gap-2">
      <code className="flex-1 text-xs text-forest-muted break-all block bg-gypsum px-2 py-2 rounded-lg font-mono">
        {publicKey}
      </code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 p-2 rounded-lg hover:bg-forest/10 text-forest-muted hover:text-forest transition-colors"
        title="Copy"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
  agent: AgentData;
  verificationStatus: VerificationStatus | null;
  channelData?: ChannelData | null;
}

export function InfoModal({ open, onClose, agent, verificationStatus, channelData }: InfoModalProps) {
  const skills = TEMPLATE_SKILLS[agent.templateType] || TEMPLATE_SKILLS.custom;
  const telegramChannel = channelData?.channels?.find((c) => c.type === "telegram" && c.enabled);
  const botUsername = telegramChannel?.botUsername?.replace(/^@/, "");
  const avatarSrc = agent.imageUrl
    ? ipfsToPublicGatewayUrl(agent.imageUrl)
    : null;

  return (
    <Modal open={open} onClose={onClose} className="max-w-md max-h-[90vh] overflow-auto">
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gypsum border border-forest/15 flex items-center justify-center shrink-0">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt={agent.name}
                width={48}
                height={48}
                className="object-cover w-full h-full"
                unoptimized={agent.imageUrl?.startsWith("ipfs://") || !agent.imageUrl}
              />
            ) : (
              <span className="text-2xl">{getTemplateIcon(agent.templateType)}</span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-forest">{agent.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="capitalize">{agent.templateType}</Badge>
            </div>
          </div>
        </div>

        {agent.description && (
          <p className="text-sm text-forest-muted">{agent.description}</p>
        )}

        <div>
          <h3 className="text-sm font-medium text-forest mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Verification
          </h3>
          <div className="flex items-center gap-2">
            {verificationStatus?.verified ? (
              <Badge variant="default" className="bg-forest-light">Verified</Badge>
            ) : (
              <Badge variant="secondary">Not verified</Badge>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-forest mb-2 flex items-center gap-2">
            <Key className="w-4 h-4" />
            Agent ID
          </h3>
          <PublicKeyDisplay publicKey={agent.id} />
        </div>

        {agent.erc8004AgentId && (
          <div>
            <h3 className="text-sm font-medium text-forest mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              ERC-8004 On-Chain ID
            </h3>
            <PublicKeyDisplay publicKey={agent.erc8004AgentId} />
          </div>
        )}

        {(verificationStatus?.publicKey ?? agent.verification?.publicKey) && (
          <div>
            <h3 className="text-sm font-medium text-forest mb-2 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Agent Public Key
            </h3>
            <p className="text-xs text-forest-muted mb-1">Ed25519 SPKI base64 (SelfClaw)</p>
            <PublicKeyDisplay publicKey={(verificationStatus?.publicKey ?? agent.verification?.publicKey)!} />
          </div>
        )}

        {agent.agentWalletAddress && (
          <div>
            <h3 className="text-sm font-medium text-forest mb-2 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Wallet
            </h3>
            <code className="text-xs text-forest-muted break-all block bg-gypsum px-2 py-2 rounded-lg">
              {agent.agentWalletAddress}
            </code>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-forest mb-2 flex items-center gap-2">
            <Send className="w-4 h-4" />
            Connect
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-gypsum/80">
              <span className="text-xs text-forest/80">💬 Web Chat</span>
              <Badge variant="default" className="text-[10px] bg-forest/20 text-forest-light border-forest/30">Active</Badge>
            </div>
            {botUsername ? (
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg bg-gypsum/80 hover:bg-gypsum transition-colors"
              >
                <span className="text-xs text-forest/80">📱 Telegram</span>
                <span className="text-[10px] text-blue-400">@{botUsername} →</span>
              </a>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-lg bg-gypsum/80">
                <span className="text-xs text-forest-muted">📱 Telegram</span>
                <span className="text-[10px] text-forest-muted">Not connected</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-forest mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
