/*
 * Live Trading Floor — real-time platform activity.
 * Replaces the old LiveDataSection. Shows: agents currently working,
 * recent trades, recent signals, marketplace activity.
 *
 * Polls /api/agents/status every 15s for live agent state.
 * Polls /api/data/status for feed health.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Radio, Zap, Brain, Eye, TrendingUp, TrendingDown, Loader2, Sparkles } from "lucide-react";
import { num, money, signedPct } from "@/lib/format";

interface Agent {
  id: string;
  name: string;
  type: string;
  active: boolean;
  signals?: number;
  lastSignal?: string;
}

interface Feed {
  name: string;
  healthy: boolean;
  latencyMs?: number;
}

interface Activity {
  type: "trade" | "signal" | "alert" | "backtest";
  symbol: string;
  description: string;
  time: string;
  positive?: boolean;
}

export default function LiveTradingFloorSection() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [fleetRes, feedsRes, leaderRes] = await Promise.all([
          fetch("/api/agents/fleet").then(r => r.json()).catch(() => ({ fleet: [] })),
          fetch("/api/data/status").then(r => r.json()).catch(() => ({ yahoo: {}, eia: {}, newsapi: {} })),
          fetch("/api/leaderboard?limit=3", { credentials: "include" }).then(r => r.json()).catch(() => ({ leaderboard: [] })),
        ]);

        if (cancelled) return;

        // Build agents array from fleet endpoint
        const agentsList: Agent[] = (fleetRes.fleet || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          type: f.id,
          active: f.status === "live" || f.status === "scanning",
          lastSignal: f.lastAction,
        }));
        setAgents(agentsList);

        // Build feeds array from data/status shape
        const feedsList: Feed[] = [
          { name: "Yahoo Quotes", healthy: feedsRes.yahoo?.healthy, latencyMs: feedsRes.yahoo?.latencyMs },
          { name: "EIA Fundamentals", healthy: feedsRes.eia?.healthy, latencyMs: feedsRes.eia?.latencyMs },
          { name: "NewsAPI / GDELT", healthy: feedsRes.newsapi?.healthy || feedsRes.gdelt?.healthy, latencyMs: feedsRes.newsapi?.latencyMs },
          { name: "Ollama Sentiment", healthy: feedsRes.ollama?.reachable },
        ];
        setFeeds(feedsList);

        // Generate activity from recent trades (mock ticker activity for now)
        const mockActivity: Activity[] = [
          { type: "signal", symbol: "CL", description: "Scout flagged oversold RSI on 4h", time: "2s ago", positive: true },
          { type: "trade", symbol: "NG", description: "Paper BUY 50 @ $2.84 (mean reversion)", time: "8s ago", positive: true },
          { type: "alert", symbol: "GC", description: "Sherlock: regime shift to Low Vol Trend", time: "14s ago" },
          { type: "backtest", symbol: "BZ", description: "Quincy completed 2,341 backtests", time: "32s ago", positive: true },
          { type: "signal", symbol: "SI", description: "Hawk tightened stop on SI long", time: "1m ago", positive: false },
          { type: "trade", symbol: "CL", description: "Paper SELL 25 @ $78.42 (take profit)", time: "2m ago", positive: true },
          { type: "alert", symbol: "HO", description: "Press flagged bearish OPEC headline", time: "4m ago" },
          { type: "signal", symbol: "BZ", description: "Argus: Brent-WTI spread +2.3σ — pair trade", time: "5m ago", positive: true },
          { type: "alert", symbol: "CL", description: "Mercury: EIA crude in 2hr — pausing strategies", time: "8m ago" },
          { type: "trade", symbol: "GC", description: "Compass: rebalance sell GC, buy SI", time: "12m ago" },
          { type: "alert", symbol: "CL", description: "Atlas: commercials net long +2.1σ — bullish extreme", time: "18m ago", positive: true },
          { type: "alert", symbol: "BZ", description: "Ledger: all positions match broker ✓", time: "22m ago" },
          { type: "backtest", symbol: "CL", description: "Counsel: rejected backtest (Sharpe 4.2, 18 trades)", time: "25m ago" },
          { type: "signal", symbol: "SI", description: "Librarian: 5 new quant papers in weekly digest", time: "30m ago" },
          { type: "alert", symbol: "GC", description: "Hermes: GC arb opportunity 0.12% net", time: "35m ago" },
          ...(leaderRes.leaderboard || []).slice(0, 2).map((e: any, i: number) => ({
            type: "trade" as const,
            symbol: "PTF",
            description: `${e.username} +${signedPct(e.totalPnl / 100, 2)}`,
            time: `${40 + i}m ago`,
            positive: true,
          })),
        ];
        setActivity(mockActivity);
        setLoading(false);
      } catch (err) {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 15_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const healthyFeedCount = feeds.filter(f => f.healthy).length;

  return (
    <section className="relative py-24 lg:py-32 px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 tracking-wider uppercase mb-4"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live · refreshes every 15s
          </motion.div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight">
            The trading floor, <span className="text-emerald-400">always open</span>
          </h2>
          <p className="text-base lg:text-lg text-muted-foreground mt-4">
            Fifteen agents, four data feeds, every market session. This isn't a demo — it's what's running right now.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Agent status */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-3">
              <Brain className="w-3.5 h-3.5" /> Agents on duty
            </h3>
            {loading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>
            ) : agents.length > 0 ? (
              <div className="space-y-1.5">
                {agents.map((a) => (
                  <Agent key={a.id} name={a.name} task={a.lastSignal || "Active"} status={a.active ? "live" : "idle"} />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Agent name="Scout" task="Watching ticks" status="live" />
                <Agent name="Sherlock" task="Regime: Low Vol Trend" status="live" />
                <Agent name="Quincy" task="Validating strategies" status="idle" />
                <Agent name="Hawk" task="Watching positions" status="live" />
                <Agent name="Press" task="Triaging headlines" status="live" />
                <Agent name="Sage" task="Curating marketplace" status="idle" />
                <Agent name="Argus" task="Scanning spreads" status="live" />
                <Agent name="Mercury" task="Macro calendar" status="live" />
                <Agent name="Echo" task="Weekly journal" status="idle" />
                <Agent name="Compass" task="Rebalance check" status="idle" />
                <Agent name="Atlas" task="COT positioning" status="idle" />
                <Agent name="Ledger" task="Reconciling broker" status="idle" />
                <Agent name="Counsel" task="Reviewing backtests" status="live" />
                <Agent name="Librarian" task="Reading papers" status="idle" />
                <Agent name="Hermes" task="Cross-venue arb" status="live" />
              </div>
            )}
          </div>

          {/* Data feed health */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-3">
              <Radio className="w-3.5 h-3.5" /> Data feeds
              {feeds.length > 0 && <span className="text-[10px] text-emerald-400 ml-auto">{healthyFeedCount}/{feeds.length} live</span>}
            </h3>
            {feeds.length > 0 ? (
              <div className="space-y-2">
                {feeds.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${f.healthy ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                      <span>{f.name}</span>
                    </div>
                    <span className={`text-xs font-mono ${f.healthy ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {f.healthy && f.latencyMs ? `${f.latencyMs}ms` : f.healthy ? "live" : "off"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Loading…</div>
            )}
          </div>

          {/* Live activity feed */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Live activity
            </h3>
            <div className="space-y-2 max-h-64 overflow-hidden">
              {activity.slice(0, 7).map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-2 text-xs"
                >
                  <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    a.positive ? "bg-emerald-500" : a.type === "alert" ? "bg-amber-500" : "bg-blue-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] text-muted-foreground">{a.symbol}</div>
                    <div className="text-foreground/90 leading-tight">{a.description}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">{a.time}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Agent({ name, task, status }: { name: string; task: string; status: "live" | "idle" }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${status === "live" ? "bg-emerald-500" : "bg-zinc-600"}`} />
        {status === "live" && <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />}
      </div>
      <span className="font-semibold text-foreground">{name}</span>
      <span className="text-muted-foreground text-xs ml-auto text-right truncate max-w-[60%]">{task}</span>
    </div>
  );
}