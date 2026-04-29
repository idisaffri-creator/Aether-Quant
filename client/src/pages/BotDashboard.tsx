/*
 * Bot Dashboard – Void Terminal
 * Cards per bot with pulsing status, daily P&L, trade log popup
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Power,
  PowerOff,
  Activity,
  Clock,
  Hash,
  Shield,
  ChevronRight,
  X,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { botsData, botTradeLogs } from "@/lib/mockData";
import { toast } from "sonner";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663489353166/Smb5wRr5wwDpFtVfRrnNA3/hero-bg-fnM23fBwFxzkcaLE9Wko44.webp";

function formatTime(date: Date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function BotCard({
  bot,
  onOpenLog,
  onToggle,
}: {
  bot: (typeof botsData)[0];
  onOpenLog: () => void;
  onToggle: () => void;
}) {
  const [heartbeat, setHeartbeat] = useState(formatTime(bot.lastHeartbeat));

  useEffect(() => {
    if (bot.status !== "running") return;
    const interval = setInterval(() => {
      setHeartbeat(formatTime(new Date(Date.now() - Math.random() * 5000)));
    }, 3000);
    return () => clearInterval(interval);
  }, [bot.status]);

  const isRunning = bot.status === "running";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`bg-card border-border hover:border-primary/20 transition-all cursor-pointer ${
          isRunning ? "" : "opacity-60"
        }`}
        onClick={onOpenLog}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isRunning ? "bg-profit animate-pulse-glow" : "bg-muted-foreground"
                }`}
              />
              <div>
                <h3 className="text-sm font-display font-semibold text-foreground">
                  {bot.name}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {bot.asset}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-mono ${
                isRunning
                  ? "border-profit/30 text-profit"
                  : "border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              {isRunning ? "Running" : "Stopped"}
            </Badge>
          </div>

          {/* Daily P&L */}
          <div className="mb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
              Daily P&L
            </p>
            <p
              className={`text-xl font-mono font-bold ${
                bot.dailyPnl >= 0 ? "text-profit" : "text-loss"
              }`}
            >
              {bot.dailyPnl >= 0 ? "+" : ""}${bot.dailyPnl.toLocaleString()}
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2 bg-secondary/40 rounded-md">
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingUp className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Total P&L</span>
              </div>
              <p className="text-xs font-mono font-semibold text-profit">
                +${bot.totalPnl.toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-secondary/40 rounded-md">
              <div className="flex items-center gap-1 mb-0.5">
                <Hash className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Trades</span>
              </div>
              <p className="text-xs font-mono font-semibold text-foreground">
                {bot.tradeCount}
              </p>
            </div>
            <div className="p-2 bg-secondary/40 rounded-md">
              <div className="flex items-center gap-1 mb-0.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Uptime</span>
              </div>
              <p className="text-xs font-mono font-semibold text-foreground">
                {bot.uptime}
              </p>
            </div>
            <div className="p-2 bg-secondary/40 rounded-md">
              <div className="flex items-center gap-1 mb-0.5">
                <Activity className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Win Rate</span>
              </div>
              <p className="text-xs font-mono font-semibold text-foreground">
                {bot.winRate}%
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Shield
                className={`w-3 h-3 ${
                  bot.riskLevel === "High"
                    ? "text-loss"
                    : bot.riskLevel === "Medium"
                    ? "text-primary"
                    : "text-profit"
                }`}
              />
              <span className="text-[10px] text-muted-foreground font-mono">
                {bot.riskLevel} Risk
              </span>
              <span className="text-[10px] text-muted-foreground/50 mx-1">·</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Beat: {heartbeat}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
              >
                {isRunning ? (
                  <PowerOff className="w-3 h-3 text-loss" />
                ) : (
                  <Power className="w-3 h-3 text-profit" />
                )}
              </Button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function BotDashboard() {
  const [bots, setBots] = useState(botsData);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);

  const toggleBot = (id: string) => {
    setBots((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const newStatus = b.status === "running" ? "stopped" : "running";
        toast(
          newStatus === "running"
            ? `${b.name} started`
            : `${b.name} stopped`,
          {
            icon: newStatus === "running" ? "▶️" : "⏹️",
          }
        );
        return {
          ...b,
          status: newStatus as "running" | "stopped",
          dailyPnl: newStatus === "stopped" ? 0 : b.dailyPnl,
        };
      })
    );
  };

  const activeBots = bots.filter((b) => b.status === "running");
  const totalDailyPnl = bots.reduce((sum, b) => sum + b.dailyPnl, 0);
  const selectedBotData = bots.find((b) => b.id === selectedBot);
  const selectedLogs = selectedBot ? botTradeLogs[selectedBot] || [] : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="relative rounded-xl overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: `url(${HERO_IMG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="relative p-6">
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Bot Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-profit animate-pulse-glow" />
              <span className="text-sm text-muted-foreground">
                <span className="font-mono text-foreground font-semibold">{activeBots.length}</span> active bots
              </span>
            </div>
            <span className="text-border">|</span>
            <span className="text-sm text-muted-foreground">
              Daily P&L:{" "}
              <span
                className={`font-mono font-semibold ${
                  totalDailyPnl >= 0 ? "text-profit" : "text-loss"
                }`}
              >
                {totalDailyPnl >= 0 ? "+" : ""}${totalDailyPnl.toLocaleString()}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Risk Overlay Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/10 rounded-lg"
      >
        <Shield className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          <span className="text-primary font-semibold">Risk Overlay Active</span> — All orders pass through
          position limits, daily loss limits, and correlation checks before execution.
        </p>
      </motion.div>

      {/* Bot Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {bots.map((bot, i) => (
          <BotCard
            key={bot.id}
            bot={bot}
            onOpenLog={() => setSelectedBot(bot.id)}
            onToggle={() => toggleBot(bot.id)}
          />
        ))}
      </div>

      {/* Trade Log Dialog */}
      <Dialog open={!!selectedBot} onOpenChange={() => setSelectedBot(null)}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              {selectedBotData?.name} — Trade Log
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Bot info */}
            {selectedBotData && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2 bg-secondary/40 rounded-md text-center">
                  <p className="text-[10px] text-muted-foreground">Strategy</p>
                  <p className="text-xs font-mono text-foreground mt-0.5">
                    {selectedBotData.strategy}
                  </p>
                </div>
                <div className="p-2 bg-secondary/40 rounded-md text-center">
                  <p className="text-[10px] text-muted-foreground">Total P&L</p>
                  <p className="text-xs font-mono text-profit mt-0.5">
                    +${selectedBotData.totalPnl.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-secondary/40 rounded-md text-center">
                  <p className="text-[10px] text-muted-foreground">Win Rate</p>
                  <p className="text-xs font-mono text-foreground mt-0.5">
                    {selectedBotData.winRate}%
                  </p>
                </div>
              </div>
            )}

            {/* Trade log table */}
            {selectedLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                        Time
                      </th>
                      <th className="text-left py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                        Action
                      </th>
                      <th className="text-left py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                        Price
                      </th>
                      <th className="text-left py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="text-right py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                        P&L
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-border/30 hover:bg-accent/30"
                      >
                        <td className="py-2 px-2 text-xs font-mono text-muted-foreground">
                          {log.time}
                        </td>
                        <td className="py-2 px-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono ${
                              log.action.includes("BUY")
                                ? "border-profit/30 text-profit"
                                : "border-loss/30 text-loss"
                            }`}
                          >
                            {log.action}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-xs font-mono">
                          ${log.price.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-xs font-mono">
                          {log.quantity}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {log.pnl !== null ? (
                            <span
                              className={`text-xs font-mono font-semibold ${
                                log.pnl >= 0 ? "text-profit" : "text-loss"
                              }`}
                            >
                              {log.pnl >= 0 ? "+" : ""}${log.pnl.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center">
                <AlertTriangle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No trade logs available for this bot
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
