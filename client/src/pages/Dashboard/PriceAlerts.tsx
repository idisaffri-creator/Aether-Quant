/**
 * Price alerts UI — set alerts on symbol price thresholds.
 * Backend cron checks every minute and fires when threshold crossed.
 */
import { useEffect, useState } from "react";
import { Bell, Plus, X, Trash2, Loader2, TrendingUp, TrendingDown, ArrowLeftRight, Power } from "lucide-react";
import { usePageTitle } from "@/lib/usePageTitle";
import { Skeleton } from "@/components/Skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { mockAlerts } from "@/lib/mockData";

const SYMBOLS = ["CL", "BZ", "NG", "GC", "SI", "HG", "HO", "RB"];

interface Alert {
  id: string;
  symbol: string;
  condition: "above" | "below" | "crosses";
  threshold: number;
  currentPrice?: number;
  triggeredAt?: string;
  active: number;
  triggerOnce: number;
  notifyEmail: number;
  notifyDiscord: number;
}

export default function PriceAlerts() {
  usePageTitle("Price Alerts");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/alerts/price", { credentials: "include" });
      const d = await r.json();
      setAlerts(d.alerts?.length ? d.alerts : mockAlerts);
    } catch (err) {
      setAlerts(mockAlerts);
    } finally {
      setLoading(false);
    }
  }

  async function create(data: any) {
    try {
      const r = await fetch("/api/alerts/price", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.message);
      }
      toast.success("Alert created");
      setShowForm(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || "Failed to create alert");
    }
  }

  async function toggleActive(id: string, currentActive: number) {
    try {
      await fetch(`/api/alerts/price/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });
      await load();
    } catch (err) {
      toast.error("Failed to update");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this alert?")) return;
    try {
      await fetch(`/api/alerts/price/${id}`, { method: "DELETE", credentials: "include" });
      await load();
    } catch (err) {
      toast.error("Failed to delete");
    }
  }

  const activeCount = alerts.filter((a) => a.active === 1).length;
  const triggeredCount = alerts.filter((a) => a.triggeredAt).length;

  if (loading) {
    return <div className="max-w-4xl mx-auto space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary" /> Price Alerts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount} active · {triggeredCount} triggered all-time
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={alerts.length >= 50}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> New Alert
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-xl p-5"
          >
            <AlertForm onSubmit={create} onCancel={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {alerts.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No price alerts. Create one to get notified when a symbol hits your target.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const isTriggered = !!a.triggeredAt;
            const ConditionIcon = a.condition === "above" ? TrendingUp : a.condition === "below" ? TrendingDown : ArrowLeftRight;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`glass-card rounded-xl p-4 flex items-center gap-4 ${isTriggered ? "border-l-2 border-l-emerald-500" : ""}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <ConditionIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-lg">{a.symbol}</span>
                    <span className="text-sm font-mono text-muted-foreground">{a.condition}</span>
                    <span className="text-sm font-mono font-bold">${Number(a.threshold).toFixed(2)}</span>
                    {isTriggered && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400">
                        ✓ Triggered
                      </span>
                    )}
                    {a.active === 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-500/20 text-zinc-400">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Created {new Date(a.createdAt || Date.now()).toLocaleDateString()}
                    {a.triggeredAt && ` · fired ${new Date(a.triggeredAt).toLocaleString()}`}
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(a.id, a.active)}
                  className="p-2 hover:bg-card/60 rounded"
                  title={a.active ? "Disable" : "Enable"}
                >
                  <Power className={`w-4 h-4 ${a.active ? "text-emerald-400" : "text-muted-foreground"}`} />
                </button>
                <button onClick={() => remove(a.id)} className="p-2 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AlertForm({ onSubmit, onCancel }: { onSubmit: (d: any) => Promise<void>; onCancel: () => void }) {
  const [symbol, setSymbol] = useState("CL");
  const [condition, setCondition] = useState<"above" | "below" | "crosses">("above");
  const [threshold, setThreshold] = useState(80);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [triggerOnce, setTriggerOnce] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/market/quotes/${symbol}`).then(r => r.json()).then((d: any) => {
      if (d?.price) {
        setCurrentPrice(Number(d.price));
        setThreshold(Number((Number(d.price) * (condition === "below" ? 0.98 : 1.05)).toFixed(2)));
      }
    }).catch(() => {});
  }, [symbol]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSubmit({ symbol, condition, threshold, triggerOnce });
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">New Price Alert</h2>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Symbol</label>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono">
            {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Condition</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value as any)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm">
            <option value="above">Goes above</option>
            <option value="below">Goes below</option>
            <option value="crosses">Crosses</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Threshold ($)</label>
          <input type="number" step="0.01" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" />
          {currentPrice && <div className="text-[10px] text-muted-foreground mt-1">Current: ${currentPrice.toFixed(2)}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="triggerOnce" checked={triggerOnce} onChange={(e) => setTriggerOnce(e.target.checked)} />
        <label htmlFor="triggerOnce" className="text-xs">Fire only once (then disable)</label>
      </div>
      <button type="submit" disabled={saving} className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
        Create Alert
      </button>
    </form>
  );
}