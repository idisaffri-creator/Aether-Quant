import { useState, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Download,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
} from "lucide-react";
import type { PortfolioSummary } from "@shared/types";
import { usePageTitle } from "@/lib/usePageTitle";
import { shortenAddress } from "@/lib/solana";
import { useWalletContext } from "@/contexts/WalletContext";
import { exportToCSV } from "@/lib/export";

const portfolio: PortfolioSummary = {
  totalValue: 284730.50,
  totalPnl: 12450.80,
  pnlPercent: 4.57,
  openPositions: 6,
  availableBalance: 45200.00,
  allocation: [
    { asset: "WTI", value: 85000, percentage: 29.8, pnl: 3400 },
    { asset: "BRENT", value: 72000, percentage: 25.3, pnl: -1200 },
    { asset: "NGAS", value: 45000, percentage: 15.8, pnl: 5600 },
    { asset: "GASOL", value: 38000, percentage: 13.4, pnl: 2100 },
    { asset: "BHEL", value: 44530, percentage: 15.6, pnl: 2550 },
  ],
};

type Trade = {
  id: string;
  asset: string;
  side: string;
  type: string;
  quantity: number;
  entry: number;
  current: number;
  pnl: number;
  pnlPercent: number;
  status: string;
  openedAt: string;
  closedAt?: string;
};

const COLORS = [
  "oklch(0.72 0.18 60)",
  "oklch(0.60 0.15 250)",
  "oklch(0.65 0.14 160)",
  "oklch(0.55 0.12 320)",
  "oklch(0.50 0.10 200)",
];

const mockTrades: Trade[] = [
  { id: "1", asset: "WTI", side: "long", type: "market", quantity: 100, entry: 77.50, current: 78.43, pnl: 93.00, pnlPercent: 1.2, status: "open", openedAt: "2026-06-14T10:30:00Z" },
  { id: "2", asset: "BRENT", side: "short", type: "limit", quantity: 50, entry: 83.00, current: 82.17, pnl: 41.50, pnlPercent: 1.0, status: "open", openedAt: "2026-06-14T08:15:00Z" },
  { id: "3", asset: "NGAS", side: "long", type: "market", quantity: 200, entry: 2.08, current: 2.14, pnl: 12.00, pnlPercent: 2.9, status: "open", openedAt: "2026-06-13T14:00:00Z" },
  { id: "4", asset: "WTI", side: "long", type: "market", quantity: 75, entry: 77.80, current: 78.43, pnl: 47.25, pnlPercent: 0.8, status: "closed", openedAt: "2026-06-12T09:00:00Z", closedAt: "2026-06-13T16:30:00Z" },
  { id: "5", asset: "GASOL", side: "short", type: "stop", quantity: 150, entry: 2.55, current: 2.51, pnl: -6.00, pnlPercent: -1.6, status: "closed", openedAt: "2026-06-11T11:00:00Z", closedAt: "2026-06-12T15:45:00Z" },
];

const metrics = [
  { label: "Sharpe Ratio", value: "1.42", icon: TrendingUp, color: "text-emerald-400", change: "Good" },
  { label: "Sortino Ratio", value: "1.89", icon: TrendingUp, color: "text-emerald-400", change: "Excellent" },
  { label: "Max Drawdown", value: "-8.3%", icon: TrendingDown, color: "text-red-400", change: "6 months" },
  { label: "VaR (95%)", value: "$3,420", icon: AlertTriangle, color: "text-amber", change: "Daily" },
];

const pnlChartData = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  value: 10000 + (Math.random() - 0.5) * 3000 + i * 150,
}));

