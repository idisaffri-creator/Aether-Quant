/*
 * Leaderboard — top performers by P&L.
 */
import { useState, useEffect } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { motion } from "framer-motion";
import { Trophy, Medal, Award, Crown, TrendingUp, TrendingDown, Loader2, Target, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { num, signedMoney, money } from "@/lib/format";

const RANK_ICONS = [Crown, Trophy, Medal, Award];

export default function Leaderboard() {
  usePageTitle("Leaderboard");
  const [entries, setEntries] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/leaderboard", { credentials: "include" }).then(r => r.json()),
        fetch("/api/leaderboard/me", { credentials: "include" }).then(r => r.json()),
      ]);
      setEntries(r1.leaderboard || []);
      setMe(r2);
    } catch (err) {
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
          <Trophy className="w-7 h-7 text-amber-400" /> Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Top traders ranked by realized P&L. {entries.length} traders competing.</p>
      </div>

      {me && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 border-l-2 border-l-primary">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-display font-bold text-primary">
              #{me.rank || "—"}
            </div>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Total P&L" value={signedMoney(me.totalPnl)} positive={num(me.totalPnl) >= 0} />
              <Stat label="Trades" value={String(num(me.totalTrades))} />
              <Stat label="Positions" value={String(num(me.totalPositions))} />
              <Stat label="Exposure" value={money(me.exposure, 0)} />
            </div>
          </div>
        </motion.div>
      )}

      <div className="glass-card rounded-xl p-2">
        {entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-3" />
            <p>No traders yet. Start trading to appear on the leaderboard!</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {entries.map((e, i) => {
              const Icon = RANK_ICONS[i] || null;
              const isMe = me && e.userId === me.userId;
              return (
                <motion.div
                  key={e.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex items-center gap-3 p-3 rounded-lg ${isMe ? "bg-primary/10" : ""}`}
                >
                  <div className="w-8 text-center">
                    {Icon ? (
                      <Icon className={`w-5 h-5 mx-auto ${i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-700" : "text-muted-foreground"}`} />
                    ) : (
                      <span className="text-sm font-mono text-muted-foreground">#{e.rank}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {e.username}
                      {e.tier === "admin" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase tracking-wider">Admin</span>}
                      {e.tier === "enterprise" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 uppercase tracking-wider">Enterprise</span>}
                      {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary uppercase tracking-wider">You</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{e.totalTrades} trades · {e.totalPositions} positions</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono font-semibold ${num(e.totalPnl) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {signedMoney(e.totalPnl)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{money(e.exposure, 0)} exposure</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-mono font-bold ${positive === undefined ? "" : positive ? "text-emerald-400" : "text-red-400"}`}>{value}</div>
    </div>
  );
}
