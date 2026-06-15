import { useState } from "react";
import { useLocation } from "wouter";
import { Zap } from "lucide-react";
import { usePageTitle } from "@/lib/usePageTitle";
import { api, setAuthToken } from "@/lib/api";

export default function Register() {
  usePageTitle("Create Account");
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !username.trim() || !password.trim()) {
      setError("All fields required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await api.auth.register({ email: email.trim(), username: username.trim(), password });
      setAuthToken(res.token);
      localStorage.setItem("aether_email", res.user.email);
      setLocation("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
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
                placeholder="you@aether-energy.ai"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="trader01"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50"
              />
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
