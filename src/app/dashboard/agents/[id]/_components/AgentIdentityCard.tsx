"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield, Copy, ExternalLink, CheckCircle, AlertCircle,
  Loader2, Code, ChevronDown, ChevronUp,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { BLOCK_EXPLORER, BLOCK_EXPLORERS } from "@/lib/constants";
import type { AgentData, RegistrationResult } from "../_types";

interface AgentIdentityCardProps {
  agent: AgentData;
  connectedChainId: number | undefined;
  userAddress: string | undefined;
  isRegistering: boolean;
  erc8004Error: string | null;
  erc8004Deployed: boolean | null;
  currentChainId: number | undefined;
  erc8004Contracts: { identityRegistry: string; reputationRegistry: string } | null;
  registrationResult: RegistrationResult | null;
  handleRegisterOnChain: () => void;
}

export function AgentIdentityCard({
  agent,
  connectedChainId,
  userAddress,
  isRegistering,
  erc8004Error,
  erc8004Deployed,
  currentChainId,
  erc8004Contracts,
  registrationResult,
  handleRegisterOnChain,
}: AgentIdentityCardProps) {
  const [showAbi, setShowAbi] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Agent Identity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ── ERC-8004 On-Chain Status ── */}
        {agent.erc8004AgentId ? (
          <>
            <div className="p-3 rounded-lg bg-forest/5 border border-forest/30">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-forest-light" />
                <span className="text-xs text-forest-light font-medium">Registered On-Chain (ERC-8004)</span>
              </div>

              <div className="space-y-2">
                {/* Agent Name */}
                <CopyRow label="Agent Name" value={agent.name} className="text-xs text-forest font-medium truncate" />

                {/* On-Chain Agent ID */}
                <CopyRow label="On-Chain Agent ID" value={`#${agent.erc8004AgentId}`} copyValue={agent.erc8004AgentId!} className="text-sm text-forest-light font-mono font-bold" />

                {/* Agent Registry */}
                {agent.erc8004ChainId && (
                  <CopyRow
                    label="Agent Registry"
                    value={`eip155:${agent.erc8004ChainId}:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`}
                    className="text-[10px] text-violet-300 font-mono break-all leading-relaxed"
                  />
                )}

                {/* IdentityRegistry */}
                <CopyRow
                  label="IdentityRegistry"
                  value="0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
                  className="text-[10px] text-blue-300 font-mono"
                />

                {/* Tx Hash */}
                {agent.erc8004TxHash && (
                  <div className="flex items-center justify-between p-2 rounded-md bg-gypsum border border-forest/15/20">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-forest-muted/70 uppercase tracking-wider">Tx Hash</div>
                      <a
                        href={`${BLOCK_EXPLORERS[agent.erc8004ChainId || 42220] || BLOCK_EXPLORER}/tx/${agent.erc8004TxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                      >
                        {agent.erc8004TxHash.slice(0, 14)}...{agent.erc8004TxHash.slice(-8)}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(agent.erc8004TxHash!)}
                      className="ml-2 p-1 rounded hover:bg-gypsum-darker/50 text-forest-muted/70 hover:text-forest transition-colors cursor-pointer flex-shrink-0"
                      title="Copy tx hash"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Chain */}
                {agent.erc8004ChainId && (
                  <div className="p-2 rounded-md bg-gypsum border border-forest/15/20">
                    <div className="text-[10px] text-forest-muted/70 uppercase tracking-wider">Chain</div>
                    <div className="text-xs text-forest">
                      {agent.erc8004ChainId === 42220 ? "Celo Mainnet" : agent.erc8004ChainId === 11142220 ? "Celo Sepolia" : `Chain ${agent.erc8004ChainId}`}
                      <span className="text-[10px] text-forest-muted/70 ml-1">(ID: {agent.erc8004ChainId})</span>
                    </div>
                  </div>
                )}

                {/* Registration URI */}
                {agent.erc8004URI && (
                  <div className="flex items-center justify-between p-2 rounded-md bg-gypsum border border-forest/15/20">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-forest-muted/70 uppercase tracking-wider">Registration URI</div>
                      <a
                        href={agent.erc8004URI}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1 break-all"
                      >
                        {agent.erc8004URI.length > 40 ? agent.erc8004URI.slice(0, 40) + "..." : agent.erc8004URI}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(agent.erc8004URI!)}
                      className="ml-2 p-1 rounded hover:bg-gypsum-darker/50 text-forest-muted/70 hover:text-forest transition-colors cursor-pointer flex-shrink-0"
                      title="Copy URI"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div className="flex items-center gap-3 mt-3 pt-2 border-t border-forest/20">
                {agent.erc8004TxHash && (
                  <a
                    href={`${BLOCK_EXPLORERS[agent.erc8004ChainId || 42220] || BLOCK_EXPLORER}/tx/${agent.erc8004TxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    View on Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <a href="https://8004.org" target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1">
                  ERC-8004 Spec <ExternalLink className="w-3 h-3" />
                </a>
                <a href="https://github.com/erc-8004/erc-8004-contracts" target="_blank" rel="noopener noreferrer" className="text-[10px] text-forest-muted hover:text-forest/80 flex items-center gap-1">
                  GitHub <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </>
        ) : (
          <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400 font-medium">Not Registered On-Chain</span>
            </div>
            <p className="text-[10px] text-forest-muted mb-3">
              Register this agent on the ERC-8004 IdentityRegistry to make it discoverable on-chain.
              You&apos;ll mint an NFT representing this agent&apos;s identity.
            </p>

            {erc8004Error && (
              <div className="p-2 rounded bg-red-900/30 border border-red-500/30 mb-2">
                <p className="text-[10px] text-red-400">{erc8004Error}</p>
              </div>
            )}
            {registrationResult && (
              <div className="p-2 rounded bg-forest/5 border border-forest/30 mb-2">
                <p className="text-[10px] text-forest-light">✅ Registered as #{registrationResult.agentId}</p>
                <a href={registrationResult.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1">
                  View transaction <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {erc8004Deployed === false && (
              <div className="p-2 rounded bg-gypsum mb-2">
                <p className="text-[10px] text-forest-muted">
                  ⚠️ ERC-8004 contracts not found on chain {currentChainId}.
                  {currentChainId !== 42220 && " Switch to Celo Mainnet to register."}
                </p>
              </div>
            )}

            <Button
              size="sm"
              className="w-full text-xs h-8"
              disabled={isRegistering || !userAddress || erc8004Deployed === false}
              onClick={handleRegisterOnChain}
            >
              {isRegistering ? (
                <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Registering...</>
              ) : !userAddress ? (
                "Connect Wallet First"
              ) : erc8004Deployed === false ? (
                "Contracts Not Deployed"
              ) : (
                <><Shield className="w-3 h-3 mr-1" /> Register On-Chain (ERC-8004)</>
              )}
            </Button>

            {erc8004Contracts && (
              <p className="text-[8px] text-forest-faint mt-1 text-center">
                Registry: {erc8004Contracts.identityRegistry.slice(0, 10)}...
              </p>
            )}
          </div>
        )}

        {/* ── Agent Configuration ── */}
        <div className="p-3 rounded-lg bg-gypsum">
          <div className="text-xs text-forest-muted/70 mb-1">Runtime</div>
          <div className="text-sm text-forest">AgentHaus Native</div>
        </div>
        <div className="p-3 rounded-lg bg-gypsum">
          <div className="text-xs text-forest-muted/70 mb-1">LLM Provider</div>
          <div className="text-sm text-forest capitalize">{agent.llmProvider}</div>
          <div className="text-xs text-forest-muted/70 mt-0.5">
            {agent.llmModel.split("/").pop()?.split(":")[0] || agent.llmModel}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-gypsum">
          <div className="text-xs text-forest-muted/70 mb-1">Network</div>
          <div className="text-sm text-forest">
            {connectedChainId === 42220
              ? "Celo Mainnet"
              : connectedChainId === 11142220
                ? "Celo Sepolia (Testnet)"
                : `Chain ${connectedChainId || "—"}`}
          </div>
        </div>
        {agent.deployedAt && (
          <div className="p-3 rounded-lg bg-gypsum">
            <div className="text-xs text-forest-muted/70 mb-1">Created</div>
            <div className="text-sm text-forest">{formatDate(agent.deployedAt)}</div>
          </div>
        )}

        {/* Registration JSON */}
        <div className="p-3 rounded-lg bg-gypsum">
          <div className="text-xs text-forest-muted/70 mb-1">Registration JSON</div>
          <a
            href={`/api/agents/${agent.id}/registration.json`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            View Registration File <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* ERC-8004 Contract ABI Viewer */}
        <div className="rounded-lg border border-forest/15/30 overflow-hidden">
          <button
            onClick={() => setShowAbi(!showAbi)}
            className="w-full flex items-center justify-between p-3 bg-gypsum/80 hover:bg-gypsum transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Code className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-forest-muted font-medium">ERC-8004 Contract ABI</span>
            </div>
            {showAbi ? <ChevronUp className="w-3.5 h-3.5 text-forest-muted/70" /> : <ChevronDown className="w-3.5 h-3.5 text-forest-muted/70" />}
          </button>
          {showAbi && (
            <div className="border-t border-forest/15/30">
              <div className="flex items-center justify-between px-3 py-2 bg-gypsum-dark/20">
                <span className="text-[10px] text-forest-muted/70 uppercase tracking-wider">IdentityRegistry ABI</span>
                <button
                  onClick={() => {
                    import("@/lib/blockchain/erc8004").then((mod) => {
                      navigator.clipboard.writeText(JSON.stringify(mod.IDENTITY_REGISTRY_ABI, null, 2));
                    });
                  }}
                  className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> Copy Full ABI
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto p-3 bg-white/60">
                <pre className="text-[9px] text-forest-light font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(ABI_PREVIEW, null, 2)}
                </pre>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-gypsum-dark/20 border-t border-forest/15/30">
                <a href="https://github.com/erc-8004/erc-8004-contracts/tree/main/abis" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  Full ABI on GitHub <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-[10px] text-forest-faint">|</span>
                <a href="https://github.com/erc-8004/erc-8004-contracts" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  ERC-8004 Spec <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

/** Reusable copyable row inside the on-chain section. */
function CopyRow({
  label,
  value,
  copyValue,
  className,
}: {
  label: string;
  value: string;
  copyValue?: string;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-gypsum border border-forest/15/20">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-forest-muted/70 uppercase tracking-wider">{label}</div>
        <div className={className}>{value}</div>
      </div>
      <button
        onClick={() => navigator.clipboard.writeText(copyValue ?? value)}
        className="ml-2 p-1 rounded hover:bg-gypsum-darker/50 text-forest-muted/70 hover:text-forest transition-colors cursor-pointer flex-shrink-0"
        title={`Copy ${label.toLowerCase()}`}
      >
        <Copy className="w-3 h-3" />
      </button>
    </div>
  );
}

/** Condensed ABI preview displayed in the viewer. */
const ABI_PREVIEW = [
  { name: "register", type: "function", inputs: [], outputs: [{ name: "agentId", type: "uint256" }] },
  { name: "register", type: "function", inputs: [{ name: "agentURI", type: "string" }], outputs: [{ name: "agentId", type: "uint256" }] },
  { name: "register", type: "function", inputs: [{ name: "agentURI", type: "string" }, { name: "metadata", type: "tuple[]", components: [{ name: "metadataKey", type: "string" }, { name: "metadataValue", type: "bytes" }] }], outputs: [{ name: "agentId", type: "uint256" }] },
  { name: "setAgentURI", type: "function", inputs: [{ name: "agentId", type: "uint256" }, { name: "newURI", type: "string" }] },
  { name: "setMetadata", type: "function", inputs: [{ name: "agentId", type: "uint256" }, { name: "metadataKey", type: "string" }, { name: "metadataValue", type: "bytes" }] },
  { name: "getMetadata", type: "function", inputs: [{ name: "agentId", type: "uint256" }, { name: "metadataKey", type: "string" }], outputs: [{ name: "value", type: "bytes" }] },
  { name: "setAgentWallet", type: "function", inputs: [{ name: "agentId", type: "uint256" }, { name: "newWallet", type: "address" }, { name: "deadline", type: "uint256" }, { name: "signature", type: "bytes" }] },
  { name: "getAgentWallet", type: "function", inputs: [{ name: "agentId", type: "uint256" }], outputs: [{ name: "wallet", type: "address" }] },
  { name: "tokenURI", type: "function", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }] },
  { name: "ownerOf", type: "function", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "address" }] },
];

