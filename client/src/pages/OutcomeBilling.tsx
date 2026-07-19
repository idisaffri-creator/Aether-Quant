/*
 * AI FinOps & Billing — cost breakdown per agent (simulated cost model,
 * see server/services/finops/costTracker.ts) plus net ROI and portfolio
 * totals. Paper trading remains free; live trading still uses underlying
 * broker fees with no platform markup — this page is about AI operating
 * cost, not brokerage billing.
 */
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { api } from "@/lib/api";
import { useAtom } from "jotai";
import { tokenAtom } from "@/store/auth";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Receipt, Loader2, Cpu, Database, Server, TrendingUp, TrendingDown, Info } from "lucide-react";

interface FinopsAgent {
  agentKey: string;
  name: string;
  costByType: { ai_model: number; data: number; infra: number };
  totalCost: number;
  attributedPnl: number;
  netRoi: number;
}

interface FinopsSummary {
  agents: FinopsAgent[];
  portfolioTotalCost: number;
  portfolioAttributedPnl?: number;
  portfolioNetRoi: number;
  note: string;
}

export default function OutcomeBilling() {
  usePageTitle("AI FinOps & Billing");
  const [token] = useAtom(tokenAtom);
  const [summary, setSummary] = useState<FinopsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.finops.summary()
      .then(setSummary)
      .catch(() => toast.error("Failed to load FinOps summary"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading || !summary) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const roiPositive = summary.portfolioNetRoi >= 0;

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
          <Receipt className="w-7 h-7 text-primary" /> AI FinOps & Billing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cost accounting for every agent working the account, and what it's netting you. Paper trading stays free; live trading still uses underlying broker fees only.
        </p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300/90">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{summary.note}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat icon={Cpu} label="Portfolio AI Operating Cost" value={`$${summary.portfolioTotalCost.toFixed(4)}`} />
        <Stat icon={roiPositive ? TrendingUp : TrendingDown} label="Portfolio Net ROI" value={`${roiPositive ? "+" : ""}$${summary.portfolioNetRoi.toFixed(4)}`} positive={roiPositive} />
        <Stat icon={Server} label="Agents Tracked" value={String(summary.agents.length)} />
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h2 className="text-sm font-display font-semibold">Cost Breakdown by Agent</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                <th className="px-4 py-2 font-semibold">Agent</th>
                <th className="px-4 py-2 font-semibold flex items-center gap-1"><Cpu className="w-3 h-3" /> AI Model</th>
                <th className="px-4 py-2 font-semibold"><Database className="w-3 h-3 inline mr-1" />Data</th>
                <th className="px-4 py-2 font-semibold"><Server className="w-3 h-3 inline mr-1" />Infra</th>
                <th className="px-4 py-2 font-semibold">Total Cost</th>
                <th className="px-4 py-2 font-semibold">Net ROI</th>
              </tr>
            </thead>
            <tbody>
              {summary.agents.map((a) => (
                <tr key={a.agentKey} className="border-b border-border/30 hover:bg-accent/20">
                  <td className="px-4 py-2.5 font-medium">{a.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">${a.costByType.ai_model.toFixed(4)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">${a.costByType.data.toFixed(4)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">${a.costByType.infra.toFixed(4)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">${a.totalCost.toFixed(4)}</td>
                  <td className={`px-4 py-2.5 font-mono text-xs ${a.netRoi >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {a.netRoi >= 0 ? "+" : ""}${a.netRoi.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ icon: Icon, label, value, positive }: { icon: any; label: string; value: string; positive?: boolean }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
        <Icon className={`w-4 h-4 ${positive === true ? "text-emerald-400" : positive === false ? "text-red-400" : "text-primary"}`} />
      </div>
      <div className={`text-2xl font-display font-bold ${positive === true ? "text-emerald-400" : positive === false ? "text-red-400" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
