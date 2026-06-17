/*
 * Strategy Marketplace — browse, publish, clone public strategies.
 */
import { useState, useEffect } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { motion } from "framer-motion";
import { Store, Search, Copy, Star, Upload, TrendingUp, Filter, Loader2, Globe, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatDistanceToNow } from "@/lib/dateUtils";

const SYMBOLS = ["WTI", "BRENT", "NGAS", "GOLD", "SILVER", "COPPER", "HEATOIL", "GASOL"];

export default function Marketplace() {
  usePageTitle("Strategy Marketplace");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [symbol, setSymbol] = useState<string>("");
  const [myCustom, setMyCustom] = useState<any[]>([]);
  const [cloning, setCloning] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (symbol) params.append("symbol", symbol);
      const [r1, r2] = await Promise.all([
        fetch(`/api/strategies/marketplace?${params}`, { credentials: "include" }).then(r => r.json()),
        api.strategies.listCustom(),
      ]);
      setItems(r1.strategies || []);
      setMyCustom(r2.strategies || []);
    } catch (err) {
      toast.error("Failed to load marketplace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [symbol]);

  async function cloneStrategy(id: string) {
    setCloning(id);
    try {
      const r = await fetch(`/api/strategies/custom/${id}/clone`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then(r => r.json());
      if (r.id) {
        toast.success("Strategy cloned to your account!");
        load();
      } else {
        toast.error(r.message || "Clone failed");
      }
    } catch (err) {
      toast.error("Clone failed");
    } finally {
      setCloning(null);
    }
  }

  async function publishStrategy(id: string) {
    try {
      const r = await fetch(`/api/strategies/custom/${id}/publish`, {
        method: "POST",
        credentials: "include",
      }).then(r => r.json());
      toast.success(r.message || "Published!");
      load();
    } catch {
      toast.error("Publish failed");
    }
  }

  async function unpublishStrategy(id: string) {
    try {
      const r = await fetch(`/api/strategies/custom/${id}/unpublish`, {
        method: "POST",
        credentials: "include",
      }).then(r => r.json());
      toast.success(r.message || "Unpublished");
      load();
    } catch {
      toast.error("Unpublish failed");
    }
  }

  async function rateStrategy(id: string, rating: number) {
    try {
      await fetch(`/api/strategies/custom/${id}/rate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      toast.success(`Rated ${"⭐".repeat(rating)}`);
      load();
    } catch {
      toast.error("Rating failed");
    }
  }

  const published = myCustom.filter(s => s.published === "true");
  const unpublished = myCustom.filter(s => s.published === "false");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
          <Store className="w-7 h-7 text-primary" /> Strategy Marketplace
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Browse, clone, and publish trading strategies. {items.length} strategies available.</p>
      </div>

      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") load(); }}
              placeholder="Search strategies by name or description…"
              className="w-full bg-card border border-border rounded-lg pl-10 pr-3 py-2 text-sm"
            />
            {search && (
              <button onClick={() => { setSearch(""); load(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent/50">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select value={symbol} onChange={e => setSymbol(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
            <option value="">All symbols</option>
            {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No published strategies match your search yet. Publish one of your own!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(s => (
              <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-sm">{s.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description || "No description"}</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/50 text-muted-foreground whitespace-nowrap">{s.symbol}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> {s.clones || 0} clones</span>
                  <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {s.rating || 0} pts</span>
                  <span className="ml-auto">{s.createdAt ? formatDistanceToNow(new Date(s.createdAt)) : ""}</span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => rateStrategy(s.id, n)} className="p-0.5 hover:scale-110 transition-transform">
                        <Star className={`w-3.5 h-3.5 ${n <= Math.min(5, Math.floor((s.rating || 0) / Math.max(1, s.clones || 1))) ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => cloneStrategy(s.id)}
                    disabled={cloning === s.id}
                    className="ml-auto px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {cloning === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                    Clone
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-display font-semibold mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4" /> Your strategies
          {unpublished.length > 0 && <span className="text-xs text-muted-foreground">({unpublished.length} unpublished)</span>}
        </h3>
        {myCustom.length === 0 ? (
          <p className="text-sm text-muted-foreground">No custom strategies yet. Create one in the Strategy Builder.</p>
        ) : (
          <div className="space-y-2">
            {[...published, ...unpublished].map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-card/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.symbol} · {s.conditions?.length || 0} condition(s) · {s.clones || 0} clones · {s.published === "true" ? "🟢 published" : "⚪ draft"}
                  </div>
                </div>
                {s.published === "true" ? (
                  <button onClick={() => unpublishStrategy(s.id)} className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs hover:border-red-500/50">
                    Unpublish
                  </button>
                ) : (
                  <button onClick={() => publishStrategy(s.id)} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/30 rounded-lg text-xs hover:bg-primary/20 flex items-center gap-1.5">
                    <Upload className="w-3 h-3" /> Publish
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
