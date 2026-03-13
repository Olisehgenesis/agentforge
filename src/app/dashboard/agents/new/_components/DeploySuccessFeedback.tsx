"use client";

import React from "react";
import { Star, Loader2, ArrowRight, Check, Key, ExternalLink } from "lucide-react";
import { getAgentHausAgentId, LLM_PROVIDER_INFO } from "@/lib/constants";
import type { LLMProvider } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DeploySuccessFeedbackProps {
  chainId: number;
  giveFeedback: (
    agentId: bigint,
    value: number,
    valueDecimals: number,
    tag1?: string,
    tag2?: string
  ) => Promise<{ txHash: string }>;
  onDone: () => void;
  hasApiKey: boolean;
  llmProvider: LLMProvider;
  onSaveApiKey: () => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  apiKeySaving: boolean;
  apiKeySaved: boolean;
}

export function DeploySuccessFeedback({
  chainId,
  giveFeedback,
  onDone,
  hasApiKey,
  llmProvider,
  onSaveApiKey,
  apiKey,
  setApiKey,
  apiKeySaving,
  apiKeySaved,
}: DeploySuccessFeedbackProps) {
  const [rating, setRating] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const agentHausId = getAgentHausAgentId(chainId);

  const handleSubmit = async () => {
    if (!agentHausId || rating === 0) return;
    setSubmitting(true);
    try {
      const value = rating * 10;
      await giveFeedback(
        BigInt(agentHausId),
        value,
        1,
        "starred",
        "deployment"
      );
      setSubmitted(true);
    } catch (err) {
      console.error("Feedback failed:", err);
    } finally {
      setSubmitting(false);
    }
  };


  const providerInfo = LLM_PROVIDER_INFO[llmProvider];

  return (
    <div className="space-y-12">
      {!hasApiKey && (
        <div className="border-4 border-forest bg-white p-8 shadow-hard space-y-6">
          <div className="space-y-2">
            <h4 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
              <Key className="w-8 h-8" /> API KEY REQUIRED
            </h4>
            <p className="text-xs font-bold uppercase tracking-tight text-forest/60 max-w-md">
              Your agent is deployed but needs an access key for {providerInfo.label} to start operational cycles.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4">
              <Input
                type="password"
                placeholder={providerInfo.keyPlaceholder || "sk_..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 h-14 text-lg font-mono"
              />
              <Button
                onClick={onSaveApiKey}
                loading={apiKeySaving}
                disabled={!apiKey}
                className="h-14 px-10 text-lg"
              >
                BIND KEY
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <a
                href={providerInfo.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-black uppercase tracking-widest text-forest flex items-center gap-1 hover:text-celo transition-colors"
              >
                GET {llmProvider.toUpperCase()} KEY <ExternalLink className="w-3 h-3" />
              </a>
              {apiKeySaved && (
                <span className="text-xs font-black uppercase text-celo flex items-center gap-2">
                  <Check className="w-4 h-4" /> KEY VERIFIED
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {agentHausId ? (
        <div className="border-4 border-forest bg-celo p-8 shadow-hard space-y-6">
          <div className="space-y-2">
            <h4 className="text-2xl font-black uppercase tracking-tighter">
              PROTOCOL RATING
            </h4>
            <p className="text-xs font-bold uppercase tracking-tight text-forest/60 max-w-md">
              Help Agent Haus optimize the registry. Your feedback is hashed and
              persisted on-chain.
            </p>
          </div>

          {!submitted ? (
            <div className="space-y-6">
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className={`w-14 h-14 border-2 border-forest flex items-center justify-center transition-all ${rating >= s
                      ? "bg-forest text-white shadow-hard-active translate-y-0.5"
                      : "bg-white hover:bg-gypsum"
                      }`}
                  >
                    <Star
                      className={`w-7 h-7 stroke-[2.5px] ${rating >= s ? "fill-white" : ""}`}
                    />
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSubmit}
                  disabled={rating === 0 || submitting}
                  className="h-14 px-8 border-4 border-forest bg-white font-black uppercase text-sm tracking-widest shadow-hard active:translate-y-1 active:shadow-hard-active disabled:opacity-40 flex items-center gap-3"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      RECORD FEEDBACK
                      <ArrowRight className="w-5 h-5 stroke-[3px]" />
                    </>
                  )}
                </button>
                <button
                  onClick={onDone}
                  className="px-6 font-black uppercase text-xs tracking-widest text-forest/40 hover:text-forest transition-colors"
                >
                  SKIP_LOGS
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-6">
              <div className="p-4 border-2 border-forest bg-white shadow-hard flex items-center gap-3">
                <div className="w-8 h-8 bg-forest text-white flex items-center justify-center">
                  <Check className="w-5 h-5 stroke-[4px]" />
                </div>
                <span className="text-sm font-black uppercase tracking-tight">TRANSMISSION_COMPLETE</span>
              </div>
              <button
                onClick={onDone}
                className="h-14 px-8 border-4 border-forest bg-white font-black uppercase text-sm tracking-widest shadow-hard active:translate-y-1 active:shadow-hard-active flex items-center gap-3"
              >
                CONTINUE TO DASHBOARD <ArrowRight className="w-5 h-5 stroke-[3px]" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="border-4 border-forest bg-white p-6 shadow-hard space-y-4">
          <p className="text-xs font-black uppercase tracking-tight text-forest/60">
            Rating is unavailable right now.
          </p>
          <button
            onClick={onDone}
            className="h-12 px-6 border-2 border-forest bg-white font-black uppercase text-xs tracking-widest shadow-hard active:translate-y-px flex items-center gap-2"
          >
            CONTINUE TO DASHBOARD <ArrowRight className="w-4 h-4 stroke-[3px]" />
          </button>
        </div>
      )}
    </div>
  );
}
