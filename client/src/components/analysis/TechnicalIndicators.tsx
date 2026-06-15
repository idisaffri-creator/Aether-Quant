import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, Activity, BarChart3, Zap, AlertTriangle, ArrowUpDown,
} from "lucide-react";
import { api } from "@/lib/api";

interface FullAnalysis {
  symbol: string; timestamp: number;
  sma: { period: number; value: number }[];
  ema: { period: number; value: number }[];
  rsi: { value: number; signal: string };
  macd: { macd: number; signal: number; histogram: number; cross: string };
  bollinger: { upper: number; middle: number; lower: number; width: number; squeeze: boolean };
  atr: number;
  stochastic: { k: number; d: number; signal: string };
  obv: number;
}

export default function TechnicalIndicators({ symbol }: { symbol: string }) {
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.analysis.full(symbol)
      .then((data) => { setAnalysis(data); setLoading(false); })
      .catch(() => { setError("Failed to load analysis"); setLoading(false); });
  }, [symbol]);

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-center h-32">
          <div className="w-5 h-5 border-2 border-amber border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-center h-32">
          <p className="text-xs text-muted-foreground">{error || "No data available"}</p>
        </div>
      </div>
    );
  }

  const rsi = analysis.rsi;
  const rsiColor = rsi.signal === "overbought" ? "text-red-500"
    : rsi.signal === "oversold" ? "text-green-500" : "text-amber";
  const rsiBarColor = rsi.signal === "overbought" ? "bg-red-500"
    : rsi.signal === "oversold" ? "bg-green-500" : "bg-amber";

  const macd = analysis.macd;
  const macdBullish = macd.cross === "bullish";
  const macdBearish = macd.cross === "bearish";

  const bb = analysis.bollinger;
  const stoch = analysis.stochastic;

  return (
    <div className="glass-card rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber" />
          <h2 className="text-sm font-semibold">{symbol} Technical Analysis</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {new Date(analysis.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">RSI (14)</span>
              <span className={`text-sm font-mono font-bold ${rsiColor}`}>{rsi.value.toFixed(1)}</span>
            </div>
            <div className="h-2 rounded-full bg-accent/50 overflow-hidden">
              <div className={`h-full rounded-full ${rsiBarColor}`} style={{ width: `${Math.min(rsi.value, 100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0</span>
              <span className={rsi.signal === "overbought" ? "text-red-500 font-medium" : rsi.signal === "oversold" ? "text-green-500 font-medium" : ""}>
                {rsi.signal === "overbought" ? "Overbought" : rsi.signal === "oversold" ? "Oversold" : "Neutral"}
              </span>
              <span>100</span>
            </div>
          </div>

          <div className="border-t border-border/30 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">MACD</span>
              <div className="flex items-center gap-1">
                {macdBullish && <TrendingUp className="w-3 h-3 text-green-500" />}
                {macdBearish && <TrendingDown className="w-3 h-3 text-red-500" />}
                <span className={`text-xs font-mono font-medium ${macdBullish ? "text-green-500" : macdBearish ? "text-red-500" : "text-muted-foreground"}`}>
                  {macd.cross === "bullish" ? "Bullish" : macd.cross === "bearish" ? "Bearish" : "Neutral"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "MACD", value: macd.macd.toFixed(2), color: "" },
                { label: "Signal", value: macd.signal.toFixed(2), color: "" },
                { label: "Hist", value: macd.histogram.toFixed(2), color: macd.histogram >= 0 ? "text-green-500" : "text-red-500" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                  <div className={`text-xs font-mono font-medium ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Bollinger Bands</span>
              {bb.squeeze && (
                <div className="flex items-center gap-1 text-yellow-500">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-[10px] font-medium">Squeeze</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Upper", value: bb.upper.toFixed(2) },
                { label: "Middle", value: bb.middle.toFixed(2) },
                { label: "Lower", value: bb.lower.toFixed(2) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                  <div className="text-xs font-mono font-medium">{value}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Band Width</span>
              <span className={`text-[10px] font-mono font-medium ${bb.squeeze ? "text-yellow-500" : "text-muted-foreground"}`}>
                {(bb.width * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="border-t border-border/30 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">ATR (14)</span>
              </div>
              <span className="text-xs font-mono font-bold">{analysis.atr.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Stochastic</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono">K:{stoch.k.toFixed(1)}</span>
                <span className="text-[10px] font-mono">D:{stoch.d.toFixed(1)}</span>
                <span className={`text-[10px] font-medium ${
                  stoch.signal === "overbought" ? "text-red-500"
                  : stoch.signal === "oversold" ? "text-green-500" : "text-muted-foreground"
                }`}>{stoch.signal}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <BarChart3 className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">OBV</span>
              </div>
              <span className="text-xs font-mono font-medium">{analysis.obv.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
