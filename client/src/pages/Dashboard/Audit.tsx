import { useState, useEffect } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { Shield, Activity, Key, RefreshCw, LogIn, Settings, AlertTriangle } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  category: "trade" | "auth" | "setting" | "strategy" | "admin";
  details: string;
  ip: string;
  timestamp: string;
}

const categoryIcons: Record<string, typeof Activity> = {
  trade: Activity, auth: LogIn, setting: Settings, strategy: Key, admin: Shield,
};

const categoryColors: Record<string, string> = {
  trade: "text-green-500", auth: "text-blue-500", setting: "text-amber", strategy: "text-purple-500", admin: "text-red-500",
};

const categoryFilters = ["all", "trade", "auth", "setting", "strategy", "admin"];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Audit() {
  usePageTitle("Audit Trail");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("aether_token");
      const url = filter === "all" ? "/api/audit" : `/api/audit?category=${filter}`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
      }
    } catch {
      /* use empty */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAudit(); }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Audit Trail</h1>
          <p className="text-sm text-muted-foreground mt-1">Record of all account activity and system events</p>
        </div>
        <button onClick={fetchAudit} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-accent/50 text-muted-foreground hover:text-foreground transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex gap-1 bg-accent/30 rounded-lg p-1 w-fit">
        {categoryFilters.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wider transition-all ${filter === cat ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {cat === "all" ? "All" : cat}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-amber border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Shield className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">No audit entries found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((entry) => {
              const Icon = categoryIcons[entry.category] || Shield;
              return (
                <div key={entry.id} className="flex items-start gap-4 px-5 py-4 hover:bg-accent/30 transition-colors">
                  <div className={`mt-0.5 ${categoryColors[entry.category] || "text-muted-foreground"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{entry.action}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{timeAgo(entry.timestamp)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{entry.details}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground bg-accent/30 px-1.5 py-0.5 rounded">{entry.ip}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{entry.category}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
