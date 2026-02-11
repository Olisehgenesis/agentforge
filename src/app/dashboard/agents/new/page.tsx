"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { type Address } from "viem";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Rocket,
} from "lucide-react";
import { AGENT_TEMPLATES, LLM_MODELS } from "@/lib/constants";
import type { AgentTemplate, LLMProvider, AgentConfig } from "@/lib/types";
import { useERC8004 } from "@/hooks/useERC8004";
import {
  TemplateStep,
  ConfigureStep,
  SecurityStep,
  ReviewStep,
} from "./_components";

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

  React.useEffect(() => {
    checkDeployed().then(setErc8004Deployed);
  }, [checkDeployed, currentChainId]);

  // ── Form State ──────────────────────────────────────────────────────
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

  // API key status per provider
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

  const hasKeyForProvider = keyStatus[llmProvider] || false;

  // ── Helpers ─────────────────────────────────────────────────────────
  const providerKeyField: Record<string, string> = {
    openrouter: "openrouterApiKey",
    openai: "openaiApiKey",
    groq: "groqApiKey",
    grok: "grokApiKey",
    gemini: "geminiApiKey",
    deepseek: "deepseekApiKey",
    zai: "zaiApiKey",
  };

  const generateRandomName = () => {
    const hex = Math.random().toString(16).slice(2, 8).toUpperCase();
    return `#${hex}`;
  };

  const handleTemplateSelect = (templateId: AgentTemplate) => {
    setSelectedTemplate(templateId);
    const template = AGENT_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSystemPrompt(template.defaultPrompt);
      setConfig(template.defaultConfig);
      setName("");
      setDescription(template.description);
    }
  };

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
      // Save unsaved API key
      if (apiKey && address) {
        const body: Record<string, string> = { walletAddress: address };
        body[providerKeyField[llmProvider]] = apiKey;
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      // Create agent in DB
      const agentName = name.trim() || generateRandomName();
      const createRes = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName,
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

      // ERC-8004 On-Chain Registration
      setDeployStatus("signing");
      const result = await registerOnChain(address as Address, agent.id, agentName);

      setDeployStatus("confirming");

      // Record on-chain data + activate
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
        router.push(`/dashboard/agents/${agent.id}`);
    } catch (error) {
      console.error("Failed to deploy agent:", error);
      setDeployError(error instanceof Error ? error.message : "Deployment failed");
      setDeployStatus("error");
    } finally {
      setIsDeploying(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────
  const stepIndex = steps.findIndex((s) => s.id === currentStep);
  const canProceed =
    (currentStep === "template" && selectedTemplate) ||
    (currentStep === "configure" && systemPrompt) ||
    (currentStep === "security" && spendingLimit > 0) ||
    currentStep === "review";

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-forest">Create New Agent</h1>
          <p className="text-forest-muted text-sm">
            Deploy an AI agent on Celo with ERC-8004 identity
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <Tabs tabs={steps} activeTab={currentStep} onChange={setCurrentStep} />

      {/* Step Content */}
      {currentStep === "template" && (
        <TemplateStep
          selectedTemplate={selectedTemplate}
          onSelect={handleTemplateSelect}
        />
      )}

      {currentStep === "configure" && (
        <ConfigureStep
          selectedTemplate={selectedTemplate}
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
          llmProvider={llmProvider}
          setLlmProvider={(p) => {
            setLlmProvider(p);
            setLlmModel(LLM_MODELS[p][0].id);
                    setApiKey("");
                    setApiKeySaved(false);
                  }}
          llmModel={llmModel}
          setLlmModel={setLlmModel}
          config={config}
          setConfig={setConfig}
          apiKey={apiKey}
          setApiKey={setApiKey}
          apiKeySaving={apiKeySaving}
          apiKeySaved={apiKeySaved}
          hasKeyForProvider={hasKeyForProvider}
          onSaveApiKey={handleSaveApiKey}
          onResetKey={() => setKeyStatus((prev) => ({ ...prev, [llmProvider]: false }))}
        />
      )}

      {currentStep === "security" && (
        <SecurityStep
          spendingLimit={spendingLimit}
          setSpendingLimit={setSpendingLimit}
        />
      )}

      {currentStep === "review" && (
        <ReviewStep
          name={name}
          selectedTemplate={selectedTemplate}
          llmProvider={llmProvider}
          llmModel={llmModel}
          spendingLimit={spendingLimit}
          systemPrompt={systemPrompt}
          address={address}
          deployStatus={deployStatus}
          isDeploying={isDeploying}
          deployError={deployError}
          erc8004Error={erc8004Error}
          erc8004Deployed={erc8004Deployed}
          erc8004Contracts={erc8004Contracts}
          currentChainId={currentChainId}
          onDeploy={handleDeploy}
        />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-forest/10">
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
