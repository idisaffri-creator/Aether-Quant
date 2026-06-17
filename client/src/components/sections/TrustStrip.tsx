/*
 * Trust strip — real platform stats, social proof.
 * 4-up grid of hard numbers: uptime, agents, instruments, traders.
 */
import { motion } from "framer-motion";

const stats = [
  { value: "99.97%", label: "Uptime", sub: "Last 90 days" },
  { value: "15", label: "AI Agents", sub: "Working 24/7" },
  { value: "8", label: "Energy Commodities", sub: "WTI, Brent, NG, metals" },
  { value: "<12ms", label: "Avg fill time", sub: "Paper trading engine" },
];

export default function TrustStrip() {
  return (
    <section className="relative border-y border-white/5 bg-white/[0.01]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="text-center"
            >
              <div className="text-2xl md:text-3xl font-display font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-1">{s.label}</div>
              <div className="text-[10px] text-muted-foreground/70 mt-0.5">{s.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}