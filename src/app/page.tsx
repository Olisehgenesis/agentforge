"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ReactTyped } from "react-typed";
import { useAccount, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { cn, formatCompactNumber, formatCompactCurrency } from "@/lib/utils";
import { Zap, Bot, Sparkles, Send, LogOut } from "lucide-react";
/** Hackathon ideas – one flowing paragraph each, related phrases (random) */
const DEMO_PROMPTS = [
  "Deploy an ERC-8004 remittance agent for me that parses natural language like send $50 to my mom in the Philippines, finds the cheapest route via Mento, and executes cross-border transfers in cUSD with fee comparison to Western Union…",
  "Deploy an ERC-8004 split-bill agent for me that takes voice input for dinner expenses, confirms who owes what audibly, tracks balances across events, and settles debts via stablecoin transfers in group chats…",
  "Deploy an ERC-8004 freelancer agent for me that holds funds in escrow, uses an AI judge to resolve disputes by comparing deliverables to requirements, and releases payment automatically when milestones are approved…",
  "Deploy an ERC-8004 FX hedging agent for me that monitors my portfolio exposure, keeps 50% USD and 30% EUR via Mento swaps, rebalances when drift exceeds my threshold, and batches trades for lower fees…",
  "Deploy an ERC-8004 savings agent for me that sets goals like save $500 for vacation, asks about income and risk tolerance, allocates across AAVE and Uniswap LPs, and adjusts strategy as markets move…",
  "Deploy an ERC-8004 price-alert agent for me that watches ETH and BTC, buys when price drops below my target, sells on 20% gains, and notifies me on Telegram when trades execute…",
  "Deploy an ERC-8004 reputation oracle for me that indexes on-chain behavior and payment history, scores agents by reliability and task completion, and lets other agents query trust before transacting…",
  "Deploy an ERC-8004 no-code launcher for me with templates for trading and payments, an LLM config and prompt editor, one-click ERC-8004 registration, and a dashboard to monitor activity and spending…",
  "Deploy an ERC-8004 raffle agent for me that sells tickets via x402 micropayments, accumulates the prize pool, uses Chainlink VRF for provably fair winner selection, and distributes prizes automatically…",
  "Deploy an ERC-8004 arbitrage agent for me that monitors Uniswap and Mento for stablecoin price gaps, executes profitable trades, and shares returns with delegators who deposit into my vault…",
  "Deploy an ERC-8004 task marketplace for me where agents post work with specs and budget, other agents bid with reputation thresholds, and x402 pays automatically on verified completion…",
  "Deploy an ERC-8004 DAO treasury agent for me that runs payroll and recurring bills, invests idle funds in AAVE and Uniswap LPs, and queues large transactions for multi-sig approval…",
  "Deploy an ERC-8004 MentoTrader agent for me that competes on FX returns, ranks on a public leaderboard, and lets users delegate capital to my strategy with configurable profit sharing…",
  "Deploy an ERC-8004 Rent-a-Human agent for me that posts physical tasks like verify a storefront or deliver a package, accepts proof from verified workers, and releases USDT payment on completion…",
  "Deploy an ERC-8004 KYC gateway for me that agents call when they need verification, returns privacy-preserving attestations without raw PII, and charges per check in USDT…",
  "Deploy an ERC-8004 AgentVault for me that stores encrypted memory on IPFS, lets agents remember preferences and conversation history across sessions, and charges per GB and query…",
  "Deploy an ERC-8004 Agent Mesh for me that registers capabilities and pricing, lets agents discover each other by task type and reputation, and enables encrypted messaging for task coordination…",
];

const FALLBACK_AGENTS = [
  { name: "MentoTrader", status: "active", erc8004: { agentId: "8004" } },
  { name: "CeloVault", status: "online", erc8004: { agentId: "1242" } },
  { name: "ProsperityBot", status: "deployed", erc8004: { agentId: "901" } },
  { name: "StableSwap", status: "active", erc8004: { agentId: "2021" } },
  { name: "ERC8004_Oracle", status: "online", erc8004: { agentId: "44" } },
  { name: "AlphaAgent", status: "active", erc8004: { agentId: "777" } },
  { name: "LlamaWatcher", status: "deployed", erc8004: { agentId: "333" } },
];

type DemoState = "idle" | "clicking";

export default function HomePage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [demoState, setDemoState] = useState<DemoState>("idle");
  const [agents, setAgents] = useState<any[]>([]);
  const [stats, setStats] = useState<{
    uniqueUsers: number;
    agentsTotal: number;
    agentsDeployed: number;
    activeAgents: number;
    verifiedAgents: number;
    tokensDeployed: number;
    transactionsCount: number;
    totalVolume: number;
    deploymentRate: number;
    activeRate: number;
    averageAgentsPerUser: number;
    transactionsPerAgent: number;
  } | null>(null);

  const handleTryClick = () => {
    if (demoState !== "idle") return;
    setDemoState("clicking");
    setTimeout(() => {
      router.push("/beta/create");
    }, 300);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Fetch stats
        const statsRes = await fetch("/api/analytics/stats");
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (mounted) setStats(statsData);
        }

        // Fetch public agents for avatars and marquee
        const agentsRes = await fetch("/api/public/agents?limit=15&status=all");
        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          if (mounted && agentsData.agents) {
            setAgents(agentsData.agents);
          }
        }
      } catch (err) {
        console.error("Home page fetch failed", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Show only 4 simple stats on the homepage: total agents, unique users, active agents, and volume
  const statsCards = stats
    ? [
      { label: "Total agents", value: formatCompactNumber(stats.agentsTotal) },
      { label: "Unique users", value: formatCompactNumber(stats.uniqueUsers) },
      { label: "Active agents", value: formatCompactNumber(stats.activeAgents) },
    ]
    : [
      { label: "Total agents", value: "—" },
      { label: "Unique users", value: "—" },
      { label: "Active agents", value: "—" },
    ];

  return (
    <div className="min-h-screen bg-gypsum font-mono pb-20">
      {/* Top Utility Bar */}
      <div className="w-full border-b-2 border-forest bg-white/50 backdrop-blur-sm px-6 py-2 flex justify-center md:justify-end gap-6 text-[10px] font-bold uppercase tracking-widest text-forest/60">
        <Link href="/how-it-works" className="hover:text-forest transition-colors">
          How it works
        </Link>
        <Link href="/why" className="hover:text-forest transition-colors">
          Why
        </Link>
        <Link href="/docs" className="hover:text-forest transition-colors">
          Docs
        </Link>
      </div>

      <section className="relative overflow-hidden pt-8 md:pt-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge - Neobrutalist style */}
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 border-2 border-forest bg-celo-yellow text-forest text-[10px] font-bold uppercase tracking-widest neobrutal-shadow">
            <Sparkles className="w-3 h-3" />
            ERC-8004 Agents actually doind stuff
          </div>

          {/* Heading - Anton Font, Large, Uppercase */}
          <h1 className="text-5xl md:text-7xl xl:text-8xl font-sans font-normal mb-6 leading-[0.9] text-forest uppercase tracking-tighter">
            AGENT HAUS
          </h1>

          {/* Subtitle */}
          <p className="text-xs md:text-sm text-forest/80 max-w-2xl mx-auto mb-6 leading-relaxed font-bold uppercase tracking-wide">
            On Click Deploy ERC8004 AI agents.
            Automated registration, secure management, and real-time monitoring.
          </p>

          {/* Search Bar / Console Area - Neobrutalist */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="flex flex-row items-center gap-0 border-2 border-forest bg-white neobrutal-shadow h-14 overflow-hidden">
              <div className="flex-1 flex items-center text-forest text-sm md:text-base px-4 font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                {demoState === "idle" ? (
                  <ReactTyped
                    strings={DEMO_PROMPTS}
                    typeSpeed={35}
                    backSpeed={20}
                    backDelay={1500}
                    loop
                    shuffle={false}
                    showCursor={true}
                    cursorChar="_"
                  />
                ) : (
                  <span className="text-forest/50 animate-pulse">DEPLOYING AGENT...</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => router.push("/dashboard/agents/new")}
                className={cn(
                  "shrink-0 h-full flex items-center justify-center gap-2 px-6 bg-forest text-white font-bold uppercase tracking-widest text-[10px] md:text-xs transition-all duration-200 border-l-2 border-forest hover:bg-forest/90 active:bg-forest/80"
                )}
              >
                <Send className="w-3.5 h-3.5" />
                Deploy
              </button>
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-forest/40">
              Prefer chat? <Link href="/beta/create" className="text-forest/60 hover:text-forest underline underline-offset-2">Try Chat Deploy</Link>
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="h-12 px-8 bg-accent text-white border-2 border-forest rounded-none font-bold uppercase tracking-widest text-sm neobrutal-shadow"
              >
                <Bot className="w-5 h-5" />
                Enter app
              </Button>
            </Link>
          </div>

          {/* Social Proof - Agent Avatars */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="flex -space-x-3">
              {(agents.length > 0 ? agents.slice(0, 8) : [1, 2, 3, 4, 5, 6, 7, 8]).map((agent, i) => (
                <div key={agent.id || i} className="w-10 h-10 rounded-full border-2 border-forest overflow-hidden bg-gypsum-dark bg-white flex items-center justify-center p-1.5 neobrutal-shadow">
                  <Image
                    src={agent.imageUrl || "/robot-bot-icon.svg"}
                    alt={agent.name || "agent avatar"}
                    width={40}
                    height={40}
                    className="w-full h-full object-contain"
                  />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-forest bg-celo-yellow flex items-center justify-center font-bold text-[10px] neobrutal-shadow">
                +{stats ? formatCompactNumber(stats.agentsTotal - Math.min(agents.length, 8)) : "1K"}
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-forest/60">
              Trusted by {stats ? formatCompactNumber(stats.uniqueUsers) : "1,802"}+ Agent Operators
            </p>
          </div>
        </div>

        {/* Recently Checked Marquee Section - Real Data */}
        <div className="w-full border-y-2 border-forest py-6 bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 bg-forest text-gypsum px-4 py-1 text-[10px] font-bold uppercase tracking-widest -translate-y-1/2 ml-10">
            Live Feed
          </div>
          <div className="flex gap-8 animate-marquee whitespace-nowrap">
            {(agents.length > 0 ? [...agents, ...agents] : [...FALLBACK_AGENTS, ...FALLBACK_AGENTS]).map((agent, i) => (
              <Link
                key={i}
                href={agent.id ? `/public/agents/${agent.id}/chat` : "#"}
                target="_blank"
                className="inline-flex items-center gap-3 px-4 py-2 border-2 border-forest bg-gypsum-dark font-bold text-sm neobrutal-shadow hover:bg-white transition-colors cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-forest flex items-center justify-center overflow-hidden">
                  <Image
                    src={agent?.imageUrl || "/robot-bot-icon.svg"}
                    alt="avatar"
                    width={20}
                    height={20}
                    className="w-full h-full object-contain p-0.5"
                  />
                </div>
                <span>{agent?.name} is {agent?.status}</span>
                <span className="text-accent">#{agent?.erc8004?.agentId || "ERC-8004"}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statsCards.map((stat) => (
              <div key={stat.label} className="p-4 border-2 border-forest bg-white neobrutal-shadow text-center">
                <div className="text-3xl md:text-4xl font-sans font-normal text-forest mb-1">{stat.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-forest/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap Section */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="border-4 border-forest bg-celo-yellow p-8 neobrutal-shadow relative">
            <h2 className="text-4xl font-sans font-normal text-forest uppercase tracking-tighter mb-8 border-b-4 border-forest pb-4 inline-block">
              Roadmap
            </h2>

            <div className="relative space-y-6">
              {/* Vertical Line */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-forest/20 -translate-x-1/2 z-0" />

              <div className="relative flex items-start gap-4 z-10">
                <div className="w-8 h-8 rounded-none border-2 border-forest bg-forest text-white flex items-center justify-center shrink-0 font-bold">✓</div>
                <div>
                  <h3 className="font-bold uppercase text-lg leading-tight">Agents Deployment and Verification</h3>
                  <p className="text-xs font-bold uppercase text-forest/60">Status: Complete</p>
                </div>
              </div>

              <div className="relative flex items-start gap-4 z-10">
                <div className="w-8 h-8 rounded-none border-2 border-forest bg-forest text-white flex items-center justify-center shrink-0 font-bold">✓</div>
                <div>
                  <h3 className="font-bold uppercase text-lg leading-tight">Agent Chats via Socials</h3>
                  <p className="text-xs font-bold uppercase text-forest/60">Status: Telegram Integrated</p>
                </div>
              </div>

              <div className="relative flex items-start gap-4 z-10">
                <div className="w-8 h-8 rounded-none border-2 border-forest bg-white flex items-center justify-center shrink-0 font-bold"></div>
                <div>
                  <h3 className="font-bold uppercase text-lg leading-tight">Agent Skills</h3>
                  <p className="text-xs font-bold uppercase text-accent">Status: Coming Soon</p>
                </div>
              </div>

              <div className="relative flex items-start gap-4 z-10">
                <div className="w-8 h-8 rounded-none border-2 border-forest bg-white flex items-center justify-center shrink-0 font-bold"></div>
                <div>
                  <h3 className="font-bold uppercase text-lg leading-tight">Agent Cron Jobs</h3>
                  <p className="text-xs font-bold uppercase text-accent">Status: Coming Soon (Clawbots)</p>
                </div>
              </div>

              <div className="relative flex items-start gap-4 z-10">
                <div className="w-8 h-8 rounded-none border-2 border-forest bg-white flex items-center justify-center shrink-0 font-bold"></div>
                <div>
                  <h3 className="font-bold uppercase text-lg leading-tight">Agents Not Sleeping</h3>
                  <p className="text-xs font-bold uppercase text-accent">Status: Coming Soon (Clawbots)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Background Grid */}
      <div className="fixed inset-0 grid-pattern pointer-events-none -z-10 opacity-50" />
      {/* Visual Accents */}
      <div className="fixed top-20 left-10 w-32 h-32 border-2 border-forest/10 rounded-full -z-10" />
      <div className="fixed bottom-20 right-10 w-64 h-64 border-2 border-forest/10 rounded-full -z-10" />
    </div>
  );
}
