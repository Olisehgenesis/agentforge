"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Shield,
  Zap,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { LLM_MODELS, LLM_PROVIDER_INFO } from "@/lib/constants";
import type { LLMProvider } from "@/lib/types";

export function InfoCardsSection() {
  return (
    <>
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
            <div className="p-3 rounded-lg bg-gypsum text-center">
              <div className="text-2xl mb-1">💬</div>
              <div className="text-xs text-forest/80 font-medium">Web Chat</div>
              <Badge
                variant="default"
                className="text-[10px] mt-1 bg-forest/20 text-forest-light border-forest/30"
              >
                Always On
              </Badge>
            </div>
            <div className="p-3 rounded-lg bg-gypsum text-center">
              <div className="text-2xl mb-1">📱</div>
              <div className="text-xs text-forest/80 font-medium">Telegram</div>
              <Badge variant="secondary" className="text-[10px] mt-1">
                Per-Agent Bot
              </Badge>
            </div>
            <div className="p-3 rounded-lg bg-gypsum text-center">
              <div className="text-2xl mb-1">🎮</div>
              <div className="text-xs text-forest/80 font-medium">Discord</div>
              <Badge variant="secondary" className="text-[10px] mt-1">
                Coming Soon
              </Badge>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-xs text-forest-muted">
              📡 <strong className="text-forest">Multi-tenant:</strong> Each agent has its own
              Telegram bot token. Connect channels from the{" "}
              <strong>agent detail page</strong> → Channels &amp; Tasks card. No external gateway
              needed — everything runs natively in AgentHaus.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gypsum">
            <p className="text-xs text-forest-muted">
              ⏰ <strong className="text-forest">Cron Scheduler:</strong> Schedule periodic tasks
              per-agent (rate monitoring, portfolio reports, etc). Configure from the agent detail
              page or call
              <code className="text-forest-light ml-1">POST /api/cron/tick</code> every minute to
              execute due jobs.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Agent Wallet Configuration */}
      <Card className="border-forest/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-forest-light" />
            <CardTitle>Agent Wallets</CardTitle>
          </div>
          <CardDescription>HD wallet derivation for agent on-chain transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-gypsum">
            <div className="text-xs text-forest-muted/70 mb-1">AGENT_MNEMONIC</div>
            <p className="text-xs text-forest-muted mb-2">
              A BIP-39 mnemonic phrase in your <code className="text-forest-light">.env</code> file
              is used to derive unique HD wallets for each agent. Each agent gets its own address via{" "}
              <code className="text-forest-light">
                m/44&apos;/60&apos;/0&apos;/0/&#123;index&#125;
              </code>
              .
            </p>
            <div className="p-2 rounded bg-gypsum-dark font-mono text-xs text-forest/80">
              AGENT_MNEMONIC=&quot;your twelve word mnemonic phrase goes here ...&quot;
            </div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-forest-muted">
                  <strong className="text-amber-400">Security:</strong> The mnemonic stays on the
                  server and is never exposed to the frontend. Private keys are derived on-the-fly
                  for signing and never persisted to disk. Use a dedicated mnemonic for agent wallets
                  — do not reuse your personal wallet.
                </p>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-gypsum">
            <p className="text-xs text-forest-muted">
              ✅ Agents created when{" "}
              <code className="text-forest-light">AGENT_MNEMONIC</code> is set automatically get a
              wallet. For agents without wallets, use the{" "}
              <strong>&quot;Initialize Wallet&quot;</strong> button on the agent detail page.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Model Info */}
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
                <div className="text-xs text-forest-muted/70 uppercase tracking-wider mb-2 mt-3">
                  {info.label}
                </div>
                {models.map((model) => {
                  const isFree = model.name.toLowerCase().includes("free");
                  return (
                    <div
                      key={model.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gypsum transition-colors"
                    >
                      <div>
                        <span className="text-sm text-forest">{model.name}</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          isFree
                            ? "bg-forest/10 text-forest-light border-forest/20"
                            : "bg-gypsum-darker text-forest-muted"
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
    </>
  );
}

