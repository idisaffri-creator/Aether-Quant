import { useState } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { Link, useLocation } from "wouter";
import { Mail, ArrowRight, RefreshCw, Check, Copy, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function ForgotPassword() {
  usePageTitle("Forgot Password");
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ devToken: string | null; resetUrl: string | null } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.auth.forgotPassword(email.trim());
      setResult(res);
      toast.success("If an account exists, a reset link has been sent");
    } catch (err: any) {
      toast.error(err?.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Link href="/" className="flex items-center gap-2 mx-auto mb-8 w-fit">
          <img src="/logo.png" alt="Aether Energy" className="h-7 w-auto" />
        </Link>

        <div className="glass-card rounded-2xl p-6 space-y-5 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-amber" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold">Reset your password</h1>
              <p className="text-xs text-muted-foreground">We'll send a reset link to your email</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-200">
                    If an account exists for <span className="font-mono">{email}</span>, a reset link has been sent.
                  </div>
                </div>

                {result.devToken && (
                  <div className="p-3 rounded-lg bg-amber/10 border border-amber/20 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                      <div className="text-[11px] text-amber-200">
                        <strong>Dev mode:</strong> the reset token is shown below. In production this would only be sent via email.
                      </div>
                    </div>
                    <button
                      onClick={() => { setLocation(`/reset-password?token=${result.devToken}`); }}
                      className="w-full btn-amber px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />Continue to reset
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setResult(null)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  Use a different email
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={submit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !email.trim()}
                  className="w-full btn-amber px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Send reset link
                </button>
                <p className="text-center text-xs text-muted-foreground">
                  Remember your password?{" "}
                  <Link href="/login" className="text-amber hover:underline">
                    Sign in
                  </Link>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
