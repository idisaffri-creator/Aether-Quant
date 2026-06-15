import { useState, useCallback } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { useWalletContext, WalletMultiButton } from "@/contexts/WalletContext";
import { shortenAddress } from "@/lib/solana";
import {
  User,
  Wallet,
  Bell,
  Key,
  Shield,
  ChevronRight,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  label: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  enabled: boolean;
}

const mockApiKeys: ApiKey[] = [
  { id: "k1", label: "Trading API", key: "aeth_sk_2xK9mP4qR8vW3nJ7", createdAt: "2026-05-15", lastUsed: "2026-06-14 14:32", enabled: true },
  { id: "k2", label: "Market Data Feed", key: "aeth_sk_5cL1tH6sY0fD9bE3", createdAt: "2026-04-22", lastUsed: "2026-06-15 09:15", enabled: true },
  { id: "k3", label: "Dev Environment", key: "aeth_sk_7gR2xV8qA4mN0pW6", createdAt: "2026-03-10", lastUsed: null, enabled: false },
];

export default function Settings() {
  usePageTitle("Settings");
  const { connected, publicKey } = useWalletContext();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-display font-bold">Settings</h1>

      {/* Profile */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center">
            <User className="w-5 h-5 text-amber" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Profile</h2>
            <p className="text-xs text-muted-foreground">Manage your account</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Username</label>
            <input
              type="text"
              placeholder="trader"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50"
            />
          </div>
          <button className="btn-amber px-4 py-2 rounded-lg text-xs font-semibold w-fit">
            Save Changes
          </button>
        </div>
      </div>

      {/* Wallet */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-amber" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Solana Wallet</h2>
            <p className="text-xs text-muted-foreground">Connect your Solana wallet for on-chain trading</p>
          </div>
        </div>

        {connected && publicKey ? (
          <div className="p-3 rounded-lg bg-accent/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Connected</span>
              <span className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono">{shortenAddress(publicKey, 8)}</span>
              <button onClick={copyAddress} className="p-1 rounded hover:bg-accent transition-colors">
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
              </button>
            </div>
            <WalletMultiButton />
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-accent/30">
            <p className="text-xs text-muted-foreground mb-3">No wallet connected</p>
            <WalletMultiButton />
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Notifications</h2>
            <p className="text-xs text-muted-foreground">Alert preferences</p>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: "Trade Executions", desc: "When orders are filled or cancelled" },
            { label: "Price Alerts", desc: "When assets reach target prices" },
            { label: "Strategy Signals", desc: "When strategies trigger entry/exit" },
            { label: "Portfolio Updates", desc: "Daily P&L and performance summary" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/30 transition-colors">
              <div>
                <div className="text-xs font-medium">{item.label}</div>
                <div className="text-[10px] text-muted-foreground">{item.desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-8 h-4 bg-accent/50 rounded-full peer peer-checked:bg-amber/50 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-foreground after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* API Keys */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">API Keys</h2>
              <p className="text-xs text-muted-foreground">Manage trading API credentials</p>
            </div>
          </div>
          <button className="btn-amber px-3 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5">
            <Plus className="w-3 h-3" />
            New Key
          </button>
        </div>

        <div className="space-y-2">
          {mockApiKeys.map((apiKey) => (
            <ApiKeyRow key={apiKey.id} apiKey={apiKey} />
          ))}
        </div>

        <div className="p-3 rounded-lg bg-accent/30">
          <p className="text-[10px] text-muted-foreground">
            Your API keys carry the same privileges as your account. Keep them secret and rotate regularly.
            <span className="text-amber ml-1">View docs →</span>
          </p>
        </div>
      </div>

      {/* Security */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Security</h2>
            <p className="text-xs text-muted-foreground">Two-factor authentication and session management</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/30 transition-colors">
          <div>
            <div className="text-xs font-medium">Two-Factor Authentication</div>
            <div className="text-[10px] text-muted-foreground">Add an extra layer of security to your account</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-8 h-4 bg-accent/50 rounded-full peer peer-checked:bg-amber/50 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-foreground after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" />
          </label>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/30 transition-colors">
          <div>
            <div className="text-xs font-medium">Session Duration</div>
            <div className="text-[10px] text-muted-foreground">Current session expires in 23h 45m</div>
          </div>
          <button className="text-[10px] text-muted-foreground hover:text-foreground font-medium">Revoke</button>
        </div>
      </div>
    </div>
  );
}

function ApiKeyRow({ apiKey }: { apiKey: ApiKey }) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{apiKey.label}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${apiKey.enabled ? "bg-green-500/10 text-green-500" : "bg-accent/50 text-muted-foreground"}`}>
            {apiKey.enabled ? "Active" : "Disabled"}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] font-mono text-muted-foreground">
            {showKey ? apiKey.key : `${apiKey.key.slice(0, 12)}...`}
          </span>
          <button onClick={() => setShowKey(!showKey)} className="text-muted-foreground hover:text-foreground">
            {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
          <button onClick={() => { navigator.clipboard.writeText(apiKey.key); toast.success("API key copied"); }} className="text-muted-foreground hover:text-foreground">
            <Copy className="w-3 h-3" />
          </button>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          Created {apiKey.createdAt}{apiKey.lastUsed ? ` · Last used ${apiKey.lastUsed}` : " · Never used"}
        </div>
      </div>
      <button className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
