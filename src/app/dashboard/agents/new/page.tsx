"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { type Address } from "viem";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Rocket,
  Sparkles,
  Shield,
  Zap,
  AlertCircle,
  Key,
  ExternalLink,
  Info,
  Loader2,
} from "lucide-react";
import { AGENT_TEMPLATES, LLM_MODELS, LLM_PROVIDER_INFO } from "@/lib/constants";
import type { AgentTemplate, LLMProvider, AgentConfig } from "@/lib/types";
import { useERC8004 } from "@/hooks/useERC8004";

const steps = [
  { id: "template", label: "Choose Template", icon: <Sparkles className="w-4 h-4" /> },
  { id: "configure", label: "Configure", icon: <Zap className="w-4 h-4" /> },
  { id: "security", label: "Security", icon: <Shield className="w-4 h-4" /> },
  { id: "review", label: "Review & Deploy", icon: <Rocket className="w-4 h-4" /> },
];

export default function NewAgentPage() {
  const router = useRouter();
  const { address } = useAccount();
  const [currentStep, setCurrentStep] = React.useState("template");
  const [isDeploying, setIsDeploying] = React.useState(false);
  const [deployStatus, setDeployStatus] = React.useState<
    "idle" | "creating" | "signing" | "confirming" | "activating" | "done" | "error"
  >("idle");
  const [deployError, setDeployError] = React.useState<string | null>(null);

  // ERC-8004 on-chain registration
  const {
    register: registerOnChain,
    checkDeployed,
    isRegistering,
    error: erc8004Error,
    chainId: currentChainId,
    contractAddresses: erc8004Contracts,
    blockExplorerUrl,
  } = useERC8004();
  const [erc8004Deployed, setErc8004Deployed] = React.useState<boolean | null>(null);

  // Check ERC-8004 contract deployment
  React.useEffect(() => {
    checkDeployed().then(setErc8004Deployed);
  }, [checkDeployed, currentChainId]);

  // Form State
  const [selectedTemplate, setSelectedTemplate] = React.useState<AgentTemplate | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [systemPrompt, setSystemPrompt] = React.useState("");
  const [llmProvider, setLlmProvider] = React.useState<LLMProvider>("openrouter");
  const [llmModel, setLlmModel] = React.useState("meta-llama/llama-3.3-70b-instruct:free");
  const [spendingLimit, setSpendingLimit] = React.useState(100);
  const [config, setConfig] = React.useState<AgentConfig>({});
  const [apiKey, setApiKey] = React.useState("");
  const [apiKeySaving, setApiKeySaving] = React.useState(false);
  const [apiKeySaved, setApiKeySaved] = React.useState(false);

  // Check if user already has API keys configured
  const [keyStatus, setKeyStatus] = React.useState<Record<string, boolean>>({
    openrouter: false,
    openai: false,
    groq: false,
    grok: false,
    gemini: false,
    deepseek: false,
    zai: false,
  });

  React.useEffect(() => {
    if (!address) return;
    fetch(`/api/settings?walletAddress=${address}`)
      .then((res) => res.json())
      .then((data) => {
        setKeyStatus({
          openrouter: data.hasOpenrouterKey ?? false,
          openai: data.hasOpenaiKey ?? false,
          groq: data.hasGroqKey ?? false,
          grok: data.hasGrokKey ?? false,
          gemini: data.hasGeminiKey ?? false,
          deepseek: data.hasDeepseekKey ?? false,
          zai: data.hasZaiKey ?? false,
        });
      })
      .catch(() => {});
  }, [address]);

  const providerInfo = LLM_PROVIDER_INFO[llmProvider];
  const hasKeyForProvider = keyStatus[llmProvider] || false;

  const currentTemplate = AGENT_TEMPLATES.find((t) => t.id === selectedTemplate);

  const handleTemplateSelect = (templateId: AgentTemplate) => {
    setSelectedTemplate(templateId);
    const template = AGENT_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSystemPrompt(template.defaultPrompt);
      setConfig(template.defaultConfig);
      setName(`${template.name}`);
      setDescription(template.description);
    }
  };

  // Map provider → API key field name
  const providerKeyField: Record<string, string> = {
    openrouter: "openrouterApiKey",
    openai: "openaiApiKey",
    groq: "groqApiKey",
    grok: "grokApiKey",
    gemini: "geminiApiKey",
    deepseek: "deepseekApiKey",
    zai: "zaiApiKey",
  };

  // Save API key inline (during creation flow)
  const handleSaveApiKey = async () => {
    if (!address || !apiKey) return;
    setApiKeySaving(true);
    try {
      const body: Record<string, string> = { walletAddress: address };
      body[providerKeyField[llmProvider]] = apiKey;

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setKeyStatus((prev) => ({ ...prev, [llmProvider]: true }));
        setApiKey("");
        setApiKeySaved(true);
        setTimeout(() => setApiKeySaved(false), 3000);
      }
    } catch (e) {
      console.error("Failed to save API key:", e);
    } finally {
      setApiKeySaving(false);
    }
  };

  const handleDeploy = async () => {
    if (!address) return;
    setIsDeploying(true);
    setDeployError(null);
    setDeployStatus("creating");

    try {
      // ── Step 0: Save unsaved API key ──────────────────────────────
      if (apiKey && address) {
        const body: Record<string, string> = { walletAddress: address };
        body[providerKeyField[llmProvider]] = apiKey;
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      // ── Step 1: Create agent in DB (status: "deploying") ──────────
      const createRes = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          templateType: selectedTemplate,
          systemPrompt,
          llmProvider,
          llmModel,
          spendingLimit,
          configuration: config,
          ownerAddress: address,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Failed to create agent");
      }

      const agent = await createRes.json();

      // ── Step 2: ERC-8004 On-Chain Registration ────────────────────
      setDeployStatus("signing");

      // This triggers the wallet popup for the user to sign
      const result = await registerOnChain(
        address as Address,
        agent.id
      );

      setDeployStatus("confirming");

      // ── Step 3: Record on-chain data + activate the agent ─────────
      setDeployStatus("activating");
      await fetch(`/api/agents/${agent.id}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          erc8004AgentId: result.agentId,
          erc8004TxHash: result.txHash,
          erc8004ChainId: result.chainId,
          erc8004URI: result.agentURI,
        }),
      });

      setDeployStatus("done");

      // Navigate to agent detail page
        router.push(`/dashboard/agents/${agent.id}`);
    } catch (error) {
      console.error("Failed to deploy agent:", error);
      setDeployError(error instanceof Error ? error.message : "Deployment failed");
      setDeployStatus("error");
    } finally {
      setIsDeploying(false);
    }
  };

  const stepIndex = steps.findIndex((s) => s.id === currentStep);
  const canProceed =
    (currentStep === "template" && selectedTemplate) ||
    (currentStep === "configure" && name && systemPrompt) ||
    (currentStep === "security" && spendingLimit > 0) ||
    currentStep === "review";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create New Agent</h1>
          <p className="text-slate-400 text-sm">
            Deploy an AI agent on Celo with ERC-8004 identity
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <Tabs tabs={steps} activeTab={currentStep} onChange={setCurrentStep} />

      {/* Step Content */}
      {currentStep === "template" && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {AGENT_TEMPLATES.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all duration-300 hover:border-slate-600 ${
                  selectedTemplate === template.id
                    ? "border-emerald-500 ring-1 ring-emerald-500/20"
                    : ""
                }`}
                onClick={() => handleTemplateSelect(template.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${template.color} text-2xl`}
                      >
                        {template.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{template.name}</h3>
                      </div>
                    </div>
                    {selectedTemplate === template.id && (
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mb-4">{template.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {template.features.slice(0, 3).map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-[10px]">
                        {feature}
                      </Badge>
                    ))}
                    {template.features.length > 3 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{template.features.length - 3} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Skills preview for selected template */}
          {selectedTemplate && (
            <Card className="border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-white">Agent Skills</span>
                  <Badge variant="secondary" className="text-[10px]">OpenClaw-compatible</Badge>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Skills are auto-injected into the agent&apos;s system prompt. The agent invokes them via command tags in its responses to fetch real data and execute on-chain actions.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(() => {
                    const TEMPLATE_SKILLS: Record<string, { name: string; icon: string; category: string }[]> = {
                      payment: [
                        { name: "Send CELO", icon: "💸", category: "transfer" },
                        { name: "Send Tokens", icon: "💰", category: "transfer" },
                        { name: "Check Balance", icon: "🔍", category: "data" },
                        { name: "Query Rate", icon: "📊", category: "oracle" },
                        { name: "Gas Price", icon: "⛽", category: "data" },
                      ],
                      trading: [
                        { name: "Oracle Rates", icon: "📊", category: "oracle" },
                        { name: "Mento Quote", icon: "💱", category: "mento" },
                        { name: "Mento Swap", icon: "🔄", category: "mento" },
                        { name: "Forex Analysis", icon: "📈", category: "forex" },
                        { name: "Portfolio", icon: "💼", category: "forex" },
                        { name: "Send CELO", icon: "💸", category: "transfer" },
                        { name: "Balance Check", icon: "🔍", category: "data" },
                        { name: "Gas Price", icon: "⛽", category: "data" },
                      ],
                      forex: [
                        { name: "SortedOracles", icon: "📊", category: "oracle" },
                        { name: "Mento Quote", icon: "💱", category: "mento" },
                        { name: "Mento Swap", icon: "🔄", category: "mento" },
                        { name: "Forex Analysis", icon: "📈", category: "forex" },
                        { name: "Portfolio Tracker", icon: "💼", category: "forex" },
                        { name: "All Rates", icon: "📉", category: "oracle" },
                        { name: "Send CELO", icon: "💸", category: "transfer" },
                        { name: "Send Tokens", icon: "💰", category: "transfer" },
                        { name: "Balance Check", icon: "🔍", category: "data" },
                        { name: "Gas Price", icon: "⛽", category: "data" },
                      ],
                      social: [
                        { name: "Send CELO", icon: "💸", category: "transfer" },
                        { name: "Send Tokens (Tips)", icon: "💰", category: "transfer" },
                        { name: "Check Balance", icon: "🔍", category: "data" },
                      ],
                      custom: [
                        { name: "Send CELO", icon: "💸", category: "transfer" },
                        { name: "Send Tokens", icon: "💰", category: "transfer" },
                        { name: "Oracle Rates", icon: "📊", category: "oracle" },
                        { name: "Mento Quote", icon: "💱", category: "mento" },
                        { name: "Balance Check", icon: "🔍", category: "data" },
                        { name: "Gas Price", icon: "⛽", category: "data" },
                      ],
                    };
                    const skills = TEMPLATE_SKILLS[selectedTemplate] || [];
                    return skills.map((s) => (
                      <Badge key={s.name} variant="outline" className="text-[10px] gap-1">
                        {s.icon} {s.name}
                      </Badge>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {currentStep === "configure" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Details</CardTitle>
              <CardDescription>Configure your agent&apos;s basic settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Agent Name"
                placeholder="My Payment Agent"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Description"
                placeholder="A brief description of what this agent does"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <Select
                  label="LLM Provider"
                  value={llmProvider}
                  onChange={(e) => {
                    const provider = e.target.value as LLMProvider;
                    setLlmProvider(provider);
                    setLlmModel(LLM_MODELS[provider][0].id);
                    setApiKey("");
                    setApiKeySaved(false);
                  }}
                  options={[
                    { value: "openrouter", label: "OpenRouter (Free Models)" },
                    { value: "groq", label: "Groq (Fast Inference)" },
                    { value: "openai", label: "OpenAI (ChatGPT)" },
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
                  options={LLM_MODELS[llmProvider].map((m) => ({
                    value: m.id,
                    label: m.name,
                  }))}
                />
              </div>

              {/* Inline API Key Configuration */}
              <div className="mt-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-slate-300">
                    {providerInfo.label} API Key
                  </span>
                  {hasKeyForProvider && (
                    <Badge variant="default" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      ✓ Configured
                    </Badge>
                  )}
                  {apiKeySaved && (
                    <Badge variant="default" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      Saved!
                    </Badge>
                  )}
                </div>

                {hasKeyForProvider ? (
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">
                        Your {providerInfo.label} API key is already configured. You can update it in{" "}
                        <a href="/dashboard/settings" className="text-emerald-400 hover:text-emerald-300 underline">
                          Settings
                        </a>.
                      </p>
                      <div className="mt-2">
                        <button
                          onClick={() => setKeyStatus((prev) => ({ ...prev, [llmProvider]: false }))}
                          className="text-xs text-slate-500 hover:text-slate-400 underline cursor-pointer"
                        >
                          Enter a new key instead
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 mb-2">
                      {providerInfo.description}
                      {providerInfo.hasFreeModels && (
                        <span className="text-emerald-400 ml-1">• Free models available</span>
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
                        onClick={handleSaveApiKey}
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
                      <p className="text-xs text-slate-600">
                        Optional — can be set later in Settings
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Prompt</CardTitle>
              <CardDescription>
                Define your agent&apos;s behavior and capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter your agent's system prompt..."
                className="min-h-[250px] font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-2">
                {systemPrompt.length} characters • Defines how your agent processes requests
              </p>
            </CardContent>
          </Card>

          {/* Template-specific configuration */}
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
                    className="rounded border-slate-700"
                  />
                  <label htmlFor="requireConfirmation" className="text-sm text-slate-300">
                    Require confirmation for transactions over $100
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

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
        </div>
      )}

      {currentStep === "security" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Spending Controls</CardTitle>
              <CardDescription>
                Set limits to protect your agent&apos;s wallet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-3">
                  Daily Spending Limit (cUSD)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="10000"
                    step="10"
                    value={spendingLimit}
                    onChange={(e) => setSpendingLimit(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="w-24 text-right">
                    <span className="text-lg font-bold text-white">${spendingLimit}</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>$10</span>
                  <span>$10,000</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-400">Security Notice</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Spending limits are enforced at the smart contract level. 
                      Your agent cannot exceed this limit without owner approval. 
                      You can adjust this at any time from the agent dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ERC-8004 Registration</CardTitle>
              <CardDescription>
                Your agent will be registered on-chain for verifiable identity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  "Agent registered on Celo IdentityRegistry",
                  "Unique on-chain identity (agentId) assigned",
                  "Agent wallet address linked to identity",
                  "Reputation tracking via ReputationRegistry",
                  "Registration metadata stored on IPFS",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10">
                      <Check className="w-3 h-3 text-emerald-500" />
                    </div>
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {currentStep === "review" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Review Configuration</CardTitle>
              <CardDescription>
                Verify your agent&apos;s settings before deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { label: "Name", value: name },
                    { label: "Template", value: selectedTemplate },
                    { label: "LLM Provider", value: llmProvider },
                    { label: "Model", value: llmModel },
                    { label: "Spending Limit", value: `$${spendingLimit}` },
                    { label: "Owner", value: address || "Not connected" },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg bg-slate-800/50">
                      <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                      <div className="text-sm text-white font-medium truncate">{item.value}</div>
                    </div>
                  ))}
                </div>
                
                <div className="p-3 rounded-lg bg-slate-800/50">
                  <div className="text-xs text-slate-500 mb-1">System Prompt</div>
                  <div className="text-sm text-slate-300 font-mono whitespace-pre-wrap max-h-32 overflow-auto">
                    {systemPrompt.slice(0, 300)}
                    {systemPrompt.length > 300 && "..."}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/20">
                  <Rocket className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Ready to Deploy</h3>

                  {/* Deploy status steps */}
                  {deployStatus !== "idle" && deployStatus !== "error" && (
                    <div className="space-y-2 mb-4">
                      {[
                        { key: "creating", label: "Creating agent & HD wallet..." },
                        { key: "signing", label: "Sign ERC-8004 registration transaction..." },
                        { key: "confirming", label: "Waiting for on-chain confirmation..." },
                        { key: "activating", label: "Activating agent & generating pairing code..." },
                        { key: "done", label: "Agent deployed!" },
                      ].map((step) => {
                        const stepOrder = ["creating", "signing", "confirming", "activating", "done"];
                        const currentIdx = stepOrder.indexOf(deployStatus);
                        const stepIdx = stepOrder.indexOf(step.key);
                        const isDone = stepIdx < currentIdx;
                        const isCurrent = step.key === deployStatus;

                        return (
                          <div key={step.key} className="flex items-center gap-2">
                            {isDone ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : isCurrent ? (
                              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-600" />
                            )}
                            <span className={`text-sm ${isCurrent ? "text-white" : isDone ? "text-emerald-400" : "text-slate-500"}`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Error message */}
                  {(deployError || erc8004Error) && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-300">{deployError || erc8004Error}</p>
                      </div>
                    </div>
                  )}

                  {deployStatus === "idle" && (
                    <>
                  <p className="text-sm text-slate-400 mb-4">
                        Your agent will be registered on-chain via the ERC-8004 IdentityRegistry.
                        This mints an identity NFT and requires a wallet signature to pay gas.
                      </p>

                      {/* ERC-8004 deployment status */}
                      {erc8004Deployed === false && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-amber-300">
                                ERC-8004 contracts not found on chain {currentChainId}.
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                Switch to Celo Mainnet (42220) to deploy your agent.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {erc8004Contracts && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
                          <p className="text-xs text-emerald-400">
                            ✓ ERC-8004 IdentityRegistry found on chain {currentChainId}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Contract: {erc8004Contracts.identityRegistry.slice(0, 18)}...
                  </p>
                        </div>
                      )}
                    </>
                  )}

                  <Button
                    variant="glow"
                    size="lg"
                    loading={isDeploying}
                    disabled={
                      isDeploying ||
                      !address ||
                      erc8004Deployed === false
                    }
                    onClick={handleDeploy}
                  >
                    <Rocket className="w-5 h-5" />
                    {isDeploying
                      ? deployStatus === "signing"
                        ? "Sign Transaction in Wallet..."
                        : deployStatus === "confirming"
                        ? "Confirming On-Chain..."
                        : "Deploying..."
                      : "Deploy & Register On-Chain"
                    }
                  </Button>

                  {!address && (
                    <p className="text-xs text-amber-400 mt-2">
                      ⚠️ Connect your wallet to deploy
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <Button
          variant="ghost"
          onClick={() => {
            const prevIndex = Math.max(0, stepIndex - 1);
            setCurrentStep(steps[prevIndex].id);
          }}
          disabled={stepIndex === 0}
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>

        {stepIndex < steps.length - 1 && (
          <Button
            variant="default"
            onClick={() => {
              const nextIndex = Math.min(steps.length - 1, stepIndex + 1);
              setCurrentStep(steps[nextIndex].id);
            }}
            disabled={!canProceed}
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

