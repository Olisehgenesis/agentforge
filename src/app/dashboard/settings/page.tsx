"use client";

import React from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Key,
  Shield,
  Bell,
  Globe,
  Save,
  ExternalLink,
  Copy,
  Cpu,
  Zap,
  CheckCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  MessageSquare,
  Plus,
  Power,
  Timer,
  Send,
  Loader2,
} from "lucide-react";
import { formatAddress } from "@/lib/utils";
import { ERC8004_IDENTITY_REGISTRY, ERC8004_REPUTATION_REGISTRY, BLOCK_EXPLORER, LLM_MODELS, LLM_PROVIDER_INFO } from "@/lib/constants";
import type { LLMProvider } from "@/lib/types";

// Provider config for the settings page
const PROVIDERS: {
  key: LLMProvider;
  label: string;
  dbField: string;
  hasKeyField: string;
  maskedField: string;
  badge: string;
}[] = [
  { key: "openrouter", label: "OpenRouter API Key", dbField: "openrouterApiKey", hasKeyField: "hasOpenrouterKey", maskedField: "openrouterApiKey", badge: "Free Tier Available" },
  { key: "groq", label: "Groq API Key", dbField: "groqApiKey", hasKeyField: "hasGroqKey", maskedField: "groqApiKey", badge: "Fast Inference ⚡" },
  { key: "openai", label: "OpenAI API Key", dbField: "openaiApiKey", hasKeyField: "hasOpenaiKey", maskedField: "openaiApiKey", badge: "GPT-4o, o1, o3" },
  { key: "grok", label: "Grok (xAI) API Key", dbField: "grokApiKey", hasKeyField: "hasGrokKey", maskedField: "grokApiKey", badge: "Grok 3, Grok 2" },
  { key: "gemini", label: "Google Gemini API Key", dbField: "geminiApiKey", hasKeyField: "hasGeminiKey", maskedField: "geminiApiKey", badge: "Gemini 2.0, 1.5 Pro" },
  { key: "deepseek", label: "DeepSeek API Key", dbField: "deepseekApiKey", hasKeyField: "hasDeepseekKey", maskedField: "deepseekApiKey", badge: "DeepSeek V3, R1" },
  { key: "zai", label: "Z.AI (Zhipu) API Key", dbField: "zaiApiKey", hasKeyField: "hasZaiKey", maskedField: "zaiApiKey", badge: "GLM-4 Flash Free" },
];

// ---------------------------------------------------------------------------
// Channel definitions for the UI
// ---------------------------------------------------------------------------
interface ChannelDef {
  key: string;
  label: string;
  icon: string;
  alwaysOn?: boolean;
  tokenField?: string | null;
  tokenLabel?: string | null;
  helpUrl?: string | null;
  helpLabel?: string | null;
}

const CHANNEL_DEFS: ChannelDef[] = [
  { key: "web", label: "Web Chat", icon: "💬", alwaysOn: true },
  { key: "telegram", label: "Telegram", icon: "📱", tokenField: "botToken", tokenLabel: "Bot Token", helpUrl: "https://core.telegram.org/bots#botfather", helpLabel: "Create with @BotFather" },
  { key: "discord", label: "Discord", icon: "🎮", tokenField: "botToken", tokenLabel: "Bot Token", helpUrl: "https://discord.com/developers/applications", helpLabel: "Discord Developer Portal" },
  { key: "whatsapp", label: "WhatsApp", icon: "📞", tokenField: null, tokenLabel: null, helpUrl: "https://docs.openclaw.ai/channels/whatsapp", helpLabel: "Pair via QR" },
];

