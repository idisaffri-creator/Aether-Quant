/*
 * Dashboard v4 – Sleek Institutional Overview
 * Re-styled with Neo-Glassmorphism, soft gradients,
 * and premium institutional data density.
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
  ChevronRight,
  ShieldCheck,
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
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
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
      <Card className="bg-white/[0.02] backdrop-blur-xl border-white/5 hover:border-primary/30 transition-all duration-300 group relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.15em]">
                {label}
              </p>
              <p className="text-3xl font-display font-bold text-foreground tracking-tight">
                {value}
              </p>
              {change && (
                <div className="flex items-center gap-1.5">
                  <div className={`p-0.5 rounded-full ${positive ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                    {positive ? (
                      <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-sans font-semibold ${
                      positive ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {change}
                  </span>
                </div>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
              <Icon className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
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
    <div className="bg-background/90 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-[10px] text-muted-foreground font-sans font-bold uppercase tracking-widest mb-2 border-b border-white/5 pb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 mt-1">
          <span className="text-xs text-foreground/70">{p.name}</span>
          <span className="text-sm font-mono font-bold" style={{ color: p.color || p.fill }}>
            ${p.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  return (
    <motion.div 
      className="space-y-6 lg:space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight">Executive Overview</h1>
          <p className="text-muted-foreground font-sans text-sm lg:text-base">System-wide performance and agent health.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-sans font-bold text-muted-foreground uppercase tracking-widest bg-white/[0.03] px-4 py-2 rounded-full border border-white/5">
           <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
           Verified Node: STABLE-0x42f
        </div>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <MetricCard
          label="Portfolio Value"
          value={`$${(dashboardMetrics.portfolioValue / 1000000).toFixed(2)}M`}
          change={`+${dashboardMetrics.monthlyReturn}% monthly`}
          icon={TrendingUp}
          positive
        />
        <MetricCard
          label="Daily P&L"
          value={`$${dashboardMetrics.dailyPnl.toLocaleString()}`}
          change="+1.2% variance"
          icon={Activity}
          positive={dashboardMetrics.dailyPnl >= 0}
        />
        <MetricCard
          label="Workforce"
          value={String(dashboardMetrics.activeAgents)}
          change="All Nodes Healthy"
          icon={Users}
          positive
        />
        <MetricCard
          label="Avg Sharpe"
          value={dashboardMetrics.avgSharpe.toFixed(2)}
          change={`Top 5% of Cluster`}
          icon={Zap}
          positive
        />
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily PnL Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="bg-white/[0.02] backdrop-blur-xl border-white/5 h-full overflow-hidden shadow-2xl">
            <CardHeader className="p-6 pb-0">
              <div className="flex items-center justify-between mb-4">
                 <CardTitle className="text-sm font-sans font-bold text-foreground flex items-center gap-2 uppercase tracking-widest">
                   <BarChart3 className="w-4 h-4 text-primary" />
                   Performance Velocity
                 </CardTitle>
                 <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> PROFIT</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> LOSS</span>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyPnlData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="pnl" name="P&L">
                      {dailyPnlData.map((entry, index) => (
                        <Cell key={index} fill={entry.pnl >= 0 ? "oklch(0.82 0.19 160)" : "oklch(0.68 0.22 20)"} fillOpacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Portfolio Allocation */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white/[0.02] backdrop-blur-xl border-white/5 h-full shadow-2xl">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-sm font-sans font-bold text-foreground flex items-center gap-2 uppercase tracking-widest">
                <Library className="w-4 h-4 text-blue-400" />
                Asset Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={portfolioAllocation} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                      {portfolioAllocation.map((entry, index) => (
                        <Cell key={index} fill={entry.color} fillOpacity={0.8} />
                      ))}
                    </Pie>
                    <Tooltip content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-background/90 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2 shadow-2xl">
                          <p className="text-xs font-sans font-bold text-foreground">{payload[0].name}: {payload[0].value}%</p>
                        </div>
                      );
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 mt-6">
                {portfolioAllocation.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-[11px] group cursor-default">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full transition-transform group-hover:scale-125" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground font-medium">{item.name}</span>
                    </div>
                    <span className="font-mono text-foreground font-bold">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Compounding Area Chart */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/[0.02] backdrop-blur-xl border-white/5 overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 right-0 p-6 opacity-20"><Sparkles className="w-12 h-12 text-primary" /></div>
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-sm font-sans font-bold text-foreground flex items-center gap-2 uppercase tracking-widest">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Agent Intelligence Curve
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-2 font-sans max-w-xl">
              Real-time monitoring of agent learning efficiency. Higher slope indicates faster adaptation to market volatility.
            </p>
          </CardHeader>
          <CardContent className="p-8 pt-2">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={compoundingData}>
                  <defs>
                    <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.82 0.15 195)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="oklch(0.82 0.15 195)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="oklch(0.82 0.15 195)" strokeWidth={3} fill="url(#primaryGrad)" animationDuration={2000} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-8">
              {compoundingData.map((d) => (
                <div key={d.week} className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-1 hover:border-primary/20 transition-colors">
                  <span className="text-[9px] font-sans font-bold text-primary uppercase tracking-widest">{d.week}</span>
                  <span className="text-[11px] font-sans font-medium text-foreground/80">{d.improvement}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="bg-white/[0.02] backdrop-blur-xl border-white/5 shadow-2xl overflow-hidden">
             <CardHeader className="p-6 border-b border-white/5 bg-white/[0.01]">
                <CardTitle className="text-sm font-sans font-bold text-foreground flex items-center gap-2 uppercase tracking-widest">
                   <Clock className="w-4 h-4 text-blue-400" />
                   Recent Audit Trail
                </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                   {recentActivity.slice(0, 5).map((item) => (
                     <div key={item.id} className="p-4 flex items-center justify-between group hover:bg-white/[0.02] transition-colors cursor-pointer">
                        <div className="flex items-center gap-4">
                           <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center group-hover:border-primary/30 transition-colors">
                              <Activity className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                           </div>
                           <div>
                              <p className="text-sm font-sans font-medium text-foreground/90">{item.message}</p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.time}</p>
                           </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                     </div>
                   ))}
                </div>
                <button className="w-full py-3 text-[10px] font-sans font-bold text-primary uppercase tracking-[0.2em] border-t border-white/5 hover:bg-primary/5 transition-colors">
                   View Full Audit Trail
                </button>
             </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/[0.02] backdrop-blur-xl border-white/5 shadow-2xl overflow-hidden h-full">
             <CardHeader className="p-6 border-b border-white/5 bg-white/[0.01]">
                <CardTitle className="text-sm font-sans font-bold text-foreground flex items-center gap-2 uppercase tracking-widest">
                   <Users className="w-4 h-4 text-emerald-400" />
                   Agent Health Summary
                </CardTitle>
             </CardHeader>
             <CardContent className="p-6">
                <div className="space-y-5">
                   {agentsData.slice(0, 4).map((agent) => (
                     <div key={agent.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'running' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500'} animate-pulse`} />
                           <div>
                              <p className="text-sm font-sans font-bold text-foreground">{agent.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono uppercase">{agent.asset} · NODE_{agent.id.slice(0,4)}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className={`text-sm font-mono font-bold ${agent.dailyPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {agent.dailyPnl >= 0 ? "+" : ""}${agent.dailyPnl.toLocaleString()}
                           </p>
                           <p className="text-[10px] text-muted-foreground font-mono">Win Rate: 68%</p>
                        </div>
                     </div>
                   ))}
                </div>
                <div className="mt-8 pt-6 border-t border-white/5">
                   <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                         <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Workforce Status</span>
                         <span className="text-xs font-sans font-medium text-emerald-400">92.4% Optimal Efficiency</span>
                      </div>
                      <button className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-sans font-bold text-primary uppercase tracking-widest hover:bg-primary/20 transition-all">
                         Scale Operations
                      </button>
                   </div>
                </div>
             </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
