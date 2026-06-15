import { useState, useCallback } from "react";
import { Play, Check, RotateCcw, TrendingUp, BarChart3, Target, Gauge } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

interface ParamDef {
  key: string; label: string; min: number; max: number; step: number; current: number;
}

interface OptResult {
  bestParams: Record<string, number>;
  before: Record<string, number>;
  after: Record<string, number>;
  improvement: Record<string, number>;
  history: { iteration: number; value: number }[];
}

const defaultParams: ParamDef[] = [
  { key: "emaShort", label: "EMA Short", min: 5, max: 50, step: 1, current: 12 },
  { key: "emaLong", label: "EMA Long", min: 20, max: 200, step: 5, current: 26 },
  { key: "rsiThreshold", label: "RSI Threshold", min: 20, max: 80, step: 5, current: 30 },
  { key: "stopLoss", label: "Stop Loss %", min: 0.5, max: 5, step: 0.5, current: 2 },
  { key: "takeProfit", label: "Take Profit %", min: 1, max: 10, step: 1, current: 3 },
  { key: "positionSize", label: "Position Size %", min: 5, max: 50, step: 5, current: 20 },
];

const modes = ["Grid Search", "Random Search", "Genetic Algorithm"] as const;
const metrics = ["Sharpe Ratio", "Sortino", "Win Rate", "Profit Factor", "Calmar Ratio"] as const;
const metricKeys = ["sharpe", "sortino", "winRate", "profitFactor", "calmar"];
const metricLabels = ["Sharpe Ratio", "Sortino", "Win Rate", "Profit Factor", "Calmar Ratio"];
const baseVals = [1.42, 1.18, 58.3, 1.85, 0.92];
const optVals = [2.14, 1.76, 71.2, 2.48, 1.45];

function generateMockResult(params: ParamDef[], metric: (typeof metrics)[number]): OptResult {
  const bestParams: Record<string, number> = {};
  const before: Record<string, number> = {};
  const after: Record<string, number> = {};
  const improvement: Record<string, number> = {};
  for (const p of params) {
    bestParams[p.key] = p.min + Math.round((p.max - p.min) / p.step / 2) * p.step;
  }
  metricKeys.forEach((k, i) => {
    before[k] = baseVals[i];
    after[k] = optVals[i];
    improvement[k] = ((optVals[i] - baseVals[i]) / baseVals[i]) * 100;
  });
  const idx = Math.max(0, metrics.indexOf(metric));
  const history = Array.from({ length: 20 }, (_, i) => ({
    iteration: i + 1,
    value: baseVals[idx] + (optVals[idx] - baseVals[idx]) * ((i + 1) / 20) + (Math.random() - 0.5) * 0.2,
  }));
  return { bestParams, before, after, improvement, history };
}

