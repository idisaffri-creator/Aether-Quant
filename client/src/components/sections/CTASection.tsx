/*
 * Call to Action — final conversion section.
 * Showcases the breadth of what's now in the platform.
 */
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Shield, Sparkles, TrendingUp, Brain, Zap, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CTASection() {
  return (
    <section className="relative py-24 lg:py-32 px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.12),transparent_70%)]" />

      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary tracking-wider uppercase mb-6">
            <Sparkles className="w-3 h-3" /> Free forever · No credit card
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.05]">
            Ship your first trade
            <br />
            <span className="bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent">
              before lunch.
            </span>
          </h2>

          <p className="text-base lg:text-lg text-muted-foreground mt-5 max-w-xl mx-auto">
            15 AI agents. 80+ API endpoints. 4 data feeds. $100k paper to start. Open the dashboard, clone a strategy, and watch it run against live market data.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link href="/login">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 font-semibold h-12 px-6">
                Launch Dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/dashboard/backtest">
              <Button size="lg" variant="outline" className="border-border hover:bg-accent/30 font-semibold h-12 px-6">
                <BarChart3 className="mr-2 w-4 h-4" />
                Try a Backtest
              </Button>
            </Link>
            <a href="#fleet">
              <Button size="lg" variant="ghost" className="hover:bg-accent/30 font-semibold h-12 px-6">
                <Brain className="mr-2 w-4 h-4" />
                Meet the Agents
              </Button>
            </a>
          </div>

          {/* What you get */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
            <Pill icon={Brain} text="15 AI agents · 24/7" />
            <Pill icon={TrendingUp} text="Paper → live in one click" />
            <Pill icon={Shield} text="JWT + 2FA + admin lockout" />
            <Pill icon={Sparkles} text="AI strategy advisor" />
            <Pill icon={Zap} text="Discord & email alerts" />
            <Pill icon={BarChart3} text="Monte Carlo + backtest" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Pill({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="glass-card rounded-xl p-3 flex items-center gap-2 text-xs">
      <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
      <span className="text-left">{text}</span>
    </div>
  );
}