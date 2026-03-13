"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { type Address } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { AGENT_TEMPLATES } from "@/lib/constants";
import type { AgentTemplate, LLMProvider, AgentConfig } from "@/lib/types";
import { useERC8004 } from "@/hooks/useERC8004";
import { DeploySuccessFeedback } from "./_components";



export default function NewAgentPage() {
  const router = useRouter();
  const { address, chainId, isConnected } = useAccount();
  const [isDeploying, setIsDeploying] = React.useState(false);
  const [deployStatus, setDeployStatus] = React.useState<
    "idle" | "creating" | "uploading" | "signing" | "confirming" | "activating" | "done" | "error"
  >("idle");
  const [deployError, setDeployError] = React.useState<string | null>(null);

  // ERC-8004 on-chain registration
  const {
    register: registerOnChain,
    giveFeedback,
    checkDeployed,
    isRegistering,
    error: erc8004Error,
    chainId: currentChainId,
    contractAddresses: erc8004Contracts,
    blockExplorerUrl,
  } = useERC8004();
  const [erc8004Deployed, setErc8004Deployed] = React.useState<boolean | null>(null);
  const [createdAgentId, setCreatedAgentId] = React.useState<string | null>(null);

  React.useEffect(() => {
    checkDeployed().then(setErc8004Deployed);
  }, [checkDeployed, currentChainId]);

  // ── Form State ──────────────────────────────────────────────────────
  // simplified form state – single page form
  const [name, setName] = React.useState("");
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [agentType, setAgentType] = React.useState<AgentTemplate | "">("");
  const [subtype, setSubtype] = React.useState("");


  // informational text per type
  const TYPE_INFO: Record<string, string> = {
    payment: "Payment agents can send CELO or tokens, check balances, and the AI can help users make transactions securely.",
    trading: "Trading agents can query rates, swap tokens, and the AI can recommend trades or analyze markets.",
    social: "Social agents can send tips, manage balances, and the AI can interact conversationally with users.",
    custom: "Custom agents start blank; AI capabilities depend on your system prompt and configuration.",
  };



  // legacy/hidden state kept to satisfy API, but never shown
  const [description, setDescription] = React.useState("");
  const [selectedTemplate, setSelectedTemplate] = React.useState<AgentTemplate | null>(null);
  const [systemPrompt, setSystemPrompt] = React.useState("");
  const [llmProvider, setLlmProvider] = React.useState<LLMProvider>("groq");
  const [llmModel, setLlmModel] = React.useState("llama-3.3-70b-versatile");
  const [spendingLimit, setSpendingLimit] = React.useState(100);
  const [config, setConfig] = React.useState<AgentConfig>({});
  const [walletOption, setWalletOption] = React.useState<"dedicated" | "owner" | "later">("dedicated");
  const [apiKey, setApiKey] = React.useState("");
  const [apiKeySaving, setApiKeySaving] = React.useState(false);
  const [apiKeySaved, setApiKeySaved] = React.useState(false);

  // API key status per provider
  const [keyStatus, setKeyStatus] = React.useState<Record<string, boolean>>({
    openrouter: false,
    openai: false,
    groq: false,
    anthropic: false,
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
          anthropic: data.hasAnthropicKey ?? false,
          grok: data.hasGrokKey ?? false,
          gemini: data.hasGeminiKey ?? false,
          deepseek: data.hasDeepseekKey ?? false,
          zai: data.hasZaiKey ?? false,
        });
      })
      .catch(() => { });
  }, [address]);

  const hasKeyForProvider = keyStatus[llmProvider] || false;

  // ── Helpers ─────────────────────────────────────────────────────────
  const providerKeyField: Record<string, string> = {
    openrouter: "openrouterApiKey",
    openai: "openaiApiKey",
    groq: "groqApiKey",
    anthropic: "anthropicApiKey",
    grok: "grokApiKey",
    gemini: "geminiApiKey",
    deepseek: "deepseekApiKey",
    zai: "zaiApiKey",
  };

  const generateRandomName = () => {
    const hex = Math.random().toString(16).slice(2, 8).toUpperCase();
    return `#${hex}`;
  };

  // legacy stub: we no longer use template selection directly
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

  React.useEffect(() => {
    if (agentType) {
      setSelectedTemplate(agentType);
    }
  }, [agentType]);

  React.useEffect(() => {
    if (subtype) {
      setDescription(subtype);
    }
  }, [subtype]);

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
      // Create agent in DB – use simplified values if provided
      const agentName = name.trim() || generateRandomName();
      const createRes = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName,
          description: subtype || TYPE_INFO[agentType as string] || description,
          templateType: (agentType as AgentTemplate) || selectedTemplate,
          systemPrompt,
          llmProvider,
          llmModel,
          spendingLimit,
          configuration: config,
          ownerAddress: address,
          walletOption,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Failed to create agent");
      }

      const agent = await createRes.json();

      // Upload agent image before registration (ERC-8004 best practice)
      if (imageFile) {
        setDeployStatus("uploading");
        const formData = new FormData();
        formData.append("file", imageFile);
        const imgRes = await fetch(`/api/agents/${agent.id}/image`, {
          method: "POST",
          body: formData,
        });
        if (!imgRes.ok) {
          const err = await imgRes.json();
          throw new Error(err.error || "Failed to upload image");
        }
      }

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
      setCreatedAgentId(agent.id);
    } catch (error) {
      console.error("Failed to deploy agent:", error);
      setDeployError(error instanceof Error ? error.message : "Deployment failed");
      setDeployStatus("error");
    } finally {
      setIsDeploying(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────
  const canDeploy = name.trim().length > 0 && agentType !== "";

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto space-y-8 py-12">
      <button onClick={() => router.back()} className="text-sm text-forest hover:underline">
        ← Back
      </button>
      <h1 className="text-4xl font-bold text-center">Create New Agent</h1>

      {deployStatus === "done" && createdAgentId ? (
        <div className="bg-white border border-forest shadow p-8">
          <DeploySuccessFeedback
            chainId={currentChainId}
            giveFeedback={giveFeedback}
            onDone={() => router.push(`/dashboard/agents/${createdAgentId}`)}
            hasApiKey={hasKeyForProvider}
            llmProvider={llmProvider}
            onSaveApiKey={handleSaveApiKey}
            apiKey={apiKey}
            setApiKey={setApiKey}
            apiKeySaving={apiKeySaving}
            apiKeySaved={apiKeySaved}
          />
        </div>
      ) : (
        <div className="bg-white p-8 shadow rounded-lg">
          <form className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Agent name & details</h2>
              <Input
                label="Name"
                placeholder="My Agent"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-sm"
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Picture (optional)</label>
                <div className="relative border-2 border-dashed border-forest rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-forest/5 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size <= 5 * 1024 * 1024) setImageFile(f);
                    }}
                  />
                  {imageFile ? (
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="preview"
                      className="w-48 h-48 object-cover rounded mb-2 image-rendering-pixelated"
                    />
                  ) : (
                    <span className="text-xs text-forest/60">Click or drag image here</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Type</h2>
              <Select
                label="Type"
                value={agentType}
                onChange={(e) => setAgentType(e.target.value as AgentTemplate)}
                options={[{ value: "", label: "Select type" },
                ...AGENT_TEMPLATES.map((t) => ({ value: t.id, label: t.name }))]}
                className="text-sm"
              />
              {agentType && (
                <p className="text-xs text-forest/60 mt-1">
                  {TYPE_INFO[agentType] || ""}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="px-4 py-2 bg-forest text-white rounded"
                onClick={handleDeploy}
                disabled={!canDeploy || isDeploying}
              >
                {isDeploying ? "Creating…" : "Create Agent"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
