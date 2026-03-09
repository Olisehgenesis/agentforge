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
  isSimplified?: boolean;
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
  isSimplified = false,
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
    <div className="space-y-12">
      {/* Agent Details */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 border-b-4 border-forest pb-4">
          <div className="w-12 h-12 bg-forest text-white flex items-center justify-center font-black text-2xl">
            01
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Identity & core</h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Column: Image & Name */}
          <div className="space-y-8">
            {!isSimplified && (
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-forest">Agent Interface Image</label>
                <div className="flex items-center gap-8">
                  <div className="relative w-32 h-32 border-4 border-forest bg-gypsum flex items-center justify-center overflow-hidden shadow-hard">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-12 h-12 text-forest/20 stroke-[3px]" />
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="cursor-pointer bg-forest text-white px-6 py-2 font-black uppercase text-sm shadow-hard hover:bg-celo hover:text-forest transition-colors active:translate-y-px active:shadow-hard-active">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f && f.size <= 5 * 1024 * 1024) setImageFile(f);
                        }}
                      />
                      Upload Image
                    </label>
                    {imageFile && (
                      <button
                        type="button"
                        onClick={() => setImageFile(null)}
                        className="text-xs font-black uppercase tracking-widest text-forest/40 hover:text-forest underline"
                      >
                        Delete Asset
                      </button>
                    )}
                    <p className="text-[10px] font-bold text-forest/40 leading-tight uppercase">
                      Max 5MB • PNG / JPG / WEBP<br />ERC-8004 STANDARD
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-2">
                <Input
                  label="Network Identifier (Name)"
                  placeholder={
                    selectedTemplate
                      ? `e.g. ${AGENT_TEMPLATES.find((t) => t.id === selectedTemplate)?.name || "AGENT"}_01`
                      : "AGENT_ID"
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={isSimplified ? "text-sm" : "text-xl font-black uppercase"}
                />
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">
                    Permanent node identity
                  </p>
                  {nameChecking && (
                    <span className="text-[10px] font-black uppercase text-celo flex items-center gap-1">
                      <span className="w-2 h-2 bg-celo animate-pulse" /> Validating...
                    </span>
                  )}
                </div>
                {nameTaken && (
                  <div className="p-4 border-2 border-forest bg-amber-50 shadow-[4px_4px_0px_0px_rgba(245,158,11,1)]">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-black uppercase text-amber-900">Name Restricted</p>
                        <p className="text-[10px] font-bold text-amber-800/70 uppercase leading-normal mt-1">
                          This identity is already active. Verification will append: <span className="underline">{nameTaken.suggestion}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Textarea
                  label="Protocol description"
                  placeholder="Operational parameters and purpose..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={isSimplified ? "min-h-[80px] text-sm" : "min-h-[120px]"}
                />
                <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">
                  Metadata broadcast to registry ({description.length} chars)
                </p>
              </div>
            </div>
          </div>

          {!isSimplified && (
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-forest">Network manifest (Optional)</label>
                <div className="grid gap-4">
                  <Input
                    placeholder="https://node.address"
                    type="url"
                    value={config.webUrl ?? ""}
                    onChange={(e) => setConfig({ ...config, webUrl: e.target.value.trim() || undefined })}
                    className="bg-gypsum"
                  />
                  <Input
                    placeholder="admin@node.network"
                    type="email"
                    value={config.contactEmail ?? ""}
                    onChange={(e) => setConfig({ ...config, contactEmail: e.target.value.trim() || undefined })}
                    className="bg-gypsum"
                  />
                  <div className="p-4 border-2 border-forest bg-gypsum/50 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-forest/60">Attribution Tag</span>
                    <span className="text-xs font-black uppercase text-forest">{DEPLOYMENT_ATTRIBUTION}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-xs font-black uppercase tracking-widest text-forest">Interface Provider (LLM)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Select
                      value={llmProvider}
                      onChange={(e) => {
                        const provider = e.target.value as LLMProvider;
                        setLlmProvider(provider);
                        setLlmModel(LLM_MODELS[provider][0].id);
                        setApiKey("");
                      }}
                      options={[
                        { value: "openrouter", label: "OpenRouter" },
                        { value: "groq", label: "Groq (Turbo)" },
                        { value: "openai", label: "OpenAI" },
                        { value: "anthropic", label: "Anthropic" },
                        { value: "grok", label: "Grok" },
                        { value: "gemini", label: "Gemini" },
                        { value: "deepseek", label: "DeepSeek" },
                        { value: "zai", label: "Z.AI" },
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Select
                      value={llmModel}
                      onChange={(e) => setLlmModel(e.target.value)}
                      options={LLM_MODELS[llmProvider].map((m) => ({
                        value: m.id,
                        label: m.name,
                      }))}
                    />
                  </div>
                </div>

                {/* API Key Box */}
                <div className="border-4 border-forest bg-white p-6 shadow-hard space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-5 h-5" />
                      <h3 className="font-black uppercase text-sm tracking-tight">{providerInfo.label} ACCESS KEY</h3>
                    </div>
                    {hasKeyForProvider ? (
                      <div className="bg-forest text-white px-2 py-0.5 text-[10px] font-black uppercase">Active</div>
                    ) : apiKeySaved ? (
                      <div className="bg-celo text-forest px-2 py-0.5 text-[10px] font-black uppercase">Verified</div>
                    ) : null}
                  </div>

                  {hasKeyForProvider ? (
                    <div className="space-y-4">
                      <p className="text-xs font-bold leading-relaxed text-forest/60 uppercase">
                        Security handshake complete. Authorization active via dashboard settings.
                      </p>
                      <button
                        onClick={onResetKey}
                        className="text-[10px] font-black uppercase tracking-widest text-forest/40 hover:text-forest underline"
                      >
                        Override current key
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-forest/40 uppercase leading-tight">
                        {providerInfo.description}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder="sk_live_..."
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={onSaveApiKey}
                          loading={apiKeySaving}
                          disabled={!apiKey}
                          className="h-[52px]"
                        >
                          BIND
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <a
                          href={providerInfo.keyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-black uppercase tracking-widest text-forest flex items-center gap-1 hover:text-celo"
                        >
                          GET ACCESS KEY <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-[10px] font-bold text-forest/30 uppercase">Optional for init</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isSimplified && (
        <div className="space-y-8">
          <div className="flex items-center gap-4 border-b-4 border-forest pb-4">
            <div className="w-12 h-12 bg-forest text-white flex items-center justify-center font-black text-2xl">
              02
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">Behavioral protocol</h2>
          </div>

          <div className="border-4 border-forest bg-white shadow-hard relative group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-black uppercase tracking-widest bg-forest text-white px-2 py-1">RAW EDITOR</span>
            </div>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="DEFINE OPERATIONAL LOGIC..."
              className="min-h-[400px] font-mono text-base border-none shadow-none focus-visible:ring-0 p-8"
            />
            <div className="border-t-2 border-forest p-4 bg-gypsum flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
              <span>Encoding: UTF-8 // Protocol: JSON-T</span>
              <span>{systemPrompt.length} Symbols detected</span>
            </div>
          </div>
        </div>
      )}

      {/* Template-specific settings - redesigned */}
      {!isSimplified && currentTemplate && selectedTemplate !== "custom" && (
        <div className="space-y-8">
          <div className="flex items-center gap-4 border-b-4 border-forest pb-4">
            <div className="w-12 h-12 bg-forest text-white flex items-center justify-center font-black text-2xl">
              03
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">{currentTemplate.name} Constraints</h2>
          </div>

          <div className="border-4 border-forest bg-white p-8 shadow-hard grid md:grid-cols-2 gap-8">
            {selectedTemplate === "payment" && (
              <>
                <Input
                  label="MAX TX LIMIT ($)"
                  type="number"
                  value={config.maxTransactionAmount?.toString() || "1000"}
                  onChange={(e) => setConfig({ ...config, maxTransactionAmount: Number(e.target.value) })}
                />
                <div className="flex items-center gap-4 p-4 border-2 border-forest bg-gypsum h-[52px] mt-auto">
                  <input
                    type="checkbox"
                    id="requireConfirmation"
                    checked={config.requireConfirmation ?? true}
                    onChange={(e) => setConfig({ ...config, requireConfirmation: e.target.checked })}
                    className="w-6 h-6 border-2 border-forest rounded-none checked:bg-forest"
                  />
                  <label htmlFor="requireConfirmation" className="text-xs font-black uppercase tracking-tight">
                    Strict confirm {'>'} $100
                  </label>
                </div>
              </>
            )}

            {selectedTemplate === "trading" && (
              <>
                <Input
                  label="MAX SLIPPAGE (%)"
                  type="number"
                  step="0.1"
                  value={config.maxSlippage?.toString() || "1.0"}
                  onChange={(e) => setConfig({ ...config, maxSlippage: Number(e.target.value) })}
                />
                <Input
                  label="STOP LOSS (%)"
                  type="number"
                  step="0.5"
                  value={config.stopLossPercentage?.toString() || "5.0"}
                  onChange={(e) => setConfig({ ...config, stopLossPercentage: Number(e.target.value) })}
                />
              </>
            )}

            {selectedTemplate === "social" && (
              <>
                <Input
                  label="DEFAULT TIP (CELO)"
                  type="number"
                  step="0.01"
                  value={config.tipAmount?.toString() || "0.5"}
                  onChange={(e) => setConfig({ ...config, tipAmount: Number(e.target.value) })}
                />
                <div className="flex items-center gap-4 p-4 border-2 border-forest bg-gypsum h-[52px] mt-auto">
                  <input
                    type="checkbox"
                    id="autoReply"
                    checked={config.autoReply ?? true}
                    onChange={(e) => setConfig({ ...config, autoReply: e.target.checked })}
                    className="w-6 h-6 border-2 border-forest rounded-none checked:bg-forest"
                  />
                  <label htmlFor="autoReply" className="text-xs font-black uppercase tracking-tight">
                    Autonomous Response Active
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

