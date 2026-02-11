"use client";

import React from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Bot,
  Shield,
  BarChart3,
  ArrowRight,
  Sparkles,
  Globe,
  Lock,
} from "lucide-react";

export default function HomePage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gypsum">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-forest/10 backdrop-blur-sm sticky top-0 z-50 bg-gypsum/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-celo shadow-lg shadow-celo/20">
            <Zap className="w-5 h-5 text-forest" />
          </div>
          <span className="text-xl font-bold text-forest tracking-tight">AgentHaus</span>
        </div>
        <div className="flex items-center gap-4">
          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus="avatar"
          />
          {isConnected && (
            <Link href="/dashboard">
              <Button variant="glow" size="sm">
                Launch App <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-celo/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-forest/5 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-forest/10 border border-forest/15 text-forest text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Built on Celo with ERC-8004
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-forest mb-6 leading-tight">
            Deploy AI Agents
            <br />
            <span className="bg-gradient-to-r from-forest-light to-forest bg-clip-text text-transparent">
              Without Code
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-forest-muted max-w-2xl mx-auto mb-12 leading-relaxed">
            Create, deploy, and manage AI agents on the Celo blockchain. 
            Automatic ERC-8004 registration, secure wallet management, 
            and real-time monitoring — all from a visual dashboard.
          </p>

          {/* CTA */}
          <div className="flex items-center justify-center gap-4">
            {isConnected ? (
              <Link href="/dashboard">
                <Button variant="glow" size="lg" className="text-base">
                  <Bot className="w-5 h-5" />
                  Launch Dashboard
                </Button>
              </Link>
            ) : (
              <ConnectButton />
            )}
            <Link href="#features">
              <Button variant="outline" size="lg" className="text-base">
                Learn More
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-20">
            {[
              { label: "Templates", value: "4+" },
              { label: "Chains", value: "Celo" },
              { label: "Registration", value: "ERC-8004" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-forest">{stat.value}</div>
                <div className="text-sm text-forest-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-forest mb-4">
            Everything You Need
          </h2>
          <p className="text-forest-muted max-w-xl mx-auto">
            From creation to monitoring, AgentHaus handles the entire lifecycle 
            of your AI agents on Celo.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Bot,
              title: "No-Code Builder",
              description: "Choose from pre-built templates or create custom agents with a visual interface. No coding required.",
              color: "from-forest to-forest-light",
            },
            {
              icon: Shield,
              title: "ERC-8004 Identity",
              description: "Automatic on-chain registration with the ERC-8004 standard. Give your agents a verified identity.",
              color: "from-blue-600 to-indigo-600",
            },
            {
              icon: Lock,
              title: "Secure Wallets",
              description: "Agent wallets with spending limits, multi-sig for high-value ops, and emergency pause controls.",
              color: "from-purple-600 to-pink-600",
            },
            {
              icon: BarChart3,
              title: "Real-time Monitoring",
              description: "Track transactions, spending, reputation scores, and agent activity in real-time.",
              color: "from-amber-500 to-orange-500",
            },
            {
              icon: Globe,
              title: "Multi-Currency",
              description: "Support for cUSD, cEUR, USDC, USDT and CELO. Process payments in any Celo stablecoin.",
              color: "from-cyan-500 to-blue-500",
            },
            {
              icon: Sparkles,
              title: "AI Powered",
              description: "Powered by GPT-4 and Claude. Choose your preferred LLM provider for each agent.",
              color: "from-rose-500 to-red-500",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-xl border border-forest/10 bg-white hover:border-forest/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-forest/5"
            >
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} mb-4 shadow-lg`}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-forest mb-2">{feature.title}</h3>
              <p className="text-sm text-forest-muted leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-6 py-24 border-t border-forest/10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-forest mb-4">
            How It Works
          </h2>
          <p className="text-forest-muted max-w-xl mx-auto">
            Deploy your first AI agent in minutes, not days.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: "01", title: "Connect Wallet", desc: "Connect your Celo wallet via WalletConnect or MiniPay" },
            { step: "02", title: "Choose Template", desc: "Select from Payment, Trading, Social, or Custom agents" },
            { step: "03", title: "Configure", desc: "Set prompts, spending limits, and agent preferences" },
            { step: "04", title: "Deploy", desc: "One-click deployment with automatic ERC-8004 registration" },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-celo/20 border border-celo/30 text-forest text-xl font-bold mb-4">
                {item.step}
              </div>
              <h3 className="text-forest font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-forest-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-forest/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-forest" />
            <span className="text-sm text-forest-muted">
              Celo AgentHaus © 2026
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-forest-muted">
            <span>Built with ERC-8004</span>
            <span>•</span>
            <span>Powered by Celo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
