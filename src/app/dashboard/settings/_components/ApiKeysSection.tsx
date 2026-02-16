"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Key,
  Save,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { LLM_PROVIDER_INFO } from "@/lib/constants";
import type { LLMProvider } from "@/lib/types";

/** Provider configuration for the settings API-key cards */
export const PROVIDERS: {
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
  { key: "anthropic", label: "Anthropic (Claude) API Key", dbField: "anthropicApiKey", hasKeyField: "hasAnthropicKey", maskedField: "anthropicApiKey", badge: "Claude Sonnet, Opus" },
];

interface ApiKeysSectionProps {
  address: string | undefined;
  keyInputs: Record<string, string>;
  setKeyInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  keyStatus: Record<string, boolean | string | null>;
  saving: boolean;
  saveMessage: { type: "success" | "error"; text: string } | null;
  hasAnyKeyInput: boolean;
  onSave: () => void;
  onClearKey: (provider: LLMProvider) => void;
}

export function ApiKeysSection({
  address,
  keyInputs,
  setKeyInputs,
  keyStatus,
  saving,
  saveMessage,
  hasAnyKeyInput,
  onSave,
  onClearKey,
}: ApiKeysSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-accent" />
          <CardTitle>Your LLM API Keys</CardTitle>
        </div>
        <CardDescription>
          Each user stores their own API keys. Keys are encrypted with AES-256-GCM before storage.
          Never shared, never in env files.
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
                <label className="text-sm font-medium text-forest/80">{p.label}</label>
                {hasKey && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="default"
                      className="text-[10px] bg-forest/20 text-forest-light border-forest/30"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" /> Configured
                    </Badge>
                    <button
                      onClick={() => onClearKey(p.key)}
                      className="p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Remove key"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                )}
              </div>
              {hasKey && masked && (
                <div className="text-xs text-forest-muted/70 font-mono mb-1.5 px-1">
                  Current: {masked}
                </div>
              )}
              <Input
                type="password"
                placeholder={hasKey ? "Enter new key to replace..." : info.keyPlaceholder}
                value={keyInputs[p.key]}
                onChange={(e) =>
                  setKeyInputs((prev) => ({ ...prev, [p.key]: e.target.value }))
                }
              />
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="secondary" className="text-[10px]">
                  {p.badge}
                </Badge>
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
          <p className="text-xs text-forest-muted">
            🔐 Your keys are encrypted with AES-256-GCM and stored per-user in the database. They
            are never shared between users, never stored in environment variables, and never exposed
            in API responses or logs.
          </p>
        </div>

        {/* Save feedback */}
        {saveMessage && (
          <div
            className={`p-3 rounded-lg border flex items-center gap-2 ${
              saveMessage.type === "success"
                ? "bg-forest/5 border-forest/20 text-forest-light"
                : "bg-red-500/5 border-red-500/20 text-red-400"
            }`}
          >
            {saveMessage.type === "success" ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="text-sm">{saveMessage.text}</span>
          </div>
        )}

        <Button onClick={onSave} loading={saving} disabled={!address || !hasAnyKeyInput}>
          <Save className="w-4 h-4" />
          Save API Keys
        </Button>
      </CardContent>
    </Card>
  );
}

