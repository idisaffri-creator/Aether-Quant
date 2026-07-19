/*
 * Executive Dashboard — dense KPI-card view for decision-makers.
 * Visually distinct from the trader-facing Digital Trading Floor: no
 * per-agent controls here, just the numbers that matter for oversight.
 */
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { api } from "@/lib/api";
import { useAtom } from "jotai";
import { tokenAtom } from "@/store/auth";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Crown, Loader2, Wallet, ShieldAlert, Umbrella, Users, Bell,
  FileWarning, Cpu, Gauge, TrendingUp, TrendingDown,
} from "lucide-react";

interface Summary {
  asOf: string;
  portfolio: { equity: number; todaysPnl: number; todaysPnlPct: number };
  risk: { valueAtRisk95: number; exposure: number; exposurePct: number; maxDrawdownPct: number };
  hedgeEffectiveness: number;
  agentPerformance: { totalAgents: number; activeDomainAgents: number; pendingApproval: number; avgConfidence: number };
  marketAlerts: { unread: number; recent: Array<{ id: string; title: string; createdAt: string }> };
  regulatoryExposure: { kycStatus: string; openFlags: number };
  aiOperatingCost: { totalUsd: number; avgDecisionLatencyMs: number };
  avgConfidenceScore: number;
}

export default function ExecutiveDashboard() {
  usePageTitle("Executive Dashboard");
  const [token] = useAtom(tokenAtom);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const r = await api.executive.summary();
      setSummary(r);
    } catch {
      toast.error("Failed to load executive summary");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  if (loading || !summary) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const pnlPositive = summary.portfolio.todaysPnl >= 0;

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
          <Crown className="w-7 h-7 text-primary" /> Executive Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Oversight view — portfolio, risk, agent performance, and compliance at a glance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={Wallet}
          label="Portfolio Value"
          value={`$${summary.portfolio.equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`${pnlPositive ? "+" : ""}$${summary.portfolio.todaysPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })} today (${(summary.portfolio.todaysPnlPct * 100).toFixed(2)}%)`}
          positive={pnlPositive}
          trendIcon={pnlPositive ? TrendingUp : TrendingDown}
        />
        <Kpi
          icon={ShieldAlert}
          label="Risk Exposure / VaR (95%)"
          value={`$${summary.risk.valueAtRisk95.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`$${summary.risk.exposure.toLocaleString(undefined, { maximumFractionDigits: 0 })} exposure · ${(summary.risk.exposurePct * 100).toFixed(1)}% of equity`}
        />
        <Kpi
          icon={Umbrella}
          label="Hedge Effectiveness"
          value={`${(summary.hedgeEffectiveness * 100).toFixed(0)}%`}
          sub={`Max drawdown ${(summary.risk.maxDrawdownPct * 100).toFixed(1)}%`}
          positive={summary.hedgeEffectiveness > 0.6}
        />
        <Kpi
          icon={Users}
          label="Agent Performance"
          value={`${summary.agentPerformance.activeDomainAgents}/${summary.agentPerformance.totalAgents} active`}
          sub={`${summary.agentPerformance.pendingApproval} pending approval · ${(summary.agentPerformance.avgConfidence * 100).toFixed(0)}% avg confidence`}
        />
        <Kpi
          icon={Bell}
          label="Market Alerts"
          value={String(summary.marketAlerts.unread)}
          sub={summary.marketAlerts.recent[0]?.title || "No recent alerts"}
          positive={summary.marketAlerts.unread === 0}
        />
        <Kpi
          icon={FileWarning}
          label="Regulatory Exposure"
          value={summary.regulatoryExposure.kycStatus.replace("_", " ")}
          sub={`${summary.regulatoryExposure.openFlags} open compliance flag(s)`}
          positive={summary.regulatoryExposure.openFlags === 0}
        />
        <Kpi
          icon={Cpu}
          label="AI Operating Cost"
          value={`$${summary.aiOperatingCost.totalUsd.toFixed(4)}`}
          sub={`${summary.aiOperatingCost.avgDecisionLatencyMs}ms avg decision latency`}
        />
        <Kpi
          icon={Gauge}
          label="Avg Confidence Score"
          value={`${(summary.avgConfidenceScore * 100).toFixed(0)}%`}
          sub="Across active agent recommendations"
          positive={summary.avgConfidenceScore > 0.6}
        />
      </div>

      <div className="text-[11px] text-muted-foreground text-right">As of {new Date(summary.asOf).toLocaleString()}</div>
    </motion.div>
  );
}

function Kpi({ icon: Icon, label, value, sub, positive, trendIcon: TrendIcon }: { icon: any; label: string; value: string; sub: string; positive?: boolean; trendIcon?: any }) {
  return (
    <div className="glass-card rounded-xl p-5 border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
        <Icon className={`w-4 h-4 ${positive === true ? "text-emerald-400" : positive === false ? "text-red-400" : "text-primary"}`} />
      </div>
      <div className={`text-2xl font-display font-bold capitalize flex items-center gap-1.5 ${positive === true ? "text-emerald-400" : positive === false ? "text-red-400" : "text-foreground"}`}>
        {TrendIcon && <TrendIcon className="w-4 h-4" />}
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1 truncate">{sub}</div>
    </div>
  );
}
