"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { AlertCircle, Check, Wallet, User, Clock, MessageSquare, Info } from "lucide-react";
import { DEPLOYMENT_ATTRIBUTION } from "@/lib/constants";

export type WalletOption = "dedicated" | "owner" | "later";

interface SecurityStepProps {
  spendingLimit: number;
  setSpendingLimit: (v: number) => void;
  walletOption: WalletOption;
  setWalletOption: (v: WalletOption) => void;
  isSimplified?: boolean;
}

export function SecurityStep({ spendingLimit, setSpendingLimit, walletOption, setWalletOption, isSimplified = false }: SecurityStepProps) {
  if (isSimplified) {
    // non‑technical view: minimal choices, defaults applied
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-black">Security & funds</h2>
        <div className="space-y-4">
          <label className="text-sm font-medium">Wallet type</label>
          <Select
            value={walletOption}
            onChange={(e) => setWalletOption(e.target.value as WalletOption)}
            options={[
              { value: "dedicated", label: "Dedicated vault (recommended)" },
              { value: "owner", label: "Use my address (read‑only)" },
              { value: "later", label: "Set up later" },
            ]}
            className="text-sm"
          />
        </div>
        <p className="text-xs text-forest/60">Spending limit and channels will be configured with safe defaults after creation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Agent Wallet */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 border-b-4 border-forest pb-4">
          <div className="w-12 h-12 bg-forest text-white flex items-center justify-center font-black text-2xl">
            04
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Vault config</h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="p-6 border-4 border-forest bg-celo shadow-hard">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 border-2 border-forest bg-white flex items-center justify-center flex-shrink-0">
                  <Info className="w-6 h-6 stroke-[3px]" />
                </div>
                <p className="text-xs font-black uppercase leading-tight tracking-tight">
                  Node requires cryptographic authorization to execute on-chain logic.
                  Funding is required for gas and state transitions.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: "dedicated" as const,
                  icon: <Wallet className="w-6 h-6" />,
                  title: "DEDICATED NODE VAULT",
                  desc: "Derive unique HD wallet. Recommended for production.",
                },
                {
                  id: "owner" as const,
                  icon: <User className="w-6 h-6" />,
                  title: "OWNER PROXY (READ-ONLY)",
                  desc: "Agent uses your address. Sending disabled until upgrade.",
                },
                {
                  id: "later" as const,
                  icon: <Clock className="w-6 h-6" />,
                  title: "DEFERRED INITIALIZATION",
                  desc: "Deploy without wallet. Bind later via dashboard.",
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setWalletOption(opt.id)}
                  className={`group relative w-full text-left transition-transform active:translate-y-px`}
                >
                  <div className={`absolute inset-0 bg-forest translate-x-1 translate-y-1 transition-transform ${walletOption === opt.id ? 'translate-x-2 translate-y-2' : ''}`} />
                  <div className={`relative flex items-center gap-4 p-5 border-2 border-forest transition-colors ${walletOption === opt.id ? "bg-celo" : "bg-white hover:bg-gypsum"
                    }`}>
                    <div className="w-10 h-10 border-2 border-forest bg-white flex items-center justify-center group-hover:scale-105 transition-transform">
                      {opt.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-black uppercase tracking-tight leading-none">{opt.title}</div>
                      <div className="text-[10px] font-bold text-forest/50 uppercase mt-2 tracking-widest">{opt.desc}</div>
                    </div>
                    <div className={`w-6 h-6 border-2 border-forest flex items-center justify-center ${walletOption === opt.id ? 'bg-forest' : 'bg-white'}`}>
                      {walletOption === opt.id && <Check className="w-4 h-4 text-white stroke-[4px]" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Channels & Spending */}
          <div className="space-y-8">
            <div className="border-4 border-forest bg-white p-6 shadow-hard relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-forest text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">POST-DEPLOYMENT</div>
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="w-6 h-6" />
                <h3 className="font-black uppercase text-lg tracking-tighter">CHANNEL BINDING</h3>
              </div>
              <p className="text-xs font-bold uppercase leading-relaxed text-forest/60">
                Telegram / Twitter / Discord integrations are performed post-registration via the
                <span className="text-forest underline ml-1">Connectivity Manifest</span> in your dashboard.
              </p>
            </div>

            <div className="border-4 border-forest bg-white p-8 shadow-hard space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b-2 border-forest pb-2">
                  <label className="text-xs font-black uppercase tracking-widest">Exhaustion Limit (Daily)</label>
                  <span className="text-3xl font-black tabular-nums">${spendingLimit}</span>
                </div>

                <div className="relative pt-4 pb-2">
                  <input
                    type="range"
                    min="10"
                    max="10000"
                    step="10"
                    value={spendingLimit}
                    onChange={(e) => setSpendingLimit(Number(e.target.value))}
                    className="w-full h-4 bg-forest/10 border-2 border-forest appearance-none cursor-crosshair accent-forest [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-forest [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-hard"
                  />
                  <div className="flex justify-between mt-4 text-[10px] font-black uppercase text-forest/40 tracking-widest">
                    <span>MIN: $10</span>
                    <span>MAX: $10K</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-2 border-forest bg-amber-50 shadow-[4px_4px_0px_0px_rgba(245,158,11,1)]">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-black uppercase text-amber-900">Protocol Shield</h4>
                    <p className="text-[10px] font-bold text-amber-800/70 uppercase leading-normal mt-1">
                      Limits are hard-coded into the registry contract. Transfers exceeding threshold
                      require physical validation signature.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ERC-8004 Registration summary */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 border-b-4 border-forest pb-4">
          <div className="w-12 h-12 bg-forest text-white flex items-center justify-center font-black text-2xl">
            05
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Registration manifest</h2>
        </div>

        <div className="border-4 border-forest bg-white p-8 shadow-hard grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { label: "IDENTITY", value: "Celo Registry Lookup" },
            { label: "ID ENTITY", value: "Unique Agent UUID" },
            { label: "WALLET", value: "Linked Cryptographic Vault" },
            { label: "REPUTATION", value: "On-chain Score Tracking" },
            { label: "METADATA", value: "Pinata / IPFS Persistence" },
            { label: "ATTRIBUTION", value: DEPLOYMENT_ATTRIBUTION },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-2 border-forest bg-gypsum">
              <div className="w-8 h-8 border-2 border-forest bg-white flex items-center justify-center">
                <Check className="w-5 h-5 stroke-[4px]" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase text-forest/40 tracking-widest leading-none mb-1">{item.label}</div>
                <div className="text-xs font-black uppercase leading-none">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

