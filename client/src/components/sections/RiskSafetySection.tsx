/*
 * Risk & Safety — what's between your money and the market.
 * Trust section. Shows the 10 risk checks, audit log, 2FA, kill switch.
 */
import { motion } from "framer-motion";
import { Shield, Lock, AlertTriangle, FileText, Key, Server, Eye, GitBranch, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const checks = [
  "Max position size per symbol",
  "Max daily loss limit",
  "Max open orders",
  "Slippage threshold",
  "Leverage cap",
  "Concentration limit (single symbol % of portfolio)",
  "Correlation spike detection",
  "Drawdown velocity check",
  "Kill switch (manual + automatic)",
  "Pre-trade 2FA for admin accounts",
];

const pillars = [
  { icon: Lock, title: "JWT + 2FA enforced", desc: "Every admin action requires a TOTP code. Sessions are stateless and short-lived." },
  { icon: FileText, title: "Immutable audit log", desc: "Every login, trade, profile change is recorded forever. Exportable to CSV. SOC2-ready." },
  { icon: Server, title: "Single VPS, real ops", desc: "Postgres tuned to 6GB shared buffers. Redis 4GB with pub/sub. Backups daily, 7-day + 90-day retention." },
  { icon: Key, title: "API keys with scopes", desc: "Per-user bcrypt-hashed keys. Choose read:portfolio, trade:paper, etc. Rotate or revoke anytime." },
  { icon: Eye, title: "Real-time monitoring", desc: "Hawk watches every position, every second. Tightens stops in volatility. Alerts on anomalies." },
  { icon: GitBranch, title: "Open source core", desc: "Strategy logic is yours. Export everything via GDPR Article 15. No lock-in." },
];

export default function RiskSafetySection() {
  return (
    <section className="relative py-24 lg:py-32 px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.05),transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 tracking-wider uppercase mb-4"
          >
            <Shield className="w-3 h-3" />
            Risk & safety
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight"
          >
            What's between your money<br />
            and <span className="text-emerald-400">the market</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base lg:text-lg text-muted-foreground mt-5"
          >
            Ten risk checks per order. Hawk never sleeps. Audit log never forgets. Kill switch always works.
          </motion.p>
        </div>

        {/* 10 risk checks */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-6 lg:p-8 mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-bold text-lg">10 risk checks per order</h3>
            <span className="text-xs text-muted-foreground ml-auto">All configurable per user</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {checks.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-2 text-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-foreground/90">{c}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 6 trust pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <p.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm">{p.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom line */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <p className="text-sm text-muted-foreground">
            We don't have insurance, custody, or a trading desk.<br />
            We're the software. Your broker holds your money. Your capital never touches our servers.
          </p>
          <Link href="/dashboard/audit">
            <div className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:underline cursor-pointer">
              See the live audit log
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}