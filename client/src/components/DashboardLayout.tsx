/*
 * DashboardLayout v3 – Sleek Institutional Design
 * Glassmorphic sidebar and header, rounded pill nav items,
 * premium fintech spacing and typography.
 */
import { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { AgentChat } from "@/components/agents/AgentChat";
import NotificationBell from "@/components/NotificationBell";
import Onboarding from "@/components/Onboarding";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  Lightbulb,
  BarChart3,
  Settings2,
  Users,
  Library,
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
  LogOut,
  User,
  Briefcase,
  Menu,
  X,
  Sparkles,
  GitCompare,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAtom, useAtomValue } from "jotai";
import { userAtom, tokenAtom } from "@/store/auth";
import { setAuthToken } from "@/lib/api";

const mainNav = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/dashboard/extractor", label: "Idea Extractor", icon: Lightbulb },
  { path: "/dashboard/backtest", label: "Backtest", icon: BarChart3 },
  { path: "/dashboard/optimization", label: "Optimization", icon: Settings2 },
  { path: "/dashboard/agents", label: "Agent Workforce", icon: Users },
  { path: "/dashboard/team", label: "Agent Team", icon: UserCircle },
  { path: "/dashboard/pipeline", label: "Pipeline & Ops", icon: GitBranch },
  { path: "/dashboard/billing", label: "Outcome Billing", icon: Receipt },
  { path: "/dashboard/library", label: "Strategy Library", icon: Library },
];

