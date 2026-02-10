"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Activity,
  Star,
  DollarSign,
  Clock,
  ExternalLink,
  Pause,
  Play,
  Copy,
  Shield,
  TrendingUp,
  Fuel,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  ArrowUpRight,
  Send,
  MessageSquare,
  Bot,
  Loader2,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { getTemplateIcon, getStatusColor, formatAddress, formatCurrency, formatDate } from "@/lib/utils";
import { BLOCK_EXPLORER } from "@/lib/constants";

interface AgentData {
  id: string;
  name: string;
  description: string | null;
  templateType: string;
  status: string;
  systemPrompt: string | null;
  llmProvider: string;
  llmModel: string;
  spendingLimit: number;
  spendingUsed: number;
  agentWalletAddress: string | null;
  erc8004AgentId: string | null;
  erc8004URI: string | null;
  reputationScore: number;
  createdAt: string;
  deployedAt: string | null;
  transactions: TransactionData[];
  activityLogs: ActivityLogData[];
}

interface TransactionData {
  id: string;
  type: string;
  status: string;
  amount: number | null;
  currency: string | null;
  toAddress: string | null;
  txHash: string | null;
  gasUsed: number | null;
  createdAt: string;
}

interface ActivityLogData {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface WalletBalanceData {
  address: string;
  nativeBalance: string;
  tokens: {
    symbol: string;
    balance: string;
  }[];
}

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [agent, setAgent] = React.useState<AgentData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("chat");
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Wallet balance
  const [walletBalance, setWalletBalance] = React.useState<WalletBalanceData | null>(null);
  const [balanceLoading, setBalanceLoading] = React.useState(false);

  // Wallet init
  const [walletIniting, setWalletIniting] = React.useState(false);

  // Send form
  const [showSendForm, setShowSendForm] = React.useState(false);
  const [sendTo, setSendTo] = React.useState("");
  const [sendAmount, setSendAmount] = React.useState("");
  const [sendCurrency, setSendCurrency] = React.useState("CELO");
  const [sendLoading, setSendLoading] = React.useState(false);
  const [sendResult, setSendResult] = React.useState<{ success: boolean; txHash?: string; error?: string } | null>(null);

  // OpenClaw channels & cron
  const [openclawStatus, setOpenclawStatus] = React.useState<{
    gateway: { running: boolean };
    channels: Array<{ name: string; enabled: boolean; state: string; botUsername?: string }>;
    cronJobs: Array<{ id: string; name: string; cron?: string; every?: string; message: string; enabled: boolean }>;
  } | null>(null);
  const [showScheduleForm, setShowScheduleForm] = React.useState(false);
  const [scheduleForm, setScheduleForm] = React.useState({ name: "", message: "", every: "", channel: "" });

  // Fetch agent data from API
  React.useEffect(() => {
    async function fetchAgent() {
      try {
        const res = await fetch(`/api/agents/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setAgent(data);
        }
      } catch (err) {
        console.error("Failed to load agent:", err);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) fetchAgent();
  }, [params.id]);

  // Fetch wallet balance
  const fetchBalance = React.useCallback(async () => {
    if (!params.id) return;
    setBalanceLoading(true);
    try {
      const res = await fetch(`/api/agents/${params.id}/balance`);
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data);
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    } finally {
      setBalanceLoading(false);
    }
  }, [params.id]);

  React.useEffect(() => {
    if (agent?.agentWalletAddress) {
      fetchBalance();
    }
  }, [agent?.agentWalletAddress, fetchBalance]);

  // Fetch OpenClaw status
  React.useEffect(() => {
    async function fetchOpenClaw() {
      try {
        const res = await fetch("/api/openclaw/status");
        if (res.ok) setOpenclawStatus(await res.json());
      } catch { /* gateway may be offline */ }
    }
    fetchOpenClaw();
  }, []);

  // Auto-scroll chat
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending || !agent) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, timestamp: new Date() },
    ]);

    setIsSending(true);
    try {
      const response = await fetch(`/api/agents/${params.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: chatMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response, timestamp: new Date() },
        ]);
      } else {
        const error = await response.json();
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ Error: ${error.error || "Failed to process message"}. Make sure API keys are configured in Settings.`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Network error. Please check your connection and try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!agent) return;
    if (agent.status === "active") {
      await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paused" }),
      });
      setAgent({ ...agent, status: "paused" });
    } else {
      await fetch(`/api/agents/${agent.id}/deploy`, { method: "POST" });
      setAgent({ ...agent, status: "active", deployedAt: new Date().toISOString() });
    }
  };

  const handleInitWallet = async () => {
    if (!agent) return;
    setWalletIniting(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}/wallet`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setAgent({ ...agent, agentWalletAddress: data.address });
        fetchBalance();
      } else {
        alert(data.error || "Failed to initialize wallet");
      }
    } catch {
      alert("Network error initializing wallet");
    } finally {
      setWalletIniting(false);
    }
  };

