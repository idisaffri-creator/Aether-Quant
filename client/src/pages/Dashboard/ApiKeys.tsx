/**
 * API keys UI — manage programmatic access tokens.
 * Third-party developers can use these to integrate Aether.
 */
import { useEffect, useState } from "react";
import { Key, Plus, Trash2, Copy, Loader2, AlertCircle, Code, Eye, EyeOff } from "lucide-react";
import { usePageTitle } from "@/lib/usePageTitle";
import { Skeleton } from "@/components/Skeleton";
import { toast } from "sonner";

interface KeyEntry {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
}

const SCOPES = [
  { id: "read:portfolio", label: "Read Portfolio", desc: "View positions, P&L, exposure" },
  { id: "read:market", label: "Read Market", desc: "Live quotes for all symbols" },
  { id: "trade:paper", label: "Trade Paper", desc: "Submit paper orders" },
  { id: "read:backtests", label: "Read Backtests", desc: "List your backtest results" },
  { id: "read:strategies", label: "Read Strategies", desc: "List marketplace strategies" },
];

export default function ApiKeys() {
  usePageTitle("API Keys");
  const [keys, setKeys] = useState<KeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/keys", { credentials: "include" });
      const d = await r.json();
      setKeys(d.keys || []);
    } catch (err) {
      toast.error("Failed to load keys");
    } finally {
      setLoading(false);
    }
  }

  async function create(data: any) {
    setCreating(true);
    try {
      const r = await fetch("/api/keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      setNewKey(d.key);
      toast.success("API key created. Save it now — it won't be shown again.");
      setShowForm(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key? Any apps using it will lose access immediately.")) return;
    try {
      await fetch(`/api/keys/${id}`, { method: "DELETE", credentials: "include" });
      toast.success("Key revoked");
      await load();
    } catch (err) {
      toast.error("Failed to revoke");
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  if (loading) return <div className="space-y-4 max-w-4xl mx-auto"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
            <Key className="w-7 h-7 text-primary" /> API Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {keys.filter((k) => !k.revokedAt).length} active keys. Programmatic access for your apps.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} disabled={keys.filter((k) => !k.revokedAt).length >= 10} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Key
        </button>
      </div>

      {newKey && <NewKeyBanner keyValue={newKey} onDismiss={() => setNewKey(null)} onCopy={copy} />}

      {/* Form */}
      {showForm && <CreateKeyForm creating={creating} onSubmit={create} onCancel={() => setShowForm(false)} />}

      {/* Quick start */}
      <details className="glass-card rounded-xl p-5">
        <summary className="cursor-pointer font-semibold text-sm flex items-center gap-2">
          <Code className="w-4 h-4" /> Quick start: make your first API call
        </summary>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Verify your key</div>
            <pre className="bg-black/30 border border-border rounded-lg p-3 font-mono text-xs overflow-x-auto">
{`curl https://aether-energy.ai/api/v1/me \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
            </pre>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Get live quotes</div>
            <pre className="bg-black/30 border border-border rounded-lg p-3 font-mono text-xs overflow-x-auto">
{`curl https://aether-energy.ai/api/v1/market/quotes \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
            </pre>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Python</div>
            <pre className="bg-black/30 border border-border rounded-lg p-3 font-mono text-xs overflow-x-auto">
{`import requests
r = requests.get(
    "https://aether-energy.ai/api/v1/market/quotes",
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
print(r.json())`}
            </pre>
          </div>
          <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            Rate limits: 60 req/min general. Per-scope limiters protect expensive endpoints (backtest, AI).
          </div>
        </div>
      </details>

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Key className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No API keys yet. Create one to integrate Aether with your apps.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className={`glass-card rounded-xl p-4 ${k.revokedAt ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{k.name}</span>
                    {k.revokedAt && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-400">Revoked</span>}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground mt-1">aether_live_{k.prefix}_••••••••</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {k.scopes.map((s) => (
                      <span key={s} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono">{s}</span>
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2">
                    Created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt && ` · last used ${new Date(k.lastUsedAt).toLocaleString()}`}
                    {k.expiresAt && ` · expires ${new Date(k.expiresAt).toLocaleDateString()}`}
                  </div>
                </div>
                {!k.revokedAt && (
                  <button onClick={() => revoke(k.id)} className="p-2 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewKeyBanner({ keyValue, onDismiss, onCopy }: { keyValue: string; onDismiss: () => void; onCopy: (s: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="glass-card rounded-xl p-5 border-l-2 border-l-emerald-500">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Save your API key now</h3>
          <p className="text-xs text-muted-foreground mt-1">This is the only time you'll see the full key. Store it somewhere safe.</p>
          <div className="flex items-center gap-2 mt-3">
            <input
              type={visible ? "text" : "password"}
              value={keyValue}
              readOnly
              className="flex-1 bg-black/30 border border-border rounded-lg px-3 py-2 text-xs font-mono"
            />
            <button onClick={() => setVisible(!visible)} className="p-2 hover:bg-card/60 rounded">
              {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={() => onCopy(keyValue)} className="p-2 hover:bg-card/60 rounded">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground text-xs">Dismiss</button>
      </div>
    </div>
  );
}

function CreateKeyForm({ creating, onSubmit, onCancel }: { creating: boolean; onSubmit: (d: any) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read:portfolio", "read:market"]);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ name, scopes, expiresInDays: expiresInDays || undefined });
  }

  return (
    <form onSubmit={submit} className="glass-card rounded-xl p-5 space-y-4">
      <h2 className="font-semibold text-sm">Create API Key</h2>
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Name</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="My Trading Bot" className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Scopes</label>
        <div className="space-y-2 mt-2">
          {SCOPES.map((s) => (
            <label key={s.id} className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scopes.includes(s.id)}
                onChange={(e) => setScopes(e.target.checked ? [...scopes, s.id] : scopes.filter((x) => x !== s.id))}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-mono font-semibold">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Expires (days)</label>
        <select value={expiresInDays ?? "never"} onChange={(e) => setExpiresInDays(e.target.value === "never" ? null : Number(e.target.value))} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm">
          <option value="never">Never</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="365">1 year</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={creating || !name || scopes.length === 0} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
          Create
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-card/60 text-foreground font-semibold hover:bg-card">
          Cancel
        </button>
      </div>
    </form>
  );
}