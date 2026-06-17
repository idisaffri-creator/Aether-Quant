/**
 * Trade journal — annotate trades with thesis, lessons, tags, rating.
 */
import { useEffect, useState } from "react";
import { BookOpen, Plus, Star, X, Trash2, Loader2, Save, Tag } from "lucide-react";
import { usePageTitle } from "@/lib/usePageTitle";
import { SkeletonTable, Skeleton } from "@/components/Skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Entry {
  id: string;
  symbol: string;
  side: string;
  thesis?: string;
  lessons?: string;
  tags?: string[];
  rating?: number;
  pnlAtNote?: number;
  createdAt: string;
}

const SYMBOLS = ["CL", "BZ", "NG", "GC", "SI", "HG", "HO", "RB"];

export default function TradeJournal() {
  usePageTitle("Trade Journal");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | string>("all");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/journal", { credentials: "include" });
      const d = await r.json();
      setEntries(d.entries || []);
    } catch (err) {
      toast.error("Failed to load journal");
    } finally {
      setLoading(false);
    }
  }

  async function save(data: Partial<Entry>) {
    try {
      const url = editing ? `/api/journal/${editing.id}` : "/api/journal";
      const method = editing ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      toast.success(editing ? "Journal updated" : "Journal entry added");
      setEditing(null);
      setShowForm(false);
      await load();
    } catch (err) {
      toast.error("Failed to save journal entry");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this journal entry?")) return;
    try {
      await fetch(`/api/journal/${id}`, { method: "DELETE", credentials: "include" });
      toast.success("Entry deleted");
      await load();
    } catch (err) {
      toast.error("Failed to delete");
    }
  }

  const filtered = entries.filter((e) => filter === "all" || e.symbol === filter);
  const symbols = Array.from(new Set(entries.map((e) => e.symbol)));

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <SkeletonTable rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-primary" /> Trade Journal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {entries.length} entries. The best traders keep notes.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> New Entry
        </button>
      </div>

      {/* Filter */}
      {symbols.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
          {symbols.map((s) => (
            <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>{s}</FilterChip>
          ))}
        </div>
      )}

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{editing ? "Edit Entry" : "New Journal Entry"}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <JournalForm initial={editing || undefined} onSubmit={save} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No journal entries yet. Click "New Entry" to start documenting your trades.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card rounded-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-display font-bold text-xl">{e.symbol}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${e.side === "buy" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {e.side.toUpperCase()}
                  </span>
                  {e.rating && (
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < e.rating! ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground font-mono">{new Date(e.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(e); setShowForm(true); }} className="text-muted-foreground hover:text-foreground p-1">
                    <Save className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(e.id)} className="text-muted-foreground hover:text-red-400 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {e.thesis && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Thesis</div>
                  <div className="text-sm mt-1">{e.thesis}</div>
                </div>
              )}
              {e.lessons && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Lessons</div>
                  <div className="text-sm mt-1">{e.lessons}</div>
                </div>
              )}
              {e.tags && e.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {e.tags.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono">
                      <Tag className="w-2.5 h-2.5 inline mr-0.5" />{t}
                    </span>
                  ))}
                </div>
              )}
              {e.pnlAtNote != null && (
                <div className="text-xs text-muted-foreground font-mono">P&L at note: ${Number(e.pnlAtNote).toFixed(2)}</div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ children, active, onClick }: { children: any; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${active ? "bg-primary text-primary-foreground" : "bg-card/40 text-muted-foreground hover:text-foreground border border-border/50"}`}
    >
      {children}
    </button>
  );
}

function JournalForm({ initial, onSubmit }: { initial?: Entry; onSubmit: (data: any) => Promise<void> }) {
  const [symbol, setSymbol] = useState(initial?.symbol || "CL");
  const [side, setSide] = useState(initial?.side || "buy");
  const [thesis, setThesis] = useState(initial?.thesis || "");
  const [lessons, setLessons] = useState(initial?.lessons || "");
  const [tags, setTags] = useState((initial?.tags || []).join(", "));
  const [rating, setRating] = useState<number>(initial?.rating || 0);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSubmit({
      symbol,
      side,
      thesis: thesis || undefined,
      lessons: lessons || undefined,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      rating: rating || undefined,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Symbol</label>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono">
            {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Side</label>
          <select value={side} onChange={(e) => setSide(e.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm">
            <option value="buy">Buy / Long</option>
            <option value="sell">Sell / Short</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Thesis (why you took this trade)</label>
        <textarea value={thesis} onChange={(e) => setThesis(e.target.value)} rows={3} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Lessons learned</label>
        <textarea value={lessons} onChange={(e) => setLessons(e.target.value)} rows={2} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tags (comma-separated)</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="breakout, momentum, earnings" className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Rating</label>
          <div className="flex gap-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} type="button" onClick={() => setRating(i + 1)}>
                <Star className={`w-5 h-5 ${i < rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <button type="submit" disabled={saving} className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {initial ? "Update Entry" : "Save Entry"}
      </button>
    </form>
  );
}