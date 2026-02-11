/**
 * Price Tracker — periodic price history & trend analysis for Mento assets
 *
 * Stores price snapshots in-memory (recent) and in the DB (persisted).
 * Provides trend analysis, change detection, and simple momentum-based predictions.
 *
 * Used by the Forex Trader agent's cron jobs and analysis skills.
 */

import { prisma } from "@/lib/db";
import { getOracleRate, getAllOracleRates, type OracleRate } from "./mento";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceSnapshot {
  pair: string;
  rate: number;
  inverse: number;
  timestamp: Date;
  source: string;
}

export interface PriceTrend {
  pair: string;
  currentRate: number;
  previousRate: number;
  change: number;         // absolute change
  changePercent: number;   // percentage change
  direction: "up" | "down" | "flat";
  period: string;          // e.g. "5m", "1h", "24h"
  snapshots: number;       // number of data points
}

export interface PricePrediction {
  pair: string;
  currentRate: number;
  predictedRate: number;
  predictedDirection: "up" | "down" | "flat";
  confidence: "low" | "medium" | "high";
  reasoning: string;
  timeframe: string;
}

// ─── In-Memory Price Cache ────────────────────────────────────────────────────
// Keeps last ~288 snapshots per pair (~24h at 5-minute intervals).
// This allows instant trend analysis without DB queries.

const MAX_SNAPSHOTS_PER_PAIR = 288;
const priceCache: Map<string, PriceSnapshot[]> = new Map();

function addToCache(snapshot: PriceSnapshot) {
  const existing = priceCache.get(snapshot.pair) || [];
  existing.push(snapshot);
  // Trim to max size
  if (existing.length > MAX_SNAPSHOTS_PER_PAIR) {
    existing.splice(0, existing.length - MAX_SNAPSHOTS_PER_PAIR);
  }
  priceCache.set(snapshot.pair, existing);
}

// ─── Snapshot Recording ───────────────────────────────────────────────────────

/**
 * Record a price snapshot for all Mento pairs.
 * Called by cron jobs (e.g. every 5 minutes).
 * Returns the recorded snapshots.
 */
export async function recordAllPriceSnapshots(): Promise<PriceSnapshot[]> {
  const rates = await getAllOracleRates();
  const snapshots: PriceSnapshot[] = [];

  for (const rate of rates) {
    const snapshot: PriceSnapshot = {
      pair: rate.pair,
      rate: rate.rate,
      inverse: rate.inverse,
      timestamp: new Date(),
      source: rate.source,
    };

    // Add to in-memory cache
    addToCache(snapshot);
    snapshots.push(snapshot);

    // Persist to DB (activity log for now — lightweight)
    await prisma.activityLog.create({
      data: {
        agentId: "system-price-tracker",
        type: "info",
        message: `Price: ${rate.pair} = ${rate.rate.toFixed(6)}`,
        metadata: JSON.stringify(snapshot),
      },
    }).catch(() => {
      // If "system-price-tracker" agent doesn't exist, store generically
    });
  }

  return snapshots;
}

/**
 * Record a single pair's price.
 */
export async function recordPriceSnapshot(stableSymbol: string): Promise<PriceSnapshot> {
  const rate = await getOracleRate(stableSymbol);
  const snapshot: PriceSnapshot = {
    pair: rate.pair,
    rate: rate.rate,
    inverse: rate.inverse,
    timestamp: new Date(),
    source: rate.source,
  };
  addToCache(snapshot);
  return snapshot;
}

// ─── Price History ────────────────────────────────────────────────────────────

/**
 * Get recent price history for a pair.
 * Returns from in-memory cache (fast).
 */
export function getPriceHistory(pair: string, limit?: number): PriceSnapshot[] {
  const history = priceCache.get(pair) || [];
  if (limit) return history.slice(-limit);
  return [...history];
}

/**
 * Get all tracked pairs and their latest prices.
 */
export function getLatestPrices(): Map<string, PriceSnapshot> {
  const latest = new Map<string, PriceSnapshot>();
  for (const [pair, snapshots] of priceCache) {
    if (snapshots.length > 0) {
      latest.set(pair, snapshots[snapshots.length - 1]);
    }
  }
  return latest;
}

// ─── Trend Analysis ───────────────────────────────────────────────────────────

/**
 * Analyze price trend for a pair over a given time period.
 */
export function analyzeTrend(pair: string, periodMinutes: number = 60): PriceTrend | null {
  const history = priceCache.get(pair);
  if (!history || history.length < 2) return null;

  const now = Date.now();
  const cutoff = now - periodMinutes * 60 * 1000;

  // Filter snapshots within the period
  const periodSnapshots = history.filter((s) => s.timestamp.getTime() >= cutoff);
  if (periodSnapshots.length < 2) {
    // Fall back to using the two most recent snapshots
    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    return buildTrend(pair, current, previous, 2, formatPeriod(periodMinutes));
  }

  const current = periodSnapshots[periodSnapshots.length - 1];
  const oldest = periodSnapshots[0];

  return buildTrend(pair, current, oldest, periodSnapshots.length, formatPeriod(periodMinutes));
}

function buildTrend(
  pair: string,
  current: PriceSnapshot,
  previous: PriceSnapshot,
  snapshotCount: number,
  period: string
): PriceTrend {
  const change = current.rate - previous.rate;
  const changePercent = previous.rate !== 0
    ? (change / previous.rate) * 100
    : 0;
  const direction: PriceTrend["direction"] =
    Math.abs(changePercent) < 0.01 ? "flat" : change > 0 ? "up" : "down";

  return {
    pair,
    currentRate: current.rate,
    previousRate: previous.rate,
    change,
    changePercent,
    direction,
    period,
    snapshots: snapshotCount,
  };
}

