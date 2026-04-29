/*
 * Backtest Results – Void Terminal
 * Metrics dashboard, equity curve chart, trade list table
 * Simulated loading then display realistic results
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Shield,
  Percent,
  Hash,
  ArrowUpRight,
  ArrowDownRight,
  Settings2,
  Loader2,
  Download,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { equityCurveData, backtestMetrics, tradeList } from "@/lib/mockData";
import { useLocation } from "wouter";

const STRATEGY_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663489353166/Smb5wRr5wwDpFtVfRrnNA3/strategy-bg-cUQySaa7YRSJqRYVeNWwLs.webp";

function MetricTile({
  label,
  value,
  icon: Icon,
  color,
  suffix,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  suffix?: string;
}) {
  return (
    <div className="p-3 bg-secondary/40 rounded-lg border border-border/50">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-lg font-mono font-bold text-foreground">
        {value}
        {suffix && (
          <span className="text-xs text-muted-foreground ml-0.5">{suffix}</span>
        )}
      </p>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground font-mono mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-mono font-semibold" style={{ color: p.color }}>
          {p.name}: ${p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export default function BacktestResults() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<string>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  const sortedTrades = [...tradeList].sort((a, b) => {
    const aVal = (a as any)[sortField];
    const bVal = (b as any)[sortField];
    if (typeof aVal === "number") return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    return sortDir === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="relative rounded-xl overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: `url(${STRATEGY_BG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="relative p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-1">
              Backtest Results
            </h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                CL (Crude Oil)
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono">
                Mean Reversion
              </Badge>
              <span className="text-xs text-muted-foreground">
                2016-01 → 2025-12 · Daily
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setLocation("/optimization")}
            >
              <Settings2 className="w-3.5 h-3.5 mr-1" />
              Optimize
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                import("sonner").then(({ toast }) =>
                  toast.success("Report downloaded!")
                );
              }}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24"
          >
            <div className="relative">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-primary/20 animate-ping" />
            </div>
            <p className="text-sm text-muted-foreground mt-4 font-display">
              Running backtest on 10 years of data...
            </p>
            <div className="w-48 h-1 bg-secondary rounded-full mt-3 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </div>
            <p className="text-xs text-muted-foreground/60 mt-2 font-mono">
              Processing 2,520 trading days...
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <MetricTile
                label="CAGR"
                value={`${backtestMetrics.cagr}%`}
                icon={TrendingUp}
                color="text-profit"
              />
              <MetricTile
                label="Sharpe Ratio"
                value={backtestMetrics.sharpe.toFixed(2)}
                icon={Target}
                color="text-primary"
              />
              <MetricTile
                label="Win Rate"
                value={`${backtestMetrics.winRate}%`}
                icon={Percent}
                color="text-primary"
              />
              <MetricTile
                label="Max Drawdown"
                value={`${backtestMetrics.maxDrawdown}%`}
                icon={TrendingDown}
                color="text-loss"
              />
              <MetricTile
                label="Profit Factor"
                value={backtestMetrics.profitFactor.toFixed(2)}
                icon={BarChart3}
                color="text-primary"
              />
              <MetricTile
                label="Trade Count"
                value={String(backtestMetrics.tradeCount)}
                icon={Hash}
                color="text-muted-foreground"
              />
              <MetricTile
                label="Avg Win"
                value={`${backtestMetrics.avgWin}%`}
                icon={ArrowUpRight}
                color="text-profit"
              />
              <MetricTile
                label="Avg Loss"
                value={`${backtestMetrics.avgLoss}%`}
                icon={ArrowDownRight}
                color="text-loss"
              />
              <MetricTile
                label="Total Return"
                value={`${backtestMetrics.totalReturn}%`}
                icon={TrendingUp}
                color="text-profit"
              />
              <MetricTile
                label="Ann. Volatility"
                value={`${backtestMetrics.annualizedVol}%`}
                icon={Shield}
                color="text-muted-foreground"
              />
            </div>

            {/* Equity Curve */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Equity Curve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityCurveData}>
                      <defs>
                        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.82 0.15 195)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="oklch(0.82 0.15 195)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="benchGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.6 0.015 250)" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="oklch(0.6 0.015 250)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.25 0.015 250)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "oklch(0.6 0.015 250)", fontFamily: "'JetBrains Mono'" }}
                        axisLine={{ stroke: "oklch(0.25 0.015 250)" }}
                        tickLine={false}
                        interval={11}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "oklch(0.6 0.015 250)", fontFamily: "'JetBrains Mono'" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 11, fontFamily: "'JetBrains Mono'" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="equity"
                        name="Strategy"
                        stroke="oklch(0.82 0.15 195)"
                        strokeWidth={2}
                        fill="url(#equityGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="benchmark"
                        name="Benchmark"
                        stroke="oklch(0.5 0.015 250)"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                        fill="url(#benchGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Trade List */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary" />
                    Trade List
                  </CardTitle>
                  <span className="text-xs text-muted-foreground font-mono">
                    Showing {tradeList.length} recent trades
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {[
                          { key: "id", label: "#" },
                          { key: "asset", label: "Asset" },
                          { key: "direction", label: "Direction" },
                          { key: "entry", label: "Entry" },
                          { key: "exit", label: "Exit" },
                          { key: "entryPrice", label: "Entry Price" },
                          { key: "exitPrice", label: "Exit Price" },
                          { key: "returnPct", label: "Return" },
                          { key: "pnl", label: "P&L" },
                        ].map((col) => (
                          <th
                            key={col.key}
                            onClick={() => handleSort(col.key)}
                            className="text-left py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium cursor-pointer hover:text-foreground transition-colors"
                          >
                            <span className="flex items-center gap-1">
                              {col.label}
                              <SortIcon field={col.key} />
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTrades.map((trade) => (
                        <tr
                          key={trade.id}
                          className="border-b border-border/30 hover:bg-accent/30 transition-colors"
                        >
                          <td className="py-2 px-2 font-mono text-xs text-muted-foreground">
                            {trade.id}
                          </td>
                          <td className="py-2 px-2 text-xs font-medium">
                            {trade.asset}
                          </td>
                          <td className="py-2 px-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-mono ${
                                trade.direction === "Long"
                                  ? "border-profit/30 text-profit"
                                  : "border-loss/30 text-loss"
                              }`}
                            >
                              {trade.direction}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-xs font-mono text-muted-foreground">
                            {trade.entry}
                          </td>
                          <td className="py-2 px-2 text-xs font-mono text-muted-foreground">
                            {trade.exit}
                          </td>
                          <td className="py-2 px-2 text-xs font-mono">
                            ${trade.entryPrice.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-xs font-mono">
                            ${trade.exitPrice.toFixed(2)}
                          </td>
                          <td
                            className={`py-2 px-2 text-xs font-mono font-semibold ${
                              trade.returnPct >= 0 ? "text-profit" : "text-loss"
                            }`}
                          >
                            {trade.returnPct >= 0 ? "+" : ""}
                            {trade.returnPct.toFixed(2)}%
                          </td>
                          <td
                            className={`py-2 px-2 text-xs font-mono font-semibold ${
                              trade.pnl >= 0 ? "text-profit" : "text-loss"
                            }`}
                          >
                            {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
