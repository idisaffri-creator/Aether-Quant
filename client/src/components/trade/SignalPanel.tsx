import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { TradeSignal } from "@shared/types";
import { Zap, BellOff, CheckCircle2 } from "lucide-react";

function confidenceColor(confidence: number): string {
  if (confidence >= 0.7) return "bg-green-500";
  if (confidence >= 0.4) return "bg-yellow-500";
  return "bg-red-500";
}

function confidenceTextColor(confidence: number): string {
  if (confidence >= 0.7) return "text-green-500";
  if (confidence >= 0.4) return "text-yellow-500";
  return "text-red-500";
}

export default function SignalPanel() {
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSignals = async () => {
    try {
      const data = await api.agents.signals();
      setSignals(data.signals);
    } catch {
      setSignals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (id: string) => {
    try {
      await api.agents.acknowledgeSignal(id);
      setSignals((prev) => prev.filter((s) => s.id !== id));
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">Trade Signals</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-accent/30" />
          ))}
        </div>
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber" />
          <h2 className="text-sm font-semibold">Trade Signals</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <BellOff className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-xs">No active signals</p>
          <p className="text-[10px] mt-1">Signals update every 60 seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber" />
          <h2 className="text-sm font-semibold">Trade Signals</h2>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground bg-accent/30 px-2 py-0.5 rounded-full">
          {signals.length} active
        </span>
      </div>

      <div className="space-y-2">
        {signals.map((signal) => (
          <div
            key={signal.id}
            className="p-3 rounded-lg bg-accent/30 border border-border/50 hover:border-border transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold">{signal.symbol}</span>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    signal.direction === "long"
                      ? "bg-green-500/15 text-green-500"
                      : "bg-red-500/15 text-red-500"
                  }`}
                >
                  {signal.direction.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded">
                  {signal.strategy}
                </span>
              </div>
              <button
                onClick={() => handleAcknowledge(signal.id)}
                className="p-1 rounded hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
                title="Acknowledge"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{signal.reason}</p>

            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 rounded-full bg-accent/50 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${confidenceColor(signal.confidence)}`}
                  style={{ width: `${signal.confidence * 100}%` }}
                />
              </div>
              <span className={`text-[10px] font-mono font-medium ${confidenceTextColor(signal.confidence)}`}>
                {(signal.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
