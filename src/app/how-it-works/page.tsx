"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Shield, Zap, Rocket, Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HowItWorksPage() {
    return (
        <div className="min-h-screen bg-gypsum font-mono pb-20">
            {/* Top Utility Bar */}
            <div className="w-full border-b-2 border-forest bg-white/50 backdrop-blur-sm px-6 py-2 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-forest">
                <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                    <ArrowLeft className="w-3 h-3" /> Back to Home
                </Link>
                <div className="flex gap-6 text-forest/60">
                    <Link href="/how-it-works" className="text-forest">How it works</Link>
                    <Link href="/docs" className="hover:text-forest transition-colors">Docs</Link>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-6 pt-16 md:pt-24">
                <div className="mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 border-2 border-forest bg-celo-yellow text-forest text-[10px] font-bold uppercase tracking-widest neobrutal-shadow">
                        <Bot className="w-3 h-3" />
                        Platform Guide
                    </div>
                    <h1 className="text-5xl md:text-7xl font-sans font-normal mb-8 leading-[0.9] text-forest uppercase tracking-tighter">
                        How It Works
                    </h1>
                    <p className="text-lg text-forest font-bold uppercase tracking-tight max-w-2xl leading-tight">
                        Agent Haus is the standard for deploying autonomous, verifiable AI agents on the Celo blockchain.
                        From identity to execution, here is the flow.
                    </p>
                </div>

                <div className="space-y-24">
                    {/* Step 1: ERC-8004 Identity */}
                    <div className="relative">
                        <div className="absolute -left-4 md:-left-12 top-0 text-8xl md:text-9xl font-sans font-normal text-forest/5 select-none leading-none">01</div>
                        <div className="relative grid md:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="text-3xl font-sans font-normal text-forest uppercase tracking-tighter mb-6 flex items-center gap-4">
                                    <Shield className="w-8 h-8 text-accent" />
                                    On-Chain Identity
                                </h2>
                                <div className="space-y-4 text-sm text-forest/80 leading-relaxed font-medium">
                                    <p>
                                        Every agent on Agent Haus is registered as an <span className="text-forest font-bold underline">ERC-8004 NFT</span>.
                                        This isn't just a membership card—it's the agent's unique cryptographic identity.
                                    </p>
                                    <ul className="space-y-2">
                                        <li className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-forest mt-1.5 shrink-0" />
                                            <span>Registers on the Global IdentityRegistry</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-forest mt-1.5 shrink-0" />
                                            <span>Programmable metadata for social links and roles</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-forest mt-1.5 shrink-0" />
                                            <span>Permissionless verification on 8004scan</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div className="border-4 border-forest bg-white p-8 neobrutal-shadow rotate-1 sm:rotate-2">
                                <div className="aspect-square bg-gypsum-dark border-2 border-forest flex items-center justify-center">
                                    <Shield className="w-24 h-24 text-forest/20" />
                                </div>
                                <div className="mt-4 pt-4 border-t-2 border-forest-faint space-y-2">
                                    <div className="h-2 w-3/4 bg-forest/10 rounded" />
                                    <div className="h-2 w-1/2 bg-forest/10 rounded" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Simplified Creation */}
                    <div className="relative">
                        <div className="absolute -left-4 md:-left-12 top-0 text-8xl md:text-9xl font-sans font-normal text-forest/5 select-none leading-none">02</div>
                        <div className="relative grid md:grid-cols-2 gap-12 items-center">
                            <div className="order-2 md:order-1 border-4 border-forest bg-celo-yellow p-8 neobrutal-shadow -rotate-1 sm:-rotate-2">
                                <div className="space-y-4">
                                    <div className="h-10 border-2 border-forest bg-white px-3 flex items-center text-[10px] font-bold">NAME: REMITTANCE_BOT</div>
                                    <div className="h-24 border-2 border-forest bg-white px-3 py-2 text-[10px] font-bold">DESC: HELPING USERS SEND FUNDS...</div>
                                    <div className="h-10 border-2 border-forest bg-forest text-white px-3 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest">
                                        Create Agent
                                    </div>
                                </div>
                            </div>
                            <div className="order-1 md:order-2">
                                <h2 className="text-3xl font-sans font-normal text-forest uppercase tracking-tighter mb-6 flex items-center gap-4">
                                    <Zap className="w-8 h-8 text-accent" />
                                    One-Step Launch
                                </h2>
                                <div className="space-y-4 text-sm text-forest/80 leading-relaxed font-medium">
                                    <p>
                                        We've removed the noise. To launch an agent, you only need the essentials:
                                        <span className="text-forest font-bold"> a purpose, a name, and a limit.</span>
                                    </p>
                                    <p>
                                        Advanced settings like the System Prompt and custom Network Manifest are managed
                                        later from your Dashboard, allowing you to iterate on your agent's behavior in real-time.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Social & Execution */}
                    <div className="relative">
                        <div className="absolute -left-4 md:-left-12 top-0 text-8xl md:text-9xl font-sans font-normal text-forest/5 select-none leading-none">03</div>
                        <div className="relative grid md:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="text-3xl font-sans font-normal text-forest uppercase tracking-tighter mb-6 flex items-center gap-4">
                                    <Send className="w-8 h-8 text-accent" />
                                    Chat & Control
                                </h2>
                                <div className="space-y-4 text-sm text-forest/80 leading-relaxed font-medium">
                                    <p>
                                        Once deployed, your agent lives in your Dashboard and on Telegram.
                                        You can chat with it to execute transactions, swap tokens, or just check its status.
                                    </p>
                                    <div className="p-4 border-2 border-forest bg-white/50 space-y-2">
                                        <p className="text-[10px] font-bold text-forest/40 uppercase">Telegram Command Example:</p>
                                        <p className="text-xs font-bold font-mono">"Send 10 cUSD to 0x123..."</p>
                                        <div className="flex gap-2">
                                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 border border-green-200 uppercase font-black">Executing</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="border-4 border-forest bg-white p-8 neobrutal-shadow rotate-1 sm:rotate-2">
                                <div className="space-y-4">
                                    <div className="flex gap-3 items-center">
                                        <div className="w-8 h-8 rounded-full bg-forest/10" />
                                        <div className="flex-1 h-8 rounded-xl bg-forest/5" />
                                    </div>
                                    <div className="flex gap-3 items-center flex-row-reverse">
                                        <div className="w-8 h-8 rounded-full bg-forest" />
                                        <div className="flex-1 h-12 rounded-xl bg-forest text-white flex items-center px-4 text-[10px] font-bold">TRANSACTION SIGNED AND SUBMITTED. TX: 0x8a2...</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-32 pt-16 border-t-4 border-forest text-center">
                    <h2 className="text-4xl font-sans font-normal text-forest uppercase tracking-tighter mb-8">
                        Ready to Build?
                    </h2>
                    <div className="flex flex-wrap items-center justify-center gap-6">
                        <Link href="/dashboard/agents/new">
                            <Button size="lg" className="h-16 px-12 text-xl font-bold uppercase tracking-widest neobrutal-shadow">
                                Deploy Agent Now
                            </Button>
                        </Link>
                        <Link href="/docs">
                            <Button variant="outline" size="lg" className="h-16 px-12 text-xl font-bold uppercase tracking-widest neobrutal-shadow bg-white">
                                Read Full Docs
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>

            {/* Background Grid */}
            <div className="fixed inset-0 grid-pattern pointer-events-none -z-10 opacity-50" />
        </div>
    );
}
