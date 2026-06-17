/**
 * Real-time OHLCV candle chart using lightweight-charts (TradingView OSS).
 */
import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, type IChartApi, type ISeriesApi, type Time, ColorType } from "lightweight-charts";
import { Loader2, RefreshCw } from "lucide-react";

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface Props {
  symbol: string;
  resolution?: "1m" | "5m" | "15m" | "1h" | "1d";
  height?: number;
  onRefresh?: () => void;
}

export default function CandleChart({ symbol, resolution = "1h", height = 320, onRefresh }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#a3a3a3",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(255,255,255,0.1)",
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.1)",
      },
      crosshair: {
        vertLine: { color: "rgba(245,158,11,0.4)", width: 1 },
        horzLine: { color: "rgba(245,158,11,0.4)", width: 1 },
      },
      width: containerRef.current.clientWidth,
      height,
    });
    chartRef.current = chart;
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });
    seriesRef.current = series;

    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.resize(containerRef.current.clientWidth, height);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!seriesRef.current) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`https://aether-energy.ai/api/market/history/${symbol}?resolution=${resolution}&count=100`, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const candles: Candle[] = await res.json();
        if (cancelled) return;
        const data = candles.map((c) => ({
          time: Math.floor(c.timestamp / 1000) as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        seriesRef.current.setData(data);
        chartRef.current?.timeScale().fitContent();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [symbol, resolution]);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">
          {symbol} · {resolution}
        </div>
        {onRefresh && (
          <button onClick={onRefresh} className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-red-400">{error}</div>
      )}
      <div ref={containerRef} style={{ width: "100%", height }} />
    </div>
  );
}