const tradingNav = [
  { path: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
  { path: "/dashboard/trade", label: "Trade", icon: TrendingUp },
  { path: "/dashboard/portfolio", label: "Portfolio", icon: PieChartIcon },
  { path: "/dashboard/strategies", label: "Strategies", icon: Brain },
  { path: "/dashboard/analysis", label: "Analysis", icon: BarChart3 },
  { path: "/dashboard/intelligence", label: "Intelligence", icon: Activity },
  { path: "/dashboard/mail", label: "Mail", icon: Mail },
  { path: "/dashboard/audit", label: "Audit Trail", icon: Shield },
  { path: "/dashboard/trading", label: "Paper Trading", icon: TrendingUp },
  { path: "/dashboard/ai", label: "AI Assistant", icon: Sparkles },
  { path: "/dashboard/comparison", label: "Compare Backtests", icon: GitCompare },
  { path: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];

const adminNav = [
  { path: "/dashboard/admin-mail", label: "Admin Webmail", icon: Briefcase },
];

const LogoSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 22H22L12 2Z" fill="url(#paint0_linear)" fillOpacity="0.1" stroke="url(#paint0_linear)" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M12 8L7 18H17L12 8Z" fill="url(#paint0_linear)"/>
    <defs>
      <linearGradient id="paint0_linear" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
  </svg>
);

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAtomValue(userAtom);
  const [, setToken] = useAtom(tokenAtom);
  const [, setUser] = useAtom(userAtom);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isAdmin = user?.role === "admin" || user?.tier === "admin";

  const handleLogout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    toast.success("Logged out successfully");
    setLocation("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={`relative flex flex-col border-r border-white/5 bg-white/[0.01] backdrop-blur-xl shrink-0 z-20 ${
          mobileOpen ? "fixed inset-y-0 left-0 w-72" : "hidden md:flex"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-white/5">
          <Link href="/" className="flex items-center gap-3 overflow-hidden group cursor-pointer w-full">
            <div className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
              <LogoSvg />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <span className="font-display font-bold text-sm text-foreground tracking-tight">
                    Aether Quant
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto p-1.5 rounded hover:bg-accent/50 md:hidden"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto no-scrollbar">
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-sans font-bold text-muted-foreground uppercase tracking-widest px-3 pb-2"
              >
                Core Operations
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
                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans font-medium transition-all relative group overflow-hidden
                        ${isActive
                          ? "text-primary bg-primary/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                        }
                      `}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                      )}
                      <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-primary drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-muted-foreground group-hover:text-foreground"}`} />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
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
                  <TooltipContent side="right" sideOffset={8} className="bg-popover/90 backdrop-blur-md border-white/10 text-foreground font-sans text-xs font-medium px-3 py-1.5 rounded-lg">
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
                className="text-[10px] font-sans font-bold text-muted-foreground uppercase tracking-widest px-3 pt-6 pb-2"
              >
                Market Intelligence
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
                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans font-medium transition-all relative group overflow-hidden
                        ${isActive
                          ? "text-blue-400 bg-blue-500/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-blue-500/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                        }
                      `}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none" />
                      )}
                      <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "text-muted-foreground group-hover:text-foreground"}`} />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
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
                  <TooltipContent side="right" sideOffset={8} className="bg-popover/90 backdrop-blur-md border-white/10 text-foreground font-sans text-xs font-medium px-3 py-1.5 rounded-lg">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {isAdmin && (
          <nav className="space-y-1 pt-4 border-t border-amber/30">
            <div className="px-3 mb-2"><span className="text-[9px] font-mono uppercase tracking-widest text-amber">Admin</span></div>
            {adminNav.map((item) => {
              const isActive = location === item.path;
              const Icon = item.icon;
              return (
                <Tooltip key={item.path} delayDuration={collapsed ? 100 : 1000}>
                  <TooltipTrigger asChild>
                    <Link href={item.path}>
                      <div className={`${isActive ? "text-amber bg-amber/10 border-amber/30" : "text-muted-foreground border-transparent hover:bg-amber/[0.04]"} flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border transition-all`}>
                        <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-amber" : ""}`} />
                        {!collapsed && <span className="overflow-hidden whitespace-nowrap">{item.label}</span>}
                      </div>
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" sideOffset={8} className="bg-popover/90 backdrop-blur-md border-amber/20 text-foreground font-sans text-xs font-medium px-3 py-1.5 rounded-lg">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3.5 top-20 w-7 h-7 rounded-full bg-white/[0.05] backdrop-blur-md border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all z-30 shadow-lg shadow-black/20"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Bottom section — Plan tier */}
        <div className="p-4 border-t border-white/5 space-y-3 bg-white/[0.01]">
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 shadow-inner"
              >
                <Crown className="w-4 h-4 text-primary shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <span className="text-[11px] font-sans text-primary font-bold uppercase tracking-widest">
                  {user?.tier === 'enterprise' ? 'Full Aether' : user?.tier === 'professional' ? 'Pro Access' : user?.tier === 'admin' ? 'Admin Console' : 'Free Tier'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center justify-center gap-2 px-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-muted-foreground font-sans font-medium"
                >
                  System Online
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Ambient background glow for main area */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />

        {/* Top header */}
        <header className="h-16 border-b border-white/5 bg-white/[0.01] backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 rounded hover:bg-accent/50"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 items-center justify-center">
              <Activity className="w-4 h-4 text-foreground/80" />
            </div>
            <span className="font-display font-semibold text-base text-foreground tracking-tight truncate">
              {[...mainNav, ...tradingNav].find((n) => n.path === location)?.label || "Dashboard"}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            {/* Market status */}
            <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 text-xs font-mono font-medium">
              <span className="text-muted-foreground">CL:</span>
              <span className="text-white">$72.85</span>
              <span className="text-emerald-400">+0.42%</span>
              <span className="w-px h-3 bg-white/10 mx-1" />
              <span className="text-muted-foreground">GC:</span>
              <span className="text-white">$2,048.30</span>
              <span className="text-red-400">-0.18%</span>
            </div>

            {/* Notifications */}
            <NotificationBell />

            {/* User avatar with dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="outline-none">
                  <Avatar className="w-9 h-9 border border-white/10 hover:border-primary/50 transition-colors shadow-sm ring-2 ring-transparent focus:ring-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-blue-500/20 text-foreground text-xs font-display font-bold uppercase">
                      {user?.username?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-[oklch(0.14_0.01_250)]/95 backdrop-blur-xl border-white/10 p-2 rounded-xl shadow-2xl">
                <DropdownMenuLabel className="font-display p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none text-foreground">{user?.username || "Trader"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5 my-1" />
                <DropdownMenuItem
                  className="focus:bg-white/[0.05] rounded-lg cursor-pointer gap-3 p-2.5 font-medium text-sm text-foreground/80"
                  onClick={() => setLocation("/dashboard/settings")}
                >
                  <User className="w-4 h-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="focus:bg-white/[0.05] rounded-lg cursor-pointer gap-3 p-2.5 font-medium text-sm text-foreground/80"
                  onClick={() => setLocation("/dashboard/settings")}
                >
                  <SettingsIcon className="w-4 h-4" />
                  System Preferences
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5 my-1" />
                <DropdownMenuItem
                  className="focus:bg-red-500/10 text-red-400 rounded-lg cursor-pointer gap-3 p-2.5 font-medium text-sm"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Secure Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto grid-bg p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 15, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.99 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="h-full max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <AgentChat />
      <Onboarding />
    </div>
  );
}
