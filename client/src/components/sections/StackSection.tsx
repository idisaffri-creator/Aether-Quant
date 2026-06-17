/*
 * StackSection — the trading stack, no infra talk.
 * What powers the platform for traders: data feeds, broker,
 * AI, agents, integrations.
 */
import { motion } from "framer-motion";
import { Database, Brain, Radio, Shield, Key, Cpu, Activity, Code, LineChart, Webhook, BarChart3, Search, Newspaper, TrendingUp } from "lucide-react";

const layers = [
  {
    name: "Market Data",
    description: "Real-time quotes + fundamentals. Every tick, every EIA report, every headline.",
    items: [
      { icon: Database, name: "Yahoo Finance", desc: "Free real-time quotes, 10y history" },
      { icon: Radio, name: "EIA API", desc: "Crude/NGas inventory & production" },
      { icon: Newspaper, name: "NewsAPI + GDELT", desc: "Curated headlines + global events" },
      { icon: Activity, name: "Ollama", desc: "Local LLM for sentiment scoring" },
    ],
  },
  {
    name: "Trading Engine",
    description: "Paper and live execution. Risk checks on every order. Sub-12ms fills.",
    items: [
      { icon: Cpu, name: "Paper Engine", desc: "12ms avg fill, $100k virtual capital" },
      { icon: TrendingUp, name: "Alpaca Live", desc: "One-click paper → live migration" },
      { icon: Shield, name: "Risk Manager", desc: "10 checks/order, kill switch always on" },
      { icon: Webhook, name: "Order Webhooks", desc: "Discord, Slack, custom endpoints" },
    ],
  },
  {
    name: "AI Agents",
    description: "15 specialists. Each runs a cron, talks to the data layer, fires alerts.",
    items: [
      { icon: Brain, name: "15 Named Agents", desc: "Scout, Sherlock, Quincy, Hawk, Press, Sage, Argus, Mercury, Echo, Compass, Atlas, Ledger, Counsel, Librarian, Hermes" },
      { icon: Code, name: "Strategy DSL", desc: "Visual rules — RSI < 30, MACD cross, ATR breakout" },
      { icon: BarChart3, name: "Backtest + Monte Carlo", desc: "10y history, 10k randomized paths" },
      { icon: LineChart, name: "Live WebSocket", desc: "Per-user channels, Redis pub/sub" },
    ],
  },
  {
    name: "Platform",
    description: "What you touch. The dashboard, the docs, the developer access.",
    items: [
      { icon: Key, name: "Per-user API Keys", desc: "Bcrypt-hashed, scoped, revocable" },
      { icon: Search, name: "Meilisearch", desc: "Search across strategies, signals, news" },
      { icon: Code, name: "OpenAPI 3.1", desc: "80+ endpoints, full schema at /api/docs" },
      { icon: Webhook, name: "i18n + PWA", desc: "EN/ES/ZH/JA, installable to home screen" },
    ],
  },
];

export default function StackSection() {
  return (
    <section className="relative py-24 lg:py-32 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary tracking-wider uppercase mb-4"
          >
            <Cpu className="w-3 h-3" />
            The stack
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight"
          >
            Everything you need to trade.
            <br />
            <span className="text-primary">Nothing you don't.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base lg:text-lg text-muted-foreground mt-4"
          >
            Real market data feeds. A paper engine that fills in 12ms. 15 agents running 24/7. Open API for the rest. No SaaS bills, no rate limits on the free tier.
          </motion.p>
        </div>

        <div className="space-y-3">
          {layers.map((layer, i) => (
            <motion.div
              key={layer.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl p-5"
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-1">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">{layer.name}</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed">{layer.description}</p>
                </div>
                <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {layer.items.map((item) => (
                    <div key={item.name} className="p-3 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <item.icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{item.name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-relaxed">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}