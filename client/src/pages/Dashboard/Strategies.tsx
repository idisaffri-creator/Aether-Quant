/*
 * Strategies — real data from /api/strategies/custom + /api/backtest.
 * Create / Pause / Resume / Configure / Delete / Backtest actions.
 * Each strategy shows aggregated metrics from its most recent backtest.
 */
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { useAtom } from "jotai";
import { tokenAtom } from "@/store/auth";
import { api } from "@/lib/api";
import {
  Play, Pause, Plus, Trash2, BarChart3, TrendingUp, TrendingDown,
  Grid3x3, LineChart, Brain, X, Save, Zap, AlertCircle, Loader2,
  Power, GitBranch, Eye, Copy, CheckCircle2,
} from "lucide-react";
import StrategyOptimizer from "@/components/strategies/StrategyOptimizer";
import BacktestPanel from "@/components/strategies/BacktestPanel";
import MLPipeline from "@/components/strategies/MLPipeline";
import { Skeleton } from "@/components/Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface Strategy {
  id: string;
  name: string;
  description: string | null;
  symbol: string;
  conditions: any[];
  actions: any[];
  enabled: boolean;
  published: string;
  clones: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

interface Backtest {
  id: string;
  userId?: string;
  strategy: string;
  symbol: string;
  status: string;
  sharpeRatio: string | null;
  totalReturnPct: string | null;
  winRate: string | null;
  totalTrades: number | null;
  maxDrawdownPct: string | null;
  createdAt: string;
}

const SYMBOLS = ["CL", "BZ", "NG", "GC", "SI", "HG", "HO", "RB"];
const INDICATORS = [
  { value: "rsi", label: "RSI", defaultLookback: 14, defaultThreshold: 30, comparisonDefault: "lt", desc: "Relative Strength Index" },
  { value: "macd", label: "MACD", defaultLookback: 26, defaultThreshold: 0, comparisonDefault: "gt", desc: "Moving Average Convergence Divergence" },
  { value: "price_change", label: "Price Change %", defaultLookback: 5, defaultThreshold: 2, comparisonDefault: "gt", desc: "Percent change over N days" },
  { value: "volume_spike", label: "Volume Spike", defaultLookback: 20, defaultThreshold: 1.5, comparisonDefault: "gt", desc: "Volume vs 20d average multiple" },
  { value: "moving_average_cross", label: "MA Crossover", defaultLookback: 50, defaultThreshold: 0, comparisonDefault: "gt", desc: "Price vs 50-day MA" },
];

const tabs = [
  { id: "strategies", label: "My Strategies", icon: Grid3x3 },
  { id: "optimizer", label: "Optimizer", icon: TrendingUp },
  { id: "backtest", label: "Backtest", icon: LineChart },
  { id: "mlpipeline", label: "ML Pipeline", icon: Brain },
] as const;
type TabId = (typeof tabs)[number]["id"];