export default function StrategyOptimizer() {
  const [params, setParams] = useState<ParamDef[]>(defaultParams);
  const [mode, setMode] = useState<(typeof modes)[number]>("Grid Search");
  const [metric, setMetric] = useState<(typeof metrics)[number]>("Sharpe Ratio");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OptResult | null>(null);
  const [heatmapX, setHeatmapX] = useState("emaShort");
  const [heatmapY, setHeatmapY] = useState("emaLong");

  const updateParam = useCallback((key: string, value: number) => {
    setParams((prev) => prev.map((p) => (p.key === key ? { ...p, current: value } : p)));
  }, []);

  const runOptimization = useCallback(async () => {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 2000));
    setResult(generateMockResult(params, metric));
    setRunning(false);
  }, [params, metric]);

  const applyParams = useCallback(() => {
    if (!result) return;
    setParams((prev) =>
      prev.map((p) => ({ ...p, current: result.bestParams[p.key] ?? p.current }))
    );
  }, [result]);

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">Strategy Parameters</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 pr-4">Parameter</th>
                <th className="text-right px-2">Min</th>
                <th className="text-right px-2">Max</th>
                <th className="text-right px-2">Step</th>
                <th className="text-right pl-2">Current</th>
              </tr>
            </thead>
            <tbody>
              {params.map((p) => (
                <tr key={p.key} className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-medium">{p.label}</td>
                  <td className="py-2.5 px-2 text-right text-muted-foreground">{p.min}</td>
                  <td className="py-2.5 px-2 text-right text-muted-foreground">{p.max}</td>
                  <td className="py-2.5 px-2 text-right text-muted-foreground">{p.step}</td>
                  <td className="py-2.5 pl-2 text-right">
                    <input
                      type="number" value={p.current}
                      min={p.min} max={p.max} step={p.step}
                      onChange={(e) => updateParam(p.key, parseFloat(e.target.value) || p.min)}
                      className="w-20 text-right bg-accent/30 rounded px-2 py-1 text-xs font-mono border border-border/50 focus:border-amber outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Optimization Mode</h3>
          <div className="flex flex-wrap gap-1.5">
            {modes.map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === m ? "bg-amber text-black" : "bg-accent/50 text-muted-foreground hover:text-foreground"}`}
              >{m}</button>
            ))}
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Optimize Metric</h3>
          <div className="flex flex-wrap gap-1.5">
            {metrics.map((m) => (
              <button key={m} onClick={() => setMetric(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${metric === m ? "bg-amber text-black" : "bg-accent/50 text-muted-foreground hover:text-foreground"}`}
              >{m}</button>
            ))}
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex flex-col justify-center">
          <button onClick={runOptimization} disabled={running}
            className="btn-amber px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {running ? <><RotateCcw className="w-4 h-4 animate-spin" /> Optimizing...</> : <><Play className="w-4 h-4" /> Run Optimization</>}
          </button>
        </div>
      </div>

      {result && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Optimization Results</h2>
            <button onClick={applyParams}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all"
            >
              <Check className="w-3 h-3" /> Apply to Strategy
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(result.bestParams).map(([k, v]) => {
              const label = params.find((p) => p.key === k)?.label || k;
              return (
                <div key={k} className="bg-amber/10 text-amber px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium">
                  {label}: <strong>{v}</strong>
                </div>
              );
            })}
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-2 pr-4">Metric</th>
                  <th className="text-right px-2">Before</th>
                  <th className="text-right px-2">After</th>
                  <th className="text-right pl-2">Improvement</th>
                </tr>
              </thead>
              <tbody>
                {metricKeys.map((k, i) => (
                  <tr key={k} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium">{metricLabels[i]}</td>
                    <td className="py-2 px-2 text-right text-muted-foreground">{result.before[k].toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-medium">{result.after[k].toFixed(2)}</td>
                    <td className={`py-2 pl-2 text-right font-medium ${result.improvement[k] >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {result.improvement[k] >= 0 ? "+" : ""}{result.improvement[k].toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.history}>
                <XAxis dataKey="iteration" tick={{ fontSize: 10 }} stroke="oklch(1 0 0 / 20%)" />
                <YAxis tick={{ fontSize: 10 }} stroke="oklch(1 0 0 / 20%)" domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "oklch(0.15 0.009 260)", border: "1px solid oklch(1 0 0 / 8%)", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="value" stroke="oklch(0.72 0.18 60)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground">2D Parameter Sweep</h3>
              <select value={heatmapX} onChange={(e) => setHeatmapX(e.target.value)}
                className="bg-accent/30 rounded px-2 py-1 text-xs border border-border/50 outline-none"
              >
                {params.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
              <span className="text-xs text-muted-foreground">×</span>
              <select value={heatmapY} onChange={(e) => setHeatmapY(e.target.value)}
                className="bg-accent/30 rounded px-2 py-1 text-xs border border-border/50 outline-none"
              >
                {params.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: 32 }, (_, i) => {
                const val = Math.random();
                return (
                  <div key={i} className="aspect-square rounded"
                    style={{ backgroundColor: `oklch(${0.5 + val * 0.3} ${0.12 + val * 0.12} 60)` }}
                    title={`Value: ${(val * 100).toFixed(0)}%`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
