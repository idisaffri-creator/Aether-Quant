import { TrendingUp, TrendingDown } from "lucide-react";
import { usePageTitle } from "@/lib/usePageTitle";
import FactorCard from "@/components/analysis/FactorCard";
import IndicatorPanel from "@/components/analysis/IndicatorPanel";
import AIInsightCard from "@/components/analysis/AIInsightCard";
import FactorBreakdown from "@/components/analysis/FactorBreakdown";

interface FactorData {
  name: string;
  value: number;
  signal: "bullish" | "bearish" | "neutral";
}

const factors: FactorData[] = [
  { name: "Momentum", value: 72.4, signal: "bullish" },
  { name: "Value", value: 45.8, signal: "neutral" },
  { name: "Volatility", value: 68.2, signal: "bullish" },
  { name: "Volume", value: 31.5, signal: "bearish" },
  { name: "Seasonality", value: 58.9, signal: "neutral" },
  { name: "Sentiment", value: 63.7, signal: "bullish" },
];

const compositeScore = factors.reduce((s, f) => s + f.value, 0) / factors.length;

const sparklineData = {
  rsi: Array.from({ length: 20 }, (_, i) => ({ v: 45 + Math.sin(i * 0.8) * 15 + Math.random() * 5 })),
  macd: Array.from({ length: 20 }, (_, i) => ({ v: Math.sin(i * 0.5) * 2 })),
  bb: Array.from({ length: 20 }, (_, i) => ({ v: 78 + Math.sin(i * 0.6) * 1.5 })),
};

const factorContributions = [
  { factor: "Momentum", contribution: 3.2, direction: "positive" as const, consistency: 82 },
  { factor: "Value", contribution: -1.5, direction: "negative" as const, consistency: 65 },
  { factor: "Volatility", contribution: 2.1, direction: "positive" as const, consistency: 74 },
  { factor: "Volume", contribution: -0.8, direction: "negative" as const, consistency: 43 },
  { factor: "Seasonality", contribution: 1.4, direction: "positive" as const, consistency: 71 },
  { factor: "Sentiment", contribution: 2.8, direction: "positive" as const, consistency: 88 },
];

export default function Analysis() {
  usePageTitle("Analysis");
  const signal = compositeScore > 55 ? "bullish" : compositeScore < 45 ? "bearish" : "neutral";
  const signalColor = signal === "bullish" ? "text-green-500" : signal === "bearish" ? "text-red-500" : "text-amber";
  const SignalIcon = signal === "bullish" ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Factor Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          QuantMuse-inspired multi-factor analysis engine
        </p>
      </div>

      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Composite Factor Score</span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-3xl font-display font-bold">{compositeScore.toFixed(1)}</span>
              <span className={`text-sm font-medium flex items-center gap-1 ${signalColor}`}>
                <SignalIcon className="w-4 h-4" />
                {signal.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        <div className="h-3 rounded-full bg-accent/30 overflow-hidden">
          <div className="h-full rounded-full bg-amber transition-all" style={{ width: `${compositeScore}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {factors.map((f) => (
          <FactorCard key={f.name} name={f.name} value={f.value} signal={f.signal} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber" />
            Technical Analysis
          </h2>
          <IndicatorPanel
            name="RSI (14)"
            value="62.4"
            signal="Near overbought territory. Momentum favoring bulls."
            status="neutral"
            sparklineData={sparklineData.rsi}
          />
          <IndicatorPanel
            name="MACD"
            value="Bullish Cross"
            signal="MACD line crossed above signal line. Histogram expanding."
            status="bullish"
            sparklineData={sparklineData.macd}
          />
          <IndicatorPanel
            name="Bollinger Bands"
            value="Squeeze Detected"
            signal="Bandwidth contracting. Expecting breakout within 3–5 sessions."
            status="squeeze"
            sparklineData={sparklineData.bb}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            AI Insights
          </h2>
          <AIInsightCard
            summary="WTI crude maintaining upward momentum above $78.50 as inventory draws and geopolitical tensions support prices. The recent breakout above the 50-day SMA aligns with our momentum factor reading. However, overbought RSI conditions on the daily timeframe suggest a potential short-term pullback before the next leg higher. OPEC+ commentary remains supportive, while USD strength poses the primary downside risk."
            sentiment="bullish"
            confidence={72.5}
            levels={{ support: 77.80, resistance: 80.50, pivot: 78.45 }}
            risk={{ var95: 2.4, expectedShortfall: 3.8, betaToWTI: 1.15 }}
            opportunity="Long WTI on pullback to $77.80 support with target at $81.20. Risk/reward ratio of 1:2.4."
          />
        </div>
      </div>

      <FactorBreakdown factors={factorContributions} />
    </div>
  );
}
