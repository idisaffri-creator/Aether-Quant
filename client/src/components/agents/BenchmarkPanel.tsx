import { useState, useEffect, useCallback } from "react";
import { Play, Loader2, BarChart3, TrendingUp, Award } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";

interface BenchmarkResult {
  id: string; agentId: string; agentName: string; testCase: string;
  category: string; score: number; passed: boolean; details: string; timestamp: number;
}

interface BenchmarkData {
  summaries: Record<string, {
    totalTests: number; passed: number; averageScore: number; lastRun: string | null;
    results: BenchmarkResult[];
  }>;
  history: { date: string; score: number }[];
}

function gradeLetter(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function gradeColor(letter: string): string {
  const map: Record<string, string> = { A: "text-green-500", B: "text-emerald-500", C: "text-yellow-500", D: "text-orange-500" };
  return map[letter] || "text-red-500";
}

export default function BenchmarkPanel() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBenchmark = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("aether_token");
      const res = await fetch("/api/agents/benchmark", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBenchmark(); }, [fetchBenchmark]);

  if (!data) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Agent Benchmarks</h2>
          <button onClick={fetchBenchmark} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/50 text-muted-foreground hover:text-foreground transition-all"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {loading ? "Running..." : "Run Benchmark"}
          </button>
        </div>
        <div className="text-center py-8 text-xs text-muted-foreground">
          No benchmark data yet. Click "Run Benchmark" to start.
        </div>
      </div>
    );
  }

  const allResults = Object.values(data.summaries).flatMap(s => s.results);
  const overallAvg = allResults.length > 0
    ? Math.round(allResults.reduce((a, r) => a + r.score, 0) / allResults.length) : 0;
  const grade = gradeLetter(overallAvg);

  const categoryAvg = (cat: string) => {
    const filtered = allResults.filter(r => r.category === cat);
    return filtered.length > 0
      ? Math.round(filtered.reduce((a, r) => a + r.score, 0) / filtered.length) : 0;
  };

  const distData = [
    { category: "decision", score: categoryAvg("decision") },
    { category: "timing", score: categoryAvg("timing") },
    { category: "risk", score: categoryAvg("risk") },
    { category: "signal", score: categoryAvg("signal") },
  ];

  const totalTests = allResults.length;
  const passed = allResults.filter(r => r.passed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Agent Benchmarks</h2>
        <button onClick={fetchBenchmark} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/50 text-muted-foreground hover:text-foreground transition-all"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {loading ? "Running..." : "Run Benchmark"}
        </button>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <div className={`text-5xl font-bold font-mono ${gradeColor(grade)}`}>{grade}</div>
            <div className="text-[10px] text-muted-foreground mt-1">GRADE</div>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4">
            {[
              { label: "AVG SCORE", value: overallAvg },
              { label: "PASSED", value: `${passed}/${totalTests}` },
              { label: "RUNS", value: data.history.length },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-mono font-bold">{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 text-xs font-semibold mb-3">
          <BarChart3 className="w-3.5 h-3.5 text-amber" />Score by Category
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={distData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="score" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {data.history.length > 1 && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs font-semibold mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-amber" />Historical Trend
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={data.history.map((h, i) => ({ run: i + 1, score: h.score }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="run" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="score" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 text-xs font-semibold mb-3">
          <Award className="w-3.5 h-3.5 text-amber" />Test Results
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {["Agent", "Test Case", "Category", "Score", "Status"].map(h => (
                  <th key={h} className={`py-2 text-muted-foreground font-medium ${h === "Score" || h === "Status" ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allResults.map(r => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                  <td className="py-2 font-medium">{r.agentName}</td>
                  <td className="py-2 text-muted-foreground">{r.testCase}</td>
                  <td className="py-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent/30 text-muted-foreground">
                      {r.category}
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono font-bold">{r.score}</td>
                  <td className="py-2 text-right">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      r.passed ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    }`}>
                      {r.passed ? "PASS" : "FAIL"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
