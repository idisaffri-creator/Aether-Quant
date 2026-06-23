/*
 * Strategy Comparison — compare multiple backtests side by side.
 */
import { useState, useEffect } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { motion } from "framer-motion";
import { GitCompare, Trophy, TrendingUp, TrendingDown, Target, Shield, Hash, Calendar, DollarSign, CheckCircle2, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { mockBacktests } from "@/lib/mockData";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface BacktestSummary {
  id: string;
  strategy: string;
  symbol: string;
  startDate: string;
  endDate: string;
  initialBalance: number;
  finalEquity: number | null;
  totalReturn: number | null;
  totalReturnPct: number | null;
  totalTrades: number | null;
  status: string;
  createdAt: string;
}

interface ComparisonResult {
  count: number;
  backtests: any[];
  rankings: Record<string, number>;
  best: { id: string; score: number; reason: string };
}

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316"];

export default function Comparison() {
  usePageTitle("Compare Backtests");
  const [history, setHistory] = useState<BacktestSummary[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    api.backtest.list(20).then((r) => {
      setHistory(r.backtests?.length ? r.backtests : mockBacktests as any);
      setLoading(false);
    }).catch(() => { setHistory(mockBacktests as any); setLoading(false); });
  }, []);

  function toggleSelect(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 5) {
        toast.error("Maximum 5 backtests to compare");
        return prev;
      }
      return [...prev, id];
    });
  }

  async function runComparison() {
    if (selected.length < 2) {
      toast.error("Select at least 2 backtests");
      return;
    }
    setComparing(true);
    try {
      const r = await fetch("/api/comparison/compare", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected }),
      }).then(r => r.json());
      setComparison(r);
    } catch (err) {
      toast.error("Comparison failed");
    } finally {
      setComparing(false);
    }
  }

  function resetComparison() {
    setComparison(null);
    setSelected([]);
  }

  // Build normalized equity curves
  const equityChartData = useMemo(() => {
    if (!comparison) return [];
    const allPoints: { [ts: string]: any } = {};
    for (const bt of comparison.backtests) {
      const curve = bt.result?.equityCurve || [];
      for (const p of curve) {
        const date = new Date(p.timestamp).toLocaleDateString();
        if (!allPoints[date]) allPoints[date] = { date };
        // Normalize to % return
        const ret = ((p.equity - bt.initialBalance) / bt.initialBalance) * 100;
        allPoints[date][`${bt.id}_pct`] = ret;
      }
    }
    return Object.values(allPoints).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [comparison]);

  const bestId = comparison?.best?.id;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
            <GitCompare className="w-7 h-7 text-primary" /> Compare Backtests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Select 2-5 backtests to compare side-by-side. Picks the best using a composite score.</p>
        </div>
        {comparison ? (
          <button onClick={resetComparison} className="px-4 py-2 bg-card border border-border rounded-lg text-sm hover:border-primary/50 flex items-center gap-2">
            <X className="w-4 h-4" /> New comparison
          </button>
        ) : (
          <button onClick={runComparison} disabled={selected.length < 2 || comparing} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
            {comparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
            Compare {selected.length} backtest{selected.length !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {!comparison ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {history.length === 0 ? (
            <div className="col-span-full glass-card rounded-xl p-12 text-center">
              <GitCompare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-display font-semibold mb-1">No backtests yet</h3>
              <p className="text-sm text-muted-foreground">Run a few backtests first, then come back here to compare them.</p>
            </div>
          ) : history.map((bt) => {
            const isSelected = selected.includes(bt.id);
            return (
              <button
                key={bt.id}
                onClick={() => toggleSelect(bt.id)}
                className={`glass-card rounded-xl p-4 text-left transition-all ${
                  isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/30"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-display font-semibold text-sm">{bt.strategy}</div>
                    <div className="text-xs text-muted-foreground">{bt.symbol} · {new Date(bt.startDate).toLocaleDateString()} → {new Date(bt.endDate).toLocaleDateString()}</div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={bt.totalReturn != null && bt.totalReturn >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {bt.totalReturn != null ? `${(bt.totalReturnPct! * 100).toFixed(2)}%` : "—"}
                  </span>
                  <span className="text-muted-foreground">{bt.totalTrades ?? 0} trades</span>
                  <span className="text-muted-foreground ml-auto">{new Date(bt.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Best pick banner */}
          {comparison.best && (
            <div className="glass-card rounded-xl p-5 border-2 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <Trophy className="w-6 h-6 text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-1">Best backtest</div>
                  <div className="text-lg font-display font-bold">
                    {comparison.backtests.find((b: any) => b.id === bestId)?.strategy} · {comparison.backtests.find((b: any) => b.id === bestId)?.symbol}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">{comparison.best.reason}</div>
                </div>
                <div className="text-3xl font-display font-bold text-amber-400">{comparison.best.score.toFixed(2)}</div>
              </div>
            </div>
          )}

          {/* Side-by-side metrics */}
          <div className="glass-card rounded-xl p-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 text-left">Strategy</th>
                  <th className="py-2 text-left">Symbol</th>
                  <th className="py-2 text-right">Final $</th>
                  <th className="py-2 text-right">Return %</th>
                  <th className="py-2 text-right">Sharpe</th>
                  <th className="py-2 text-right">Max DD %</th>
                  <th className="py-2 text-right">Win Rate</th>
                  <th className="py-2 text-right">Trades</th>
                  <th className="py-2 text-right">Rank</th>
                </tr>
              </thead>
              <tbody>
                {comparison.backtests.map((bt: any) => {
                  const isBest = bt.id === bestId;
                  return (
                    <tr key={bt.id} className={`border-b border-border/50 ${isBest ? "bg-amber-500/5" : ""}`}>
                      <td className="py-2.5">
                        <div className="font-medium flex items-center gap-2">
                          {isBest && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                          {bt.strategy}
                        </div>
                      </td>
                      <td className="py-2.5">{bt.symbol}</td>
                      <td className="py-2.5 text-right font-mono">${(bt.finalEquity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className={`py-2.5 text-right font-mono font-semibold ${(bt.totalReturnPct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {((bt.totalReturnPct ?? 0) * 100).toFixed(2)}%
                      </td>
                      <td className="py-2.5 text-right font-mono">{(bt.sharpeRatio ?? 0).toFixed(2)}</td>
                      <td className="py-2.5 text-right font-mono text-red-400">{((bt.maxDrawdownPct ?? 0) * 100).toFixed(2)}%</td>
                      <td className="py-2.5 text-right font-mono">{((bt.winRate ?? 0) * 100).toFixed(1)}%</td>
                      <td className="py-2.5 text-right font-mono">{bt.totalTrades ?? 0}</td>
                      <td className="py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-accent/50 text-xs font-mono">
                          #{comparison.rankings[bt.id]?.toFixed(1) || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Equity curve comparison */}
          {equityChartData.length > 0 && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-display font-semibold mb-3">Equity curve (% return)</h3>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={equityChartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} minTickGap={50} />
                  <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickFormatter={v => `${v.toFixed(1)}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0a0a0e", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#a3a3a3" }}
                    formatter={(v: number) => `${v.toFixed(2)}%`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {comparison.backtests.map((bt: any, i: number) => (
                    <Line
                      key={bt.id}
                      type="monotone"
                      dataKey={`${bt.id}_pct`}
                      name={`${bt.strategy} ${bt.symbol}`}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={bt.id === bestId ? 3 : 2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// Helper: useMemo
import { useMemo } from "react";
