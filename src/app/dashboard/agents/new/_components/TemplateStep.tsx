"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Check, Zap } from "lucide-react";
import { AGENT_TEMPLATES } from "@/lib/constants";
import type { AgentTemplate } from "@/lib/types";

/** Skills preview per template (static data) */
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

interface TemplateStepProps {
  selectedTemplate: AgentTemplate | null;
  onSelect: (templateId: AgentTemplate) => void;
  isSimplified?: boolean;
}

export function TemplateStep({ selectedTemplate, onSelect, isSimplified = false }: TemplateStepProps) {
  if (isSimplified) {
    return (
      <div className="space-y-4">
        <Select
          value={selectedTemplate ?? ""}
          onChange={(e) => onSelect(e.target.value as AgentTemplate)}
          options={AGENT_TEMPLATES.map((t) => ({ value: t.id, label: t.name }))}
          className="text-sm"
        />
        {selectedTemplate && (
          <p className="text-sm text-forest/60">
            {AGENT_TEMPLATES.find((t) => t.id === selectedTemplate)?.description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-6">
        {AGENT_TEMPLATES.map((template) => (
          <div
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={`group relative cursor-pointer`}
          >
            <div className={`absolute inset-0 bg-forest translate-x-1.5 translate-y-1.5 transition-transform ${selectedTemplate === template.id ? 'translate-x-2.5 translate-y-2.5' : 'group-hover:translate-x-2 group-hover:translate-y-2'}`} />
            <div className={`relative bg-white border-2 border-forest p-6 h-full transition-transform ${selectedTemplate === template.id ? 'bg-celo -translate-y-1' : 'group-hover:-translate-y-0.5'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-2 border-forest bg-white flex items-center justify-center text-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    {template.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight leading-none">{template.name}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-forest/40 mt-2">v1.2 // SECURE</p>
                  </div>
                </div>
                {selectedTemplate === template.id && (
                  <div className="w-8 h-8 border-2 border-forest bg-forest flex items-center justify-center">
                    <Check className="w-5 h-5 text-white stroke-[3px]" />
                  </div>
                )}
              </div>
              <p className="text-sm font-bold leading-relaxed mb-6">{template.description}</p>
              <div className="flex flex-wrap gap-2">
                {template.features.slice(0, 3).map((feature) => (
                  <div key={feature} className="border-2 border-forest bg-gypsum px-2 py-1 text-[10px] font-black uppercase">
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Skills preview for selected template */}
      {selectedTemplate && (
        <div className="border-4 border-forest bg-white p-6 shadow-hard">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 border-2 border-forest bg-celo flex items-center justify-center">
              <Zap className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <div>
              <h4 className="text-lg font-black uppercase tracking-tighter">Injection manifest</h4>
              <p className="text-[10px] font-bold uppercase text-forest/40 tracking-widest leading-none">OpenClaw auto-injected capabilities</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {(TEMPLATE_SKILLS[selectedTemplate] || []).map((s) => (
              <div key={s.name} className="border-2 border-forest bg-white p-3 flex flex-col items-center gap-2 hover:bg-celo transition-colors cursor-default">
                <span className="text-xl">{s.icon}</span>
                <span className="text-[10px] font-black uppercase text-center leading-tight">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

