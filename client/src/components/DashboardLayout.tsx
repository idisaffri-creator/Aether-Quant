/*
 * DashboardLayout v2 – Void Terminal Design
 * Narrow sidebar (64px collapsed / 240px expanded) + top header bar
 * Deep space aesthetic with electric cyan accents
 * Updated: Agent terminology, pricing tier indicator
 */
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { AgentChat } from "@/components/agents/AgentChat";
import NotificationBell from "@/components/NotificationBell";
import {
  LayoutDashboard,
  Lightbulb,
  BarChart3,
  Settings2,
  Users,
  Library,
  Bell,
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap,
  Receipt,
  Crown,
  UserCircle,
  GitBranch,
  TrendingUp,
  PieChart as PieChartIcon,
  Brain,
  Mail,
  Shield,
  Settings as SettingsIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

const mainNav = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/extractor", label: "Idea Extractor", icon: Lightbulb },
  { path: "/backtest", label: "Backtest", icon: BarChart3 },
  { path: "/optimization", label: "Optimization", icon: Settings2 },
  { path: "/agents", label: "Agent Workforce", icon: Users },
  { path: "/team", label: "Agent Team", icon: UserCircle },
  { path: "/pipeline", label: "Pipeline & Ops", icon: GitBranch },
  { path: "/billing", label: "Outcome Billing", icon: Receipt },
  { path: "/library", label: "Strategy Library", icon: Library },
];

const tradingNav = [
  { path: "/overview", label: "Overview", icon: LayoutDashboard },
  { path: "/trade", label: "Trade", icon: TrendingUp },
  { path: "/portfolio", label: "Portfolio", icon: PieChartIcon },
  { path: "/strategies", label: "Strategies", icon: Brain },
  { path: "/analysis", label: "Analysis", icon: BarChart3 },
  { path: "/intelligence", label: "Intelligence", icon: Activity },
  { path: "/mail", label: "Mail", icon: Mail },
  { path: "/audit", label: "Audit Trail", icon: Shield },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="relative flex flex-col border-r border-border bg-sidebar shrink-0"
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-3 border-b border-border">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <span className="font-display font-bold text-sm text-foreground tracking-tight">
                    Aether Quant
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-3 pb-1"
              >
                Aether Quant
              </motion.div>
            )}
          </AnimatePresence>
          {mainNav.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            return (
              <Tooltip key={item.path} delayDuration={collapsed ? 100 : 1000}>
                <TooltipTrigger asChild>
                  <Link href={item.path}>
                    <motion.div
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative
                        ${isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }
                      `}
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.1 }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r"
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      )}
                      <Icon className="w-4.5 h-4.5 shrink-0" />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-3 pt-3 pb-1"
              >
                Aether Energy
              </motion.div>
            )}
          </AnimatePresence>
          {tradingNav.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            return (
              <Tooltip key={item.path} delayDuration={collapsed ? 100 : 1000}>
                <TooltipTrigger asChild>
                  <Link href={item.path}>
                    <motion.div
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative
                        ${isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }
                      `}
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.1 }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r"
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      )}
                      <Icon className="w-4.5 h-4.5 shrink-0" />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>

        {/* Bottom section — Plan tier */}
        <div className="p-3 border-t border-border space-y-2">
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/5 border border-primary/20"
              >
                <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-mono text-primary font-medium">Full AETHER</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2 px-2">
            <div className="w-2 h-2 rounded-full bg-profit animate-pulse-glow shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-muted-foreground font-mono"
                >
                  System Online
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="h-14 border-b border-border bg-sidebar flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-display font-semibold text-sm text-foreground">
              {[...mainNav, ...tradingNav].find((n) => n.path === location)?.label || "Dashboard"}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5"
            >
              LIVE
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {/* Market status */}
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span>CL: $72.85</span>
              <span className="text-profit">+0.42%</span>
              <span className="mx-1 text-border">|</span>
              <span>GC: $2,048.30</span>
              <span className="text-loss">-0.18%</span>
            </div>

            {/* Pricing tier badge */}
            <Badge
              variant="outline"
              className="hidden lg:flex text-[10px] font-mono border-primary/20 text-primary/80 bg-primary/5 gap-1"
            >
              <Crown className="w-2.5 h-2.5" />
              Full AETHER
            </Badge>

            {/* Notifications */}
            <NotificationBell />

            {/* User avatar */}
            <Avatar className="w-8 h-8 border border-border">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-display font-semibold">
                AQ
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto grid-bg">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <AgentChat />
    </div>
  );
}
