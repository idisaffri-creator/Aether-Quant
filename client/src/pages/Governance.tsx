/*
 * Governance & Approvals — the 4-tier autonomy policy, pending approval
 * queue, and the platform-wide kill switch.
 */
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { api } from "@/lib/api";
import { useAtom } from "jotai";
import { tokenAtom } from "@/store/auth";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Gavel, Loader2, CheckCircle2, XCircle, Power, AlertTriangle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface PolicyRow {
  tier: string;
  label: string;
  autonomy: string;
  description: string;
  exampleActions: string[];
}

interface Approval {
  id: string;
  actionClass: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const TIER_STYLE: Record<string, string> = {
  informational: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  high: "bg-red-500/10 text-red-400 border-red-500/30",
};

export default function Governance() {
  usePageTitle("Governance & Approvals");
  const [token] = useAtom(tokenAtom);
  const [policy, setPolicy] = useState<PolicyRow[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [killing, setKilling] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        api.governance.policy(),
        token ? api.governance.approvals() : Promise.resolve({ approvals: [] }),
      ]);
      setPolicy(p.policy || []);
      setApprovals(a.approvals || []);
    } catch {
      toast.error("Failed to load governance data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  async function decide(id: string, decision: "approve" | "reject") {
    try {
      if (decision === "approve") await api.governance.approve(id);
      else await api.governance.reject(id);
      setApprovals((prev) => prev.map((r) => (r.id === id ? { ...r, status: decision === "approve" ? "approved" : "rejected" } : r)));
      toast.success(decision === "approve" ? "Approved" : "Rejected");
    } catch {
      toast.error("Action failed");
    }
  }

  async function killSwitch() {
    setKilling(true);
    try {
      const r = await api.governance.killSwitch();
      toast.success(`${r.message} — ${r.agentsStopped} agents stopped, ${r.strategiesDisabled} strategies disabled`);
    } catch (err: any) {
      toast.error(err?.message || "Kill switch failed");
    } finally {
      setKilling(false);
    }
  }

  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
            <Gavel className="w-7 h-7 text-primary" /> Governance & Approvals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">The autonomy policy that governs every agent action on the platform.</p>
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
                <AlertTriangle className="w-5 h-5" /> Engage the kill switch?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This immediately stops every one of your deployed domain agents and disables every one of your active custom strategies. This is a hard stop — agents and strategies must be manually re-enabled afterward.
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

      {/* Policy table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h2 className="text-sm font-display font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Approval Policy</h2>
        </div>
        <div className="divide-y divide-border/50">
          {policy.map((row) => (
            <div key={row.tier} className="p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className={TIER_STYLE[row.tier]}>{row.label}</Badge>
                <span className="text-sm font-semibold">{row.autonomy}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{row.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {row.exampleActions.map((a, i) => (
                  <span key={i} className="text-[11px] px-2 py-1 rounded-md bg-accent/30 text-muted-foreground">{a}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending approvals */}
      <div>
        <h2 className="text-lg font-display font-semibold mb-3">Pending Approvals {pending.length > 0 && <Badge className="ml-1">{pending.length}</Badge>}</h2>
        {pending.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-sm text-muted-foreground">Nothing awaiting approval.</div>
        ) : (
          <div className="glass-card rounded-xl divide-y divide-border/50">
            {pending.map((a) => (
              <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 flex items-center gap-4">
                <Badge variant="outline" className={TIER_STYLE[a.actionClass]}>{a.actionClass}</Badge>
                <div className="flex-1 min-w-0 text-sm">{a.description}</div>
                <button onClick={() => decide(a.id, "approve")} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:scale-110 transition-transform" title="Approve">
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <button onClick={() => decide(a.id, "reject")} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:scale-110 transition-transform" title="Reject">
                  <XCircle className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div>
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold mb-2">History</h2>
          <div className="glass-card rounded-xl divide-y divide-border/50">
            {resolved.slice(0, 10).map((a) => (
              <div key={a.id} className="p-3 flex items-center gap-3 text-xs">
                <Badge variant="outline" className={a.status === "approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}>{a.status}</Badge>
                <span className="text-muted-foreground flex-1">{a.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
