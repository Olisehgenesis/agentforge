"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Book, Code, Shield, Cpu, Zap, Globe, Cpu as Wallet, History } from "lucide-react";

export default function DocsPage() {
    const sections = [
        {
            id: "overview",
            icon: <Globe className="w-5 h-5 text-accent" />,
            title: "Overview",
            content: "Agent Haus is a no-code platform for launching and managing autonomous AI agents on the Celo blockchain. It bridges the gap between Large Language Models (LLMs) and on-chain execution using the ERC-8004 identity standard."
        },
        {
            id: "erc8004",
            icon: <Shield className="w-5 h-5 text-accent" />,
            title: "ERC-8004 Identity",
            content: "The fundamental unit of an agent is its ERC-8004 token. This NFT-based identity represents the agent on the IdentityRegistry, allowing for verifiable reputation, automated role discovery, and permissionless interaction between agents."
        },
        {
            id: "templates",
            icon: <Zap className="w-5 h-5 text-accent" />,
            title: "Templates",
            content: "We provide pre-configured templates for common financial use cases: Remittance, Bill Splitting, Freelance Escrow, and Portfolio Hedging. Each template comes with a specialized system prompt and default configurations tailored for Celo's ecosystem (Mento, stablecoins)."
        },
        {
            id: "security",
            icon: <Wallet className="w-5 h-5 text-accent" />,
            title: "Security & Guardrails",
            content: "Every agent operates within strict user-defined spending limits. You can choose between a dedicated wallet (using a unique HD derivation path) or using your own connected wallet. Critical actions always require owner authorization."
        },
        {
            id: "management",
            icon: <Cpu className="w-5 h-5 text-accent" />,
            title: "Advanced Management",
            content: "Post-deployment, you can refine your agent's behavior through the Admin Dashboard. This includes editing the core System Prompt, updating the Network Manifest (Web URL, contact), and enabling or disabling specific skills like Swapping or Group Chat support."
        }
    ];

    return (
        <div className="min-h-screen bg-white font-mono flex flex-col md:flex-row">
            {/* Sidebar navigation */}
            <aside className="w-full md:w-64 border-b-2 md:border-b-0 md:border-r-2 border-forest bg-gypsum-dark p-6 space-y-8 flex-shrink-0">
                <div>
                    <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase text-forest hover:opacity-70 transition-opacity mb-8">
                        <ArrowLeft className="w-3 h-3" /> Back to Home
                    </Link>
                    <div className="flex items-center gap-3 text-forest mb-6">
                        <Book className="w-6 h-6" />
                        <h1 className="text-xl font-sans font-normal uppercase tracking-tighter">Docs</h1>
                    </div>
                    <nav className="space-y-1">
                        {sections.map((s) => (
                            <a
                                key={s.id}
                                href={`#${s.id}`}
                                className="block py-2 px-3 text-xs font-bold uppercase text-forest/60 hover:text-forest hover:bg-forest/5 transition-all rounded"
                            >
                                {s.title}
                            </a>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto bg-white">
                <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
                    <div className="mb-16 pb-12 border-b-2 border-forest/10">
                        <h2 className="text-4xl md:text-6xl font-sans font-normal text-forest uppercase tracking-tighter mb-6">
                            Documentation
                        </h2>
                        <p className="text-sm text-forest-muted font-medium max-w-xl leading-relaxed">
                            Welcome to the Agent Haus technical overview. Here you'll find everything you need to know about building and managing agents on Celo.
                        </p>
                    </div>

                    <div className="space-y-20">
                        {sections.map((s) => (
                            <section key={s.id} id={s.id} className="scroll-mt-24">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-10 h-10 border-2 border-forest bg-gypsum-dark flex items-center justify-center neobrutal-shadow-sm">
                                        {s.icon}
                                    </div>
                                    <h3 className="text-2xl font-sans font-normal text-forest uppercase tracking-tighter">
                                        {s.title}
                                    </h3>
                                </div>
                                <div className="pl-0 md:pl-14">
                                    <p className="text-sm text-forest-muted font-medium leading-relaxed">
                                        {s.content}
                                    </p>

                                    {s.id === "erc8004" && (
                                        <div className="mt-8 p-6 bg-forest text-white neobrutal-shadow">
                                            <div className="flex items-center gap-3 mb-4">
                                                <Code className="w-4 h-4 text-celo-yellow" />
                                                <span className="text-[10px] uppercase font-bold tracking-widest">Technical Spec</span>
                                            </div>
                                            <code className="text-[10px] block font-mono whitespace-pre opacity-80">
                                                {`interface IERC8004 {
  function getAgentID() external view returns (bytes32);
  function getAgentURI() external view returns (string memory);
  function getController() external view returns (address);
}`}
                                            </code>
                                        </div>
                                    )}
                                </div>
                            </section>
                        ))}
                    </div>

                    <div className="mt-24 pt-12 border-t-2 border-forest/10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <History className="w-5 h-5 text-forest/30" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-forest/40">
                                Last updated: March 2026
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <Link href="https://github.com/aicelo" target="_blank" className="text-xs font-bold uppercase text-forest hover:opacity-70 transition-opacity">
                                GitHub
                            </Link>
                            <Link href="https://twitter.com/aicelo" target="_blank" className="text-xs font-bold uppercase text-forest hover:opacity-70 transition-opacity">
                                Twitter
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            {/* Background visual accent */}
            <div className="fixed top-0 right-0 w-64 h-64 bg-celo-yellow/5 rounded-full -translate-y-1/2 translate-x-1/2 -z-10 blur-3xl pointer-events-none" />
        </div>
    );
}
