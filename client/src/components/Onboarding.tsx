/**
 * Onboarding modal — shown on first login to guide new users.
 * 3 steps: Welcome → KYC info → Trading mode.
 * Skipped if user has completed onboarding (stored in user preferences).
 */
import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { userAtom } from "@/store/auth";
import { api } from "@/lib/api";
import { Sparkles, Shield, TrendingUp, X, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { toast } from "sonner";

interface Step {
  id: "welcome" | "kyc" | "mode";
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  { id: "welcome", title: "Welcome to Aether Energy", description: "Algorithmic trading for energy commodities. Let's get you set up in 2 minutes.", icon: <Sparkles className="w-6 h-6" /> },
  { id: "kyc", title: "Verify your identity", description: "For live trading, you'll need to complete KYC. For now, paper trading works without it.", icon: <Shield className="w-6 h-6" /> },
  { id: "mode", title: "Choose your trading mode", description: "Start with paper trading to learn the platform. Switch to live when you're ready.", icon: <TrendingUp className="w-6 h-6" /> },
];

export default function Onboarding() {
  const [user, setUser] = useAtom(userAtom);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const prefs = user.preferences as Record<string, any> | undefined;
    const completed = prefs?.onboardingCompleted;
    if (!completed) {
      setOpen(true);
    }
  }, [user]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  async function handleComplete() {
    setSaving(true);
    try {
      const updated = await api.auth.completeOnboarding();
      setUser(updated);
      setOpen(false);
      toast.success("Onboarding complete! Welcome to Aether Energy.");
    } catch (err) {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    handleComplete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg glass-card rounded-2xl p-6 sm:p-8">
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground"
          aria-label="Skip onboarding"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/20 text-primary rounded-lg">
            {current.icon}
          </div>
          <div className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</div>
        </div>

        <h2 className="text-2xl font-bold mb-2">{current.title}</h2>
        <p className="text-muted-foreground mb-6">{current.description}</p>

        {current.id === "kyc" && (
          <div className="bg-card/50 rounded-lg p-4 mb-6 text-sm space-y-2">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Paper trading is available immediately — no KYC needed.</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>For live trading, KYC takes ~5 minutes. We'll guide you through it.</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Your data is encrypted and never shared with third parties.</span>
            </div>
          </div>
        )}

        {current.id === "mode" && (
          <div className="space-y-3 mb-6">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors">
              <input type="radio" name="mode" value="paper" defaultChecked className="mt-1" />
              <div>
                <div className="font-semibold">Paper trading (recommended)</div>
                <div className="text-xs text-muted-foreground">$100,000 virtual balance. No real money at risk.</div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors opacity-60">
              <input type="radio" name="mode" value="live" disabled className="mt-1" />
              <div>
                <div className="font-semibold">Live trading</div>
                <div className="text-xs text-muted-foreground">Requires KYC verification + broker setup. Available after step 1.</div>
              </div>
            </label>
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={isFirst}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-primary" : "w-1.5 bg-muted"}`} />
            ))}
          </div>
          <button
            onClick={isLast ? handleComplete : () => setStep(s => s + 1)}
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
          >
            {saving ? "Saving..." : isLast ? "Get started" : "Next"}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
