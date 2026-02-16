"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Key, ExternalLink, Info, Upload, X, AlertCircle } from "lucide-react";
import { AGENT_TEMPLATES, LLM_MODELS, LLM_PROVIDER_INFO, DEPLOYMENT_ATTRIBUTION } from "@/lib/constants";
import type { AgentTemplate, LLMProvider, AgentConfig } from "@/lib/types";

interface ConfigureStepProps {
  selectedTemplate: AgentTemplate | null;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  systemPrompt: string;
  setSystemPrompt: (v: string) => void;
  llmProvider: LLMProvider;
  setLlmProvider: (v: LLMProvider) => void;
  llmModel: string;
  setLlmModel: (v: string) => void;
  config: AgentConfig;
  setConfig: (v: AgentConfig) => void;
  imageFile: File | null;
  setImageFile: (v: File | null) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  apiKeySaving: boolean;
  apiKeySaved: boolean;
  hasKeyForProvider: boolean;
  onSaveApiKey: () => void;
  onResetKey: () => void;
}

export function ConfigureStep({
  selectedTemplate,
  name,
  setName,
  description,
  setDescription,
  systemPrompt,
  setSystemPrompt,
  llmProvider,
  setLlmProvider,
  llmModel,
  setLlmModel,
  config,
  setConfig,
  imageFile,
  setImageFile,
  apiKey,
  setApiKey,
  apiKeySaving,
  apiKeySaved,
  hasKeyForProvider,
  onSaveApiKey,
  onResetKey,
}: ConfigureStepProps) {
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [nameTaken, setNameTaken] = React.useState<{ suggestion?: string } | null>(null);
  const [nameChecking, setNameChecking] = React.useState(false);

  React.useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImagePreview(null);
    }
  }, [imageFile]);

  React.useEffect(() => {
    if (!name?.trim() || name.length < 3) {
      setNameTaken(null);
      return;
    }
    const t = setTimeout(async () => {
      setNameChecking(true);
      try {
        const res = await fetch(`/api/selfclaw/check-name?name=${encodeURIComponent(name.trim())}`);
        const data = await res.json();
        setNameTaken(data.available ? null : { suggestion: data.suggestion });
      } catch {
        setNameTaken(null);
      } finally {
        setNameChecking(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [name]);
  const providerInfo = LLM_PROVIDER_INFO[llmProvider];
  const currentTemplate = AGENT_TEMPLATES.find((t) => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      {/* Agent Details */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Details</CardTitle>
          <CardDescription>Configure your agent&apos;s basic settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agent Image (ERC-8004 recommended) */}
          <div>
            <label className="text-sm font-medium text-forest block mb-1.5">Agent Image</label>
            <p className="text-xs text-forest-muted/70 mb-2">
              Recommended for ERC-8004. Shown in explorers and agent cards. PNG, JPEG, WebP (max 5MB)
            </p>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-xl border border-forest/15 bg-gypsum/50 flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-8 h-8 text-forest-muted/50" />
                )}
              </div>
              <div className="flex gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size <= 5 * 1024 * 1024) setImageFile(f);
                    }}
                  />
                  <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-medium bg-forest/10 text-forest hover:bg-forest/20 transition-colors">
                    Upload
                  </span>
                </label>
                {imageFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageFile(null)}
                    className="text-forest-muted hover:text-forest"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div>
            <Input
              label="Agent Name (optional)"
              placeholder={
                selectedTemplate
                  ? `e.g. My ${AGENT_TEMPLATES.find((t) => t.id === selectedTemplate)?.name || "Agent"}`
                  : "My Agent"
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-[10px] text-forest-muted/70 mt-1">
              Leave blank to auto-generate. If provided: 3–200 characters.
            </p>
            {nameTaken && (
              <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-amber-300">This name is already taken on SelfClaw.</p>
                  {nameTaken.suggestion && (
                    <p className="text-xs text-forest-muted mt-1">
                      Verification will use a unique suffix (e.g. {nameTaken.suggestion}) automatically.
                    </p>
                  )}
                </div>
              </div>
            )}
            {nameChecking && (
              <p className="text-[10px] text-forest-muted mt-1">Checking name availability...</p>
            )}
          </div>
          <div>
            <Input
              label="Description"
              placeholder="A brief description of what this agent does"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-[10px] text-forest-muted/70 mt-1">
              {description.length} chars. Recommended: 50–500 for ERC-8004.
            </p>
          </div>

          {/* ERC-8004 metadata (optional) */}
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Web URL (optional)"
              placeholder="https://myagent.example.com"
              type="url"
              value={config.webUrl ?? ""}
              onChange={(e) => setConfig({ ...config, webUrl: e.target.value.trim() || undefined })}
            />
            <Input
              label="Contact Email (optional)"
              placeholder="support@example.com"
              type="email"
              value={config.contactEmail ?? ""}
              onChange={(e) => setConfig({ ...config, contactEmail: e.target.value.trim() || undefined })}
            />
          </div>
          <div className="p-3 rounded-lg bg-forest/5 border border-forest/10">
            <p className="text-xs text-forest-muted">
              <span className="font-medium text-forest">{DEPLOYMENT_ATTRIBUTION}</span>
              {" "}— included in all agent metadata (ERC-8004 registration)
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-forest/80">LLM Provider</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-forest-muted hover:text-forest"
                  onClick={() => {
                    const defProvider = "groq" as LLMProvider;
                    setLlmProvider(defProvider);
                    setLlmModel(LLM_MODELS[defProvider][0].id);
                    setApiKey("");
                  }}
                >
                  Use default
                </Button>
              </div>
              <Select
                label=""
                value={llmProvider}
                onChange={(e) => {
                  const provider = e.target.value as LLMProvider;
                  setLlmProvider(provider);
                  setLlmModel(LLM_MODELS[provider][0].id);
                  setApiKey("");
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
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-forest/80">Model</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-forest-muted hover:text-forest"
                  onClick={() => setLlmModel(LLM_MODELS[llmProvider][0].id)}
                >
                  Use default
                </Button>
              </div>
              <Select
                label=""
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                options={LLM_MODELS[llmProvider].map((m) => ({
                  value: m.id,
                  label: m.name,
                }))}
              />
            </div>
          </div>

          {/* Inline API Key Configuration */}
          <div className="mt-4 p-4 rounded-lg bg-gypsum border border-forest/15/50">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-forest/80">
                {providerInfo.label} API Key
              </span>
              {hasKeyForProvider && (
                <Badge variant="default" className="text-[10px] bg-forest/20 text-forest-light border-celo/30">
                  ✓ Configured
                </Badge>
              )}
              {apiKeySaved && (
                <Badge variant="default" className="text-[10px] bg-forest/20 text-forest-light border-celo/30">
                  Saved!
                </Badge>
              )}
            </div>

            {hasKeyForProvider ? (
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-forest-muted">
                    Your {providerInfo.label} API key is already configured. You can update it in{" "}
                    <a href="/dashboard/settings" className="text-forest-light hover:text-forest underline">
                      Settings
                    </a>
                    .
                  </p>
                  <div className="mt-2">
                    <button
                      onClick={onResetKey}
                      className="text-xs text-forest-muted/70 hover:text-forest-muted underline cursor-pointer"
                    >
                      Enter a new key instead
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-forest-muted/70 mb-2">
                  {providerInfo.description}
                  {providerInfo.hasFreeModels && (
                    <span className="text-forest-light ml-1">• Free models available</span>
                  )}
                </p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder={providerInfo.keyPlaceholder}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onSaveApiKey}
                    loading={apiKeySaving}
                    disabled={!apiKey}
                    className="whitespace-nowrap"
                  >
                    Save Key
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <a
                    href={providerInfo.keyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    Get API Key <ExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-xs text-forest-faint">Optional — can be set later in Settings</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
          <CardDescription>Define your agent&apos;s behavior and capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter your agent's system prompt..."
            className="min-h-[250px] font-mono text-sm"
          />
          <p className="text-xs text-forest-muted/70 mt-2">
            {systemPrompt.length} characters • Defines how your agent processes requests
          </p>
        </CardContent>
      </Card>

      {/* Template-specific: Payment */}
      {currentTemplate && selectedTemplate === "payment" && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Settings</CardTitle>
            <CardDescription>Configure payment-specific parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Max Transaction Amount ($)"
              type="number"
              value={config.maxTransactionAmount?.toString() || "1000"}
              onChange={(e) => setConfig({ ...config, maxTransactionAmount: Number(e.target.value) })}
            />
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="requireConfirmation"
                checked={config.requireConfirmation ?? true}
                onChange={(e) => setConfig({ ...config, requireConfirmation: e.target.checked })}
                className="rounded border-forest/15"
              />
              <label htmlFor="requireConfirmation" className="text-sm text-forest/80">
                Require confirmation for transactions over $100
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template-specific: Trading */}
      {currentTemplate && selectedTemplate === "trading" && (
        <Card>
          <CardHeader>
            <CardTitle>Trading Settings</CardTitle>
            <CardDescription>Configure trading-specific parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Max Slippage (%)"
              type="number"
              step="0.1"
              value={config.maxSlippage?.toString() || "1.0"}
              onChange={(e) => setConfig({ ...config, maxSlippage: Number(e.target.value) })}
            />
            <Input
              label="Stop Loss (%)"
              type="number"
              step="0.5"
              value={config.stopLossPercentage?.toString() || "5.0"}
              onChange={(e) => setConfig({ ...config, stopLossPercentage: Number(e.target.value) })}
            />
          </CardContent>
        </Card>
      )}

      {/* Template-specific: Forex */}
      {currentTemplate && selectedTemplate === "forex" && (
        <Card>
          <CardHeader>
            <CardTitle>Forex Settings</CardTitle>
            <CardDescription>Configure forex trading and rate monitoring</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Max Position Size"
              type="number"
              value={config.maxPositionSize?.toString() || "100"}
              onChange={(e) => setConfig({ ...config, maxPositionSize: Number(e.target.value) })}
            />
            <Input
              label="Monitor Interval (min)"
              type="number"
              value={config.monitorInterval?.toString() || "5"}
              onChange={(e) => setConfig({ ...config, monitorInterval: Number(e.target.value) })}
            />
            <Input
              label="Max Transaction Amount ($)"
              type="number"
              value={config.maxTransactionAmount?.toString() || "1000"}
              onChange={(e) => setConfig({ ...config, maxTransactionAmount: Number(e.target.value) })}
            />
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="forexRequireConfirmation"
                checked={config.requireConfirmation ?? true}
                onChange={(e) => setConfig({ ...config, requireConfirmation: e.target.checked })}
                className="rounded border-forest/15"
              />
              <label htmlFor="forexRequireConfirmation" className="text-sm text-forest/80">
                Require confirmation for swaps over $10
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoTrade"
                checked={config.autoTrade ?? false}
                onChange={(e) => setConfig({ ...config, autoTrade: e.target.checked })}
                className="rounded border-forest/15"
              />
              <label htmlFor="autoTrade" className="text-sm text-forest/80">
                Enable automated trading
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template-specific: Social */}
      {currentTemplate && selectedTemplate === "social" && (
        <Card>
          <CardHeader>
            <CardTitle>Social Settings</CardTitle>
            <CardDescription>Configure tip distribution and engagement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Tip Amount (default CELO)"
              type="number"
              step="0.01"
              value={config.tipAmount?.toString() || "0.5"}
              onChange={(e) => setConfig({ ...config, tipAmount: Number(e.target.value) })}
            />
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoReply"
                checked={config.autoReply ?? true}
                onChange={(e) => setConfig({ ...config, autoReply: e.target.checked })}
                className="rounded border-forest/15"
              />
              <label htmlFor="autoReply" className="text-sm text-forest/80">
                Auto-reply to community messages
              </label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

