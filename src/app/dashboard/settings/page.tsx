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
  Zap,
  CheckCircle,
  AlertCircle,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { formatAddress } from "@/lib/utils";
import { ERC8004_CONTRACTS, BLOCK_EXPLORER, BLOCK_EXPLORERS, LLM_MODELS, LLM_PROVIDER_INFO } from "@/lib/constants";
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

// (OpenClaw runtime card removed — channels are now native per-agent)

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
          Manage your API keys, channels, and preferences
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

      {/* Channel Integration Info */}
      <Card className="border-blue-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <CardTitle>Channel Integrations</CardTitle>
          </div>
          <CardDescription>
            Connect your agents to Telegram, Discord, and more — each agent gets its own bot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-800/50 text-center">
              <div className="text-2xl mb-1">💬</div>
              <div className="text-xs text-slate-300 font-medium">Web Chat</div>
              <Badge variant="default" className="text-[10px] mt-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Always On</Badge>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/50 text-center">
              <div className="text-2xl mb-1">📱</div>
              <div className="text-xs text-slate-300 font-medium">Telegram</div>
              <Badge variant="secondary" className="text-[10px] mt-1">Per-Agent Bot</Badge>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/50 text-center">
              <div className="text-2xl mb-1">🎮</div>
              <div className="text-xs text-slate-300 font-medium">Discord</div>
              <Badge variant="secondary" className="text-[10px] mt-1">Coming Soon</Badge>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-xs text-slate-400">
              📡 <strong className="text-white">Multi-tenant:</strong> Each agent has its own Telegram bot token.
              Connect channels from the <strong>agent detail page</strong> → Channels &amp; Tasks card.
              No external gateway needed — everything runs natively in Agent Forge.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/30">
            <p className="text-xs text-slate-400">
              ⏰ <strong className="text-white">Cron Scheduler:</strong> Schedule periodic tasks per-agent
              (rate monitoring, portfolio reports, etc). Configure from the agent detail page or call
              <code className="text-emerald-400 ml-1">POST /api/cron/tick</code> every minute to execute due jobs.
            </p>
          </div>
        </CardContent>
      </Card>

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
          <CardDescription>
            On-chain agent registries — <a href="https://github.com/erc-8004/erc-8004-contracts" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">spec</a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(ERC8004_CONTRACTS).map(([chainIdStr, addrs]) => {
            const cid = Number(chainIdStr);
            const chainName = cid === 42220 ? "Celo Mainnet" : cid === 97 ? "BSC Testnet" : `Chain ${cid}`;
            const explorer = BLOCK_EXPLORERS[cid] || BLOCK_EXPLORER;
            return (
              <div key={cid} className="space-y-2">
                <div className="text-xs text-slate-400 font-medium">{chainName}</div>
                <div className="p-3 rounded-lg bg-slate-800/50">
                  <div className="text-xs text-slate-500 mb-1">IdentityRegistry</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-white">{formatAddress(addrs.identity)}</span>
                    <a
                      href={`${explorer}/address/${addrs.identity}`}
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
                    <span className="text-sm font-mono text-white">{formatAddress(addrs.reputation)}</span>
                    <a
                      href={`${explorer}/address/${addrs.reputation}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-slate-600 mt-2">
            Override for testnet: set NEXT_PUBLIC_ERC8004_IDENTITY and NEXT_PUBLIC_ERC8004_REPUTATION env vars.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
