/**
 * Watchlist — favorite symbols, persisted per user.
 * Stored in user preferences.watchlist: string[]
 * GET /api/preferences returns preferences object
 * PUT /api/preferences updates them
 */
import { useEffect, useState } from "react";
import { Star, Plus, X, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { mockQuotes } from "@/lib/mockData";
import { toast } from "sonner";
import { num, money, signedPct } from "@/lib/format";

const ALL_SYMBOLS = ["CL", "BZ", "NG", "GC", "SI", "HG", "HO", "RB", "ZW", "ES"];

interface Quote {
  symbol: string;
  price: number;
  change24h: number;
  pctChange24h: number;
}

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadWatchlist();
    const t = setInterval(loadQuotes, 60_000);
    return () => clearInterval(t);
  }, []);

  async function loadWatchlist() {
    try {
      const r = await api.auth.getPreferences();
      const wl = (r.preferences as any)?.watchlist as string[] | undefined;
      setWatchlist(Array.isArray(wl) ? wl : ["CL", "GC", "NG"]);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  }

  async function loadQuotes() {
    try {
      const all = await api.market.quotes();
      const qm: Record<string, Quote> = {};
      for (const q of all) {
        qm[q.symbol] = {
          symbol: q.symbol,
          price: Number(q.price),
          change24h: Number((q as any).change24h ?? 0),
          pctChange24h: Number((q as any).pctChange24h ?? (q as any).changePct ?? 0),
        };
      }
      setQuotes(qm);
    } catch {
      const qm: Record<string, Quote> = {};
      for (const q of mockQuotes) {
        qm[q.symbol] = { symbol: q.symbol, price: q.price, change24h: q.change24h, pctChange24h: q.change24h };
      }
      setQuotes(qm);
    }
  }

  useEffect(() => { loadQuotes(); }, []);

  async function saveWatchlist(next: string[]) {
    try {
      const cur = await api.auth.getPreferences();
      await api.auth.updatePreferences({ ...(cur.preferences as any), watchlist: next });
      setWatchlist(next);
    } catch (err) {
      toast.error("Failed to update watchlist");
    }
  }

  function addSymbol(sym: string) {
    if (watchlist.includes(sym)) return;
    saveWatchlist([...watchlist, sym]);
    setAdding(false);
  }

  function removeSymbol(sym: string) {
    saveWatchlist(watchlist.filter((s) => s !== sym));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
            <Star className="w-7 h-7 text-amber-400 fill-amber-400" /> Watchlist
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{watchlist.length} symbols tracked. Click to trade.</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Symbol
        </button>
      </div>

      {/* Symbol picker */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Pick a symbol</span>
              <button onClick={() => setAdding(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {ALL_SYMBOLS.filter((s) => !watchlist.includes(s)).map((s) => (
                <button
                  key={s}
                  onClick={() => addSymbol(s)}
                  className="px-3 py-2 rounded-lg bg-card/40 border border-border/50 hover:border-primary/40 text-sm font-mono font-bold"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Watchlist */}
      {watchlist.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No symbols yet. Add one above to start tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {watchlist.map((sym) => {
            const q = quotes[sym];
            const isUp = q ? q.change24h >= 0 : false;
            const Icon = isUp ? TrendingUp : TrendingDown;
            return (
              <motion.div
                key={sym}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card rounded-xl p-4 relative group"
              >
                <button
                  onClick={() => removeSymbol(sym)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
                <Link href={`/dashboard/trade?symbol=${sym}`}>
                  <div className="cursor-pointer">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="font-display font-bold text-2xl">{sym}</span>
                      <Icon className={`w-4 h-4 ${isUp ? "text-emerald-400" : "text-red-400"}`} />
                    </div>
                    {q ? (
                      <>
                        <div className="text-2xl font-mono font-bold">${money(q.price).replace("$", "")}</div>
                        <div className={`text-sm font-mono font-semibold mt-1 ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                          {isUp ? "+" : ""}${num(q.change24h).toFixed(2)} ({signedPct(q.pctChange24h / 100, 2)})
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground mt-2">Loading...</div>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}