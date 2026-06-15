import { useState } from "react";
import { useLocation } from "wouter";
import { Zap, Eye, EyeOff } from "lucide-react";
import { usePageTitle } from "@/lib/usePageTitle";
import { api, setAuthToken } from "@/lib/api";

export default function Login() {
  usePageTitle("Sign In");
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Email and password required");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await api.auth.login({ email: email.trim(), password });
      setAuthToken(res.token);
      localStorage.setItem("aether_email", res.user.email);
      setLocation("/dashboard");
    } catch {
      setError("Invalid credentials. Try demo@aether-energy.ai / demo123");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail("demo@aether-energy.ai");
    setPassword("demo123");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 mx-auto mb-8">
          <div className="w-8 h-8 rounded-lg bg-amber/20 border border-amber/40 flex items-center justify-center">
            <Zap className="w-4 h-4 text-amber" fill="currentColor" />
          </div>
          <span className="font-display text-lg font-bold">
            AETHER<span className="text-amber">.</span>
          </span>
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
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Password</label>
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

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-amber w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="text-center">
            <button onClick={fillDemo} className="text-[10px] text-muted-foreground hover:text-amber transition-colors">
              Use demo credentials
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          Don't have an account?{" "}
          <button onClick={() => setLocation("/register")} className="text-amber hover:underline">
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