export default function Strategies() {
  usePageTitle("Strategies");
  const [token] = useAtom(tokenAtom);
  const [, setLocation] = useLocation();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [backtests, setBacktests] = useState<Backtest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("strategies");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Strategy | null>(null);
  const [runningBacktest, setRunningBacktest] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    load();
  }, [token]);

  async function load() {
    setLoading(true);
    try {
      const [strats, bts] = await Promise.all([
        api.strategies.listCustom().catch(() => ({ strategies: [] })),
        api.backtests.list().catch(() => ({ backtests: [] })),
      ]);
      setStrategies(strats.strategies || []);
      setBacktests(bts.backtests || []);
    } catch (err) {
      toast.error("Failed to load strategies");
    } finally {
      setLoading(false);
    }
  }

  async function toggleStrategy(s: Strategy) {
    try {
      await api.strategies.updateCustom(s.id, { enabled: !s.enabled });
      setStrategies((prev) => prev.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)));
      toast.success(s.enabled ? `${s.name} paused` : `${s.name} running`);
    } catch (err) {
      toast.error("Update failed");
    }
  }

  async function deleteStrategy(s: Strategy) {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    try {
      await api.strategies.deleteCustom(s.id);
      setStrategies((prev) => prev.filter((x) => x.id !== s.id));
      toast.success("Strategy deleted");
    } catch (err) {
      toast.error("Delete failed");
    }
  }

  async function runQuickBacktest(s: Strategy) {
    setRunningBacktest(s.id);
    try {
      // Find latest backtest for this strategy+symbol
      const latest = backtests
        .filter((b) => b.strategy === s.name && b.symbol === s.symbol)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      const end = new Date();
      end.setDate(end.getDate() - 1);

      await api.backtests.run({
        strategy: s.name,
        symbol: s.symbol,
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
        initialBalance: latest ? 100000 : 100000,
        params: s.conditions?.[0] ? {
          lookback: s.conditions[0].lookback || 20,
          threshold: s.conditions[0].threshold || 0.05,
          holdDays: 5,
        } : undefined,
      });
      toast.success("Backtest queued", { description: "Check the Backtest tab in a few seconds." });
      setActiveTab("backtest");
    } catch (err: any) {
      toast.error(err?.message || "Backtest failed");
    } finally {
      setRunningBacktest(null);
    }
  }

  // Get best backtest metrics for a given strategy+symbol
  function metricsFor(strategy: Strategy): Backtest | null {
    const candidates = backtests
      .filter((b) => b.strategy === strategy.name && b.symbol === strategy.symbol && b.status === "completed")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return candidates[0] || null;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold tracking-tight">Strategies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build, backtest, and deploy algorithmic strategies on energy commodities.
            <span className="ml-2 text-foreground font-mono">
              {strategies.filter((s) => s.enabled).length}/{strategies.length} running
            </span>
          </p>
        </div>
        {activeTab === "strategies" && (
          <button
            onClick={() => { setEditing(null); setShowCreate(true); }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Strategy
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-accent/30 rounded-lg p-1 w-fit overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "strategies" && (
        <>
          {strategies.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center space-y-3">
              <GitBranch className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-display font-semibold">No strategies yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Build your first strategy. Define entry conditions (RSI &lt; 30, MACD crossover, etc.) and what to do when they fire.
              </p>
              <button
                onClick={() => { setEditing(null); setShowCreate(true); }}
                className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create your first strategy
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {strategies.map((s) => (
                <StrategyCard
                  key={s.id}
                  strategy={s}
                  metrics={metricsFor(s)}
                  onToggle={() => toggleStrategy(s)}
                  onEdit={() => { setEditing(s); setShowCreate(true); }}
                  onDelete={() => deleteStrategy(s)}
                  onBacktest={() => runQuickBacktest(s)}
                  onViewBacktests={() => setActiveTab("backtest")}
                  isRunning={runningBacktest === s.id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "optimizer" && <StrategyOptimizer />}
      {activeTab === "backtest" && <BacktestPanel />}
      {activeTab === "mlpipeline" && <MLPipeline />}

      {/* Create / Edit modal */}
      <AnimatePresence>
        {showCreate && (
          <StrategyFormModal
            initial={editing}
            onClose={() => { setShowCreate(false); setEditing(null); }}
            onSaved={async () => {
              setShowCreate(false);
              setEditing(null);
              await load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Strategy card ───────────────────────────────────────────────── */

function StrategyCard({ strategy, metrics, onToggle, onEdit, onDelete, onBacktest, onViewBacktests, isRunning }: {
  strategy: Strategy;
  metrics: Backtest | null;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onBacktest: () => void;
  onViewBacktests: () => void;
  isRunning: boolean;
}) {
  const condCount = strategy.conditions?.length || 0;
  const actCount = strategy.actions?.length || 0;
  const isActive = strategy.enabled;
  const hasMetrics = metrics && metrics.sharpeRatio;

  return (
    <motion.div
      layout
      className={`glass-card rounded-xl p-5 space-y-4 border-l-2 ${
        isActive ? "border-l-emerald-500" : "border-l-zinc-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-base truncate">{strategy.name}</h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {strategy.symbol}
            </span>
            {strategy.published === "true" && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                📢 published
              </span>
            )}
          </div>
          {strategy.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{strategy.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground font-mono">
            <span>{condCount} condition{condCount !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{actCount} action{actCount !== 1 ? "s" : ""}</span>
            {strategy.clones > 0 && (<><span>·</span><span>{strategy.clones} clone{strategy.clones !== 1 ? "s" : ""}</span></>)}
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
            isActive ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/30"
          }`}
          title={isActive ? "Pause strategy" : "Resume strategy"}
        >
          <Power className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics */}
      {hasMetrics ? (
        <div className="grid grid-cols-4 gap-2">
          <Metric label="Sharpe" value={Number(metrics.sharpeRatio).toFixed(2)} positive={Number(metrics.sharpeRatio) > 1} />
          <Metric label="Win %" value={`${(Number(metrics.winRate || 0) * 100).toFixed(0)}%`} positive={Number(metrics.winRate) > 0.5} />
          <Metric label="Return" value={`${(Number(metrics.totalReturnPct) * 100).toFixed(1)}%`} positive={Number(metrics.totalReturnPct) > 0} prefix={Number(metrics.totalReturnPct) > 0 ? "+" : ""} />
          <Metric label="Trades" value={String(metrics.totalTrades || 0)} />
        </div>
      ) : (
        <div className="text-xs text-muted-foreground bg-accent/30 rounded-lg p-3 text-center">
          <AlertCircle className="w-3.5 h-3.5 inline mr-1.5" />
          No backtest yet. Click "Backtest" to see how this would have performed.
        </div>
      )}

      {/* Conditions preview */}
      {condCount > 0 && (
        <div className="text-[10px] bg-card/30 rounded-lg p-2 font-mono space-y-0.5">
          {strategy.conditions.slice(0, 2).map((c, i) => {
            const ind = INDICATORS.find((x) => x.value === c.indicator);
            return (
              <div key={i} className="text-muted-foreground">
                IF {ind?.label || c.indicator} {c.comparison === "gt" ? ">" : "<"} {c.threshold}
                {c.lookback ? ` (${c.lookback}d)` : ""}
              </div>
            );
          })}
          {condCount > 2 && <div className="text-muted-foreground/60">+{condCount - 2} more…</div>}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <button
          onClick={onBacktest}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
        >
          {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart3 className="w-3 h-3" />}
          {isRunning ? "Running..." : "Backtest"}
        </button>
        <button
          onClick={onViewBacktests}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          title="View all backtests"
        >
          <Eye className="w-3 h-3" />
          Results
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          Configure
        </button>
        <button
          onClick={onDelete}
          className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Status footer */}
      <div className="flex items-center gap-1.5 text-[10px]">
        {isActive ? (
          <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-emerald-400 font-mono">Running — auto-executes on real-time signals</span></>
        ) : (
          <><Pause className="w-3 h-3 text-muted-foreground" /><span className="text-muted-foreground font-mono">Paused</span></>
        )}
      </div>
    </motion.div>
  );
}

function Metric({ label, value, positive, prefix = "" }: { label: string; value: string; positive?: boolean; prefix?: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-accent/30">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-mono font-bold mt-1 ${positive === true ? "text-emerald-400" : positive === false ? "text-red-400" : "text-foreground"}`}>
        {prefix}{value}
      </div>
    </div>
  );
}

/* ─── Create / Edit modal ─────────────────────────────────────────── */

function StrategyFormModal({ initial, onClose, onSaved }: { initial: Strategy | null; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [symbol, setSymbol] = useState(initial?.symbol || "CL");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [conditions, setConditions] = useState<any[]>(initial?.conditions?.length ? initial.conditions : [
    { indicator: "rsi", threshold: 30, comparison: "lt", lookback: 14 },
  ]);
  const [actions, setActions] = useState<any[]>(initial?.actions?.length ? initial.actions : [
    { type: "buy", quantity: 10, orderType: "market" },
  ]);
  const [saving, setSaving] = useState(false);

  function updateCondition(idx: number, field: string, value: any) {
    setConditions((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }
  function addCondition() {
    setConditions((prev) => [...prev, { indicator: "rsi", threshold: 30, comparison: "lt", lookback: 14 }]);
  }
  function removeCondition(idx: number) {
    setConditions((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateAction(idx: number, field: string, value: any) {
    setActions((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  }
  function addAction() {
    setActions((prev) => [...prev, { type: "buy", quantity: 10, orderType: "market" }]);
  }
  function removeAction(idx: number) {
    setActions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name required"); return; }
    if (conditions.length === 0) { toast.error("Add at least one condition"); return; }
    if (actions.length === 0) { toast.error("Add at least one action"); return; }
    setSaving(true);
    try {
      if (initial) {
        await api.strategies.updateCustom(initial.id, { name, description, symbol, conditions, actions, enabled });
        toast.success(`${name} updated`);
      } else {
        await api.strategies.createCustom({ name, description, symbol, conditions, actions, enabled });
        toast.success(`${name} created`);
      }
      await onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, scale: 0.97 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={save}>
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
            <div>
              <h2 className="text-lg font-display font-bold">
                {initial ? `Edit ${initial.name}` : "New Strategy"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define entry conditions and the order to submit when they fire.
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-accent">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Basics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. WTI Mean Reversion"
                  className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Symbol *</label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono"
                >
                  {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What does this strategy do?"
                className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <label htmlFor="enabled" className="text-xs">
                {enabled ? "Enabled (auto-execute on real-time signals)" : "Disabled (paused — won't place orders)"}
              </label>
            </div>

            {/* Conditions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Entry Conditions
                </label>
                <button type="button" onClick={addCondition} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {conditions.map((c, i) => {
                  const ind = INDICATORS.find((x) => x.value === c.indicator) || INDICATORS[0];
                  return (
                    <div key={i} className="flex items-center gap-2 bg-accent/30 rounded-lg p-2">
                      <span className="text-xs text-muted-foreground font-mono w-6">{i + 1}.</span>
                      <select
                        value={c.indicator}
                        onChange={(e) => {
                          const newInd = INDICATORS.find((x) => x.value === e.target.value) || INDICATORS[0];
                          updateCondition(i, "indicator", e.target.value);
                          updateCondition(i, "threshold", newInd.defaultThreshold);
                          updateCondition(i, "lookback", newInd.defaultLookback);
                        }}
                        className="bg-background border border-border rounded px-2 py-1.5 text-xs flex-shrink-0"
                      >
                        {INDICATORS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                      </select>
                      <select
                        value={c.comparison}
                        onChange={(e) => updateCondition(i, "comparison", e.target.value)}
                        className="bg-background border border-border rounded px-2 py-1.5 text-xs font-mono"
                      >
                        <option value="lt">&lt;</option>
                        <option value="gt">&gt;</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={c.threshold}
                        onChange={(e) => updateCondition(i, "threshold", Number(e.target.value))}
                        className="bg-background border border-border rounded px-2 py-1.5 text-xs font-mono w-20"
                      />
                      <input
                        type="number"
                        value={c.lookback}
                        onChange={(e) => updateCondition(i, "lookback", Number(e.target.value))}
                        placeholder="period"
                        className="bg-background border border-border rounded px-2 py-1.5 text-xs font-mono w-16"
                      />
                      <span className="text-[10px] text-muted-foreground flex-1 truncate" title={ind.desc}>{ind.desc}</span>
                      {conditions.length > 1 && (
                        <button type="button" onClick={() => removeCondition(i)} className="text-muted-foreground hover:text-red-400 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Actions
                </label>
                <button type="button" onClick={addAction} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {actions.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-accent/30 rounded-lg p-2">
                    <span className="text-xs text-muted-foreground font-mono w-6">{i + 1}.</span>
                    <select
                      value={a.type}
                      onChange={(e) => updateAction(i, "type", e.target.value)}
                      className={`bg-background border border-border rounded px-2 py-1.5 text-xs font-mono font-bold ${
                        a.type === "buy" ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      <option value="buy">BUY</option>
                      <option value="sell">SELL</option>
                    </select>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={a.quantity}
                      onChange={(e) => updateAction(i, "quantity", Number(e.target.value))}
                      className="bg-background border border-border rounded px-2 py-1.5 text-xs font-mono w-20"
                      placeholder="qty"
                    />
                    <span className="text-xs text-muted-foreground font-mono">units of {symbol}</span>
                    <select
                      value={a.orderType}
                      onChange={(e) => updateAction(i, "orderType", e.target.value)}
                      className="bg-background border border-border rounded px-2 py-1.5 text-xs"
                    >
                      <option value="market">Market</option>
                      <option value="limit">Limit</option>
                    </select>
                    {actions.length > 1 && (
                      <button type="button" onClick={() => removeAction(i)} className="ml-auto text-muted-foreground hover:text-red-400 p-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-accent/20 rounded-lg p-3 text-xs text-muted-foreground">
              <Zap className="w-3.5 h-3.5 inline mr-1.5 text-primary" />
              When all conditions are true on a real-time tick, the system submits the action as a paper order.
              Risk checks (max position, daily loss, kill switch) are enforced by Hawk before every order.
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 p-5 border-t border-border sticky bottom-0 bg-card">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-accent/50 text-sm font-semibold hover:bg-accent">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="ml-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {initial ? "Save Changes" : "Create Strategy"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}