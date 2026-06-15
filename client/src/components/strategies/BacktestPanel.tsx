import { useState } from "react";
import {
  TrendingUp, TrendingDown, BarChart3, DollarSign, Activity, Target,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

interface TradeItem {
  id: string; entry: string; exit: string; direction: "Long" | "Short"; pnl: number; holdDays: number;
}

interface BacktestResult {
  totalReturn: number; sharpe: number; maxDD: number; winRate: number; trades: number; profitFactor: number;
  equity: { date: string; value: number }[];
  drawdown: { date: string; value: number }[];
  monthly: { month: string; return: number }[];
  tradeList: TradeItem[];
}

function generateMockBacktest(): BacktestResult {
  const equity = Array.from({ length: 180 }, (_, i) => {
    const d = new Date(2025, 0, 1);
    d.setDate(d.getDate() + i);
    return { date: d.toISOString().slice(0, 10), value: 100000 + i * 350 + Math.sin(i * 0.1) * 5000 + (Math.random() - 0.5) * 2000 };
  });
  const drawdown = equity.map((e, i) => {
    const peak = Math.max(...equity.slice(0, i + 1).map((x) => x.value));
    return { date: e.date, value: ((e.value - peak) / peak) * 100 };
  });
  const monthly = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    .map((m) => ({ month: m, return: (Math.random() - 0.4) * 8 }));
  const tradeList = Array.from({ length: 25 }, (_, i) => {
    const entry = new Date(2025, 0, 1 + i * 7);
    const exit = new Date(entry);
    exit.setDate(exit.getDate() + Math.floor(Math.random() * 14) + 1);
    const direction: "Long" | "Short" = Math.random() > 0.5 ? "Long" : "Short";
    return {
      id: `t-${i + 1}`,
      entry: entry.toISOString().slice(0, 10),
      exit: exit.toISOString().slice(0, 10),
      direction,
      pnl: Math.round(((Math.random() - 0.35) * 2000) * 100) / 100,
      holdDays: Math.floor((exit.getTime() - entry.getTime()) / 86400000),
    };
  });
  return { totalReturn: 18.4, sharpe: 1.87, maxDD: -8.2, winRate: 62.5, trades: tradeList.length, profitFactor: 1.85, equity, drawdown, monthly, tradeList };
}

const presets = ["1M", "3M", "6M", "1Y", "All"] as const;

const tooltipStyle: React.CSSProperties = {
  background: "oklch(0.15 0.009 260)",
  border: "1px solid oklch(1 0 0 / 8%)",
  borderRadius: "8px",
  fontSize: "12px",
};

export default function BacktestPanel() {
  const [range, setRange] = useState<(typeof presets)[number]>("6M");
  const [result] = useState<BacktestResult>(generateMockBacktest);
  const r = result;
  const stats = [
    { icon: TrendingUp, label: "Total Return", value: `+${r.totalReturn.toFixed(1)}%`, color: "text-green-500" },
    { icon: Activity, label: "Sharpe Ratio", value: r.sharpe.toFixed(2), color: "text-amber" },
    { icon: TrendingDown, label: "Max DD", value: `${r.maxDD.toFixed(1)}%`, color: "text-red-500" },
    { icon: Target, label: "Win Rate", value: `${r.winRate.toFixed(1)}%`, color: "text-green-500" },
    { icon: BarChart3, label: "Trades", value: String(r.trades), color: "text-blue-500" },
    { icon: DollarSign, label: "Profit Factor", value: r.profitFactor.toFixed(2), color: "text-amber" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        {presets.map((p) => (
          <button key={p} onClick={() => setRange(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${range === p ? "bg-amber text-black" : "bg-accent/50 text-muted-foreground hover:text-foreground"}`}
          >{p}</button>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">From</span>
          <input type="date" className="bg-accent/30 rounded px-2 py-1 text-xs border border-border/50 outline-none" />
          <span className="text-xs text-muted-foreground">To</span>
          <input type="date" className="bg-accent/30 rounded px-2 py-1 text-xs border border-border/50 outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="glass-card rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">{s.label}</span>
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
            </div>
            <div className={`text-lg font-display font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Equity Curve</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={r.equity}>
                <defs>
                  <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.18 60)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="oklch(0.72 0.18 60)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis domain={["auto", "auto"]} hide />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, "Equity"]} />
                <Area type="monotone" dataKey="value" stroke="oklch(0.72 0.18 60)" strokeWidth={2} fill="url(#eqGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Drawdown</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={r.drawdown}>
                <defs>
                  <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.6 0.2 30)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="oklch(0.6 0.2 30)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis domain={["auto", "auto"]} hide />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toFixed(2)}%`, "Drawdown"]} />
                <Area type="monotone" dataKey="value" stroke="oklch(0.6 0.2 30)" strokeWidth={2} fill="url(#ddGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">Monthly Returns</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {r.monthly.map((m) => {
            const isPos = m.return >= 0;
            const intensity = Math.min(Math.abs(m.return) / 8, 1);
            return (
              <div key={m.month} className="rounded-lg p-2.5 text-center"
                style={{
                  backgroundColor: isPos
                    ? `oklch(${0.55 + (1 - intensity) * 0.3} ${intensity * 0.18} 145)`
                    : `oklch(${0.55 + (1 - intensity) * 0.3} ${intensity * 0.18} 30)`,
                }}
              >
                <div className="text-[10px] text-muted-foreground font-medium">{m.month}</div>
                <div className={`text-xs font-mono font-bold ${isPos ? "text-green-500" : "text-red-500"}`}>
                  {isPos ? "+" : ""}{m.return.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Trade List</h2>
          <span className="text-[10px] text-muted-foreground">{r.tradeList.length} trades</span>
        </div>
        <div className="overflow-x-auto max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border sticky top-0 bg-background">
                <th className="text-left py-2 pr-3">#</th><th className="text-left px-2">Entry</th>
                <th className="text-left px-2">Exit</th><th className="text-left px-2">Dir</th>
                <th className="text-right px-2">P&L</th><th className="text-right pl-2">Hold</th>
              </tr>
            </thead>
            <tbody>
              {r.tradeList.map((t) => (
                <tr key={t.id} className="border-b border-border/30">
                  <td className="py-1.5 pr-3 text-muted-foreground">{t.id}</td>
                  <td className="py-1.5 px-2 font-mono">{t.entry}</td>
                  <td className="py-1.5 px-2 font-mono">{t.exit}</td>
                  <td className="py-1.5 px-2">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${t.direction === "Long" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                      {t.direction}
                    </span>
                  </td>
                  <td className={`py-1.5 px-2 text-right font-mono font-medium ${t.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                  </td>
                  <td className="py-1.5 pl-2 text-right text-muted-foreground">{t.holdDays}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