export default function Portfolio() {
  usePageTitle("Portfolio");
  const { connected, publicKey } = useWalletContext();
  const [activeTab, setActiveTab] = useState<"positions" | "history">("positions");

  const handleExport = useCallback(() => {
    const displayTrades = mockTrades.filter(
      (t) => activeTab === "positions" ? t.status === "open" : true,
    );
    exportToCSV(
      displayTrades.map(({ id, openedAt, closedAt, entry, current, ...rest }) => ({
        ...rest,
        entry,
        current,
        openedAt: new Date(openedAt).toLocaleDateString(),
        closedAt: closedAt ? new Date(closedAt).toLocaleDateString() : "",
      })),
      `aether-trades-${activeTab}-${new Date().toISOString().slice(0, 10)}`,
      {
        asset: "Asset",
        side: "Side",
        type: "Type",
        quantity: "Quantity",
        entry: "Entry Price",
        current: "Current Price",
        pnl: "P&L ($)",
        pnlPercent: "P&L %",
        status: "Status",
        openedAt: "Opened",
        closedAt: "Closed",
      },
    );
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Portfolio</h1>
      </div>

      {/* Risk Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <m.icon className={`w-4 h-4 ${m.color}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{m.label}</span>
            </div>
            <div className="text-xl lg:text-2xl font-display font-bold">{m.value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{m.change}</div>
          </div>
        ))}
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PnL Chart */}
        <div className="lg:col-span-2 glass-card rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Portfolio P&L (30 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pnlChartData}>
                <defs>
                  <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.60 0.15 250)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="oklch(0.60 0.15 250)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.15 0.009 260)",
                    border: "1px solid oklch(1 0 0 / 8%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "P&L"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="oklch(0.60 0.15 250)"
                  strokeWidth={2}
                  fill="url(#pnlGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation Pie */}
        <div className="glass-card rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Allocation</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={portfolio.allocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  stroke="none"
                >
                  {portfolio.allocation.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.15 0.009 260)",
                    border: "1px solid oklch(1 0 0 / 8%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => [`$${(value).toLocaleString()}`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1">
            {portfolio.allocation.map((a, i) => (
              <div key={a.asset} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="font-mono">{a.asset}</span>
                </div>
                <span className="font-mono">{a.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Positions / History */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("positions")}
              className={`text-sm font-medium pb-1 border-b-2 transition-all ${
                activeTab === "positions" ? "text-amber border-amber" : "text-muted-foreground border-transparent"
              }`}
            >
              Open Positions
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`text-sm font-medium pb-1 border-b-2 transition-all ${
                activeTab === "history" ? "text-amber border-amber" : "text-muted-foreground border-transparent"
              }`}
            >
              Trade History
            </button>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-amber transition-colors"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left p-2">Asset</th>
                <th className="text-left p-2">Side</th>
                <th className="text-right p-2">Qty</th>
                <th className="text-right p-2">Entry</th>
                <th className="text-right p-2">Current</th>
                <th className="text-right p-2">P&L</th>
                <th className="text-right p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockTrades
                .filter((t) => activeTab === "positions" ? t.status === "open" : true)
                .map((trade) => (
                  <tr key={trade.id} className="border-t border-border/50 hover:bg-accent/20 transition-colors">
                    <td className="p-2 font-mono text-xs">{trade.asset}</td>
                    <td className="p-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        trade.side === "long" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      }`}>
                        {trade.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2 text-right font-mono text-xs">{trade.quantity}</td>
                    <td className="p-2 text-right font-mono text-xs">${trade.entry.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono text-xs">${trade.current.toFixed(2)}</td>
                    <td className={`p-2 text-right font-mono text-xs ${trade.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                    </td>
                    <td className="p-2 text-right">
                      <span className={`text-[10px] font-medium ${
                        trade.status === "open" ? "text-yellow-500" : trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                      }`}>
                        {trade.status === "open" ? "Open" : trade.pnl >= 0 ? "Closed +" : "Closed -"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wallet Info */}
      {connected && publicKey && (
        <div className="glass-card rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Connected Wallet</h2>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
            <div className="w-8 h-8 rounded-full bg-amber/20 flex items-center justify-center">
              <ExternalLink className="w-4 h-4 text-amber" />
            </div>
            <div>
              <div className="text-xs font-mono font-medium">{shortenAddress(publicKey, 8)}</div>
              <div className="text-[10px] text-muted-foreground">Solana Devnet</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
