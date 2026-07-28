/*
 * Agent Marketplace — deploy pre-built domain agents (Brent Spread, Crack
 * Spread, LNG Forecast, ...). Distinct from the user-strategy marketplace
 * at /dashboard/marketplace (publish/clone backtested strategies).
 */
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { api } from "@/lib/api";
import { useAtom } from "jotai";
import { tokenAtom } from "@/store/auth";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Bot, Loader2, ShieldAlert, ShieldCheck, Shield, Power, Rocket,
  TrendingUp, Waves, Factory, Radio, Ship, Boxes, LineChart,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CatalogAgent {
  key: string;
  name: string;
  category: string;
  description: string;
  riskTier: "low" | "medium" | "high";
  suggestedRiskLimitUsd: number;
}

interface Deployment {
  id: string;
  agentKey: string;
  name: string;
  riskLimitUsd: string;
  status: "active" | "stopped" | "pending_approval";
  confidence: string | null;
  rationale: string | null;
  lastAction: string | null;
  nextAction: string | null;
  createdAt: string;
}

const CATEGORY_ICON: Record<string, any> = {
  Spreads: LineChart,
  Forecasting: Waves,
  Fundamentals: Factory,
  Logistics: Ship,
  Derivatives: TrendingUp,
};

const RISK_STYLE: Record<string, { badge: string; icon: any }> = {
  low: { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: ShieldCheck },
  medium: { badge: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Shield },
  high: { badge: "bg-red-500/10 text-red-400 border-red-500/30", icon: ShieldAlert },
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  pending_approval: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  stopped: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
};

export default function AgentMarketplace() {
  usePageTitle("Agent Marketplace");
  const [token] = useAtom(tokenAtom);
  const [catalog, setCatalog] = useState<CatalogAgent[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deployTarget, setDeployTarget] = useState<CatalogAgent | null>(null);
  const [riskLimit, setRiskLimit] = useState<string>("");
  const [deploying, setDeploying] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [c, d] = await Promise.all([
        api.domainAgents.catalog(),
        token ? api.domainAgents.deployed() : Promise.resolve({ deployments: [] }),
      ]);
      setCatalog(c.agents || []);
      setDeployments(d.deployments || []);
    } catch {
      toast.error("Failed to load agent marketplace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  function openDeploy(agent: CatalogAgent) {
    setDeployTarget(agent);
    setRiskLimit(String(agent.suggestedRiskLimitUsd));
  }

  async function confirmDeploy() {
    if (!deployTarget) return;
    const amount = Number(riskLimit);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid risk limit");
      return;
    }
    setDeploying(true);
    try {
      const r = await api.domainAgents.deploy(deployTarget.key, amount);
      toast.success(r.requiresApproval ? "Deployment submitted for governance approval" : "Agent deployed");
      setDeployTarget(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Deploy failed");
    } finally {
      setDeploying(false);
    }
  }

  async function stop(id: string) {
    try {
      await api.domainAgents.stop(id);
      setDeployments((prev) => prev.map((d) => (d.id === id ? { ...d, status: "stopped" } : d)));
      toast.success("Agent stopped");
    } catch {
      toast.error("Stop failed");
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
          <Bot className="w-7 h-7 text-primary" /> Agent Marketplace
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Deploy pre-built domain specialists. Actions are governed by the platform's risk-tiered approval policy.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {catalog.map((agent) => {
          const Icon = CATEGORY_ICON[agent.category] || Boxes;
          const risk = RISK_STYLE[agent.riskTier];
          const RiskIcon = risk.icon;
          return (
            <motion.div key={agent.key} whileHover={{ y: -2 }} className="glass-card rounded-xl p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <Badge variant="outline" className={risk.badge}>
                  <RiskIcon className="w-3 h-3" /> {agent.riskTier} risk
                </Badge>
              </div>
              <h3 className="font-display font-semibold text-sm mb-1">{agent.name}</h3>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{agent.category}</div>
              <p className="text-xs text-muted-foreground flex-1 mb-4 leading-relaxed">{agent.description}</p>
              <div className="text-[11px] text-muted-foreground mb-3">Suggested limit: <span className="font-mono text-foreground">${agent.suggestedRiskLimitUsd.toLocaleString()}</span></div>
              <Button size="sm" className="w-full gap-1.5" onClick={() => openDeploy(agent)} disabled={!token}>
                <Rocket className="w-3.5 h-3.5" /> Deploy
              </Button>
            </motion.div>
          );
        })}
      </div>

      <div>
        <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary" /> Your Deployments
        </h2>
        {deployments.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center text-sm text-muted-foreground">
            {token ? "No agents deployed yet — deploy one from the catalog above." : "Log in to deploy and manage domain agents."}
          </div>
        ) : (
          <div className="glass-card rounded-xl divide-y divide-border/50">
            {deployments.map((d) => (
              <div key={d.id} className="p-4 flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${d.status === "active" ? "bg-emerald-500 animate-pulse" : d.status === "pending_approval" ? "bg-amber-500 animate-pulse" : "bg-zinc-600"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {d.name}
                    <Badge variant="outline" className={STATUS_STYLE[d.status]}>{d.status.replace("_", " ")}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Limit ${Number(d.riskLimitUsd).toLocaleString()} · confidence {d.confidence ? `${(Number(d.confidence) * 100).toFixed(0)}%` : "—"} · {d.nextAction || "—"}
                  </div>
                </div>
                {d.status !== "stopped" && (
                  <button
                    onClick={() => stop(d.id)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:scale-110 transition-transform"
                    title="Stop agent"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!deployTarget} onOpenChange={(open) => !open && setDeployTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy {deployTarget?.name}</DialogTitle>
            <DialogDescription>
              Set a risk limit in USD. {deployTarget?.riskTier === "high" && "High-risk agents require governance approval before they go active."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Risk limit (USD)</label>
            <input
              type="number"
              min={100}
              value={riskLimit}
              onChange={(e) => setRiskLimit(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeployTarget(null)}>Cancel</Button>
            <Button onClick={confirmDeploy} disabled={deploying} className="gap-1.5">
              {deploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
              Deploy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
