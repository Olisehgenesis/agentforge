"use client";

import React from "react";
import Image from "next/image";
import { useAccount, useChainId } from "wagmi";
import type { LLMProvider } from "@/lib/types";
import {
  WalletNetworkSection,
  BotConfigSection,
  ApiKeysSection,
  PROVIDERS,
  InfoCardsSection,
  NotificationsContractsSection,
} from "./_components";

export default function SettingsPage() {
  const { address } = useAccount();
  const chainId = useChainId();

  // ── API-key state ────────────────────────────────────────────────────
  const [keyInputs, setKeyInputs] = React.useState<Record<string, string>>({
    openrouter: "",
    groq: "",
    openai: "",
    anthropic: "",
    grok: "",
    gemini: "",
    deepseek: "",
    zai: "",
  });

  const [saving, setSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!address) return;
    setSaving(true);
    setSaveMessage(null);

    try {
      const body: Record<string, string> = { walletAddress: address };
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
        setKeyInputs({
          openrouter: "",
          groq: "",
          openai: "",
          anthropic: "",
          grok: "",
          gemini: "",
          deepseek: "",
          zai: "",
        });
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
        setSaveMessage({
          type: "success",
          text: `${p.label.replace(" API Key", "")} key removed`,
        });
      }
    } catch (e) {
      console.error("Failed to clear key:", e);
    } finally {
      setSaving(false);
    }
  };

  const hasAnyKeyInput = Object.values(keyInputs).some(Boolean);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl space-y-6">
      {/* Header + Illustration */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-forest">Settings</h1>
          <p className="text-forest-muted text-sm mt-1">
            Manage your API keys, channels, and preferences
          </p>
        </div>
        <div className="hidden lg:block w-52 flex-shrink-0">
          <Image
            src="/images/10-Dashboard_Settings-Option_A-Bot_at_Settings_Hub.png"
            alt="AgentHaus bot at settings hub"
            width={208}
            height={117}
            className="w-full h-auto rounded-xl object-contain"
          />
        </div>
      </div>

      <WalletNetworkSection address={address} chainId={chainId} />

      <BotConfigSection keyStatus={keyStatus} />

      <ApiKeysSection
        address={address}
        keyInputs={keyInputs}
        setKeyInputs={setKeyInputs}
        keyStatus={keyStatus}
        saving={saving}
        saveMessage={saveMessage}
        hasAnyKeyInput={hasAnyKeyInput}
        onSave={handleSave}
        onClearKey={handleClearKey}
      />

      <InfoCardsSection />

      <NotificationsContractsSection />
    </div>
  );
}
