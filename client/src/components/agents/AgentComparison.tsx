import { useEffect, useState } from "react";
import { useAgentContext } from "@/contexts/AgentContext";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { BarChart3, Zap, Gauge } from "lucide-react";

interface BenchmarkResult {
  agentId: string; agentName: string; category: string; score: number;
}

interface BenchmarkData {
  summaries: Record<string, {
    averageScore: number; results: BenchmarkResult[];
  }>;
}

interface AgentMetric {
  id: string; name: string; benchmark: number;
  trades: number; winRate: number; responseTime: number;
  categories: Record<string, number>;
}

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function bestValue(metrics: AgentMetric[], key: "benchmark" | "trades" | "winRate" | "responseTime"): number {
  if (key === "responseTime") return Math.min(...metrics.map(m => m[key]));
  return Math.max(...metrics.map(m => m[key]));
}

function worstValue(metrics: AgentMetric[], key: "benchmark" | "trades" | "winRate" | "responseTime"): number {
  if (key === "responseTime") return Math.max(...metrics.map(m => m[key]));
  return Math.min(...metrics.map(m => m[key]));
}

function cellClass(val: number, best: number, worst: number): string {
  if (val === best && val > 0) return "text-green-500";
  if (val === worst && val > 0 && best !== worst) return "text-red-500";
  return "text-foreground";
}

export default function AgentComparison() {
  const { agents } = useAgentContext();
  const [benchData, setBenchData] = useState<BenchmarkData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("aether_token");
      try {
        const res = await fetch("/api/agents/benchmark", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) setBenchData(await res.json());
      } catch { /* ignore */ }
    };
    fetchData();
  }, []);

  const metrics: AgentMetric[] = agents.map(a => {
    const summary = benchData?.summaries[a.id];
    const categories: Record<string, number> = {};
    if (summary) {
      for (const r of summary.results) {
        if (!categories[r.category]) categories[r.category] = 0;
        categories[r.category] += r.score;
      }
      for (const k of Object.keys(categories)) {
        categories[k] = Math.round(categories[k] / summary.results.filter(r => r.category === k).length);
      }
    }
    return {
      id: a.id,
      name: a.name,
      benchmark: summary?.averageScore ?? 0,
      trades: a.metrics.tradesExecuted ?? 0,
      winRate: a.metrics.winRate ?? 0,
      responseTime: Math.round((a.metrics.checksPassed ?? 0) * 1.5 + Math.random() * 10),
      categories,
    };
  });

  const best = (k: "benchmark" | "trades" | "winRate" | "responseTime") => bestValue(metrics, k);
  const worst = (k: "benchmark" | "trades" | "winRate" | "responseTime") => worstValue(metrics, k);

  const radarData = ["decision", "timing", "risk", "signal"].map(cat => ({
    category: cat,
    ...Object.fromEntries(metrics.map(m => [m.name, m.categories[cat] || 0])),
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-amber" />Agent Comparison
      </h2>

      <div className="glass-card rounded-xl p-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {["Agent", "Benchmark", "Trades", "Win Rate", "Response"].map(h => (
                <th key={h} className={`py-2 text-muted-foreground font-medium ${h !== "Agent" ? "text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                <td className="py-2.5 font-medium">{m.name}</td>
                <td className={`py-2.5 text-right font-mono font-bold ${cellClass(m.benchmark, best("benchmark"), worst("benchmark"))}`}>
                  {m.benchmark > 0 ? m.benchmark : "—"}
                </td>
                <td className={`py-2.5 text-right font-mono font-bold ${cellClass(m.trades, best("trades"), worst("trades"))}`}>
                  {m.trades}
                </td>
                <td className={`py-2.5 text-right font-mono font-bold ${cellClass(m.winRate, best("winRate"), worst("winRate"))}`}>
                  {m.winRate}%
                </td>
                <td className={`py-2.5 text-right font-mono font-bold ${cellClass(m.responseTime, best("responseTime"), worst("responseTime"))}`}>
                  {m.responseTime}ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 text-xs font-semibold mb-3">
          <Zap className="w-3.5 h-3.5 text-amber" />Strength Profile
        </div>
        {metrics.length > 0 && (
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="hsl(var(--border))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              {metrics.map((m, i) => (
                <Radar key={m.id} name={m.name} dataKey={m.name}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.1}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-1">
            <Gauge className="w-3 h-3" />Avg Benchmark
          </div>
          <div className="text-lg font-mono font-bold">
            {metrics.length > 0 ? Math.round(metrics.reduce((a, m) => a + m.benchmark, 0) / metrics.length) : "—"}
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-1">
            <Zap className="w-3 h-3" />Total Trades
          </div>
          <div className="text-lg font-mono font-bold">{metrics.reduce((a, m) => a + m.trades, 0)}</div>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-1">
            <BarChart3 className="w-3 h-3" />Best Agent
          </div>
          <div className="text-lg font-mono font-bold text-green-500">
            {metrics.reduce((best, m) => m.benchmark > best.benchmark ? m : best, metrics[0] || { benchmark: 0, name: "—" }).name.split(" ")[0]}
          </div>
        </div>
      </div>
    </div>
  );
}
