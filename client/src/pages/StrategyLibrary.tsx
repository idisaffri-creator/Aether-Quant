/*
 * Strategy Library – Void Terminal
 * List of saved backtests/optimizations with name, date, metrics
 * Options: Delete, Re-run, Deploy
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Library,
  Search,
  Trash2,
  Play,
  Rocket,
  Calendar,
  Target,
  TrendingUp,
  TrendingDown,
  Percent,
  Filter,
  MoreVertical,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { strategyLibrary } from "@/lib/mockData";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function StrategyLibrary() {
  const [, setLocation] = useLocation();
  const [strategies, setStrategies] = useState(strategyLibrary);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filtered = strategies.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || s.type.toLowerCase() === filterType;
    return matchesSearch && matchesType;
  });

  const handleDelete = (id: string) => {
    setStrategies((prev) => prev.filter((s) => s.id !== id));
    toast.success("Strategy deleted");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-display font-bold text-foreground mb-1">
          Strategy Library
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse, manage, and redeploy your saved backtests and optimization runs.
        </p>
      </motion.div>

      {/* Search & Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search strategies..."
            className="w-full bg-input border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2">
          {["all", "backtest", "optimization"].map((type) => (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              size="sm"
              className="text-xs capitalize font-display"
              onClick={() => setFilterType(type)}
            >
              {type === "all" ? (
                <>
                  <Filter className="w-3 h-3 mr-1" />
                  All
                </>
              ) : type === "backtest" ? (
                <>
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Backtests
                </>
              ) : (
                <>
                  <Target className="w-3 h-3 mr-1" />
                  Optimizations
                </>
              )}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Strategy Count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-mono text-foreground">{filtered.length}</span> of{" "}
          <span className="font-mono text-foreground">{strategies.length}</span> strategies
        </p>
      </div>

      {/* Strategy Cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((strategy, i) => (
            <motion.div
              key={strategy.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="bg-card border-border hover:border-primary/20 transition-all">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-display font-semibold text-foreground truncate">
                          {strategy.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono shrink-0 ${
                            strategy.status === "deployed"
                              ? "border-profit/30 text-profit"
                              : "border-muted-foreground/30 text-muted-foreground"
                          }`}
                        >
                          {strategy.status === "deployed" ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                              Deployed
                            </>
                          ) : (
                            <>
                              <Clock className="w-2.5 h-2.5 mr-0.5" />
                              Saved
                            </>
                          )}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          {strategy.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {strategy.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          {strategy.date}
                        </span>
                        <span className="font-mono">{strategy.asset}</span>
                      </div>
                    </div>

                    {/* Middle: Metrics */}
                    <div className="flex items-center gap-4 lg:gap-6">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          CAGR
                        </p>
                        <p className="text-sm font-mono font-bold text-profit">
                          {strategy.cagr}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Sharpe
                        </p>
                        <p className="text-sm font-mono font-bold text-primary">
                          {strategy.sharpe.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Win%
                        </p>
                        <p className="text-sm font-mono font-bold text-foreground">
                          {strategy.winRate}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Max DD
                        </p>
                        <p className="text-sm font-mono font-bold text-loss">
                          {strategy.maxDrawdown}%
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-display"
                        onClick={() => setLocation("/backtest")}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Re-run
                      </Button>
                      {strategy.status !== "deployed" && (
                        <Button
                          size="sm"
                          className="text-xs font-display bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() =>
                            toast.success(`Deploying ${strategy.name} as bot...`)
                          }
                        >
                          <Rocket className="w-3 h-3 mr-1" />
                          Deploy
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border">
                          <DropdownMenuItem
                            className="text-xs"
                            onClick={() => setLocation("/optimization")}
                          >
                            <Target className="w-3 h-3 mr-2" />
                            Optimize
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs text-loss"
                            onClick={() => handleDelete(strategy.id)}
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <Library className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No strategies found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Try adjusting your search or filter
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
