/*
 * Agent Team — managed trader personas.
 * Live data: list of running strategies from /api/strategies/custom.
 */
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { useAtom } from "jotai";
import { tokenAtom } from "@/store/auth";
import { api } from "@/lib/api";
import { Users, Activity, TrendingUp, TrendingDown, Zap, Brain, Pause, Play, Loader2, Power } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function AgentTeam() {
  usePageTitle("Agent Team");
  const [token] = useAtom(tokenAtom);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.strategies.listCustom().then(r => {
      setStrategies(r.strategies || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  async function toggle(id: string, enabled: boolean) {
    try {
      await api.strategies.updateCustom(id, { enabled: !enabled });
      setStrategies(prev => prev.map(s => s.id === id ? { ...s, enabled: !enabled } : s));
      toast.success(enabled ? "Disabled" : "Enabled");
    } catch {
      toast.error("Update failed");
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const running = strategies.filter(s => s.enabled).length;
  const stopped = strategies.length - running;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Agent Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Your live trading agents. Toggle to enable auto-execution on real-time signals.</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> <span className="text-emerald-400 font-mono">{running} running</span></div>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-zinc-600" /> <span className="text-muted-foreground font-mono">{stopped} stopped</span></div>
        </div>
      </div>

      {strategies.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-display font-semibold mb-1">No agents yet</h3>
          <p className="text-sm text-muted-foreground">Clone a template from the marketplace or build your own to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {strategies.map(s => {
            const condCount = s.conditions?.length || 0;
            return (
              <motion.div key={s.id} className="glass-card rounded-xl p-4" whileHover={{ y: -2 }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-display font-semibold text-sm">{s.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.symbol} · {condCount} conditions</div>
                  </div>
                  <button
                    onClick={() => toggle(s.id, s.enabled)}
                    className={`p-1.5 rounded-lg ${s.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"} hover:scale-110 transition-transform`}
                    title={s.enabled ? "Disable" : "Enable"}
                  >
                    {s.enabled ? <Power className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-xs">
                    {s.enabled ? (
                      <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> <span className="text-emerald-400">Active</span></>
                    ) : (
                      <><Pause className="w-3 h-3 text-muted-foreground" /> <span className="text-muted-foreground">Paused</span></>
                    )}
                  </div>
                  <div className="ml-auto text-[10px] text-muted-foreground font-mono">
                    {s.published === "true" ? "📢 Published" : "📝 Draft"}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
