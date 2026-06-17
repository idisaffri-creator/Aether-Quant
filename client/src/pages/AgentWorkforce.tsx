/*
 * Agent Workforce — real-time status of all running strategy threads.
 */
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { api } from "@/lib/api";
import { useAtom } from "jotai";
import { tokenAtom } from "@/store/auth";
import { Users, Activity, Zap, Loader2, Power, Play } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatDistanceToNow } from "@/lib/dateUtils";

export default function AgentWorkforce() {
  usePageTitle("Agent Workforce");
  const [token] = useAtom(tokenAtom);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    try {
      const r = await api.strategies.listCustom();
      setItems(r.strategies || []);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [token]);

  async function toggle(id: string, enabled: boolean) {
    try {
      await api.strategies.updateCustom(id, { enabled: !enabled });
      setItems(prev => prev.map(s => s.id === id ? { ...s, enabled: !enabled } : s));
      toast.success(enabled ? "Disabled" : "Enabled");
    } catch { toast.error("Update failed"); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Agent Workforce</h1>
        <p className="text-sm text-muted-foreground mt-1">Live status of your strategy threads. Each runs as a worker that auto-executes on real-time signals.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Total agents" value={String(items.length)} icon={Users} />
        <Stat label="Active" value={String(items.filter(s => s.enabled).length)} icon={Zap} positive />
        <Stat label="Paused" value={String(items.filter(s => !s.enabled).length)} icon={Activity} />
      </div>

      {items.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-display font-semibold mb-1">No agents yet</h3>
          <p className="text-sm text-muted-foreground">Create or clone a strategy to start your workforce.</p>
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
                onClick={() => toggle(s.id, s.enabled)}
                className={`p-2 rounded-lg ${s.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"} hover:scale-110 transition-transform`}
                title={s.enabled ? "Disable" : "Enable"}
              >
                {s.enabled ? <Power className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      )}
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
