"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Bot,
  Shield,
  Wallet,
  Globe,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LLM_PROVIDER_INFO } from "@/lib/constants";

interface BotConfigSectionProps {
  keyStatus: Record<string, boolean | string | null>;
}

export function BotConfigSection({ keyStatus }: BotConfigSectionProps) {
  return (
    <>
      {/* Bot Configuration */}
      <Card className="border-accent/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-accent" />
            <CardTitle>Bot Configuration</CardTitle>
          </div>
          <CardDescription>Default settings for your AI agents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Default LLM */}
          <div>
            <label className="text-sm font-medium text-forest/80 mb-1.5 block">
              Default LLM Provider
            </label>
            <p className="text-xs text-forest-muted/70 mb-2">
              New agents will use this provider by default. You can override per-agent.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                ["openrouter", "groq", "gemini", "openai", "anthropic", "grok", "deepseek", "zai"] as const
              ).map((provider) => {
                const info = LLM_PROVIDER_INFO[provider];
                const hasKey = !!keyStatus[
                  `has${provider.charAt(0).toUpperCase() + provider.slice(1)}Key`
                ];
                return (
                  <div
                    key={provider}
                    className={cn(
                      "p-2.5 rounded-lg border transition-colors cursor-default",
                      hasKey
                        ? "bg-gypsum border-forest/10"
                        : "bg-gypsum-dark/40 border-forest/10 opacity-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-forest font-medium">
                        {info.label.split("(")[0].trim()}
                      </span>
                      {hasKey ? (
                        <CheckCircle className="w-3 h-3 text-forest-light" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-forest-faint" />
                      )}
                    </div>
                    <div className="text-[10px] text-forest-muted/70 mt-0.5">
                      {hasKey ? "Key configured" : "No API key"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Default Agent Settings */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-forest/80 block">
              Default Agent Behavior
            </label>
            <div className="space-y-2">
              {[
                {
                  label: "Require confirmation for transactions > $10",
                  icon: Shield,
                  defaultChecked: true,
                  desc: "Agent will ask before executing large transfers",
                },
                {
                  label: "Auto-initialize agent wallet on creation",
                  icon: Wallet,
                  defaultChecked: true,
                  desc: "Derive HD wallet automatically from master mnemonic",
                },
                {
                  label: "Enable ERC-8004 on-chain identity by default",
                  icon: Globe,
                  defaultChecked: true,
                  desc: "Register agents on-chain during deployment",
                },
                {
                  label: "Auto-connect web chat channel",
                  icon: MessageSquare,
                  defaultChecked: true,
                  desc: "Web chat is always available for new agents",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between p-3 rounded-lg bg-gypsum"
                >
                  <div className="flex items-start gap-2.5 flex-1">
                    <item.icon className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm text-forest/80 block">{item.label}</span>
                      <span className="text-[10px] text-forest-muted/70">{item.desc}</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3 mt-0.5">
                    <input
                      type="checkbox"
                      defaultChecked={item.defaultChecked}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gypsum-darker peer-focus:ring-2 peer-focus:ring-celo/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-forest-faint after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-forest peer-checked:after:bg-white" />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Spending Limits */}
          <div>
            <label className="text-sm font-medium text-forest/80 mb-1.5 block">
              Default Spending Limit
            </label>
            <p className="text-xs text-forest-muted/70 mb-2">
              Maximum amount an agent can spend before pausing. Override per-agent.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {["$100", "$500", "$1,000", "$5,000"].map((limit) => (
                <button
                  key={limit}
                  className="p-2 rounded-lg bg-gypsum border border-forest/10 hover:border-celo/50 hover:bg-celo/10 transition-colors text-xs text-forest/80 font-medium cursor-pointer"
                >
                  {limit}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SelfClaw Verification Settings */}
      <Card className="border-forest/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-forest-light" />
            <CardTitle>SelfClaw Verification</CardTitle>
          </div>
          <CardDescription>
            Passport-based zero-knowledge proof verification via{" "}
            <a
              href="https://selfclaw.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-light"
            >
              selfclaw.ai
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-gypsum text-center">
              <div className="text-lg mb-1">🔐</div>
              <div className="text-xs text-forest/80 font-medium">Ed25519 Keys</div>
              <div className="text-[10px] text-forest-muted/70 mt-0.5">Per-agent key pair</div>
            </div>
            <div className="p-3 rounded-lg bg-gypsum text-center">
              <div className="text-lg mb-1">🛂</div>
              <div className="text-xs text-forest/80 font-medium">Self.xyz</div>
              <div className="text-[10px] text-forest-muted/70 mt-0.5">ZK passport proofs</div>
            </div>
            <div className="p-3 rounded-lg bg-gypsum text-center">
              <div className="text-lg mb-1">⛓️</div>
              <div className="text-xs text-forest/80 font-medium">Celo Mainnet</div>
              <div className="text-[10px] text-forest-muted/70 mt-0.5">Chain ID 42220</div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-forest/5 border border-forest/20">
            <p className="text-xs text-forest-muted">
              🔒 <strong className="text-forest-light">Privacy First:</strong> SelfClaw uses
              Self.xyz zero-knowledge proofs. Raw passport data never leaves your device — only the
              ZK proof is shared. Works in 180+ countries with any NFC-enabled passport.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gypsum">
            <p className="text-xs text-forest-muted">
              <strong className="text-forest">Verification flow:</strong> Generate Ed25519 keys →
              Sign SelfClaw challenge → Scan QR with Self app → Agent verified ✅
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://selfclaw.ai/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:text-accent-light flex items-center gap-1"
            >
              SelfClaw Docs <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://self.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Self.xyz <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

