/*
 * Platform — real architecture diagram. No mock data.
 * Shows the actual stack: 8 PM2 workers, 6 background services,
 * Postgres, Redis, MinIO, Meilisearch, Prometheus, Grafana.
 */
import { motion } from "framer-motion";
import { Database, Server, Zap, Brain, LineChart, Shield, MessageSquare, Search, BarChart3, FileCheck } from "lucide-react";

const layers = [
  {
    title: "Client",
    items: [
      { name: "React 19 + Wouter", icon: Zap, desc: "Lazy-loaded routes, 358KB bundle" },
      { name: "Realtime WebSocket", icon: MessageSquare, desc: "Per-user channels, Redis pub/sub" },
      { name: "TradingView charts", icon: LineChart, desc: "lightweight-charts, candle + line" },
    ],
  },
  {
    title: "API",
    items: [
      { name: "Node.js + Express", icon: Server, desc: "76 OpenAPI paths, 8 PM2 workers" },
      { name: "AI assistant", icon: Brain, desc: "OpenAI / Ollama / mock" },
      { name: "Backtest engine", icon: BarChart3, desc: "Mean reversion, momentum, buy & hold" },
      { name: "Risk manager", icon: Shield, desc: "Position + daily loss + kill switch" },
    ],
  },
  {
    title: "Data",
    items: [
      { name: "PostgreSQL 16", icon: Database, desc: "6GB shared_buffers, pg_stat_statements" },
      { name: "Redis 7", icon: Zap, desc: "4GB cache, pub/sub, idempotency" },
      { name: "Meilisearch", icon: Search, desc: "Strategy, signal, news indexes" },
      { name: "MinIO (S3)", icon: FileCheck, desc: "KYC documents + exports" },
    ],
  },
  {
    title: "Observability",
    items: [
      { name: "Prometheus", icon: BarChart3, desc: "/metrics scrape every 30s" },
      { name: "Grafana", icon: LineChart, desc: "11-panel Aether dashboard" },
      { name: "Sentry", icon: Shield, desc: "Errors + traces (optional)" },
      { name: "fail2ban + backups", icon: Shield, desc: "SSH + daily pg_dump" },
    ],
  },
];

export default function PlatformSection() {
  return (
    <section className="relative py-24 lg:py-32 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary tracking-wider uppercase mb-4">
            Architecture
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight">
            One VPS. <span className="text-primary">Full stack.</span>
          </h2>
          <p className="text-base lg:text-lg text-muted-foreground mt-4">
            No vendor lock-in. No SaaS bills. Production-grade observability + storage + search + monitoring on a single 8-core box. Switch any component without rewriting the rest.
          </p>
        </div>

        <div className="space-y-3">
          {layers.map((layer, i) => (
            <motion.div
              key={layer.title}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl p-5"
            >
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{layer.title}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {layer.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.name} className="p-3 rounded-lg bg-card/50 border border-border/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
