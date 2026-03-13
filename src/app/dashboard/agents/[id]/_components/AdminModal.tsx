"use client";

import React from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Shield, Coins, Wallet, ExternalLink, AlertCircle, Loader2, Send, CheckCircle, XCircle, Key, RefreshCw, Zap } from "lucide-react";
import { get8004ScanAgentUrl, LLM_MODELS } from "@/lib/constants";
import type { AgentData, VerificationStatus, ChannelData } from "../_types";
import type { LLMProvider } from "@/lib/types";
import { Select } from "@/components/ui/select";
import { PublicKeyDisplay } from "./InfoModal";
import { SkillsCard } from "./SkillsCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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
  /** Update agent metadata on-chain (re-pin to IPFS + setAgentURI). */
  onUpdateMetadata?: () => void;
  isUpdatingMetadata?: boolean;
  updateMetadataError?: string | null;
  /** User must be on agent's chain to update metadata */
  connectedChainId?: number;
  onSocialsUpdated?: () => void;
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
  onUpdateMetadata,
  isUpdatingMetadata = false,
  updateMetadataError = null,
  connectedChainId,
  onSocialsUpdated,
}: AdminModalProps) {
  const [socials, setSocials] = React.useState<{ telegram?: string, twitter?: string, website?: string }>(
    (agent as any).externalSocials ? JSON.parse((agent as any).externalSocials) : {}
  );
  const [showTelegramForm, setShowTelegramForm] = React.useState(false);
  const [telegramToken, setTelegramToken] = React.useState("");
  const [telegramConnecting, setTelegramConnecting] = React.useState(false);
  const [pairingCode, setPairingCode] = React.useState<string | null>(null);
  const [pairingCodeExpiresAt, setPairingCodeExpiresAt] = React.useState<string | null>(null);
  const [pairingCodeLoading, setPairingCodeLoading] = React.useState(false);
  const [pairingCodeError, setPairingCodeError] = React.useState<string | null>(null);
  const [adminPairingLoading, setAdminPairingLoading] = React.useState(false);
  const [adminPairedCount, setAdminPairedCount] = React.useState(0);

  // LLM configuration state (allow owner to change provider/model)
  const [llmProvider, setLlmProvider] = React.useState<LLMProvider>(agent.llmProvider as LLMProvider);
  const [llmModel, setLlmModel] = React.useState<string>(agent.llmModel);
  const [updatingLLM, setUpdatingLLM] = React.useState(false);
  const [llmUpdateError, setLlmUpdateError] = React.useState<string | null>(null);

  // Advanced settings state
  const [systemPrompt, setSystemPrompt] = React.useState(agent.systemPrompt || "");
  const [webUrl, setWebUrl] = React.useState(agent.configuration?.webUrl || "");
  const [contactEmail, setContactEmail] = React.useState(agent.configuration?.contactEmail || "");
  const [updatingAdvanced, setUpdatingAdvanced] = React.useState(false);

  // export / transfer state
  const [exportLoading, setExportLoading] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [newOwnerAddress, setNewOwnerAddress] = React.useState("");
  const [transferLoading, setTransferLoading] = React.useState(false);

  const telegramChannel = channelData?.channels?.find((c) => c.type === "telegram" && c.enabled);

  // dynamically compute list of models for selected provider
  const providerModels = React.useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return LLM_MODELS[llmProvider] || [];
  }, [llmProvider]);
  const botUsername = telegramChannel?.botUsername?.replace(/^@/, "");
  const hasTelegramBot = !!botUsername;

  const fetchAdminPairingStatus = React.useCallback(async () => {
    if (!agent.id) return;
    setAdminPairingLoading(true);
    try {
      const res = await fetch(`/api/openclaw/channels?agent=${encodeURIComponent(agent.id)}`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.bindings)) {
        setAdminPairedCount(0);
        return;
      }
      const pairedBindings = data.bindings.filter(
        (b: { channel?: string; type?: string }) =>
          b.channel === "telegram" && (b.type === "pairing" || b.type === "direct")
      );
      setAdminPairedCount(pairedBindings.length);
    } catch {
      setAdminPairedCount(0);
    } finally {
      setAdminPairingLoading(false);
    }
  }, [agent.id]);

  React.useEffect(() => {
    if (open && hasTelegramBot) {
      fetchAdminPairingStatus();
    }
  }, [open, hasTelegramBot, fetchAdminPairingStatus]);

  const handleGeneratePairingCode = async () => {
    setPairingCodeLoading(true);
    setPairingCodeError(null);
    try {
      const res = await fetch("/api/openclaw/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_code", agentId: agent.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPairingCodeError(data.error || "Failed to generate pairing code");
        return;
      }
      setPairingCode(data.code || null);
      setPairingCodeExpiresAt(data.expiresAt || null);
    } catch {
      setPairingCodeError("Network error while generating pairing code");
    } finally {
      setPairingCodeLoading(false);
    }
  };

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

  // export agent to JSON (includes private key)
  const handleExport = async () => {
    if (!agent.id || !agent.owner?.walletAddress) return;
    setExportLoading(true);
    setExportError(null);
    try {
      const res = await fetch(`/api/agents/${agent.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: agent.owner.walletAddress,
          confirmationName: agent.name,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${agent.name}-export.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Agent exported");
        onSocialsUpdated?.();
        onClose();
      } else {
        const data = await res.json();
        setExportError(data.error || "Export failed");
      }
    } catch (err: any) {
      setExportError(err?.message || "Network error");
    } finally {
      setExportLoading(false);
    }
  };

  // transfer ownership to another user by wallet address
  const handleTransfer = async () => {
    if (!agent.id || !agent.owner?.walletAddress || !newOwnerAddress) return;
    setTransferLoading(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: agent.owner.walletAddress,
          newOwnerWalletAddress: newOwnerAddress,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Ownership transferred");
        onSocialsUpdated?.();
        onClose();
      } else {
        toast.error(data.error || "Transfer failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-md max-h-[90vh] overflow-auto">
      <div className="p-6 space-y-5">
        <h2 className="text-lg font-semibold text-forest">Admin</h2>

        {/* System Prompt Section */}
        <div>
          <h3 className="text-sm font-medium text-forest mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            System Prompt
          </h3>
          <p className="text-[10px] text-forest-muted mb-2 uppercase font-bold">
            The core behavioral logic and personality of your agent.
          </p>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="min-h-[150px] text-xs font-mono bg-gypsum border-forest/10"
            placeholder="You are a helpful assistant..."
          />
        </div>

        {/* Network Manifest Section */}
        <div>
          <h3 className="text-sm font-medium text-forest mb-2 flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Network Manifest
          </h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-forest-muted">Web URL</label>
              <Input
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                placeholder="https://agent.xyz"
                className="h-9 text-xs bg-gypsum border-forest/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-forest-muted">Contact Email</label>
              <Input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="admin@agent.xyz"
                className="h-9 text-xs bg-gypsum border-forest/10"
              />
            </div>
          </div>
        </div>

        <Button
          size="sm"
          className="w-full"
          disabled={updatingAdvanced}
          onClick={async () => {
            setUpdatingAdvanced(true);
            try {
              const res = await fetch(`/api/agents/${agent.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  systemPrompt,
                  configuration: {
                    ...agent.configuration,
                    webUrl,
                    contactEmail
                  }
                }),
              });
              if (!res.ok) throw new Error("Failed to update advanced settings");
              toast.success("Agent settings updated");
              // Update local state
              agent.systemPrompt = systemPrompt;
              agent.configuration = { ...agent.configuration, webUrl, contactEmail };
            } catch (err: any) {
              toast.error(err.message || "Update failed");
            } finally {
              setUpdatingAdvanced(false);
            }
          }}
        >
          {updatingAdvanced ? <><Loader2 className="w-3 h-3 animate-spin mr-2" /> Saving...</> : "Save Advanced Settings"}
        </Button>

        {/* export & transfer actions */}
        <div className="border-t-2 border-forest/5 pt-4 space-y-2">
          <h3 className="text-sm font-medium text-forest mb-2">Export & Ownership</h3>
          <p className="text-xs text-forest-muted">
            You’ll still need to transfer the ERC‑8004 NFT on‑chain to the new
            wallet using your own gas. This section only updates the
            Agent‑Haus record.
          </p>
          {agent.exported && agent.exportedAt && (
            <p className="text-xs text-forest-muted">
              Exported at {new Date(agent.exportedAt).toLocaleString()}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={exportLoading}
              onClick={handleExport}
            >
              {exportLoading ? (
                <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Exporting...</>
              ) : (
                "Export agent"
              )}
            </Button>
            <div className="flex-1">
              <Input
                placeholder="New owner wallet address"
                value={newOwnerAddress}
                onChange={(e) => setNewOwnerAddress(e.target.value)}
                className="w-full"
              />
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 w-full"
                disabled={transferLoading || !newOwnerAddress}
                onClick={handleTransfer}
              >
                {transferLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Transfer Ownership"}
              </Button>
            </div>
          </div>
          {exportError && <p className="text-xs text-red-500">{exportError}</p>}
        </div>

        <div className="border-t-2 border-forest/5 pt-4">
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
            <div className="space-y-2">
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

              <div className="p-3 rounded-lg bg-gypsum/80 border border-forest/10 space-y-2">
                <div className="flex items-center justify-between rounded-md bg-white/70 border border-forest/10 px-2 py-1.5">
                  <span className="text-[10px] text-forest-muted">Admin pairing status</span>
                  {adminPairingLoading ? (
                    <span className="text-[10px] text-forest-muted">Checking...</span>
                  ) : adminPairedCount > 0 ? (
                    <span className="text-[10px] text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-0.5">
                      Admin Paired ({adminPairedCount})
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                      Not Paired
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 w-full"
                  disabled={pairingCodeLoading}
                  onClick={handleGeneratePairingCode}
                >
                  {pairingCodeLoading ? (
                    <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Generating...</>
                  ) : (
                    "Generate Pairing Code"
                  )}
                </Button>

                {pairingCodeError && (
                  <p className="text-[10px] text-red-400">{pairingCodeError}</p>
                )}

                {pairingCode && (
                  <div className="rounded-lg bg-white border border-forest/10 px-3 py-2">
                    <p className="text-[10px] text-forest-muted mb-1">Send this code to the bot to get admin wallet access</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-mono text-forest font-semibold">{pairingCode}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-6 px-2"
                        onClick={() => navigator.clipboard.writeText(pairingCode)}
                      >
                        Copy
                      </Button>
                    </div>
                    {pairingCodeExpiresAt && (
                      <p className="text-[10px] text-forest-muted mt-1">
                        Expires: {new Date(pairingCodeExpiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] h-6 w-full"
                  disabled={adminPairingLoading}
                  onClick={fetchAdminPairingStatus}
                >
                  Refresh Status
                </Button>
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
            <p className="text-sm text-forest-muted">Agent is verified with Self Protocol.</p>
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
            <p className="text-xs text-forest-muted mb-1">Ed25519 SPKI base64 (Self Protocol)</p>
            <PublicKeyDisplay publicKey={(verificationStatus?.publicKey ?? agent.verification?.publicKey)!} />
          </div>
        )}

        {/* Skill Toggles */}
        <div>
          <h3 className="text-sm font-medium text-forest mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Skill Toggles
          </h3>
          <p className="text-xs text-forest-muted mb-3">
            Enable or disable specific capabilities for your agent.
          </p>
          <SkillsCard agentId={agent.id} templateType={agent.templateType} />

          <Card className="border border-forest/10 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-forest flex items-center gap-2">
              🌐 External Socials
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-forest-muted">Telegram Username / Link</label>
                <input
                  className="w-full h-9 rounded-lg bg-gypsum border border-forest/10 px-3 text-sm"
                  placeholder="@myagent_bot or t.me/..."
                  value={socials.telegram || ""}
                  onChange={(e) => setSocials({ ...socials, telegram: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-forest-muted">Twitter / X</label>
                <input
                  className="w-full h-9 rounded-lg bg-gypsum border border-forest/10 px-3 text-sm"
                  placeholder="x.com/myagent"
                  value={socials.twitter || ""}
                  onChange={(e) => setSocials({ ...socials, twitter: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-forest-muted">Website</label>
                <input
                  className="w-full h-9 rounded-lg bg-gypsum border border-forest/10 px-3 text-sm"
                  placeholder="https://agenthaus.space"
                  value={socials.website || ""}
                  onChange={(e) => setSocials({ ...socials, website: e.target.value })}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/agents/${agent.id}/channels`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "update_socials", socials }),
                    });
                    if (res.ok) {
                      toast.success("Social links updated");
                      onSocialsUpdated?.();
                    }
                  } catch (err) {
                    toast.error("Failed to update socials");
                  }
                }}
              >
                Save Socials
              </Button>
            </div>
          </Card>
        </div>

        {/* LLM provider/model editing */}
        <div>
          <h3 className="text-sm font-medium text-forest mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            LLM Configuration
          </h3>
          <div className="space-y-2">
            <Select
              label="Provider"
              value={llmProvider}
              onChange={(e) => {
                const p = e.target.value as LLMProvider;
                setLlmProvider(p);
                // reset model to provider default
                const ms = (LLM_MODELS as any)[p] || [];
                setLlmModel(ms[0]?.id || "");
              }}
              options={[
                { value: "openrouter", label: "OpenRouter (Free Models)" },
                { value: "groq", label: "Groq (Fast Inference)" },
                { value: "openai", label: "OpenAI (ChatGPT)" },
                { value: "anthropic", label: "Anthropic (Claude)" },
                { value: "grok", label: "Grok (xAI)" },
                { value: "gemini", label: "Google Gemini" },
                { value: "deepseek", label: "DeepSeek" },
                { value: "zai", label: "Z.AI (GLM-4)" },
              ]}
            />
            <Select
              label="Model"
              value={llmModel}
              onChange={(e) => setLlmModel(e.target.value)}
              options={providerModels.map((m) => ({ value: m.id, label: m.name }))}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setUpdatingLLM(true);
                setLlmUpdateError(null);
                try {
                  const res = await fetch(`/api/agents/${agent.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ llmProvider, llmModel }),
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to update LLM");
                  }
                  // update parent agent object
                  agent.llmProvider = llmProvider;
                  agent.llmModel = llmModel;
                } catch (err: any) {
                  setLlmUpdateError(err?.message || "Unknown error");
                } finally {
                  setUpdatingLLM(false);
                }
              }}
              disabled={updatingLLM}
            >
              {updatingLLM ? (<><Loader2 className="w-3 h-3 animate-spin mr-1" />Saving...</>) : "Save LLM"}
            </Button>
            {llmUpdateError && <p className="text-xs text-red-400">{llmUpdateError}</p>}
          </div>
        </div>

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
              {onUpdateMetadata && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-8"
                    disabled={
                      isUpdatingMetadata ||
                      !hasUserAddress ||
                      (connectedChainId != null &&
                        agent.erc8004ChainId != null &&
                        connectedChainId !== agent.erc8004ChainId)
                    }
                    onClick={onUpdateMetadata}
                    title={
                      connectedChainId != null &&
                        agent.erc8004ChainId != null &&
                        connectedChainId !== agent.erc8004ChainId
                        ? `Switch to chain ${agent.erc8004ChainId} (agent was registered there)`
                        : undefined
                    }
                  >
                    {isUpdatingMetadata ? (
                      <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Updating...</>
                    ) : (
                      <><RefreshCw className="w-3 h-3 mr-1" /> Update metadata on-chain</>
                    )}
                  </Button>
                  {updateMetadataError && (
                    <p className="text-xs text-red-400">{updateMetadataError}</p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-400 font-medium">Not Registered On-Chain</span>
              </div>
              <p className="text-xs text-forest-muted mb-3">
                Required for advanced on-chain identity flows. Register your agent on the ERC-8004 IdentityRegistry.
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