  const handleSendTx = async () => {
    if (!agent || !sendTo || !sendAmount) return;
    setSendLoading(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/agents/${agent.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: sendTo, amount: sendAmount, currency: sendCurrency }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ success: true, txHash: data.txHash });
        setSendTo("");
        setSendAmount("");
        fetchBalance();
        // Refresh agent data for updated spending
        const agentRes = await fetch(`/api/agents/${params.id}`);
        if (agentRes.ok) setAgent(await agentRes.json());
      } else {
        setSendResult({ success: false, error: data.error });
      }
    } catch {
      setSendResult({ success: false, error: "Network error" });
    } finally {
      setSendLoading(false);
    }
  };

  const activityIcon = (type: string) => {
    switch (type) {
      case "action": return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "error": return <XCircle className="w-4 h-4 text-red-400" />;
      case "warning": return <AlertCircle className="w-4 h-4 text-amber-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Bot className="w-16 h-16 text-slate-600 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Agent Not Found</h2>
        <p className="text-slate-400 mb-4">This agent doesn&apos;t exist or has been deleted.</p>
        <Button variant="secondary" onClick={() => router.push("/dashboard/agents")}>
          Back to Agents
        </Button>
      </div>
    );
  }

  const transactions = agent.transactions || [];
  const activityLogs = agent.activityLogs || [];
  const totalGas = transactions.reduce((sum, t) => sum + (t.gasUsed || 0), 0);
  const confirmedCount = transactions.filter((t) => t.status === "confirmed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="text-3xl">{getTemplateIcon(agent.templateType)}</div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
                <Badge className={getStatusColor(agent.status)}>
                  {agent.status === "active" && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse" />}
                  {agent.status}
                </Badge>
              </div>
              <p className="text-slate-400 text-sm mt-1">{agent.description || "No description"}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToggleStatus}>
            {agent.status === "active" ? (
              <><Pause className="w-4 h-4" /> Pause</>
            ) : (
              <><Play className="w-4 h-4" /> Resume</>
            )}
          </Button>
          {agent.agentWalletAddress && (
            <a
              href={`${BLOCK_EXPLORER}/address/${agent.agentWalletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="sm">
                <ExternalLink className="w-4 h-4" /> View On-Chain
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-xs text-slate-500">Reputation</span>
            </div>
            <div className="text-xl font-bold text-white">
              {agent.reputationScore > 0 ? `${agent.reputationScore}/5.0` : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-500">Spending</span>
            </div>
            <div className="text-xl font-bold text-white">{formatCurrency(agent.spendingUsed)}</div>
            <Progress value={agent.spendingUsed} max={agent.spendingLimit} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-500">Transactions</span>
            </div>
            <div className="text-xl font-bold text-white">{transactions.length}</div>
            <div className="text-xs text-slate-500 mt-1">{confirmedCount} confirmed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Fuel className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-slate-500">Gas Spent</span>
            </div>
            <div className="text-xl font-bold text-white">{totalGas.toFixed(3)} CELO</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Agent Identity & Wallet Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Wallet Card */}
          {agent.agentWalletAddress ? (
            <Card className="border-emerald-500/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <CardTitle className="text-base">Agent Wallet</CardTitle>
                  </div>
                  <button
                    onClick={fetchBalance}
                    disabled={balanceLoading}
                    className="p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Refresh balance"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${balanceLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Address */}
                <div className="p-3 rounded-lg bg-slate-800/50">
                  <div className="text-xs text-slate-500 mb-1">Address</div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-white font-mono">
                      {formatAddress(agent.agentWalletAddress)}
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(agent.agentWalletAddress!)}
                      className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <a
                      href={`${BLOCK_EXPLORER}/address/${agent.agentWalletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-emerald-400 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Balances */}
                {walletBalance ? (
                  <div className="space-y-2">
                    {/* CELO balance */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/30">
                      <span className="text-sm text-slate-300">CELO</span>
                      <span className="text-sm font-mono text-white">
                        {parseFloat(walletBalance.nativeBalance).toFixed(4)}
                      </span>
                    </div>
                    {/* Token balances */}
                    {walletBalance.tokens
                      .filter((t) => t.symbol !== "CELO")
                      .map((token) => (
                        <div key={token.symbol} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/30">
                          <span className="text-sm text-slate-300">{token.symbol}</span>
                          <span className="text-sm font-mono text-white">
                            {parseFloat(token.balance).toFixed(4)}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : balanceLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 text-center py-2">
                    Could not load balances
                  </div>
                )}

                {/* Send / Withdraw */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => { setShowSendForm(!showSendForm); setSendResult(null); }}
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {showSendForm ? "Cancel" : "Send / Withdraw"}
                  </Button>

                  {showSendForm && (
                    <div className="p-3 rounded-lg bg-slate-800/50 space-y-2">
                      <input
                        type="text"
                        placeholder="Recipient 0x address"
                        value={sendTo}
                        onChange={(e) => setSendTo(e.target.value)}
                        className="w-full h-8 px-3 bg-slate-900/50 border border-slate-700 rounded text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Amount"
                          value={sendAmount}
                          onChange={(e) => setSendAmount(e.target.value)}
                          step="0.01"
                          min="0"
                          className="flex-1 h-8 px-3 bg-slate-900/50 border border-slate-700 rounded text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                        />
                        <select
                          value={sendCurrency}
                          onChange={(e) => setSendCurrency(e.target.value)}
                          className="h-8 px-2 bg-slate-900/50 border border-slate-700 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                        >
                          <option value="CELO">CELO</option>
                          <option value="cUSD">cUSD</option>
                          <option value="cEUR">cEUR</option>
                          <option value="cREAL">cREAL</option>
                        </select>
                      </div>
                      <Button
                        size="sm"
                        variant="glow"
                        className="w-full"
                        disabled={!sendTo || !sendAmount || sendLoading}
                        onClick={handleSendTx}
                      >
                        {sendLoading ? (
                          <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Sending...</>
                        ) : (
                          <><Send className="w-3 h-3 mr-1" /> Send {sendCurrency}</>
                        )}
                      </Button>

                      {sendResult && (
                        <div className={`p-2 rounded text-xs ${sendResult.success ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                          {sendResult.success ? (
                            <>
                              ✅ Sent!{" "}
                              <a
                                href={`${BLOCK_EXPLORER}/tx/${sendResult.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                View TX
                              </a>
                            </>
                          ) : (
                            <>❌ {sendResult.error}</>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Fund Wallet - Faucet link for testnet */}
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">
                        Celo Sepolia testnet wallet. Fund with test tokens:
                      </p>
                      <a
                        href={`https://faucet.celo.org/celo-sepolia`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 mt-1"
                      >
                        Celo Sepolia Faucet <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* No Wallet — show Initialize button */
            <Card className="border-amber-500/20">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-400" />
                  <CardTitle className="text-base">No Wallet</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-400">
                  This agent doesn&apos;t have a blockchain wallet yet. Initialize one to enable
                  on-chain transactions, token transfers, and balance tracking.
                </p>
                <Button
                  variant="glow"
                  size="sm"
                  className="w-full"
                  onClick={handleInitWallet}
                  disabled={walletIniting}
                >
                  {walletIniting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Initializing...</>
                  ) : (
                    <><Wallet className="w-3.5 h-3.5 mr-1.5" /> Initialize Wallet</>
                  )}
                </Button>
                <p className="text-[10px] text-slate-600">
                  Requires AGENT_MNEMONIC in .env — wallet derived via HD path.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Agent Identity Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {agent.erc8004AgentId && (
                <div className="p-3 rounded-lg bg-slate-800/50">
                  <div className="text-xs text-slate-500 mb-1">ERC-8004 Agent ID</div>
                  <div className="text-sm text-emerald-400 font-mono">#{agent.erc8004AgentId}</div>
                </div>
              )}
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-xs text-slate-500 mb-1">Runtime</div>
                <div className="text-sm text-white">OpenClaw Gateway</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-xs text-slate-500 mb-1">LLM Provider</div>
                <div className="text-sm text-white capitalize">{agent.llmProvider}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {agent.llmModel.split("/").pop()?.split(":")[0] || agent.llmModel}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-xs text-slate-500 mb-1">Network</div>
                <div className="text-sm text-white">Celo Sepolia (Testnet)</div>
              </div>
              {agent.deployedAt && (
                <div className="p-3 rounded-lg bg-slate-800/50">
                  <div className="text-xs text-slate-500 mb-1">Deployed</div>
                  <div className="text-sm text-white">{formatDate(agent.deployedAt)}</div>
                </div>
              )}
              {agent.erc8004URI && (
                <div className="p-3 rounded-lg bg-slate-800/50">
                  <div className="text-xs text-slate-500 mb-1">Registration URI</div>
                  <div className="text-sm text-blue-400 font-mono truncate">{agent.erc8004URI}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent Skills Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                ⚡ Skills
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(() => {
                const TEMPLATE_SKILL_LABELS: Record<string, { name: string; icon: string }[]> = {
                  payment: [
                    { name: "Send CELO", icon: "💸" },
                    { name: "Send Tokens", icon: "💰" },
                    { name: "Check Balance", icon: "🔍" },
                    { name: "Query Rate", icon: "📊" },
                    { name: "Gas Price", icon: "⛽" },
                  ],
                  trading: [
                    { name: "Send CELO", icon: "💸" },
                    { name: "Send Tokens", icon: "💰" },
                    { name: "Oracle Rates", icon: "📊" },
                    { name: "Mento Quote", icon: "💱" },
                    { name: "Mento Swap", icon: "🔄" },
                    { name: "Forex Analysis", icon: "📈" },
                    { name: "Portfolio", icon: "💼" },
                  ],
                  forex: [
                    { name: "Oracle Rates", icon: "📊" },
                    { name: "Mento Quote", icon: "💱" },
                    { name: "Mento Swap", icon: "🔄" },
                    { name: "Forex Analysis", icon: "📈" },
                    { name: "Portfolio", icon: "💼" },
                    { name: "Send CELO", icon: "💸" },
                    { name: "Balance Check", icon: "🔍" },
                    { name: "Gas Price", icon: "⛽" },
                  ],
                  social: [
                    { name: "Send CELO", icon: "💸" },
                    { name: "Send Tokens", icon: "💰" },
                    { name: "Check Balance", icon: "🔍" },
                  ],
                  custom: [
                    { name: "Send CELO", icon: "💸" },
                    { name: "Send Tokens", icon: "💰" },
                    { name: "Oracle Rates", icon: "📊" },
                    { name: "Mento Quote", icon: "💱" },
                    { name: "Gas Price", icon: "⛽" },
                  ],
                };
                const skills = TEMPLATE_SKILL_LABELS[agent.templateType] || TEMPLATE_SKILL_LABELS.custom;
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((s) => (
                      <Badge key={s.name} variant="secondary" className="text-[10px] gap-1">
                        {s.icon} {s.name}
                      </Badge>
                    ))}
                  </div>
                );
              })()}
              <p className="text-[10px] text-slate-500 mt-2">
                Skills are auto-injected into the agent&apos;s system prompt. The agent uses command tags to invoke skills in real-time.
              </p>
            </CardContent>
          </Card>

          {/* OpenClaw Channels & Scheduling Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                🦞 Channels & Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Gateway Status */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                <span className="text-xs text-slate-400">Gateway</span>
                <Badge
                  variant="default"
                  className={`text-[10px] ${
                    openclawStatus?.gateway.running
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}
                >
                  {openclawStatus?.gateway.running ? "Online" : "Offline"}
                </Badge>
              </div>

              {/* Connected Channels */}
              <div className="text-xs text-slate-500 mt-2">Connected Channels</div>
              <div className="space-y-1">
                {/* Web is always on */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">💬</span>
                    <span className="text-xs text-slate-300">Web Chat</span>
                  </div>
                  <Badge variant="default" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
                </div>
                {openclawStatus?.channels.filter(c => c.enabled).map((ch) => (
                  <div key={ch.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {ch.name === "telegram" ? "📱" : ch.name === "discord" ? "🎮" : ch.name === "whatsapp" ? "📞" : "💬"}
                      </span>
                      <div>
                        <span className="text-xs text-slate-300 capitalize">{ch.name}</span>
                        {ch.botUsername && <span className="text-[10px] text-slate-500 ml-1">{ch.botUsername}</span>}
                      </div>
                    </div>
                    <Badge variant="default" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
                  </div>
                ))}
                {(!openclawStatus?.channels || openclawStatus.channels.filter(c => c.enabled).length === 0) && (
                  <p className="text-[10px] text-slate-600 px-2">
                    Add channels in Settings → OpenClaw Gateway
                  </p>
                )}
              </div>

              {/* Scheduled Tasks */}
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-slate-500">Scheduled Tasks</div>
                <button
                  onClick={() => setShowScheduleForm(!showScheduleForm)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  + Add
                </button>
              </div>
              {openclawStatus?.cronJobs && openclawStatus.cronJobs.length > 0 ? (
                <div className="space-y-1">
                  {openclawStatus.cronJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                      <div>
                        <div className="text-xs text-slate-300">{job.name}</div>
                        <div className="text-[10px] text-slate-600">{job.every || job.cron || "one-shot"}</div>
                      </div>
                      <Badge variant={job.enabled ? "default" : "outline"} className="text-[10px]">
                        {job.enabled ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-600 px-2 pb-1">No scheduled tasks</p>
              )}

              {/* Quick Schedule Form */}
              {showScheduleForm && (
                <div className="p-3 rounded-lg bg-slate-800/50 space-y-2">
                  <input
                    className="w-full h-8 rounded bg-slate-900 border border-slate-700 text-xs text-white px-2"
                    placeholder="Task name"
                    value={scheduleForm.name}
                    onChange={(e) => setScheduleForm(p => ({ ...p, name: e.target.value }))}
                  />
                  <input
                    className="w-full h-8 rounded bg-slate-900 border border-slate-700 text-xs text-white px-2"
                    placeholder="Agent instruction / message"
                    value={scheduleForm.message}
                    onChange={(e) => setScheduleForm(p => ({ ...p, message: e.target.value }))}
                  />
                  <input
                    className="w-full h-8 rounded bg-slate-900 border border-slate-700 text-xs text-white px-2"
                    placeholder="Every (e.g. 1h, 30m, 24h)"
                    value={scheduleForm.every}
                    onChange={(e) => setScheduleForm(p => ({ ...p, every: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="text-xs h-7"
                      disabled={!scheduleForm.name || !scheduleForm.message || !scheduleForm.every}
                      onClick={async () => {
                        try {
                          await fetch("/api/openclaw/cron", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              name: scheduleForm.name,
                              message: scheduleForm.message,
                              every: scheduleForm.every,
                            }),
                          });
                          setShowScheduleForm(false);
                          setScheduleForm({ name: "", message: "", every: "", channel: "" });
                          // Refresh status
                          const res = await fetch("/api/openclaw/status");
                          if (res.ok) setOpenclawStatus(await res.json());
                        } catch { /* ignore */ }
                      }}
                    >
                      Create
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowScheduleForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Chat, Activity, Transactions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <Tabs
                tabs={[
                  { id: "chat", label: "Chat", icon: <MessageSquare className="w-4 h-4" /> },
                  { id: "activity", label: `Activity (${activityLogs.length})`, icon: <Activity className="w-4 h-4" /> },
                  { id: "transactions", label: `Txns (${transactions.length})`, icon: <TrendingUp className="w-4 h-4" /> },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
              />
            </CardHeader>
            <CardContent>
              {/* Chat Tab */}
              {activeTab === "chat" && (
                <div className="flex flex-col h-[500px]">
                  <div className="flex-1 overflow-auto space-y-3 mb-4">
                    {chatMessages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <Bot className="w-12 h-12 text-slate-600 mb-3" />
                        <h3 className="text-white font-medium mb-1">Chat with {agent.name}</h3>
                        <p className="text-sm text-slate-500 max-w-sm">
                          Send a message to interact with your agent. Powered by{" "}
                          <span className="capitalize">{agent.llmProvider}</span>.
                          {agent.agentWalletAddress
                            ? " This agent has a wallet and can execute real transactions."
                            : " No wallet — chat only, no on-chain transactions."}
                        </p>
                        {agent.status !== "active" && (
                          <Badge variant="warning" className="mt-3">
                            Agent is {agent.status} — deploy it first to chat
                          </Badge>
                        )}
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                            msg.role === "user"
                              ? "bg-emerald-600 text-white rounded-br-sm"
                              : "bg-slate-800 text-slate-200 rounded-bl-sm"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${
                            msg.role === "user" ? "text-emerald-200" : "text-slate-500"
                          }`}>
                            {msg.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isSending && (
                      <div className="flex justify-start">
                        <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      placeholder={`Message ${agent.name}...`}
                      className="flex-1 h-10 px-4 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                      disabled={isSending || agent.status !== "active"}
                    />
                    <Button
                      size="icon"
                      variant="glow"
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || isSending || agent.status !== "active"}
                      className="rounded-full h-10 w-10"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === "activity" && (
                <div className="space-y-2 max-h-[500px] overflow-auto">
                  {activityLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">No activity logs yet.</p>
                    </div>
                  ) : (
                    activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                        {activityIcon(log.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-300">{log.message}</p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
                            <Clock className="w-3 h-3" />
                            {formatDate(log.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Transactions Tab */}
              {activeTab === "transactions" && (
                <div className="space-y-2 max-h-[500px] overflow-auto">
                  {transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <TrendingUp className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">No transactions yet.</p>
                    </div>
                  ) : (
                    transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            tx.type === "send" ? "bg-purple-500/10" : "bg-emerald-500/10"
                          }`}>
                            {tx.type === "send" ? (
                              <ArrowUpRight className="w-4 h-4 text-purple-400" />
                            ) : (
                              <Shield className="w-4 h-4 text-emerald-400" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm text-white capitalize">{tx.type}</div>
                            <div className="text-xs text-slate-500">
                              {tx.toAddress ? formatAddress(tx.toAddress) : tx.txHash ? formatAddress(tx.txHash) : "—"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-white">
                            {tx.amount && tx.amount > 0 ? `${tx.amount} ${tx.currency || ""}` : "—"}
                          </div>
                          <Badge
                            variant={tx.status === "confirmed" ? "default" : tx.status === "failed" ? "destructive" : "warning"}
                            className="text-[10px]"
                          >
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
