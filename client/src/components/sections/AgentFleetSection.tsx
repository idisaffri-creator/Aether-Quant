/*
 * Agent Fleet — live + static showcase.
 * Removed mockData dependency. Shows a static representation of what
 * a strategy fleet looks like (real fleet is in /dashboard/team).
 */
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Brain, Zap, Activity, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const showcase = [
  { name: "WTI Mean Reversion", asset: "WTI", strategy: "RSI < 30", pnl: 2.4, win: 64, status: "active" },
  { name: "Gold Momentum", asset: "GOLD", strategy: "EMA cross", pnl: 1.8, win: 58, status: "active" },
  { name: "NGAS Volatility", asset: "NGAS", strategy: "ATR breakout", pnl: -0.6, win: 51, status: "active" },
  { name: "Brent Spread", asset: "BRENT", strategy: "WTI-BN spread", pnl: 3.1, win: 72, status: "active" },
];

export default function AgentFleetSection() {
  return (
    <section className="relative py-24 lg:py-32 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary tracking-wider uppercase mb-4">
            <Brain className="w-3 h-3" /> Auto-execution
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight">
            Your strategies. <span className="text-primary">Running 24/7.</span>
          </h2>
          <p className="text-base lg:text-lg text-muted-foreground mt-4">
            Each custom strategy runs as a worker. Conditions are evaluated against real-time signals from Yahoo, EIA, and NewsAPI. Orders are submitted to your broker (Alpaca paper or live) with built-in risk checks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {showcase.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-display font-semibold text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.asset} · {s.strategy}</div>
                </div>
                <div className={`flex items-center gap-1.5 ${s.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {s.pnl >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span className="font-mono font-semibold text-sm">
                    {s.pnl >= 0 ? "+" : ""}{s.pnl}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-xs">
                  {s.status === "active" ? (
                    <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> <span className="text-emerald-400">Running</span></>
                  ) : (
                    <><span className="w-1.5 h-1.5 rounded-full bg-zinc-600" /> <span className="text-muted-foreground">Paused</span></>
                  )}
                </div>
                <div className="text-xs text-muted-foreground ml-auto">Win rate: <span className="text-foreground font-mono">{s.win}%</span></div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/dashboard/team">
            <div className="inline-flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer">
              Manage your fleet <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
