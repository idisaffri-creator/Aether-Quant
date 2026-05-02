/*
 * Dashboard v3 – Void Terminal Command Center Overview
 * Hero metrics, daily PnL chart, portfolio allocation, activity feed
 * NEW: Compounding value chart + Before vs After comparison
 */
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Library,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  BarChart3,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  dashboardMetrics,
  dailyPnlData,
  portfolioAllocation,
  recentActivity,
  agentsData,
  compoundingData,
  beforeAfterData,
} from "@/lib/mockData";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  positive,
}: {
  label: string;
  value: string;
  change?: string;
  icon: React.ElementType;
  positive?: boolean;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-card border-border hover:border-primary/20 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {label}
              </p>
              <p className="text-2xl font-mono font-bold text-foreground">
                {value}
              </p>
              {change && (
                <div className="flex items-center gap-1">
                  {positive ? (
                    <ArrowUpRight className="w-3 h-3 text-profit" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-loss" />
                  )}
                  <span
                    className={`text-xs font-mono font-medium ${
                      positive ? "text-profit" : "text-loss"
                    }`}
                  >
                    {change}
                  </span>
                </div>
              )}
            </div>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-4.5 h-4.5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground font-mono mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-mono font-semibold" style={{ color: p.color }}>
          {p.name}: ${p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "trade":
      return <ArrowUpRight className="w-3.5 h-3.5 text-profit" />;
    case "agent":
      return <Users className="w-3.5 h-3.5 text-primary" />;
    case "alert":
      return <Activity className="w-3.5 h-3.5 text-loss" />;
    case "strategy":
      return <BarChart3 className="w-3.5 h-3.5 text-primary" />;
    default:
      return <Zap className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Hero Metrics */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <MetricCard
          label="Portfolio Value"
          value={`$${(dashboardMetrics.portfolioValue / 1000000).toFixed(2)}M`}
          change={`+${dashboardMetrics.monthlyReturn}% this month`}
          icon={TrendingUp}
          positive
        />
        <MetricCard
          label="Daily P&L"
          value={`$${dashboardMetrics.dailyPnl.toLocaleString()}`}
          change="+1.2% today"
          icon={dashboardMetrics.dailyPnl >= 0 ? TrendingUp : TrendingDown}
          positive={dashboardMetrics.dailyPnl >= 0}
        />
        <MetricCard
          label="Active Agents"
          value={String(dashboardMetrics.activeAgents)}
          change={`${dashboardMetrics.totalStrategies} strategies`}
          icon={Users}
          positive
        />
        <MetricCard
          label="Avg Sharpe"
          value={dashboardMetrics.avgSharpe.toFixed(2)}
          change={`YTD: +${dashboardMetrics.ytdReturn}%`}
          icon={Activity}
          positive
        />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily PnL Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Daily P&L (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyPnlData} barSize={12}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.25 0.015 250)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "oklch(0.6 0.015 250)", fontFamily: "'JetBrains Mono'" }}
                      axisLine={{ stroke: "oklch(0.25 0.015 250)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "oklch(0.6 0.015 250)", fontFamily: "'JetBrains Mono'" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="pnl" name="P&L" radius={[2, 2, 0, 0]}>
                      {dailyPnlData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={
                            entry.pnl >= 0
                              ? "oklch(0.82 0.19 160)"
                              : "oklch(0.68 0.22 20)"
                          }
                          fillOpacity={0.8}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Portfolio Allocation */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-card border-border h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
                <Library className="w-4 h-4 text-primary" />
                Portfolio Allocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolioAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {portfolioAllocation.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-sm font-mono font-semibold text-foreground">
                              {payload[0].name}: {payload[0].value}%
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {portfolioAllocation.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-mono text-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Compounding Value Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Agent Intelligence Compounding
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              How agent performance improves over time as they learn from trades and optimize strategies.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={compoundingData}>
                  <defs>
                    <linearGradient id="compoundGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.82 0.15 195)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.82 0.15 195)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.25 0.015 250)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 10, fill: "oklch(0.6 0.015 250)", fontFamily: "'JetBrains Mono'" }}
                    axisLine={{ stroke: "oklch(0.25 0.015 250)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "oklch(0.6 0.015 250)", fontFamily: "'JetBrains Mono'" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-xs text-primary font-mono font-semibold">{d.week}</p>
                          <p className="text-sm font-mono font-bold text-foreground mt-1">
                            ${d.value.toLocaleString()} value
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Win Rate: {d.winRate}% | {d.trades} trades
                          </p>
                          <p className="text-xs text-profit mt-0.5 italic">
                            {d.improvement}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="oklch(0.82 0.15 195)"
                    strokeWidth={2}
                    fill="url(#compoundGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Improvement milestones */}
            <div className="flex flex-wrap gap-2 mt-4">
              {compoundingData.map((d) => (
                <div
                  key={d.week}
                  className="text-[10px] px-2 py-1 rounded bg-accent/50 border border-border/50 font-mono text-muted-foreground"
                >
                  <span className="text-primary">{d.week}:</span> {d.improvement}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Before vs After Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Before vs After Aether Quant
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              The transformation from manual trading to autonomous agent-driven execution.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Before */}
              <div className="p-4 rounded-xl bg-loss/5 border border-loss/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-loss/20 flex items-center justify-center">
                    <TrendingDown className="w-3.5 h-3.5 text-loss" />
                  </div>
                  <h3 className="text-sm font-display font-bold text-loss">Before Aether Quant</h3>
                </div>
                <div className="space-y-3">
                  {beforeAfterData.before.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-xs text-muted-foreground">{item.metric}</span>
                      </div>
                      <span className="text-xs font-mono text-loss/80 font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* After */}
              <div className="p-4 rounded-xl bg-profit/5 border border-profit/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-profit/20 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-profit" />
                  </div>
                  <h3 className="text-sm font-display font-bold text-profit">After Aether Quant</h3>
                </div>
                <div className="space-y-3">
                  {beforeAfterData.after.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-xs text-muted-foreground">{item.metric}</span>
                      </div>
                      <span className="text-xs font-mono text-profit font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cost savings callout */}
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Estimated annual savings vs. manual trading desk
                </span>
              </div>
              <span className="text-sm font-mono font-bold text-primary">$156,000+</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Row: Agent Status + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Agents Summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Agent Workforce
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agentsData
                  .filter((a) => a.status === "running")
                  .slice(0, 4)
                  .map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center justify-between py-1.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-profit animate-pulse-glow" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {agent.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {agent.asset}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-mono font-semibold ${
                            agent.dailyPnl >= 0 ? "text-profit" : "text-loss"
                          }`}
                        >
                          {agent.dailyPnl >= 0 ? "+" : ""}${agent.dailyPnl.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {agent.tradeCount} trades
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 py-1.5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
                      <ActivityIcon type={item.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        {item.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
