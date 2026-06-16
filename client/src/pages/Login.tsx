import { useState } from "react";
import { useLocation } from "wouter";
import { Zap, Eye, EyeOff } from "lucide-react";
import { usePageTitle } from "@/lib/usePageTitle";
import { api, setAuthToken } from "@/lib/api";
import { useSetAtom } from "jotai";
import { tokenAtom, userAtom } from "@/store/auth";
import { toast } from "sonner";

export default function Login() {
  usePageTitle("Sign In");
  const [, setLocation] = useLocation();
  const setToken = useSetAtom(tokenAtom);
  const setUser = useSetAtom(userAtom);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Email and password required");
      return;
    }
    setLoading(true);

    try {
      const res = await api.auth.login({ email: email.trim(), password });
      setAuthToken(res.token);
      setToken(res.token);
      setUser(res.user);
      toast.success("Welcome back, " + res.user.username);
      setLocation("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials. Try demo@aether-energy.ai / demo123");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (kind: "demo" | "admin") => {
    setLoading(true);
    try {
      const creds = kind === "admin"
        ? { email: "admin@aether-energy.ai", password: "admin123" }
        : { email: "demo@aether-energy.ai", password: "demo123" };
      setEmail(creds.email);
      setPassword(creds.password);
      const res = await api.auth.login(creds);
      setAuthToken(res.token);
      setToken(res.token);
      setUser(res.user);
      toast.success(`Welcome, ${res.user.username} (${res.user.role || "user"})`);
      setLocation("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
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
            <h1 className="text-lg font-display font-bold">Welcome back</h1>
            <p className="text-xs text-muted-foreground mt-1">Sign in to Aether Energy</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@aether-energy.ai"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => setLocation("/forgot-password")}
                  className="text-[10px] text-amber hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-9 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-amber w-full py-2.5 rounded-sm text-sm font-bold tracking-widest uppercase disabled:opacity-50 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-mono">
                <span className="bg-[oklch(0.09_0.008_260)] px-2 text-white/40">Or</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => quickLogin("demo")}
                className="py-2.5 rounded-sm text-[11px] font-bold tracking-widest uppercase border border-white/20 text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                <Zap className="w-3 h-3 inline mr-1" />Demo
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => quickLogin("admin")}
                className="py-2.5 rounded-sm text-[11px] font-bold tracking-widest uppercase border border-amber/30 text-amber/80 hover:text-amber hover:bg-amber/5 transition-all"
              >
                Admin
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button onClick={() => setLocation("/register")} className="text-amber hover:underline">
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
