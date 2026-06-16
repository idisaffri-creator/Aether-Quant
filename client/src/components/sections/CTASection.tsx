/* ============================================================
   AETHER ENERGY — CTA Section (Enhanced)
   Dashboard preview, social proof, better copy
   ============================================================ */
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, TrendingUp, Users, Bot } from "lucide-react";
import { toast } from "sonner";
import { motion, useInView } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer,
} from "recharts";
import { equityCurveData, agentsData } from "@/lib/mockData";

const miniData = equityCurveData.slice(-40);

export default function CTASection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubmitted(true);
    toast.success("You're on the list! We'll be in touch soon.");
  };

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 bg-[oklch(0.10_0.009_260)]" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/8 blur-[140px] rounded-full" />
      </div>

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy + Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="section-number mb-4">Join the Revolution</div>
            <h2 className="font-display text-4xl lg:text-5xl xl:text-[3.5rem] font-700 text-white leading-tight mb-6">
              Stop Trading Against{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                Black-Box Algorithms
              </span>
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-8">
              Over 1,000 traders have joined the Aether waitlist. Build your own
              quant edge — no fund, no team, no six-figure Bloomberg terminal required.
            </p>

            {/* Social proof strip */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-8">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm text-white/50"><span className="text-foreground font-semibold">1,247</span> traders</span>
              </div>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-white/50"><span className="text-foreground font-semibold">5</span> agents running</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white/50"><span className="text-foreground font-semibold">$145k</span> generated</span>
              </div>
            </div>

            {/* Benefits */}
            <div className="flex flex-wrap gap-4 mb-8">
              {["Free paper trading forever", "No credit card required", "Cancel anytime"].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 text-white/60 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  {benefit}
                </div>
              ))}
            </div>

            {/* Form */}
            {!submitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg">
                <input
                  type="email"
                  id="cta-email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  aria-label="Email address"
                  className="flex-1 px-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/15 text-white placeholder-white/35 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                />
                <Button type="submit" className="btn-amber px-6 py-3.5 text-sm rounded-xl shrink-0 group">
                  Get Early Access
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 max-w-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-white font-semibold text-sm">You're on the list!</div>
                  <div className="text-white/55 text-sm">We'll notify you when early access opens.</div>
                </div>
              </div>
            )}

            <p className="text-white/30 text-xs mt-4">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </motion.div>

          {/* Right: Mini dashboard preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            <div className="rounded-2xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-2xl shadow-primary/10 overflow-hidden">
              {/* Window chrome */}
              <div className="h-9 border-b border-white/8 bg-white/[0.02] flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/60" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                  <div className="w-2 h-2 rounded-full bg-green-500/60" />
                </div>
              </div>
              <div className="p-5 space-y-4">
                {/* Mini metrics */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Sharpe", value: "1.84", color: "text-emerald-400" },
                    { label: "Win Rate", value: "68.3%", color: "text-primary" },
                    { label: "CAGR", value: "18.7%", color: "text-emerald-400" },
                  ].map((m) => (
                    <div key={m.label} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
                      <div className={`text-sm font-display font-bold ${m.color}`}>{m.value}</div>
                    </div>
                  ))}
                </div>
                {/* Chart */}
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={miniData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ctaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="equity" stroke="#f59e0b" strokeWidth={2} fill="url(#ctaGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {/* Agent row */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {agentsData.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] border border-white/5 shrink-0">
                      <span className="text-xs">{a.avatar}</span>
                      <span className={`text-[9px] font-mono font-bold ${a.dailyPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {a.dailyPnl >= 0 ? "+" : ""}${(a.dailyPnl / 1000).toFixed(1)}k
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -inset-6 bg-primary/5 rounded-3xl blur-3xl pointer-events-none -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