// ---------------------------------------------------------------------------
// OpenClaw Runtime Card (interactive)
// ---------------------------------------------------------------------------
function OpenClawRuntimeCard() {
  const [status, setStatus] = React.useState<{
    gateway: { running: boolean; port: number; version: string; service?: { installed: boolean; running: boolean; pid?: number; dashboard?: string } };
    channels: Array<{ name: string; enabled: boolean; state: string; detail: string; botUsername?: string }>;
    cronJobs: Array<{ id: string; name: string; cron?: string; every?: string; message: string; enabled: boolean }>;
    sessions: Array<{ key: string; agentId: string; model: string; age: string }>;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Channel config form
  const [configChannel, setConfigChannel] = React.useState<string | null>(null);
  const [channelToken, setChannelToken] = React.useState("");
  const [channelSaving, setChannelSaving] = React.useState(false);
  const [channelMessage, setChannelMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Cron job form
  const [showCronForm, setShowCronForm] = React.useState(false);
  const [cronForm, setCronForm] = React.useState({ name: "", message: "", every: "", cron: "", channel: "", to: "" });
  const [cronSaving, setCronSaving] = React.useState(false);

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch("/api/openclaw/status");
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleAddChannel = async () => {
    if (!configChannel) return;
    setChannelSaving(true);
    setChannelMessage(null);
    try {
      const res = await fetch("/api/openclaw/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: configChannel, botToken: channelToken || undefined, enabled: true }),
      });
      const data = await res.json();
      if (data.success) {
        setChannelMessage({ type: "success", text: `${configChannel} configured! Gateway restarting to apply changes.` });
        setConfigChannel(null);
        setChannelToken("");
        fetchStatus();
      } else {
        setChannelMessage({ type: "error", text: data.message || "Failed to configure channel" });
      }
    } catch (err) {
      setChannelMessage({ type: "error", text: err instanceof Error ? err.message : "Network error" });
    } finally {
      setChannelSaving(false);
    }
  };

  const handleRemoveChannel = async (channel: string) => {
    if (!confirm(`Remove ${channel} channel? The gateway will restart.`)) return;
    try {
      await fetch("/api/openclaw/channels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      fetchStatus();
    } catch {
      // ignore
    }
  };

  const handleAddCron = async () => {
    setCronSaving(true);
    try {
      const res = await fetch("/api/openclaw/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cronForm.name,
          message: cronForm.message,
          every: cronForm.every || undefined,
          cron: cronForm.cron || undefined,
          channel: cronForm.channel || undefined,
          to: cronForm.to || undefined,
          announce: !!cronForm.channel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCronForm(false);
        setCronForm({ name: "", message: "", every: "", cron: "", channel: "", to: "" });
        fetchStatus();
      }
    } catch {
      // ignore
    } finally {
      setCronSaving(false);
    }
  };

  const handleDeleteCron = async (jobId: string) => {
    if (!confirm("Delete this scheduled task?")) return;
    try {
      await fetch("/api/openclaw/cron", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      fetchStatus();
    } catch {
      // ignore
    }
  };

  const handleToggleCron = async (jobId: string, enabled: boolean) => {
    try {
      await fetch("/api/openclaw/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", jobId, enabled }),
      });
      fetchStatus();
    } catch {
      // ignore
    }
  };

  const isChannelConfigured = (name: string) =>
    status?.channels.some((c) => c.name === name && c.enabled) ?? false;

  const getChannelInfo = (name: string) =>
    status?.channels.find((c) => c.name === name);

  return (
    <Card className="border-red-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-red-400" />
            <CardTitle>OpenClaw Gateway</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <CardDescription>
          Self-hosted AI gateway — connect your agents to Telegram, Discord, WhatsApp, and more
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gateway Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="text-lg">🦞</div>
            <div>
              <div className="text-sm text-white font-medium">
                Gateway {status?.gateway.version && `v${status.gateway.version}`}
              </div>
              <div className="text-xs text-slate-500">
                {status?.gateway.running
                  ? `Port ${status.gateway.port} · PID ${status.gateway.service?.pid || "—"}`
                  : "Not detected"}
              </div>
              {status?.gateway.service?.dashboard && (
                <a
                  href={status.gateway.service.dashboard}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-0.5"
                >
                  Open Dashboard <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
          ) : (
            <Badge
              variant="default"
              className={
                status?.gateway.running
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-red-500/20 text-red-400 border-red-500/30"
              }
            >
              <Power className="w-3 h-3 mr-1" />
              {status?.gateway.running ? "Running" : "Offline"}
            </Badge>
          )}
        </div>

        {/* Channels Grid */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            Communication Channels
          </div>
          <div className="grid grid-cols-2 gap-3">
            {CHANNEL_DEFS.map((ch) => {
              const info = getChannelInfo(ch.key);
              const isActive = ch.alwaysOn || isChannelConfigured(ch.key);

              return (
                <div
                  key={ch.key}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    isActive ? "bg-slate-800/50 border border-emerald-500/20" : "bg-slate-800/30 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{ch.icon}</span>
                    <div>
                      <span className="text-sm text-slate-300">{ch.label}</span>
                      {info?.botUsername && (
                        <div className="text-[10px] text-slate-500">{info.botUsername}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isActive ? (
                      <>
                        <Badge
                          variant="default"
                          className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        >
                          Active
                        </Badge>
                        {!ch.alwaysOn && (
                          <button
                            onClick={() => handleRemoveChannel(ch.key)}
                            className="p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Remove channel"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => setConfigChannel(ch.key)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Configure
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Channel Configuration Form */}
        {configChannel && (() => {
          const chDef = CHANNEL_DEFS.find((c) => c.key === configChannel);
          if (!chDef) return null;
          return (
            <div className="p-4 rounded-lg bg-slate-800/50 border border-blue-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white font-medium">
                  Configure {chDef.icon} {chDef.label}
                </div>
                <button onClick={() => { setConfigChannel(null); setChannelToken(""); }} className="text-xs text-slate-400 hover:text-white cursor-pointer">
                  Cancel
                </button>
              </div>

              {chDef.tokenField ? (
                <>
                  <Input
                    type="password"
                    placeholder={`Enter ${chDef.label} ${chDef.tokenLabel}...`}
                    value={channelToken}
                    onChange={(e) => setChannelToken(e.target.value)}
                  />
                  {chDef.helpUrl && (
                    <a
                      href={chDef.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {chDef.helpLabel} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </>
              ) : (
                <div className="text-xs text-slate-400">
                  {chDef.label} uses QR code pairing. Click Save to enable it, then run{" "}
                  <code className="text-emerald-400">openclaw channels login</code> in your terminal to pair.
                </div>
              )}

              {channelMessage && (
                <div className={`p-2 rounded text-xs flex items-center gap-2 ${
                  channelMessage.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}>
                  {channelMessage.type === "success" ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {channelMessage.text}
                </div>
              )}

              <Button
                size="sm"
                onClick={handleAddChannel}
                disabled={channelSaving || (!!chDef.tokenField && !channelToken)}
                loading={channelSaving}
              >
                <Save className="w-3 h-3" />
                Save & Enable {chDef.label}
              </Button>
            </div>
          );
        })()}

        {/* Scheduled Tasks (Cron) */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Timer className="w-3 h-3" />
              Scheduled Tasks
            </div>
            <button
              onClick={() => setShowCronForm(!showCronForm)}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add Task
            </button>
          </div>

          {status?.cronJobs && status.cronJobs.length > 0 ? (
            <div className="space-y-2">
              {status.cronJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
                  <div>
                    <div className="text-sm text-white">{job.name}</div>
                    <div className="text-xs text-slate-500">
                      {job.cron ? `Cron: ${job.cron}` : job.every ? `Every ${job.every}` : "One-shot"}{" "}
                      · {job.message.slice(0, 60)}{job.message.length > 60 ? "..." : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={job.enabled}
                        onChange={() => handleToggleCron(job.id, !job.enabled)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-700 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-white" />
                    </label>
                    <button
                      onClick={() => handleDeleteCron(job.id)}
                      className="p-1 rounded hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-slate-800/30 text-center">
              <p className="text-xs text-slate-500">
                No scheduled tasks. Add periodic reports, balance checks, or automated actions.
              </p>
            </div>
          )}

          {/* Cron Form */}
          {showCronForm && (
            <div className="p-4 rounded-lg bg-slate-800/50 border border-blue-500/20 space-y-3 mt-2">
              <div className="text-sm text-white font-medium">New Scheduled Task</div>
              <Input
                placeholder="Task name (e.g. Daily Balance Report)"
                value={cronForm.name}
                onChange={(e) => setCronForm((p) => ({ ...p, name: e.target.value }))}
              />
              <Input
                placeholder="Message / instruction for the agent"
                value={cronForm.message}
                onChange={(e) => setCronForm((p) => ({ ...p, message: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Interval</label>
                  <Input
                    placeholder="e.g. 1h, 30m, 24h"
                    value={cronForm.every}
                    onChange={(e) => setCronForm((p) => ({ ...p, every: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Or Cron Expression</label>
                  <Input
                    placeholder="e.g. 0 9 * * *"
                    value={cronForm.cron}
                    onChange={(e) => setCronForm((p) => ({ ...p, cron: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Deliver to Channel</label>
                  <select
                    value={cronForm.channel}
                    onChange={(e) => setCronForm((p) => ({ ...p, channel: e.target.value }))}
                    className="w-full h-9 rounded-md bg-slate-800 border border-slate-700 text-sm text-white px-3"
                  >
                    <option value="">None (agent session only)</option>
                    <option value="telegram">Telegram</option>
                    <option value="discord">Discord</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Target (chat ID / number)</label>
                  <Input
                    placeholder="e.g. 732186130"
                    value={cronForm.to}
                    onChange={(e) => setCronForm((p) => ({ ...p, to: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddCron} disabled={cronSaving || !cronForm.name || !cronForm.message || (!cronForm.every && !cronForm.cron)} loading={cronSaving}>
                  <Plus className="w-3 h-3" /> Create Task
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCronForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* Sessions */}
        {status?.sessions && status.sessions.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Active Sessions</div>
            {status.sessions.map((s) => (
              <div key={s.key} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                <div className="text-xs text-slate-400 font-mono">{s.key}</div>
                <div className="text-xs text-slate-500">{s.model} · {s.age}</div>
              </div>
            ))}
          </div>
        )}

        {/* Webhook Info */}
        <div className="p-3 rounded-lg bg-slate-800/30">
          <p className="text-xs text-slate-400">
            🦞 <strong className="text-white">Webhook Bridge:</strong> OpenClaw routes channel messages through Agent Forge&apos;s LLM pipeline (with wallet context &amp; transaction execution).
            Endpoint: <code className="text-emerald-400">/api/openclaw/webhook</code>
          </p>
        </div>

        {!status?.gateway.running && (
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">
                  <strong className="text-amber-400">Gateway not detected.</strong> Make sure OpenClaw is installed and the gateway service is running:
                </p>
                <div className="mt-1 p-2 rounded bg-slate-900/50 font-mono text-xs text-slate-300">
                  npm install -g openclaw@latest<br />
                  openclaw onboard --install-daemon<br />
                  openclaw gateway start
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { address } = useAccount();

  // Key inputs keyed by provider
  const [keyInputs, setKeyInputs] = React.useState<Record<string, string>>({
    openrouter: "",
    groq: "",
    openai: "",
    grok: "",
    gemini: "",
    deepseek: "",
    zai: "",
  });

  const [saving, setSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Stored key status from DB
  const [keyStatus, setKeyStatus] = React.useState<Record<string, boolean | string | null>>({});
  const [loading, setLoading] = React.useState(true);

  // Load existing key status on mount
  React.useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        const res = await fetch(`/api/settings?walletAddress=${address}`);
        if (res.ok) {
          const data = await res.json();
          setKeyStatus(data);
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [address]);

  const handleSave = async () => {
    if (!address) return;
    setSaving(true);
    setSaveMessage(null);

    try {
      const body: Record<string, string> = { walletAddress: address };
      // Only send keys that the user has typed (non-empty input)
      for (const p of PROVIDERS) {
        if (keyInputs[p.key]) {
          body[p.dbField] = keyInputs[p.key];
        }
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        // Update status with new has* flags
        setKeyStatus((prev) => {
          const next = { ...prev };
          for (const p of PROVIDERS) {
            if (data[p.hasKeyField] !== undefined) {
              next[p.hasKeyField] = data[p.hasKeyField];
            }
            if (keyInputs[p.key]) {
              const k = keyInputs[p.key];
              next[p.maskedField] = `${k.slice(0, 10)}...${k.slice(-4)}`;
            }
          }
          return next;
        });
        // Clear inputs after successful save
        setKeyInputs({ openrouter: "", groq: "", openai: "", grok: "", gemini: "", deepseek: "", zai: "" });
        setSaveMessage({ type: "success", text: "API keys saved securely!" });
      } else {
        const errData = await res.json();
        setSaveMessage({ type: "error", text: errData.error || "Failed to save" });
      }
    } catch (e) {
      console.error("Failed to save settings:", e);
      setSaveMessage({ type: "error", text: "Network error — please try again" });
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async (provider: LLMProvider) => {
    if (!address) return;
    setSaving(true);
    setSaveMessage(null);

    const p = PROVIDERS.find((x) => x.key === provider)!;

    try {
      const body: Record<string, string> = { walletAddress: address };
      body[p.dbField] = "";

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setKeyStatus((prev) => ({
          ...prev,
          [p.hasKeyField]: false,
          [p.maskedField]: null,
        }));
        setSaveMessage({ type: "success", text: `${p.label.replace(" API Key", "")} key removed` });
      }
    } catch (e) {
      console.error("Failed to clear key:", e);
    } finally {
      setSaving(false);
    }
  };

  const hasAnyKeyInput = Object.values(keyInputs).some(Boolean);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your API keys, OpenClaw runtime, and preferences
        </p>
      </div>

      {/* Wallet Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <CardTitle>Wallet</CardTitle>
          </div>
          <CardDescription>Your connected wallet information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
            <div>
              <div className="text-xs text-slate-500">Connected Address</div>
              <div className="text-sm font-mono text-white mt-1">
                {address || "Not connected"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">Connected</Badge>
              {address && (
                <button
                  onClick={() => navigator.clipboard.writeText(address)}
                  className="p-1.5 rounded hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LLM API Keys — Per-User Storage */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" />
            <CardTitle>Your LLM API Keys</CardTitle>
          </div>
          <CardDescription>
            Each user stores their own API keys. Keys are encrypted with AES-256-GCM before storage. Never shared, never in env files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PROVIDERS.map((p) => {
            const hasKey = !!keyStatus[p.hasKeyField];
            const masked = keyStatus[p.maskedField] as string | null;
            const info = LLM_PROVIDER_INFO[p.key];

            return (
              <div key={p.key}>
            <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-300">{p.label}</label>
                  {hasKey && (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" /> Configured
                  </Badge>
                  <button
                        onClick={() => handleClearKey(p.key)}
                    className="p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Remove key"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              )}
            </div>
                {hasKey && masked && (
              <div className="text-xs text-slate-500 font-mono mb-1.5 px-1">
                    Current: {masked}
              </div>
            )}
            <Input
              type="password"
                  placeholder={hasKey ? "Enter new key to replace..." : info.keyPlaceholder}
                  value={keyInputs[p.key]}
                  onChange={(e) => setKeyInputs((prev) => ({ ...prev, [p.key]: e.target.value }))}
            />
            <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="secondary" className="text-[10px]">{p.badge}</Badge>
              <a
                    href={info.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
            );
          })}

          {/* Security notice */}
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-xs text-slate-400">
              🔐 Your keys are encrypted with AES-256-GCM and stored per-user in the database. They are never shared between users, never stored in environment variables, and never exposed in API responses or logs.
            </p>
          </div>

          {/* Save feedback */}
          {saveMessage && (
            <div className={`p-3 rounded-lg border flex items-center gap-2 ${
              saveMessage.type === "success"
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/5 border-red-500/20 text-red-400"
            }`}>
              {saveMessage.type === "success" ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="text-sm">{saveMessage.text}</span>
            </div>
          )}

          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!address || !hasAnyKeyInput}
          >
            <Save className="w-4 h-4" />
            Save API Keys
          </Button>
        </CardContent>
      </Card>

      {/* OpenClaw Runtime — Live Gateway Integration */}
      <OpenClawRuntimeCard />

      {/* Agent Wallet Configuration */}
      <Card className="border-emerald-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <CardTitle>Agent Wallets</CardTitle>
          </div>
          <CardDescription>HD wallet derivation for agent on-chain transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-slate-800/50">
            <div className="text-xs text-slate-500 mb-1">AGENT_MNEMONIC</div>
            <p className="text-xs text-slate-400 mb-2">
              A BIP-39 mnemonic phrase in your <code className="text-emerald-400">.env</code> file is used to derive unique HD wallets for each agent.
              Each agent gets its own address via <code className="text-emerald-400">m/44&apos;/60&apos;/0&apos;/0/&#123;index&#125;</code>.
            </p>
            <div className="p-2 rounded bg-slate-900/50 font-mono text-xs text-slate-300">
              AGENT_MNEMONIC=&quot;your twelve word mnemonic phrase goes here ...&quot;
            </div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">
                  <strong className="text-amber-400">Security:</strong> The mnemonic stays on the server and is never exposed to the frontend.
                  Private keys are derived on-the-fly for signing and never persisted to disk.
                  On Celo Sepolia testnet, use a dedicated test mnemonic — do not reuse your personal wallet.
                </p>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/30">
            <p className="text-xs text-slate-400">
              ✅ Agents created when <code className="text-emerald-400">AGENT_MNEMONIC</code> is set automatically get a wallet.
              For agents without wallets, use the <strong>&quot;Initialize Wallet&quot;</strong> button on the agent detail page.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Model Info — dynamically built from constants */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <CardTitle>Available Models</CardTitle>
          </div>
          <CardDescription>Free and paid models for your agents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(LLM_MODELS) as LLMProvider[]).map((provider) => {
            const info = LLM_PROVIDER_INFO[provider];
            const models = LLM_MODELS[provider];

            return (
              <div key={provider}>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 mt-3">
                  {info.label}
              </div>
                {models.map((model) => {
                  const isFree = model.name.toLowerCase().includes("free");
                  return (
                    <div key={model.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/30 transition-colors">
              <div>
                <span className="text-sm text-white">{model.name}</span>
              </div>
              <Badge
                variant="secondary"
                className={`text-[10px] ${
                          isFree
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                        {isFree ? "Free" : "Paid"}
              </Badge>
            </div>
                  );
                })}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Configure alert preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Spending limit approaching (>80%)", defaultChecked: true },
              { label: "Failed transactions", defaultChecked: true },
              { label: "Agent status changes", defaultChecked: true },
              { label: "Reputation score changes", defaultChecked: false },
              { label: "Low wallet balance warnings", defaultChecked: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
                <span className="text-sm text-slate-300">{item.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={item.defaultChecked}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:ring-2 peer-focus:ring-emerald-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white" />
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ERC-8004 Contract Addresses */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <CardTitle>ERC-8004 Contracts</CardTitle>
          </div>
          <CardDescription>On-chain registry addresses on Celo Sepolia</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-slate-800/50">
            <div className="text-xs text-slate-500 mb-1">IdentityRegistry</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-white">{formatAddress(ERC8004_IDENTITY_REGISTRY)}</span>
              <a
                href={`${BLOCK_EXPLORER}/address/${ERC8004_IDENTITY_REGISTRY}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50">
            <div className="text-xs text-slate-500 mb-1">ReputationRegistry</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-white">{formatAddress(ERC8004_REPUTATION_REGISTRY)}</span>
              <a
                href={`${BLOCK_EXPLORER}/address/${ERC8004_REPUTATION_REGISTRY}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
