import { useState, useEffect, useCallback, useRef } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { useWalletContext, WalletMultiButton } from "@/contexts/WalletContext";
import { shortenAddress } from "@/lib/solana";
import { useAtom, useSetAtom } from "jotai";
import { userAtom, tokenAtom } from "@/store/auth";
import { api, setAuthToken } from "@/lib/api";
import {
  User,
  Wallet,
  Bell,
  Key,
  Shield,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Monitor,
  Globe,
  Clock,
  Calendar,
  Mail,
  AtSign,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { User as UserType, UserPreferences } from "@shared/types";

type SetUser = ReturnType<typeof useSetAtom<typeof userAtom>>;
type SetToken = ReturnType<typeof useSetAtom<typeof tokenAtom>>;

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

const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  if (!pw) return { score: 0, label: "—", color: "bg-white/10" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const score = Math.min(4, s) as 0 | 1 | 2 | 3 | 4;
  const map: Record<number, { label: string; color: string }> = {
    0: { label: "Empty", color: "bg-white/10" },
    1: { label: "Weak", color: "bg-red-500" },
    2: { label: "Fair", color: "bg-orange-500" },
    3: { label: "Good", color: "bg-amber" },
    4: { label: "Strong", color: "bg-emerald-500" },
  };
  return { score, ...map[score] };
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Expired";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export default function Settings() {
  usePageTitle("Settings");
  const { connected, publicKey } = useWalletContext();
  const [user, setUser] = useAtom(userAtom);
  const [, setToken] = useAtom(tokenAtom);
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Settings</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage your account, security, and preferences</p>
        </div>
      </div>

      <AccountMeta />
      <ProfileCard user={user} setUser={setUser} setToken={setToken} publicKey={publicKey} />
      <ChangePasswordCard />
      <WalletCard
        connected={connected}
        publicKey={publicKey}
        copied={copied}
        copyAddress={copyAddress}
      />
      <NotificationsCard />
      <SessionCard />
      <SecurityCard />
      <ApiKeysCard />
    </div>
  );
}