function formatPeriod(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

/**
 * Analyze trends for all tracked pairs.
 */
export function analyzeAllTrends(periodMinutes: number = 60): PriceTrend[] {
  const trends: PriceTrend[] = [];
  for (const pair of priceCache.keys()) {
    const trend = analyzeTrend(pair, periodMinutes);
    if (trend) trends.push(trend);
  }
  return trends;
}

// ─── Prediction (simple momentum-based) ───────────────────────────────────────

/**
 * Generate a simple momentum-based price prediction.
 *
 * Uses exponential moving average (EMA) crossover and rate of change.
 * This is NOT financial advice — it's a simple heuristic for the forex bot.
 */
export function predictPrice(pair: string): PricePrediction | null {
  const history = priceCache.get(pair);
  if (!history || history.length < 5) return null;

  const rates = history.map((s) => s.rate);
  const current = rates[rates.length - 1];

  // Short-term EMA (last 5 snapshots)
  const shortEma = calculateEMA(rates, Math.min(5, rates.length));
  // Long-term EMA (last 20 snapshots or all)
  const longEma = calculateEMA(rates, Math.min(20, rates.length));

  // Rate of change over last 5 snapshots
  const recentRates = rates.slice(-5);
  const roc = recentRates.length >= 2
    ? (recentRates[recentRates.length - 1] - recentRates[0]) / recentRates[0] * 100
    : 0;

  // Volatility (standard deviation of recent rates)
  const volatility = calculateStdDev(recentRates);
  const avgRate = recentRates.reduce((a, b) => a + b, 0) / recentRates.length;
  const volatilityPercent = (volatility / avgRate) * 100;

  // Prediction logic
  let predictedDirection: PricePrediction["predictedDirection"] = "flat";
  let confidence: PricePrediction["confidence"] = "low";
  let reasoning = "";

  // Bullish signals
  const bullishSignals: string[] = [];
  const bearishSignals: string[] = [];

  if (shortEma > longEma) bullishSignals.push("Short EMA above long EMA");
  else if (shortEma < longEma) bearishSignals.push("Short EMA below long EMA");

  if (roc > 0.5) bullishSignals.push(`Positive momentum (+${roc.toFixed(2)}%)`);
  else if (roc < -0.5) bearishSignals.push(`Negative momentum (${roc.toFixed(2)}%)`);

  if (current > longEma) bullishSignals.push("Price above long-term average");
  else if (current < longEma) bearishSignals.push("Price below long-term average");

  if (bullishSignals.length > bearishSignals.length) {
    predictedDirection = "up";
    reasoning = `Bullish: ${bullishSignals.join(", ")}`;
  } else if (bearishSignals.length > bullishSignals.length) {
    predictedDirection = "down";
    reasoning = `Bearish: ${bearishSignals.join(", ")}`;
  } else {
    predictedDirection = "flat";
    reasoning = "Mixed signals — no clear direction";
  }

  // Confidence based on signal strength and volatility
  const signalStrength = Math.abs(bullishSignals.length - bearishSignals.length);
  if (signalStrength >= 3 && volatilityPercent < 2) {
    confidence = "high";
  } else if (signalStrength >= 2) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // Predicted rate: current + extrapolated change
  const extrapolatedChange = roc / 100 * current;
  const predictedRate = current + extrapolatedChange;

  return {
    pair,
    currentRate: current,
    predictedRate,
    predictedDirection,
    confidence,
    reasoning,
    timeframe: "next 1h",
  };
}

function calculateEMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Generate predictions for all tracked pairs.
 */
export function predictAllPrices(): PricePrediction[] {
  const predictions: PricePrediction[] = [];
  for (const pair of priceCache.keys()) {
    const prediction = predictPrice(pair);
    if (prediction) predictions.push(prediction);
  }
  return predictions;
}

// ─── Alert Detection ──────────────────────────────────────────────────────────

export interface PriceAlert {
  pair: string;
  type: "significant_move" | "volatility_spike" | "ema_crossover";
  message: string;
  severity: "info" | "warning" | "critical";
  rate: number;
  changePercent: number;
}

/**
 * Check for significant price movements or alerts.
 * Called after recording snapshots.
 */
export function checkAlerts(thresholdPercent: number = 2): PriceAlert[] {
  const alerts: PriceAlert[] = [];

  for (const pair of priceCache.keys()) {
    const history = priceCache.get(pair);
    if (!history || history.length < 2) continue;

    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    const change = ((current.rate - previous.rate) / previous.rate) * 100;

    if (Math.abs(change) >= thresholdPercent) {
      const severity = Math.abs(change) >= 5 ? "critical" : Math.abs(change) >= 3 ? "warning" : "info";
      alerts.push({
        pair,
        type: "significant_move",
        message: `${pair} moved ${change > 0 ? "+" : ""}${change.toFixed(2)}% (${previous.rate.toFixed(4)} → ${current.rate.toFixed(4)})`,
        severity,
        rate: current.rate,
        changePercent: change,
      });
    }

    // Volatility spike check (last 5 vs previous 5)
    if (history.length >= 10) {
      const recent5 = history.slice(-5).map((s) => s.rate);
      const prev5 = history.slice(-10, -5).map((s) => s.rate);
      const recentVol = calculateStdDev(recent5);
      const prevVol = calculateStdDev(prev5);

      if (prevVol > 0 && recentVol / prevVol > 2) {
        alerts.push({
          pair,
          type: "volatility_spike",
          message: `${pair} volatility spiked ${(recentVol / prevVol).toFixed(1)}x in the last period`,
          severity: "warning",
          rate: current.rate,
          changePercent: change,
        });
      }
    }
  }

  return alerts;
}


