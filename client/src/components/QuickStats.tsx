/**
 * Quick stats bar — shown in nav when authenticated.
 * Fetches portfolio value + 24h P&L from /api/portfolio/analytics.
 * Updates every 30s.
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, Loader2, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { num, money, signedPct } from "@/lib/format";

interface Stats {
  equity: number;
  totalPnlPct: number;
  totalPnl: number;
  paperBalance: number;
}

export function QuickStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/portfolio/analytics", { credentials: "include" });
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setStats(d);
      } catch {
        // silently ignore — quick stats are decorative
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (loading) {
    return (
      <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const pnlPositive = num(stats.totalPnl) >= 0;
  const PnlIcon = pnlPositive ? TrendingUp : TrendingDown;

  return (
    <Link href="/dashboard">
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-card/40 border border-border/50 hover:border-primary/40 transition-colors cursor-pointer"
        title="Open dashboard"
      >
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Equity</span>
          <span className="text-sm font-mono font-bold">{money(stats.equity, 0)}</span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-mono font-semibold ${pnlPositive ? "text-emerald-400" : "text-red-400"}`}>
          <PnlIcon className="w-3 h-3" />
          {signedPct(stats.totalPnlPct, 2)}
        </div>
      </motion.div>
    </Link>
  );
}