// ─── Account meta ──────────────────────────────────────────────────────
function AccountMeta() {
  const [user] = useAtom(userAtom);
  if (!user) return null;
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber/30 to-blue-500/30 flex items-center justify-center text-lg font-display font-bold uppercase shrink-0">
          {user.username?.[0] || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-display font-semibold truncate">{user.username}</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber/15 text-amber uppercase tracking-wider font-bold">
              {user.tier}
            </span>
            {user.role === "admin" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 uppercase tracking-wider font-bold">
                Admin
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined {formatDate(user.createdAt)}</span>
            {user.lastLoginAt && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last login {formatDate(user.lastLoginAt)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile ───────────────────────────────────────────────────────────
function ProfileCard({
  user,
  setUser,
  setToken,
  publicKey,
}: {
  user: UserType | null;
  setUser: SetUser;
  setToken: SetToken;
  publicKey: string | null | undefined;
}) {
  const [email, setEmail] = useState(user?.email || "");
  const [username, setUsername] = useState(user?.username || "");
  const [wallet, setWallet] = useState(user?.walletAddress || "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; username?: string; wallet?: string }>({});

  // Sync from atom when user loads
  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setUsername(user.username || "");
      setWallet(user.walletAddress || "");
    }
  }, [user?.email, user?.username, user?.walletAddress, user]);

  // Auto-fill wallet from connected Solana wallet
  useEffect(() => {
    if (publicKey && !user?.walletAddress) {
      setWallet(publicKey);
    }
  }, [publicKey, user?.walletAddress]);

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email required";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = "Invalid email";
    if (!username.trim()) e.username = "Username required";
    else if (!usernameRegex.test(username)) e.username = "3-20 chars, letters/numbers/underscore only";
    if (wallet && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) e.wallet = "Invalid Solana address";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await api.auth.updateProfile({
        email: email !== user?.email ? email : undefined,
        username: username !== user?.username ? username : undefined,
        walletAddress: wallet !== (user?.walletAddress || "") ? wallet || null : undefined,
      });
      if (res.user) setUser(res.user);
      if (res.token) {
        setAuthToken(res.token);
        setToken(res.token);
      }
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const dirty = email !== (user?.email || "") || username !== (user?.username || "") || wallet !== (user?.walletAddress || "");

  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center">
          <User className="w-5 h-5 text-amber" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Profile</h2>
          <p className="text-xs text-muted-foreground">Update your account information</p>
        </div>
      </div>

      <div className="space-y-3">
        <Field
          label="Email"
          icon={Mail}
          value={email}
          onChange={setEmail}
          error={errors.email}
          type="email"
          placeholder="you@example.com"
        />
        <Field
          label="Username"
          icon={AtSign}
          value={username}
          onChange={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
          error={errors.username}
          placeholder="trader"
          hint="3-20 chars, lowercase letters, numbers, underscore"
        />
        <Field
          label="Solana Wallet Address"
          icon={Wallet}
          value={wallet}
          onChange={setWallet}
          error={errors.wallet}
          placeholder="Optional — connect wallet to autofill"
          mono
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="btn-amber px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {dirty && !saving && (
            <span className="text-[10px] text-muted-foreground">You have unsaved changes</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Change password ──────────────────────────────────────────────────
function ChangePasswordCard() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const curRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => curRef.current?.focus(), 50);
  }, [open]);

  const strength = passwordStrength(next);
  const matchOk = confirm.length === 0 || next === confirm;
  const canSubmit = current.length > 0 && strength.score >= 3 && next === confirm && next.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await api.auth.changePassword({ currentPassword: current, newPassword: next });
      toast.success("Password changed successfully");
      setCurrent("");
      setNext("");
      setConfirm("");
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Password</h2>
            <p className="text-xs text-muted-foreground">Change your account password</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:border-amber/50 hover:text-amber transition-colors"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-xl p-5 space-y-4 border-amber/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center">
          <Lock className="w-5 h-5 text-amber" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">Change Password</h2>
          <p className="text-xs text-muted-foreground">Enter your current password to confirm</p>
        </div>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Current password</label>
          <div className="relative mt-1">
            <input
              ref={curRef}
              type={show ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full px-3 py-2 pr-9 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">New password</label>
          <input
            type={show ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50"
            autoComplete="new-password"
          />
          {next && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${i < strength.score ? strength.color : "bg-white/10"}`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Strength: {strength.label}</p>
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Confirm new password</label>
          <input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border text-sm focus:outline-none ${
              matchOk ? "border-border focus:border-amber/50" : "border-red-500/50 focus:border-red-500"
            }`}
            autoComplete="new-password"
          />
          {confirm && !matchOk && (
            <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Passwords do not match
            </p>
          )}
        </div>

        {error && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="btn-amber px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {saving ? "Updating..." : "Update Password"}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setError(null); }}
            className="px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Wallet ───────────────────────────────────────────────────────────
function WalletCard({
  connected,
  publicKey,
  copied,
  copyAddress,
}: {
  connected: boolean;
  publicKey: string | null | undefined;
  copied: boolean;
  copyAddress: () => void;
}) {
  return (
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
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono">{shortenAddress(publicKey, 8)}</span>
            <button onClick={copyAddress} className="p-1 rounded hover:bg-accent transition-colors">
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
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
  );
}

// ─── Notifications ────────────────────────────────────────────────────
function NotificationsCard() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [user] = useAtom(userAtom);
  const isDemo = user?.id === "demo-user-id" || user?.id === "admin-user-id";

  useEffect(() => {
    api.auth.getPreferences()
      .then((res) => setPrefs(res.preferences))
      .catch(() => setPrefs({}))
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback(async (key: keyof NonNullable<UserPreferences["notifications"]>, value: boolean) => {
    if (!prefs) return;
    const next = {
      ...prefs,
      notifications: { ...(prefs.notifications || {}), [key]: value },
    };
    setPrefs(next);
    setSaving(true);
    try {
      const res = await api.auth.updatePreferences(next);
      setPrefs(res.preferences);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save preference");
      // revert
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  }, [prefs]);

  if (!loaded) {
    return (
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading preferences...
        </div>
      </div>
    );
  }

  const items: { key: keyof NonNullable<UserPreferences["notifications"]>; label: string; desc: string }[] = [
    { key: "tradeExecutions", label: "Trade Executions", desc: "When orders are filled or cancelled" },
    { key: "priceAlerts", label: "Price Alerts", desc: "When assets reach target prices" },
    { key: "strategySignals", label: "Strategy Signals", desc: "When strategies trigger entry/exit" },
    { key: "portfolioUpdates", label: "Portfolio Updates", desc: "Daily P&L and performance summary" },
    { key: "emailDigest", label: "Email Digest", desc: "Weekly recap delivered to your inbox" },
    { key: "pushNotifications", label: "Push Notifications", desc: "Browser push for time-sensitive events" },
  ];

  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center">
          <Bell className="w-5 h-5 text-amber" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">Notifications</h2>
          <p className="text-xs text-muted-foreground">Alert preferences {isDemo && <span className="text-amber ml-1">(demo, won't persist)</span>}</p>
        </div>
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const checked = !!(prefs?.notifications as any)?.[item.key];
          return (
            <div key={item.key} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/30 transition-colors">
              <div>
                <div className="text-xs font-medium">{item.label}</div>
                <div className="text-[10px] text-muted-foreground">{item.desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={checked}
                  onChange={(e) => update(item.key, e.target.checked)}
                />
                <div className="w-8 h-4 bg-accent/50 rounded-full peer peer-checked:bg-amber/50 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-foreground after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Active session ──────────────────────────────────────────────────
function SessionCard() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof api.auth.getSession>> | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    api.auth.getSession()
      .then(setSession)
      .catch((err) => console.warn("Failed to load session:", err));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!session) return null;

  const remaining = Math.max(0, new Date(session.expiresAt || 0).getTime() - now);
  const lowTime = remaining < 1000 * 60 * 60 * 24; // <24h
  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center">
          <Monitor className="w-5 h-5 text-amber" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">Active Session</h2>
          <p className="text-xs text-muted-foreground">This device is currently signed in</p>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-accent/30 space-y-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Browser</div>
          <div className="font-medium">{session.browser} · {session.os}</div>
          <div className="text-[10px] text-muted-foreground">{session.device}</div>
        </div>
        <div className="p-3 rounded-lg bg-accent/30 space-y-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">IP Address</div>
          <div className="font-mono">{session.ip}</div>
        </div>
        <div className="p-3 rounded-lg bg-accent/30 space-y-1 col-span-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Session expires in
          </div>
          <div className={`font-mono font-bold ${lowTime ? "text-amber" : "text-foreground"}`}>
            {formatRemaining(remaining)}
          </div>
          {lowTime && (
            <p className="text-[10px] text-amber mt-1">Session expiring soon. Save your work.</p>
          )}
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground flex items-start gap-1.5 p-2 rounded-lg bg-accent/20">
        <Globe className="w-3 h-3 mt-0.5 shrink-0" />
        <span>Sessions are stateless JWTs. To invalidate other devices, change your password — it issues a new secret and renders old tokens reusable only for the current session's lifetime window.</span>
      </div>
    </div>
  );
}

// ─── Security / 2FA ──────────────────────────────────────────────────
function SecurityCard() {
  const [twoFA, setTwoFA] = useState(false);
  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-amber" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Security</h2>
          <p className="text-xs text-muted-foreground">Two-factor authentication</p>
        </div>
      </div>

      <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/30 transition-colors">
        <div>
          <div className="text-xs font-medium flex items-center gap-2">
            Two-Factor Authentication
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent text-muted-foreground uppercase tracking-wider">Soon</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Add an extra layer with TOTP (Google Authenticator, 1Password)</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer opacity-50">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={twoFA}
            onChange={(e) => { setTwoFA(e.target.checked); toast.info("2FA setup coming in a future update"); }}
            disabled
          />
          <div className="w-8 h-4 bg-accent/50 rounded-full peer peer-checked:bg-amber/50 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-foreground after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" />
        </label>
      </div>
    </div>
  );
}

// ─── API keys ────────────────────────────────────────────────────────
function ApiKeysCard() {
  return (
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
        <button
          disabled
          className="btn-amber px-3 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 disabled:opacity-50"
          title="API key management coming in a future update"
        >
          <Plus className="w-3 h-3" />
          New Key
          <Sparkles className="w-3 h-3 ml-1" />
        </button>
      </div>

      <div className="space-y-2">
        {mockApiKeys.map((apiKey) => (
          <ApiKeyRow key={apiKey.id} apiKey={apiKey} />
        ))}
      </div>

      <div className="p-3 rounded-lg bg-accent/30 flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-amber mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground">
          API key issuance & revocation lives in the admin console. Wire it to your account from
          <span className="text-amber ml-1">Admin → Users → API Tokens →</span>
        </p>
      </div>
    </div>
  );
}

// ─── Reusable field ──────────────────────────────────────────────────
function Field({
  label,
  icon: Icon,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  hint,
  mono,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border text-sm focus:outline-none transition-colors ${
          error ? "border-red-500/50 focus:border-red-500" : "border-border focus:border-amber/50"
        } ${mono ? "font-mono" : ""}`}
      />
      {error ? (
        <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      ) : hint ? (
        <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

// ─── API key row (mock) ──────────────────────────────────────────────
function ApiKeyRow({ apiKey }: { apiKey: ApiKey }) {
  const [showKey, setShowKey] = useState(false);
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{apiKey.label}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${apiKey.enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-accent/50 text-muted-foreground"}`}>
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
      <button className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Coming soon">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
