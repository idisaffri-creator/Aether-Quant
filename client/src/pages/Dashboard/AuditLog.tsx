/**
 * Audit log viewer — admin sees all user actions.
 * Real-time filtering by user, action, date range.
 */
import { useEffect, useState } from "react";
import { ScrollText, Search, Filter, Download, Loader2, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { usePageTitle } from "@/lib/usePageTitle";
import { SkeletonTable, Skeleton } from "@/components/Skeleton";
import { toast } from "sonner";

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  resource?: string;
  ip?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: string;
}

export default function AuditLog() {
  usePageTitle("Audit Log");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [actionFilter]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set("action", actionFilter);
      params.set("limit", "200");
      const r = await fetch(`/api/audit?${params}`, { credentials: "include" });
      if (!r.ok) {
        if (r.status === 401) {
          toast.error("Admin login required");
          return;
        }
        throw new Error(`${r.status}`);
      }
      const d = await r.json();
      setEntries(d.entries || []);
      setTotal(d.total || (d.entries || []).length);
    } catch (err) {
      toast.error("Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    window.open("/api/audit/export.csv", "_blank");
  }

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.action.toLowerCase().includes(q) ||
      e.userId.toLowerCase().includes(q) ||
      (e.ip && e.ip.includes(q))
    );
  });

  const actions = Array.from(new Set(entries.map((e) => e.action.split(".")[0]))).sort();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
            <ScrollText className="w-7 h-7 text-primary" /> Audit Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} events recorded. Every login, trade, profile change — permanent, immutable.
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by action, user, IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
        >
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={6} />
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <ScrollText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No audit entries found</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Action</th>
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">IP</th>
                  <th className="text-left p-3">Resource</th>
                  <th className="text-left p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-t border-border/50 hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                  >
                    <td className="p-3 font-mono text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono">{e.action}</span></td>
                    <td className="p-3 font-mono text-xs">{e.userId.slice(0, 12)}…</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{e.ip || "—"}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{e.resource || "—"}</td>
                    <td className="p-3"><Eye className="w-3.5 h-3.5 text-muted-foreground" /></td>
                  </motion.tr>
                ))}
                {expanded && (() => {
                  const e = filtered.find((x) => x.id === expanded);
                  if (!e?.metadata) return null;
                  return (
                    <tr className="bg-white/[0.02]">
                      <td colSpan={6} className="p-3">
                        <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                          {JSON.stringify(e.metadata, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}