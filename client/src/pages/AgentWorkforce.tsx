/*
 * Digital Trading Floor (formerly "Agent Workforce") — real-time status of
 * every agent working the account: the 6 roster agents (trading, risk,
 * market intel, compliance, portfolio, signals), deployed domain agents
 * from the Agent Marketplace, and user strategy threads. Includes a
 * global kill switch (hard stop, confirm-gated).
 */
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { api } from "@/lib/api";
import { useAtom } from "jotai";
import { tokenAtom } from "@/store/auth";
import { Users, Activity, Zap, Loader2, Power, Play, AlertTriangle, Gauge, ListChecks } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatDistanceToNow } from "@/lib/dateUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface RosterAgent {
  id: string;
  name: string;
  status: "idle" | "running" | "error" | "paused";
  lastRun: string | null;
  metrics: Record<string, number>;
  lastCycle: { observeMs: number; thinkMs: number; actMs: number; checkMs: number; totalMs: number; at: string } | null;
}

interface DomainDeployment {
  id: string;
  agentKey: string;
  name: string;
  riskLimitUsd: string;
  status: "active" | "stopped" | "pending_approval";
  confidence: string | null;
  rationale: string | null;
  lastAction: string | null;
  nextAction: string | null;
}

export default function AgentWorkforce() {
  usePageTitle("Digital Trading Floor");
  const [token] = useAtom(tokenAtom);
  const [roster, setRoster] = useState<RosterAgent[]>([]);
  const [deployments, setDeployments] = useState<DomainDeployment[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [killing, setKilling] = useState(false);

  async function load() {
    if (!token) return;
    try {
      const [r, d, s] = await Promise.all([
        api.agents.status().catch(() => ({ agents: [] })),
        api.domainAgents.deployed().catch(() => ({ deployments: [] })),
        api.strategies.listCustom().catch(() => ({ strategies: [] })),
      ]);
      setRoster(r.agents || []);
      setDeployments(d.deployments || []);
      setItems(s.strategies || []);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [token]);

  async function toggleRoster(agent: RosterAgent) {
    try {
      if (agent.status === "running") {
        await api.agents.stop(agent.id);
        setRoster((prev) => prev.map((a) => (a.id === agent.id ? { ...a, status: "paused" } : a)));
      } else {
        await api.agents.start(agent.id);
        setRoster((prev) => prev.map((a) => (a.id === agent.id ? { ...a, status: "running" } : a)));
      }
      toast.success(agent.status === "running" ? "Agent stopped" : "Agent started");
    } catch { toast.error("Action failed"); }
  }

  async function stopDeployment(id: string) {
    try {
      await api.domainAgents.stop(id);
      setDeployments((prev) => prev.map((d) => (d.id === id ? { ...d, status: "stopped" } : d)));
      toast.success("Agent stopped");
    } catch { toast.error("Stop failed"); }
  }

  async function toggleStrategy(id: string, enabled: boolean) {
    try {
      await api.strategies.updateCustom(id, { enabled: !enabled });
      setItems(prev => prev.map(s => s.id === id ? { ...s, enabled: !enabled } : s));
      toast.success(enabled ? "Disabled" : "Enabled");
    } catch { toast.error("Update failed"); }
  }

  async function killSwitch() {
    setKilling(true);
    try {
      const r = await api.governance.killSwitch();
      toast.success(`${r.message} — ${r.agentsStopped} agents stopped, ${r.strategiesDisabled} strategies disabled`);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Kill switch failed");
    } finally {
      setKilling(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const totalActive = roster.filter(a => a.status === "running").length + deployments.filter(d => d.status === "active").length + items.filter(s => s.enabled).length;
  const totalAgents = roster.length + deployments.length + items.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Digital Trading Floor</h1>
          <p className="text-sm text-muted-foreground mt-1">Live status of every agent working the account — roster agents, deployed domain agents, and strategy threads.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2 shadow-lg shadow-red-500/20" disabled={!token}>
              <Power className="w-4 h-4" /> Kill Switch
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" /> Stop everything?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This immediately stops every deployed domain agent and disables every active custom strategy on your account. This is a hard stop — you'll need to manually re-enable each one afterward.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={killSwitch} disabled={killing} className="bg-destructive hover:bg-destructive/90">
                {killing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Stop everything"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Total agents" value={String(totalAgents)} icon={Users} />
        <Stat label="Active" value={String(totalActive)} icon={Zap} positive />
        <Stat label="Idle / Stopped" value={String(totalAgents - totalActive)} icon={Activity} />
      </div>

      {/* Roster agents */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5" /> Roster Agents
        </h2>
        <div className="glass-card rounded-xl divide-y divide-border/50">
          {roster.map((a) => (
            <div key={a.id} className="p-4 flex items-center gap-4">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.status === "running" ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : a.status === "error" ? "bg-red-500" : "bg-zinc-600"}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm flex items-center gap-2">
                  {a.name}
                  <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {a.lastCycle ? `O-T-A-C cycle: ${a.lastCycle.totalMs}ms total (observe ${a.lastCycle.observeMs}ms · think ${a.lastCycle.thinkMs}ms · act ${a.lastCycle.actMs}ms · check ${a.lastCycle.checkMs}ms)` : "No cycle data yet"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {Object.entries(a.metrics || {}).slice(0, 3).map(([k, v]) => `${k}: ${typeof v === "number" ? v.toFixed?.(2) ?? v : v}`).join(" · ")}
                </div>
              </div>
              <button
                onClick={() => toggleRoster(a)}
                className={`p-2 rounded-lg ${a.status === "running" ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"} hover:scale-110 transition-transform`}
                title={a.status === "running" ? "Stop" : "Start"}
              >
                {a.status === "running" ? <Power className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Domain agent deployments */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
          <ListChecks className="w-3.5 h-3.5" /> Domain Agents
        </h2>
        {deployments.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-sm text-muted-foreground">No domain agents deployed — visit the Agent Marketplace.</div>
        ) : (
          <div className="glass-card rounded-xl divide-y divide-border/50">
            {deployments.map((d) => (
              <div key={d.id} className="p-4 flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${d.status === "active" ? "bg-emerald-500 animate-pulse" : d.status === "pending_approval" ? "bg-amber-500 animate-pulse" : "bg-zinc-600"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {d.name}
                    <Badge variant="outline" className="text-[10px]">{d.status.replace("_", " ")}</Badge>
                    {d.confidence && <span className="text-[10px] text-muted-foreground">confidence {(Number(d.confidence) * 100).toFixed(0)}%</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{d.rationale}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Last: {d.lastAction || "—"} · Next: {d.nextAction || "—"} · Risk limit ${Number(d.riskLimitUsd).toLocaleString()}
                  </div>
                </div>
                {d.status !== "stopped" && (
                  <button
                    onClick={() => stopDeployment(d.id)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:scale-110 transition-transform"
                    title="Stop"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Strategy threads */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold mb-2">Strategy Threads</h2>
        {items.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-display font-semibold mb-1">No strategy threads yet</h3>
            <p className="text-sm text-muted-foreground">Create or clone a strategy to start auto-trading.</p>
          </div>
        ) : (
          <div className="glass-card rounded-xl divide-y divide-border/50">
            {items.map(s => (
              <div key={s.id} className="p-4 flex items-center gap-4 hover:bg-accent/20">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.enabled ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-600"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {s.symbol} · {s.conditions?.length || 0} conditions · updated {s.updatedAt ? formatDistanceToNow(new Date(s.updatedAt)) : "never"}
                  </div>
                </div>
                <button
                  onClick={() => toggleStrategy(s.id, s.enabled)}
                  className={`p-2 rounded-lg ${s.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"} hover:scale-110 transition-transform`}
                  title={s.enabled ? "Disable" : "Enable"}
                >
                  {s.enabled ? <Power className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, icon: Icon, positive }: { label: string; value: string; icon: any; positive?: boolean }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
        <Icon className={`w-4 h-4 ${positive ? "text-emerald-400" : "text-muted-foreground"}`} />
      </div>
      <div className={`text-2xl font-display font-bold ${positive ? "text-emerald-400" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
