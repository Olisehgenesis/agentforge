"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount, useSwitchChain } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  BadgeCheck,
  ExternalLink,
  Bot,
  Loader2,
  Shield,
  ScanLine,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { getTemplateIcon, getStatusColor } from "@/lib/utils";
import { DEPLOYMENT_ATTRIBUTION } from "@/lib/constants";

interface AgentWithVerification {
  id: string;
  name: string;
  templateType: string;
  status: string;
  erc8004AgentId: string | null;
  verification?: {
    selfxyzVerified: boolean;
    humanId: string | null;
    verifiedAt: string | null;
    publicKey: string | null;
  } | null;
}

const CELO_MAINNET_CHAIN_ID = 42220;

function CopyPublicKeyButton({ publicKey }: { publicKey: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); copy(); }}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] text-accent-light hover:bg-accent/10 border border-accent/20 transition-colors"
      title="Copy key for SelfClaw verify"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy key"}
    </button>
  );
}

export default function VerifyPage() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const isCeloMainnet = chainId === CELO_MAINNET_CHAIN_ID;
  const [agents, setAgents] = React.useState<AgentWithVerification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);

  const fetchAgents = React.useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/agents?ownerAddress=${address}`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error("Failed to load agents:", err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  React.useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAgents();
  }, [address, fetchAgents]);

  const handleSyncFromSelfClaw = React.useCallback(async () => {
    if (!address) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/agents/verify-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerAddress: address }),
      });
      const data = await res.json();
      if (res.ok && data.agents) {
        setAgents(data.agents);
      } else if (res.ok) {
        await fetchAgents();
      }
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  }, [address, fetchAgents]);

  const verifiedCount = agents.filter(a => a.verification?.selfxyzVerified).length;
  const unverifiedCount = agents.filter(a => !a.verification?.selfxyzVerified).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-forest animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header + Illustration */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-forest to-forest-light flex items-center justify-center shadow-lg shadow-forest/10">
            <ShieldCheck className="w-5 h-5 text-forest" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-forest">SelfClaw Verification</h1>
            <p className="text-sm text-forest-muted">
              Verify your agents are backed by a real human using{" "}
              <a
                href="https://selfclaw.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-light"
              >
                selfclaw.ai
              </a>{" "}
              × Self.xyz zero-knowledge proofs
            </p>
          </div>
        </div>
        </div>
        <div className="hidden lg:block w-48 flex-shrink-0">
          <Image
            src="/images/09-Dashboard_Verify-Option_A-Bot_with_Verification_Badge_v3.png"
            alt="AgentHaus bot with verification badge"
            width={192}
            height={108}
            className="w-full h-auto rounded-xl object-contain"
          />
        </div>
      </div>

      {/* Network Warning */}
      {isConnected && !isCeloMainnet && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="text-sm font-medium text-amber-300">Celo Mainnet Required</h4>
                <p className="text-xs text-amber-400/60">
                  SelfClaw verification requires Celo Mainnet (Chain ID 42220). You&apos;re on chain {chainId}.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              onClick={() => switchChain?.({ chainId: CELO_MAINNET_CHAIN_ID })}
            >
              <RefreshCw className="w-3 h-3 mr-1.5" /> Switch Network
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-forest">{agents.length}</div>
            <div className="text-xs text-forest-muted/70">Total Agents</div>
          </CardContent>
        </Card>
        <Card className="border-forest/20 relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-6 w-6 p-0 text-forest-muted hover:text-forest"
            onClick={handleSyncFromSelfClaw}
            disabled={syncing || agents.length === 0}
            title="Re-check verification from SelfClaw"
          >
            {syncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </Button>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-forest-light">{verifiedCount}</div>
            <div className="text-xs text-forest-light/60">Verified</div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{unverifiedCount}</div>
            <div className="text-xs text-amber-400/60">Unverified</div>
          </CardContent>
        </Card>
      </div>

      {/* What is SelfClaw */}
      <Card className="border-accent/20">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Shield className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h3 className="text-forest font-semibold mb-1">Why Verify?</h3>
              <p className="text-sm text-forest-muted mb-3">
                Most &quot;AI agents&quot; are just REST APIs. Anyone with an API key can fake being an agent.
                SelfClaw provides cryptographic proof of humanity using Self.xyz passport verification
                — zero-knowledge proofs that work in 180+ countries with any NFC-enabled passport.
              </p>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-accent">
                  <ScanLine className="w-3.5 h-3.5" />
                  Zero-Knowledge Proofs
                </div>
                <div className="flex items-center gap-1.5 text-forest-light">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  180+ Countries
                </div>
                <a
                  href="https://selfclaw.ai/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Docs
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Verification List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Agents</CardTitle>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-10 h-10 text-forest-faint mx-auto mb-3" />
              <p className="text-sm text-forest-muted/70 mb-4">
                No agents yet. Create an agent first to verify it.
              </p>
              <Link href="/dashboard/agents/new">
                <Button variant="glow" size="sm">
                  Create Agent
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {agents.map((agent) => {
                const isVerified = agent.verification?.selfxyzVerified;

                return (
                  <Link
                    key={agent.id}
                    href={`/dashboard/agents/${agent.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gypsum hover:bg-gypsum transition-colors group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="text-xl">{getTemplateIcon(agent.templateType)}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-forest group-hover:text-forest-light transition-colors">
                              {agent.name}
                            </h4>
                            {isVerified && (
                              <span title="SelfClaw Verified">
                                <BadgeCheck className="w-4 h-4 text-forest-light" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className={`${getStatusColor(agent.status)} text-[10px]`}>
                              {agent.status}
                            </Badge>
                            {agent.erc8004AgentId && (
                              <span className="text-[10px] text-forest-muted/70">
                                ERC-8004 #{agent.erc8004AgentId}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-forest-faint mt-0.5">{DEPLOYMENT_ATTRIBUTION}</div>
                          {agent.verification?.publicKey && (
                            <div className="mt-2 flex items-center gap-2">
                              <code className="text-[10px] text-forest-muted font-mono truncate max-w-[180px]" title={agent.verification.publicKey}>
                                {agent.verification.publicKey.slice(0, 28)}…
                              </code>
                              <CopyPublicKeyButton publicKey={agent.verification.publicKey} />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isVerified ? (
                          <Badge className="bg-forest/20 text-forest-light border-forest/30 text-xs gap-1">
                            <BadgeCheck className="w-3 h-3" />
                            Verified
                          </Badge>
                        ) : !isCeloMainnet ? (
                          <Badge variant="outline" className="text-xs text-amber-400/60 border-amber-500/20 gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Switch to Celo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-forest-muted gap-1">
                            <Shield className="w-3 h-3" />
                            Not Verified
                          </Badge>
                        )}
                        <ArrowRight className="w-4 h-4 text-forest-faint group-hover:text-forest-muted transition-colors" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

