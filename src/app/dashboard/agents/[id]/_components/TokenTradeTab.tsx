"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Coins,
  Shield,
  Wallet,
  DollarSign,
  TrendingUp,
  Loader2,
  Plus,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { formatAddress } from "@/lib/utils";
import type { AgentData } from "../_types";

interface EconomicsData {
  totalRevenue: string;
  totalCosts: string;
  profitLoss: string;
  runway?: { months: number; status: string };
}

interface PoolData {
  agentName?: string;
  tokenAddress?: string;
  price?: number;
  volume24h?: number;
  marketCap?: number;
}

interface TokenTradeTabProps {
  agent: AgentData;
  agentId: string;
  verified: boolean;
  onOpenVerifyModal?: () => void;
}

const COST_CATEGORIES = ["infra", "compute", "ai_credits", "bandwidth", "storage", "other"] as const;

export function TokenTradeTab({
  agent,
  agentId,
  verified,
  onOpenVerifyModal,
}: TokenTradeTabProps) {
  const [economics, setEconomics] = useState<EconomicsData | null>(null);
  const [pools, setPools] = useState<PoolData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletRegistering, setWalletRegistering] = useState(false);
  const [tokenDeploying, setTokenDeploying] = useState(false);
  const [logSending, setLogSending] = useState(false);
  const [sponsorRequesting, setSponsorRequesting] = useState(false);

  const normalizeEconomics = (raw: Record<string, unknown> | null): EconomicsData | null => {
    if (!raw || typeof raw !== "object") return null;
    const toStr = (v: unknown): string =>
      typeof v === "string" ? v : typeof v === "number" ? String(v) : "0";
    let runway: { months: number; status: string } | undefined;
    if (raw.runway && typeof raw.runway === "object" && !Array.isArray(raw.runway)) {
      const rw = raw.runway as Record<string, unknown>;
      const months = typeof rw.months === "number" ? rw.months : 0;
      const status = typeof rw.status === "string" ? rw.status : "";
      runway = { months, status };
    }
    return {
      totalRevenue: toStr(raw.totalRevenue ?? raw.totalRevenueUsd ?? 0),
      totalCosts: toStr(raw.totalCosts ?? raw.totalCostUsd ?? 0),
      profitLoss: toStr(raw.profitLoss ?? raw.netUsd ?? 0),
      runway,
    };
  };

  const fetchEconomics = useCallback(async () => {
    if (!agentId || !verified) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/selfclaw/economics`);
      if (res.ok) {
        const data = await res.json();
        setEconomics(normalizeEconomics(data));
      } else {
        const err = await res.json();
        setError(err.error || "Failed to fetch economics");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [agentId, verified]);

  const fetchPools = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/selfclaw/pools`);
      if (res.ok) {
        const data = await res.json();
        setPools(data.pools || []);
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (verified) {
      fetchEconomics();
      fetchPools();
    }
  }, [verified, fetchEconomics, fetchPools]);

  const onRegisterWallet = useCallback(async () => {
    if (!agentId) return;
    setWalletRegistering(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/selfclaw/create-wallet`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to register wallet");
      }
      await fetchEconomics();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setWalletRegistering(false);
    }
  }, [agentId, fetchEconomics]);

  const onDeployToken = useCallback(async (name: string, symbol: string, initialSupply: string) => {
    if (!agentId) return;
    setTokenDeploying(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/selfclaw/deploy-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, symbol, initialSupply }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to deploy token");
      }
      await fetchEconomics();
      await fetchPools();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      throw e;
    } finally {
      setTokenDeploying(false);
    }
  }, [agentId, fetchEconomics, fetchPools]);

  const onLogRevenue = useCallback(async (amount: string, source: string, currency?: string, description?: string) => {
    if (!agentId) return;
    setLogSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/selfclaw/log-revenue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency: currency || "USD", source, description }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to log revenue");
      }
      await fetchEconomics();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      throw e;
    } finally {
      setLogSending(false);
    }
  }, [agentId, fetchEconomics]);

  const onLogCost = useCallback(async (amount: string, category: string, currency?: string, description?: string) => {
    if (!agentId) return;
    setLogSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/selfclaw/log-cost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency: currency || "USD", category, description }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to log cost");
      }
      await fetchEconomics();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      throw e;
    } finally {
      setLogSending(false);
    }
  }, [agentId, fetchEconomics]);

  const onRequestSponsorship = useCallback(async () => {
    if (!agentId) return;
    setSponsorRequesting(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/selfclaw/request-sponsorship`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to request sponsorship");
      }
      await fetchPools();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSponsorRequesting(false);
    }
  }, [agentId, fetchPools]);
  const [deployName, setDeployName] = useState("");
  const [deploySymbol, setDeploySymbol] = useState("");
  const [deploySupply, setDeploySupply] = useState("10000000000");
  const [showDeployForm, setShowDeployForm] = useState(false);
  const [showLogRevenue, setShowLogRevenue] = useState(false);
  const [showLogCost, setShowLogCost] = useState(false);
  const [logAmount, setLogAmount] = useState("");
  const [logSource, setLogSource] = useState("api_fees");
  const [logCategory, setLogCategory] = useState<typeof COST_CATEGORIES[number]>("compute");
  const [logDesc, setLogDesc] = useState("");

  const handleDeploy = async () => {
    if (!deployName.trim() || !deploySymbol.trim()) return;
    try {
      await onDeployToken(deployName.trim(), deploySymbol.trim().toUpperCase(), deploySupply);
      setShowDeployForm(false);
      setDeployName("");
      setDeploySymbol("");
      setDeploySupply("10000000000");
    } catch {
      // error handled in parent
    }
  };

  const handleLogRevenueSubmit = async () => {
    if (!logAmount.trim()) return;
    try {
      await onLogRevenue(logAmount, logSource, "USD", logDesc || undefined);
      setShowLogRevenue(false);
      setLogAmount("");
      setLogDesc("");
    } catch {
      // error handled in parent
    }
  };

  const handleLogCostSubmit = async () => {
    if (!logAmount.trim()) return;
    try {
      await onLogCost(logAmount, logCategory, "USD", logDesc || undefined);
      setShowLogCost(false);
      setLogAmount("");
      setLogDesc("");
    } catch {
      // error handled in parent
    }
  };

  // Chart data: use economics or placeholder (ensure numeric)
  const chartData = React.useMemo(() => {
    const rev = parseFloat(String(economics?.totalRevenue ?? "0")) || 0;
    const cost = parseFloat(String(economics?.totalCosts ?? "0")) || 0;
    const profit = parseFloat(String(economics?.profitLoss ?? "0")) || rev - cost;
    return [
      { name: "Revenue", value: rev, fill: "hsl(var(--celo) / 0.8)" },
      { name: "Costs", value: Math.abs(cost), fill: "hsl(var(--forest) / 0.8)" },
      { name: "P&L", value: Math.max(0, profit), fill: profit >= 0 ? "hsl(var(--celo))" : "hsl(0 70% 50%)" },
    ].filter((d) => d.value > 0);
  }, [economics]);

  if (!verified) {
    return (
      <div className="space-y-4 max-h-[500px] overflow-auto">
        <div className="text-center py-8">
          <Coins className="w-14 h-14 text-celo mx-auto mb-4" />
          <h3 className="text-lg font-medium text-forest mb-2">Agent Token & Trade</h3>
          <p className="text-sm text-forest-muted max-w-md mx-auto mb-4">
            Deploy an ERC20 token for your agent, request liquidity sponsorship, and enable trading. Requires Self passport verification.
          </p>
          <Button variant="glow" onClick={onOpenVerifyModal} className="mt-2">
            <Shield className="w-4 h-4 mr-2" />
            Verify via Self Passport to enable
          </Button>
        </div>
      </div>
    );
  }

  const hasWallet = !!agent.agentWalletAddress;

  return (
    <div className="space-y-6 max-h-[500px] overflow-auto">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 text-red-600 text-sm">{error}</div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg bg-gypsum/80 border border-forest/10">
          <div className="flex items-center gap-2 text-forest-muted text-xs mb-1">
            <Wallet className="w-4 h-4" />
            Wallet
          </div>
          {hasWallet ? (
            <p className="text-sm font-mono truncate">{formatAddress(agent.agentWalletAddress!)}</p>
          ) : (
            <p className="text-sm text-forest-muted">No wallet</p>
          )}
          {hasWallet && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 h-7 text-xs"
              onClick={onRegisterWallet}
              disabled={walletRegistering}
            >
              {walletRegistering ? <Loader2 className="w-3 h-3 animate-spin" /> : "Register wallet"}
            </Button>
          )}
        </div>
        <div className="p-4 rounded-lg bg-gypsum/80 border border-forest/10">
          <div className="flex items-center gap-2 text-forest-muted text-xs mb-1">
            <DollarSign className="w-4 h-4" />
            Revenue
          </div>
          <p className="text-lg font-medium text-forest">
            ${String(economics?.totalRevenue ?? "0.00")}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-gypsum/80 border border-forest/10">
          <div className="flex items-center gap-2 text-forest-muted text-xs mb-1">
            <TrendingUp className="w-4 h-4" />
            P&L / Runway
          </div>
          <p className="text-lg font-medium text-forest">
            ${String(economics?.profitLoss ?? "0.00")}
          </p>
          {economics?.runway && (economics.runway.months > 0 || economics.runway.status) && (
            <p className="text-xs text-forest-muted mt-1">
              {economics.runway.months > 0 ? `${economics.runway.months} mo runway` : ""}
              {economics.runway.months > 0 && economics.runway.status ? " · " : ""}
              {economics.runway.status || ""}
            </p>
          )}
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="h-[200px]">
          <p className="text-sm font-medium text-forest mb-2">Revenue vs Costs</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--forest) / 0.2)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--forest) / 0.6)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--forest) / 0.6)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--gypsum))",
                  border: "1px solid hsl(var(--forest) / 0.2)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="value" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!showDeployForm ? (
          <Button size="sm" variant="outline" onClick={() => setShowDeployForm(true)} disabled={tokenDeploying}>
            <Plus className="w-4 h-4 mr-1" />
            Deploy Token
          </Button>
        ) : (
          <div className="flex-1 min-w-[200px] p-3 rounded-lg bg-gypsum border border-forest/10 space-y-2">
            <Input
              placeholder="Token name"
              value={deployName}
              onChange={(e) => setDeployName(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Symbol (e.g. MAT)"
              value={deploySymbol}
              onChange={(e) => setDeploySymbol(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Initial supply"
              value={deploySupply}
              onChange={(e) => setDeploySupply(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleDeploy} disabled={tokenDeploying || !deployName || !deploySymbol}>
                {tokenDeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deploy"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowDeployForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowLogRevenue(true)}
          disabled={logSending}
        >
          Log Revenue
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowLogCost(true)}
          disabled={logSending}
        >
          Log Cost
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onRequestSponsorship}
          disabled={sponsorRequesting}
        >
          {sponsorRequesting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Request Liquidity Sponsorship
        </Button>
      </div>

      {/* Log Revenue Modal */}
      {showLogRevenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/20 p-4">
          <div className="bg-gypsum rounded-xl p-4 max-w-sm w-full shadow-lg border border-forest/10">
            <h4 className="font-medium text-forest mb-3">Log Revenue</h4>
            <Input
              placeholder="Amount"
              type="number"
              value={logAmount}
              onChange={(e) => setLogAmount(e.target.value)}
              className="mb-2"
            />
            <select
              value={logSource}
              onChange={(e) => setLogSource(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-forest/15 bg-white text-sm mb-2"
            >
              <option value="api_fees">API Fees</option>
              <option value="subscription">Subscription</option>
              <option value="one_time">One-time</option>
              <option value="other">Other</option>
            </select>
            <Input
              placeholder="Description (optional)"
              value={logDesc}
              onChange={(e) => setLogDesc(e.target.value)}
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleLogRevenueSubmit} disabled={logSending || !logAmount}>
                Submit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowLogRevenue(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Log Cost Modal */}
      {showLogCost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/20 p-4">
          <div className="bg-gypsum rounded-xl p-4 max-w-sm w-full shadow-lg border border-forest/10">
            <h4 className="font-medium text-forest mb-3">Log Cost</h4>
            <Input
              placeholder="Amount"
              type="number"
              value={logAmount}
              onChange={(e) => setLogAmount(e.target.value)}
              className="mb-2"
            />
            <select
              value={logCategory}
              onChange={(e) => setLogCategory(e.target.value as typeof logCategory)}
              className="w-full h-10 px-3 rounded-lg border border-forest/15 bg-white text-sm mb-2"
            >
              {COST_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
            <Input
              placeholder="Description (optional)"
              value={logDesc}
              onChange={(e) => setLogDesc(e.target.value)}
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleLogCostSubmit} disabled={logSending || !logAmount}>
                Submit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowLogCost(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pools Table */}
      {pools.length > 0 && (
        <div>
          <p className="text-sm font-medium text-forest mb-2">Agent Token Pools</p>
          <div className="space-y-2">
            {pools.map((pool, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-gypsum/80 border border-forest/10"
              >
                <div>
                  <p className="text-sm font-medium text-forest">{pool.agentName || "Agent Token"}</p>
                  {pool.tokenAddress && (
                    <p className="text-xs text-forest-muted font-mono">{formatAddress(pool.tokenAddress)}</p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p>${pool.price?.toFixed(4) ?? "—"}</p>
                  <p className="text-forest-muted">MCap: ${pool.marketCap?.toLocaleString() ?? "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-forest" />
        </div>
      )}
    </div>
  );
}
