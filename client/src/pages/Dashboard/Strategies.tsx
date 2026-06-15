import { useState } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import {
  Play,
  Pause,
  Plus,
  Settings2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Grid3x3,
  LineChart,
  Brain,
} from "lucide-react";
import StrategyOptimizer from "@/components/strategies/StrategyOptimizer";
import BacktestPanel from "@/components/strategies/BacktestPanel";
import MLPipeline from "@/components/strategies/MLPipeline";

interface Strategy {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "draft";
  sharpe: number;
  winRate: number;
  totalReturn: number;
  trades: number;
}

const mockStrategies: Strategy[] = [
  {
    id: "1",
    name: "Momentum Breakout",
    description: "Long on 20-day high breakout with volume confirmation. Short on 20-day low breakdown.",
    status: "active",
    sharpe: 1.87,
    winRate: 62.5,
    totalReturn: 18.4,
    trades: 142,
  },
  {
    id: "2",
    name: "Mean Reversion",
    description: "Mean reversion on WTI/Brent spread. Entry when z-score exceeds 2.0.",
    status: "paused",
    sharpe: 1.42,
    winRate: 58.3,
    totalReturn: 12.1,
    trades: 89,
  },
  {
    id: "3",
    name: "Trend Following",
    description: "EMA crossover strategy. Entry on 12/26 EMA cross with ATR filter.",
    status: "draft",
    sharpe: 0,
    winRate: 0,
    totalReturn: 0,
    trades: 0,
  },
  {
    id: "4",
    name: "Volatility Arbitrage",
    description: "Short volatility when VIX exceeds 30. Long volatility on VIX < 15.",
    status: "active",
    sharpe: 2.14,
    winRate: 71.2,
    totalReturn: 24.8,
    trades: 56,
  },
];

const tabs = [
  { id: "strategies", label: "Strategies", icon: Grid3x3 },
  { id: "optimizer", label: "Optimizer", icon: TrendingUp },
  { id: "backtest", label: "Backtest", icon: LineChart },
  { id: "mlpipeline", label: "ML Pipeline", icon: Brain },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function Strategies() {
  usePageTitle("Strategies");
  const [strategies] = useState<Strategy[]>(mockStrategies);
  const [activeTab, setActiveTab] = useState<TabId>("strategies");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Strategies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build, backtest, and deploy algorithmic trading strategies
          </p>
        </div>
        {activeTab === "strategies" && (
          <button className="btn-amber px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Strategy
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-accent/30 rounded-lg p-1 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "strategies" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {strategies.map((s) => (
            <div key={s.id} className="glass-card rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                  s.status === "active"
                    ? "bg-green-500/10 text-green-500"
                    : s.status === "paused"
                    ? "bg-yellow-500/10 text-yellow-500"
                    : "bg-accent/50 text-muted-foreground"
                }`}>
                  {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-2 rounded-lg bg-accent/30">
                  <div className="text-[10px] text-muted-foreground uppercase">Sharpe</div>
                  <div className="text-sm font-mono font-bold mt-1">{s.sharpe.toFixed(2)}</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-accent/30">
                  <div className="text-[10px] text-muted-foreground uppercase">Win Rate</div>
                  <div className="text-sm font-mono font-bold mt-1">{s.winRate.toFixed(1)}%</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-accent/30">
                  <div className="text-[10px] text-muted-foreground uppercase">Return</div>
                  <div className="text-sm font-mono font-bold mt-1 text-green-500">+{s.totalReturn.toFixed(1)}%</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-accent/30">
                  <div className="text-[10px] text-muted-foreground uppercase">Trades</div>
                  <div className="text-sm font-mono font-bold mt-1">{s.trades}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  s.status === "active"
                    ? "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
                    : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                }`}>
                  {s.status === "active" ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {s.status === "active" ? "Pause" : s.status === "paused" ? "Resume" : "Deploy"}
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/50 text-muted-foreground hover:text-foreground transition-all">
                  <Settings2 className="w-3 h-3" />
                  Configure
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/50 text-muted-foreground hover:text-foreground transition-all">
                  <BarChart3 className="w-3 h-3" />
                  Backtest
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "optimizer" && <StrategyOptimizer />}
      {activeTab === "backtest" && <BacktestPanel />}
      {activeTab === "mlpipeline" && <MLPipeline />}
    </div>
  );
}
