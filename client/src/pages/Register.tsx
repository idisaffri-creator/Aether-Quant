import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Zap } from "lucide-react";
import { usePageTitle } from "@/lib/usePageTitle";
import { api, setAuthToken } from "@/lib/api";
import { useSetAtom } from "jotai";
import { tokenAtom, userAtom } from "@/store/auth";
import { toast } from "sonner";

const usernameRegex = /^[a-z0-9_]{3,20}$/;

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

export default function Register() {
  usePageTitle("Create Account");
  const [, setLocation] = useLocation();
  const setToken = useSetAtom(tokenAtom);
  const setUser = useSetAtom(userAtom);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; username?: boolean; password?: boolean; confirm?: boolean }>({});

  const strength = useMemo(() => passwordStrength(password), [password]);

  const errors = useMemo(() => {
    const e: { email?: string; username?: string; password?: string; confirm?: string } = {};
    if (!email.trim()) e.email = "Email required";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = "Invalid email";
    if (!username.trim()) e.username = "Username required";
    else if (!usernameRegex.test(username))
      e.username = "3-20 lowercase chars (letters, numbers, underscore)";
    if (!password) e.password = "Password required";
    else if (password.length < 8) e.password = "At least 8 characters";
    else if (!/[A-Z]/.test(password)) e.password = "Must contain an uppercase letter";
    else if (!/[a-z]/.test(password)) e.password = "Must contain a lowercase letter";
    else if (!/[0-9]/.test(password)) e.password = "Must contain a number";
    if (!confirm) e.confirm = "Please confirm your password";
    else if (confirm !== password) e.confirm = "Passwords do not match";
    return e;
  }, [email, username, password, confirm]);

  const canSubmit = Object.keys(errors).length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, username: true, password: true, confirm: true });
    if (!canSubmit) {
      toast.error(Object.values(errors)[0] || "Please fix the errors");
      return;
    }
    setLoading(true);

    try {
      const res = await api.auth.register({ email: email.trim(), username: username.trim(), password });
      setAuthToken(res.token);
      setToken(res.token);
      setUser(res.user);
      toast.success("Account created successfully!");
      setLocation("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 mx-auto mb-8">
          <img src="/logo.png" alt="Aether Energy" className="h-8 w-auto" />
        </button>

        <div className="glass-card rounded-xl p-6 space-y-5">
          <div className="text-center">
            <h1 className="text-lg font-display font-bold">Create account</h1>
            <p className="text-xs text-muted-foreground mt-1">Join Aether Energy</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="you@aether-energy.ai"
                autoComplete="email"
                className={`w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border text-sm focus:outline-none transition-colors ${
                  touched.email && errors.email ? "border-red-500/50" : "border-border focus:border-amber/50"
                }`}
              />
              {touched.email && errors.email && (
                <p className="text-[10px] text-red-400 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                placeholder="trader01"
                autoComplete="username"
                className={`w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border text-sm focus:outline-none transition-colors ${
                  touched.username && errors.username ? "border-red-500/50" : "border-border focus:border-amber/50"
                }`}
              />
              {touched.username && errors.username ? (
                <p className="text-[10px] text-red-400 mt-1">{errors.username}</p>
              ) : username.length > 0 ? (
                <p className="text-[10px] text-muted-foreground mt-1">{username.length}/20 chars</p>
              ) : null}
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder="Min 8 chars, mix of letters & numbers"
                autoComplete="new-password"
                className={`w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border text-sm focus:outline-none transition-colors ${
                  touched.password && errors.password ? "border-red-500/50" : "border-border focus:border-amber/50"
                }`}
              />
              {password && (
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
              {touched.password && errors.password && (
                <p className="text-[10px] text-red-400 mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                placeholder="Repeat your password"
                autoComplete="new-password"
                className={`w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border text-sm focus:outline-none transition-colors ${
                  touched.confirm && errors.confirm ? "border-red-500/50" : "border-border focus:border-amber/50"
                }`}
              />
              {touched.confirm && errors.confirm && (
                <p className="text-[10px] text-red-400 mt-1">{errors.confirm}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="btn-amber w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          Already have an account?{" "}
          <button onClick={() => setLocation("/login")} className="text-amber hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
