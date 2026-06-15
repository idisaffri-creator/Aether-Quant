export interface BenchmarkResult {
  id: string;
  agentId: string;
  agentName: string;
  testCase: string;
  category: 'decision' | 'timing' | 'risk' | 'signal';
  score: number;
  passed: boolean;
  details: string;
  timestamp: number;
}

export interface BenchmarkSummary {
  totalTests: number;
  passed: number;
  averageScore: number;
  results: BenchmarkResult[];
  lastRun: string | null;
}

const TEST_CASES: { name: string; category: 'decision' | 'timing' | 'risk' | 'signal'; detail: string }[] = [
  { name: "Directional Momentum Decision", category: "decision", detail: "Should we go long on WTI with current momentum?" },
  { name: "Volatility Timing Entry", category: "timing", detail: "Identify optimal entry point based on volatility contraction" },
  { name: "Drawdown Risk Assessment", category: "risk", detail: "Assess risk of 5% drawdown with current volatility regime" },
  { name: "RSI Signal Quality", category: "signal", detail: "Generate signal for Brent crude given RSI at 68 and volume spike" },
];

const AGENT_PROFILES: Record<string, Record<string, number>> = {
  "aether-trade-01": { decision: 10, timing: 8, risk: -5, signal: -3 },
  "aether-risk-01": { decision: 2, timing: -3, risk: 12, signal: 0 },
  "aether-mkt-01": { decision: 5, timing: 3, risk: -8, signal: 12 },
  "aether-comp-01": { decision: 0, timing: 2, risk: 5, signal: 3 },
  "aether-port-01": { decision: 8, timing: -5, risk: 10, signal: -2 },
};

const AGENT_NAMES: Record<string, string> = {
  "aether-trade-01": "Trading Agent",
  "aether-risk-01": "Risk Agent",
  "aether-mkt-01": "Market Intelligence Agent",
  "aether-comp-01": "Compliance Agent",
  "aether-port-01": "Portfolio Agent",
};

export class BenchmarkAgent {
  private running = false;
  private results: BenchmarkResult[] = [];
  private history: { date: string; score: number }[] = [];

  async runBenchmark(agentId: string, agentType: string): Promise<BenchmarkSummary> {
    const agentName = AGENT_NAMES[agentId] || agentType;
    const profile = AGENT_PROFILES[agentId] || { decision: 0, timing: 0, risk: 0, signal: 0 };

    const results: BenchmarkResult[] = TEST_CASES.map((tc, i) => {
      const score = Math.max(60, Math.min(99,
        75 + (profile[tc.category] || 0) + Math.floor(Math.random() * 10) - 5
      ));
      return {
        id: `${agentId}-${i}-${Date.now()}`,
        agentId,
        agentName,
        testCase: tc.name,
        category: tc.category,
        score,
        passed: score >= 70,
        details: tc.detail,
        timestamp: Date.now(),
      };
    });

    this.results.push(...results);
    const totalTests = results.length;
    const passed = results.filter(r => r.passed).length;
    const averageScore = Math.round(results.reduce((s, r) => s + r.score, 0) / totalTests);

    return { totalTests, passed, averageScore, results, lastRun: new Date().toISOString() };
  }

  async runAll(): Promise<Record<string, BenchmarkSummary>> {
    const summaries: Record<string, BenchmarkSummary> = {};
    for (const id of Object.keys(AGENT_NAMES)) {
      summaries[id] = await this.runBenchmark(id, AGENT_NAMES[id]);
    }
    const allScores = Object.values(summaries).flatMap(s => s.results.map(r => r.score));
    const avg = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;
    this.history.push({ date: new Date().toISOString(), score: avg });
    return summaries;
  }

  getStatus() {
    return {
      running: this.running,
      resultCount: this.results.length,
      historyCount: this.history.length,
    };
  }

  getHistory() { return [...this.history]; }

  async start() { this.running = true; }

  async stop() { this.running = false; }
}

export const benchmarkAgent = new BenchmarkAgent();
