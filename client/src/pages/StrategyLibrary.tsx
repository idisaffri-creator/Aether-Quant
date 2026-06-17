/*
 * Strategy library — template gallery + custom strategies.
 * Users can clone a template to create a custom strategy.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Copy, Trash2, Power, PowerOff, TrendingUp, TrendingDown,
  BarChart3, Volume2, ArrowRightLeft, Zap, BookOpen, Loader2, X, Check,
} from "lucide-react";
import { api } from "@/lib/api";
import { usePageTitle } from "@/lib/usePageTitle";
import { toast } from "sonner";

const CATEGORY_ICONS: Record<string, any> = {
  trend: TrendingUp, mean_reversion: BarChart3, momentum: Zap, volume: Volume2, volatility: ArrowRightLeft,
};
const RISK_COLORS: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-500/10",
  medium: "text-amber-400 bg-amber-500/10",
  high: "text-red-400 bg-red-500/10",
};

export default function StrategyLibraryPage() {
  usePageTitle("Strategy Library");
  const [tab, setTab] = useState<"templates" | "custom">("templates");
  const [templates, setTemplates] = useState<any[]>([]);
  const [custom, setCustom] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloneOf, setCloneOf] = useState<any | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [cloneSymbol, setCloneSymbol] = useState("WTI");

  useEffect(() => {
    Promise.all([
      api.strategies.listCustom().catch(() => ({ strategies: [] })),
      fetch("/api/strategies/templates", { credentials: "include" })
        .then(r => r.json())
        .catch(() => ({ templates: [] })),
    ]).then(([c, t]) => {
      setCustom(c.strategies || []);
      setTemplates(t.templates || []);
      setLoading(false);
    });
  }, []);

  async function cloneTemplate(t: any) {
    setCloneOf(t);
    setCloneName(t.name);
    setCloneSymbol(t.symbol);
  }

  async function confirmClone() {
    if (!cloneOf) return;
    try {
      const r = await fetch(`/api/strategies/templates/${cloneOf.id}/clone`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cloneName, symbol: cloneSymbol }),
      });
      if (!r.ok) throw new Error("Clone failed");
      toast.success(`Cloned "${cloneName}" — enable it in your custom strategies`);
      setCloneOf(null);
      const c = await api.strategies.listCustom();
      setCustom(c.strategies || []);
      setTab("custom");
    } catch (err) {
      toast.error("Failed to clone template");
    }
  }

  async function toggleEnabled(s: any) {
    try {
      await api.strategies.updateCustom(s.id, { enabled: !s.enabled });
      setCustom(prev => prev.map(x => x.id === s.id ? { ...x, enabled: !x.enabled } : x));
      toast.success(s.enabled ? "Disabled" : "Enabled");
    } catch {
      toast.error("Failed to update");
    }
  }

  async function deleteStrategy(s: any) {
    if (!confirm(`Delete "${s.name}"?`)) return;
    try {
      await api.strategies.deleteCustom(s.id);
      setCustom(prev => prev.filter(x => x.id !== s.id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Strategy Library</h1>
        <p className="text-sm text-muted-foreground mt-1">Pre-built strategy templates and your custom strategies.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[
          { v: "templates", label: "Templates", count: templates.length },
          { v: "custom", label: "Your strategies", count: custom.length },
        ].map(t => (
          <button
            key={t.v}
            onClick={() => setTab(t.v as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.v
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} <span className="ml-1 text-xs text-muted-foreground">({t.count})</span>
          </button>
        ))}
      </div>

      {tab === "templates" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => {
            const Icon = CATEGORY_ICONS[t.category] || Sparkles;
            return (
              <div key={t.id} className="glass-card rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${RISK_COLORS[t.riskLevel]}`}>
                    {t.riskLevel} risk
                  </span>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-sm">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-accent/50 text-muted-foreground">{t.symbol}</span>
                  <span className="px-2 py-0.5 rounded bg-accent/50 text-muted-foreground">{t.category.replace("_", " ")}</span>
                  <span className="px-2 py-0.5 rounded bg-accent/50 text-muted-foreground">hold: {t.expectedHoldTime}</span>
                </div>
                {t.backtestHint && (
                  <p className="text-[11px] text-muted-foreground italic">💡 {t.backtestHint}</p>
                )}
                <button
                  onClick={() => cloneTemplate(t)}
                  className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Clone to my strategies
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "custom" && (
        <div className="space-y-3">
          {custom.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-display font-semibold mb-1">No custom strategies</h3>
              <p className="text-sm text-muted-foreground">Clone a template above or build your own with the strategy builder.</p>
            </div>
          ) : (
            custom.map(s => (
              <div key={s.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-sm truncate">{s.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground">{s.symbol}</span>
                    {s.enabled ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">enabled</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400">disabled</span>
                    )}
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground mt-1 truncate">{s.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {s.conditions?.length || 0} condition(s) · {s.actions?.length || 0} action(s)
                  </p>
                </div>
                <button
                  onClick={() => toggleEnabled(s)}
                  className="p-2 rounded-lg hover:bg-accent/50"
                  title={s.enabled ? "Disable" : "Enable"}
                >
                  {s.enabled ? <Power className="w-4 h-4 text-emerald-400" /> : <PowerOff className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button
                  onClick={() => deleteStrategy(s)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <AnimatePresence>
        {cloneOf && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setCloneOf(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card rounded-2xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-display font-bold">Clone template</h2>
                  <p className="text-sm text-muted-foreground">{cloneOf.name}</p>
                </div>
                <button onClick={() => setCloneOf(null)} className="p-1 rounded hover:bg-accent/50">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Strategy name</label>
                  <input
                    value={cloneName}
                    onChange={e => setCloneName(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Symbol</label>
                  <select
                    value={cloneSymbol}
                    onChange={e => setCloneSymbol(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm"
                  >
                    {["WTI", "BRENT", "NGAS", "GOLD", "SILVER", "COPPER", "HEATOIL", "GASOL"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={confirmClone}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Clone
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
