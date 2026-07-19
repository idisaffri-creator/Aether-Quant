/*
 * Knowledge Graph (v1) — filterable timeline of market-moving events plus
 * a "find similar historical periods" heuristic search.
 */
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Network, Loader2, Search, TrendingUp, TrendingDown, Minus,
  Droplet, Factory, CloudLightning, Ship, Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/dateUtils";

interface KgEvent {
  id: string;
  type: "opec" | "refinery" | "weather" | "shipping" | "inventory";
  title: string;
  description: string;
  symbolsAffected: string;
  impact: "bullish" | "bearish" | "neutral";
  occurredAt: string;
  sourceUrl: string | null;
}

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  opec: { label: "OPEC", icon: Droplet, color: "text-amber-400" },
  refinery: { label: "Refinery", icon: Factory, color: "text-blue-400" },
  weather: { label: "Weather", icon: CloudLightning, color: "text-purple-400" },
  shipping: { label: "Shipping", icon: Ship, color: "text-cyan-400" },
  inventory: { label: "Inventory", icon: Package, color: "text-emerald-400" },
};

const IMPACT_STYLE: Record<string, { badge: string; icon: any }> = {
  bullish: { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: TrendingUp },
  bearish: { badge: "bg-red-500/10 text-red-400 border-red-500/30", icon: TrendingDown },
  neutral: { badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30", icon: Minus },
};

const TYPES = ["opec", "refinery", "weather", "shipping", "inventory"];

export default function KnowledgeGraph() {
  usePageTitle("Knowledge Graph");
  const [events, setEvents] = useState<KgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [symbolFilter, setSymbolFilter] = useState("");
  const [similarSymbol, setSimilarSymbol] = useState("");
  const [similarResults, setSimilarResults] = useState<KgEvent[] | null>(null);
  const [similarLoading, setSimilarLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api.knowledgeGraph.events({ type: typeFilter || undefined, symbol: symbolFilter || undefined });
      setEvents(r.events || []);
    } catch {
      toast.error("Failed to load knowledge graph events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [typeFilter]);

  async function runFilterSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  async function findSimilar(e: React.FormEvent) {
    e.preventDefault();
    if (!similarSymbol.trim()) return;
    setSimilarLoading(true);
    try {
      const r = await api.knowledgeGraph.similar(similarSymbol.trim().toUpperCase());
      setSimilarResults(r.periods || []);
    } catch {
      toast.error("Similar-periods search failed");
    } finally {
      setSimilarLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
          <Network className="w-7 h-7 text-primary" /> Knowledge Graph
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A curated timeline of market-moving events — OPEC statements, refinery outages, weather, shipping, inventory data.
        </p>
      </div>

      {/* Similar periods search */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Find Similar Historical Periods</h2>
        <form onSubmit={findSimilar} className="flex gap-2">
          <input
            value={similarSymbol}
            onChange={(e) => setSimilarSymbol(e.target.value)}
            placeholder="Symbol, e.g. WTI, BRENT, NGAS"
            className="flex-1 px-3 py-2 rounded-lg bg-card border border-border text-sm"
          />
          <Button type="submit" disabled={similarLoading} className="gap-1.5">
            {similarLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Search
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground mt-2">Heuristic tag match on past events — not a graph-similarity model.</p>
        {similarResults && (
          <div className="mt-4 space-y-2">
            {similarResults.length === 0 ? (
              <div className="text-sm text-muted-foreground">No comparable periods found for that symbol.</div>
            ) : similarResults.map((ev) => <EventRow key={ev.id} ev={ev} />)}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTypeFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${!typeFilter ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          All types
        </button>
        {TYPES.map((t) => {
          const meta = TYPE_META[t];
          const Icon = meta.icon;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${typeFilter === t ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="w-3 h-3" /> {meta.label}
            </button>
          );
        })}
        <form onSubmit={runFilterSearch} className="ml-auto flex gap-2">
          <input
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            placeholder="Filter by symbol..."
            className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs w-40"
          />
          <Button type="submit" size="sm" variant="outline">Filter</Button>
        </form>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : events.length === 0 ? (
        <div className="glass-card rounded-xl p-10 text-center text-sm text-muted-foreground">No events match this filter.</div>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => <EventRow key={ev.id} ev={ev} />)}
        </div>
      )}
    </div>
  );
}

function EventRow({ ev }: { ev: KgEvent }) {
  const typeMeta = TYPE_META[ev.type] || TYPE_META.opec;
  const TypeIcon = typeMeta.icon;
  const impact = IMPACT_STYLE[ev.impact] || IMPACT_STYLE.neutral;
  const ImpactIcon = impact.icon;
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4 flex items-start gap-3">
      <div className={`w-8 h-8 rounded-lg bg-accent/30 flex items-center justify-center shrink-0 mt-0.5 ${typeMeta.color}`}>
        <TypeIcon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-medium text-sm">{ev.title}</span>
          <Badge variant="outline" className={impact.badge}><ImpactIcon className="w-3 h-3" /> {ev.impact}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-1.5">{ev.description}</p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-mono">{ev.symbolsAffected}</span>
          <span>·</span>
          <span>{ev.occurredAt ? formatDistanceToNow(new Date(ev.occurredAt)) : ""} ago</span>
        </div>
      </div>
    </motion.div>
  );
}
