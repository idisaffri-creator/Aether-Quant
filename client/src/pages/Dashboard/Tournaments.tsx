/*
 * Tournaments — time-bound competitions.
 * Live data: /api/tournaments (list), /api/tournaments/:id (detail + leaderboard).
 */
import { useState, useEffect } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { useAtom } from "jotai";
import { tokenAtom } from "@/store/auth";
import { motion } from "framer-motion";
import { Trophy, Calendar, Users, DollarSign, Target, ChevronRight, Loader2, Plus, Award, Crown, Medal, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "@/lib/dateUtils";

export default function Tournaments() {
  usePageTitle("Tournaments");
  const [token] = useAtom(tokenAtom);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState<Set<string>>(new Set());

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const r = await api.tournaments.list();
      setList(r.tournaments || []);
      // Detect which ones I'm in
      const joinedSet = new Set<string>();
      for (const t of r.tournaments || []) {
        try {
          const detail = await api.tournaments.get(t.id);
          const me = (detail.leaderboard || []).find((e: any) => e.userId === "admin-user-id" || e.userId === "demo-user-id");
          if (me) joinedSet.add(t.id);
        } catch {}
      }
      setJoined(joinedSet);
    } catch (err) {
      toast.error("Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  async function join(id: string) {
    try {
      await api.tournaments.join(id);
      setJoined(prev => new Set([...prev, id]));
      toast.success("Joined tournament!");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Join failed");
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const active = list.filter(t => t.status === "active");
  const upcoming = list.filter(t => t.status === "upcoming");
  const completed = list.filter(t => t.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
          <Trophy className="w-7 h-7 text-amber-400" /> Tournaments
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Compete on returns. Win bragging rights, featured leaderboard spot, and showcase your strategy.</p>
      </div>

      {list.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-display font-semibold mb-1">No tournaments yet</h3>
          <p className="text-sm text-muted-foreground">Check back soon — new tournaments start every month.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <Section title="Active now" icon={Activity}>
              {active.map(t => <TournamentCard key={t.id} t={t} joined={joined.has(t.id)} onJoin={join} />)}
            </Section>
          )}
          {upcoming.length > 0 && (
            <Section title="Upcoming" icon={Calendar}>
              {upcoming.map(t => <TournamentCard key={t.id} t={t} joined={joined.has(t.id)} onJoin={join} />)}
            </Section>
          )}
          {completed.length > 0 && (
            <Section title="Completed" icon={Award}>
              {completed.map(t => <TournamentCard key={t.id} t={t} joined={joined.has(t.id)} onJoin={join} />)}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-3">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TournamentCard({ t, joined, onJoin }: { t: any; joined: boolean; onJoin: (id: string) => void }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(t.endsAt).getTime() - Date.now()) / 86_400_000));
  const totalDays = Math.ceil((new Date(t.endsAt).getTime() - new Date(t.startsAt).getTime()) / 86_400_000);
  const progress = totalDays > 0 ? Math.min(100, Math.max(0, 100 - (daysLeft / totalDays) * 100)) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-5 hover:border-primary/30 transition-colors"
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-display font-semibold">{t.name}</h3>
            <StatusBadge status={t.status} />
          </div>
          {t.description && <p className="text-sm text-muted-foreground mb-3">{t.description}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Mini icon={DollarSign} label="Starting" value={`$${Number(t.startingBalance).toLocaleString()}`} />
            <Mini icon={Users} label="Participants" value={`${t.participantCount || 0} / ${t.maxParticipants}`} />
            <Mini icon={Calendar} label="Ends" value={formatDistanceToNow(new Date(t.endsAt))} />
            <Mini icon={Target} label="Days left" value={`${daysLeft}`} />
          </div>
          {t.status === "active" && (
            <div className="mt-3">
              <div className="h-1.5 bg-card rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{progress.toFixed(0)}% complete</div>
            </div>
          )}
          {t.prizePool && (
            <div className="mt-3 text-xs text-amber-400">🏆 {t.prizePool}</div>
          )}
        </div>
        <div className="flex flex-col gap-2 min-w-[140px]">
          {joined ? (
            <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm text-center font-medium">
              ✓ Joined
            </div>
          ) : t.status === "completed" ? (
            <div className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-center text-muted-foreground">
              Ended
            </div>
          ) : (
            <button
              onClick={() => onJoin(t.id)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Join
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    upcoming: { label: "Upcoming", color: "bg-blue-500/20 text-blue-400" },
    active: { label: "Active", color: "bg-emerald-500/20 text-emerald-400 animate-pulse" },
    completed: { label: "Completed", color: "bg-zinc-500/20 text-zinc-400" },
  };
  const s = map[status] || { label: status, color: "bg-zinc-500/20 text-zinc-400" };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${s.color}`}>{s.label}</span>;
}

function Mini({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1"><Icon className="w-3 h-3" /> {label}</div>
      <div className="text-sm font-mono font-bold mt-0.5">{value}</div>
    </div>
  );
}
