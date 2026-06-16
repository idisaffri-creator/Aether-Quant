import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { Link, useLocation } from "wouter";
import { Key, ArrowRight, RefreshCw, Check, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

function getTokenFromUrl() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("token");
}

export default function ResetPassword() {
  usePageTitle("Reset Password");
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(getTokenFromUrl());
  const [validating, setValidating] = useState(true);
  const [validation, setValidation] = useState<{ valid: boolean; email?: string; code?: string; message?: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setValidating(false); setValidation({ valid: false, code: "NO_TOKEN", message: "No reset token in URL" }); return; }
    api.auth.validateResetToken(token)
      .then((res) => setValidation(res))
      .catch((err) => setValidation({ valid: false, code: "ERROR", message: err?.message || "Validation failed" }))
      .finally(() => setValidating(false));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setSubmitting(true);
    try {
      await api.auth.resetPassword(token, newPassword);
      setDone(true);
      toast.success("Password reset successfully");
      setTimeout(() => setLocation("/login"), 1800);
    } catch (err: any) {
      toast.error(err?.message || "Reset failed");
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
              <Key className="w-5 h-5 text-amber" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold">Set new password</h1>
              <p className="text-xs text-muted-foreground">Choose a strong password to secure your account</p>
            </div>
          </div>

          {validating ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 text-amber animate-spin" />
            </div>
          ) : !validation?.valid ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-200">
                  {validation?.message || "This reset link is invalid or has expired."}
                </div>
              </div>
              <Link href="/forgot-password" className="btn-amber w-full px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2">
                <ArrowRight className="w-3.5 h-3.5" />Request a new reset link
              </Link>
            </motion.div>
          ) : done ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-sm font-medium">Password reset successfully</p>
              <p className="text-xs text-muted-foreground">Redirecting you to sign in…</p>
            </motion.div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="p-2.5 rounded-lg bg-accent/30 text-xs text-muted-foreground">
                Resetting password for <span className="text-amber font-mono">{validation.email}</span>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">New password</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                    autoComplete="new-password"
                    className="w-full px-3 py-2 pr-10 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Confirm new password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  autoComplete="new-password"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50"
                />
              </div>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <p>Password must contain:</p>
                <ul className="ml-3 space-y-0.5">
                  <li className={newPassword.length >= 8 ? "text-emerald-400" : ""}>• At least 8 characters</li>
                  <li className={/[A-Z]/.test(newPassword) ? "text-emerald-400" : ""}>• One uppercase letter</li>
                  <li className={/[0-9]/.test(newPassword) ? "text-emerald-400" : ""}>• One number</li>
                </ul>
              </div>
              <button
                type="submit"
                disabled={submitting || newPassword.length < 8 || newPassword !== confirmPassword}
                className="w-full btn-amber px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                Reset password
              </button>
              <p className="text-center text-xs text-muted-foreground">
                <Link href="/login" className="text-amber hover:underline">Back to sign in</Link>
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
