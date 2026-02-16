"use client";

import React from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Shield, Coins, Wallet, ExternalLink, AlertCircle, Loader2, Send, CheckCircle, XCircle, Key } from "lucide-react";
import { get8004ScanAgentUrl } from "@/lib/constants";
import type { AgentData, VerificationStatus, ChannelData } from "../_types";
import { PublicKeyDisplay } from "./InfoModal";

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  agent: AgentData;
  verificationStatus: VerificationStatus | null;
  channelData?: ChannelData | null;
  fetchChannels?: () => void;
  onOpenVerifyModal: () => void;
  /** ERC-8004 registration (required for sponsorship). Pass from useAgentDetail when available. */
  onRegisterOnChain?: () => void;
  isRegistering?: boolean;
  erc8004Error?: string | null;
  erc8004Deployed?: boolean | null;
  hasUserAddress?: boolean;
  /** Sync existing ERC-8004 to SelfClaw (for agents registered before auto-sync). */
  onSyncToSelfClaw?: () => void;
  isSyncingToSelfClaw?: boolean;
}

export function AdminModal({
  open,
  onClose,
  agent,
  verificationStatus,
  channelData,
  fetchChannels,
  onOpenVerifyModal,
  onRegisterOnChain,
  isRegistering = false,
  erc8004Error = null,
  erc8004Deployed = true,
  hasUserAddress = false,
  onSyncToSelfClaw,
  isSyncingToSelfClaw = false,
}: AdminModalProps) {
  const [showTelegramForm, setShowTelegramForm] = React.useState(false);
  const [telegramToken, setTelegramToken] = React.useState("");
  const [telegramConnecting, setTelegramConnecting] = React.useState(false);

  const telegramChannel = channelData?.channels?.find((c) => c.type === "telegram" && c.enabled);
  const botUsername = telegramChannel?.botUsername?.replace(/^@/, "");
  const hasTelegramBot = !!botUsername;

  const handleConnectTelegram = async () => {
    if (!telegramToken || !agent.id) return;
    setTelegramConnecting(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect_telegram", botToken: telegramToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowTelegramForm(false);
        setTelegramToken("");
        fetchChannels?.();
      } else {
        alert(data.error || "Failed to connect Telegram bot");
      }
    } catch {
      alert("Network error");
    } finally {
      setTelegramConnecting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-md max-h-[90vh] overflow-auto">
      <div className="p-6 space-y-5">
        <h2 className="text-lg font-semibold text-forest">Admin</h2>

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

        <div>
          <h3 className="text-sm font-medium text-forest mb-2 flex items-center gap-2">
            <Send className="w-4 h-4" />
            Telegram Bot
            {hasTelegramBot && (
              <span title="Bot connected">
                <CheckCircle className="w-4 h-4 text-green-500" />
              </span>
            )}
          </h3>
          {hasTelegramBot ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-gypsum/80">
              <div>
                <span className="text-xs text-forest/80">@{botUsername}</span>
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[10px] text-blue-400 hover:underline mt-0.5"
                >
                  Open in Telegram →
                </a>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setShowTelegramForm(true)}
                >
                  Change
                </Button>
                <button
                  onClick={async () => {
                    if (!confirm("Disconnect Telegram bot?")) return;
                    await fetch(`/api/agents/${agent.id}/channels`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "disconnect_telegram" }),
                    });
                    fetchChannels?.();
                  }}
                  className="p-1.5 text-red-400 hover:text-red-300 rounded"
                  title="Disconnect"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : showTelegramForm ? (
            <div className="p-3 rounded-lg bg-gypsum space-y-2">
              <p className="text-[10px] text-forest-muted">
                Get a bot token from{" "}
                <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  @BotFather
                </a>{" "}
                on Telegram.
              </p>
              <input
                type="password"
                className="w-full h-8 rounded bg-white border border-forest/15 text-xs text-forest px-2 font-mono"
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v..."
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" className="text-xs h-7" disabled={!telegramToken || telegramConnecting} onClick={handleConnectTelegram}>
                  {telegramConnecting ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Connecting...</> : "Connect Bot"}
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setShowTelegramForm(false); setTelegramToken(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-forest-muted">Connect a Telegram bot to chat with your agent on Telegram.</p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 w-full"
                onClick={() => setShowTelegramForm(true)}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Set Bot
              </Button>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-forest mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Verification
          </h3>
          {verificationStatus?.verified ? (
            <p className="text-sm text-forest-muted">Agent is verified with SelfClaw.</p>
          ) : (
            <Button variant="glow" size="sm" onClick={() => { onClose(); onOpenVerifyModal(); }}>
              Verify with Self
            </Button>
          )}
        </div>

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
              Agent Wallet
            </h3>
            <code className="text-xs text-forest-muted break-all block bg-gypsum px-2 py-2 rounded-lg">
              {agent.agentWalletAddress}
            </code>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-forest mb-2 flex items-center gap-2">
            <Coins className="w-4 h-4" />
            Token & Trade
          </h3>
          <p className="text-sm text-forest-muted mb-2">
            Deploy token, request sponsorship, log revenue/costs.
          </p>
          <Link href={`/dashboard/agents/${agent.id}`}>
            <Button variant="outline" size="sm" onClick={onClose}>
              Open Token tab
            </Button>
          </Link>
        </div>

        <div>
          <h3 className="text-sm font-medium text-forest mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            ERC-8004 Identity
          </h3>
          {agent.erc8004AgentId && agent.erc8004ChainId ? (
            <div className="space-y-2">
              <a
                href={get8004ScanAgentUrl(agent.erc8004ChainId, agent.erc8004AgentId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-forest-light hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                View on 8004scan
              </a>
              {verificationStatus?.verified && onSyncToSelfClaw && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-8"
                  disabled={isSyncingToSelfClaw}
                  onClick={onSyncToSelfClaw}
                >
                  {isSyncingToSelfClaw ? (
                    <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Syncing...</>
                  ) : (
                    "Sync to SelfClaw (for sponsorship)"
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-400 font-medium">Not Registered On-Chain</span>
              </div>
              <p className="text-xs text-forest-muted mb-3">
                Required for SelfClaw sponsorship. Register your agent on the ERC-8004 IdentityRegistry.
              </p>
              {erc8004Error && (
                <p className="text-xs text-red-400 mb-2">{erc8004Error}</p>
              )}
              {onRegisterOnChain && (
                <Button
                  size="sm"
                  variant="glow"
                  className="w-full text-xs h-8"
                  disabled={isRegistering || !hasUserAddress || erc8004Deployed === false}
                  onClick={onRegisterOnChain}
                >
                  {isRegistering ? (
                    <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Registering...</>
                  ) : !hasUserAddress ? (
                    "Connect Wallet First"
                  ) : erc8004Deployed === false ? (
                    "Contracts Not Deployed"
                  ) : (
                    <><Shield className="w-3 h-3 mr-1" /> Register On-Chain (ERC-8004)</>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
