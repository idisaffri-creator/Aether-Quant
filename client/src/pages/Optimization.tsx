/*
 * Parameter Optimization – Void Terminal
 * Sliders for parameters, optimization goal radio, results table with Deploy button
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings2,
  Play,
  Loader2,
  Rocket,
  Trophy,
  Target,
  TrendingUp,
  Percent,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { optimizationResults } from "@/lib/mockData";
import { toast } from "sonner";

const TRADING_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663489353166/Smb5wRr5wwDpFtVfRrnNA3/trading-abstract-DXtPimWMYhSeYixTv3o4qo.webp";

interface ParamConfig {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  unit: string;
}

const defaultParams: ParamConfig[] = [
  { name: "lookback", label: "Lookback Period", min: 5, max: 50, step: 1, value: [10, 35], unit: "days" },
  { name: "threshold", label: "Entry Threshold", min: 0.5, max: 3.0, step: 0.1, value: [1.0, 2.5], unit: "σ" },
  { name: "stopLoss", label: "Stop Loss", min: 0.5, max: 5.0, step: 0.5, value: [1.0, 3.5], unit: "ATR" },
  { name: "takeProfit", label: "Take Profit", min: 1.0, max: 10.0, step: 0.5, value: [2.0, 7.0], unit: "ATR" },
];

export default function Optimization() {
  const [params, setParams] = useState(defaultParams);
  const [optimizeFor, setOptimizeFor] = useState("sharpe");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<typeof optimizationResults | null>(null);
  const [combosText, setCombosText] = useState("");

  const totalCombos = params.reduce((acc, p) => {
    const range = (p.value[1] - p.value[0]) / p.step;
    return acc * Math.max(1, Math.round(range));
  }, 1);

  const handleParamChange = (index: number, newValue: number[]) => {
    setParams((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value: [newValue[0], newValue[1]] };
      return updated;
    });
  };

  const runOptimization = useCallback(() => {
    setIsRunning(true);
    setResults(null);
    setProgress(0);
    setCombosText("");

    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 8 + 2;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => {
          setIsRunning(false);
          setResults(optimizationResults);
          toast.success(`Optimization complete! ${totalCombos.toLocaleString()} combinations tested.`);
        }, 300);
      }
      setProgress(Math.min(p, 100));
      setCombosText(`${Math.round((p / 100) * totalCombos).toLocaleString()} / ${totalCombos.toLocaleString()}`);
    }, 200);
  }, [totalCombos]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="relative rounded-xl overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${TRADING_BG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="relative p-6">
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">
            Parameter Optimization
          </h1>
          <p className="text-sm text-muted-foreground">
            Define parameter ranges and let AI find the optimal configuration.
            Grid search or Bayesian optimization across thousands of combinations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parameter Controls */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                Parameter Ranges
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {params.map((param, i) => (
                <div key={param.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground font-medium">
                      {param.label}
                    </label>
                    <span className="text-xs font-mono text-primary">
                      {param.value[0]}–{param.value[1]} {param.unit}
                    </span>
                  </div>
                  <Slider
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={param.value}
                    onValueChange={(v) => handleParamChange(i, v)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
                    <span>{param.min}</span>
                    <span>{param.max}</span>
                  </div>
                </div>
              ))}

              {/* Optimization Goal */}
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium mb-3">
                  Optimize For
                </p>
                <RadioGroup
                  value={optimizeFor}
                  onValueChange={setOptimizeFor}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/30 transition-colors">
                    <RadioGroupItem value="sharpe" id="sharpe" />
                    <Label htmlFor="sharpe" className="flex items-center gap-2 text-sm cursor-pointer">
                      <Target className="w-3.5 h-3.5 text-primary" />
                      Sharpe Ratio
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/30 transition-colors">
                    <RadioGroupItem value="cagr" id="cagr" />
                    <Label htmlFor="cagr" className="flex items-center gap-2 text-sm cursor-pointer">
                      <TrendingUp className="w-3.5 h-3.5 text-profit" />
                      CAGR
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/30 transition-colors">
                    <RadioGroupItem value="winrate" id="winrate" />
                    <Label htmlFor="winrate" className="flex items-center gap-2 text-sm cursor-pointer">
                      <Percent className="w-3.5 h-3.5 text-primary" />
                      Win Rate
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Combos info */}
              <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Total combinations:{" "}
                  <span className="font-mono text-primary font-semibold">
                    {totalCombos.toLocaleString()}
                  </span>
                </p>
              </div>

              {/* Run button */}
              <Button
                onClick={runOptimization}
                disabled={isRunning}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Optimization
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="bg-card border-border h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  Top 20 Parameter Sets
                </CardTitle>
                {results && (
                  <Badge variant="outline" className="text-[10px] font-mono border-profit/30 text-profit">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Complete
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {isRunning ? (
                  <motion.div
                    key="running"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-20"
                  >
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-full border-2 border-primary/20 flex items-center justify-center">
                        <span className="text-lg font-mono font-bold text-primary">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <svg className="absolute inset-0 w-20 h-20 -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="38"
                          fill="none"
                          stroke="oklch(0.82 0.15 195)"
                          strokeWidth="2"
                          strokeDasharray={`${(progress / 100) * 239} 239`}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground font-display mb-1">
                      Testing parameter combinations...
                    </p>
                    <p className="text-xs text-muted-foreground/60 font-mono">
                      {combosText}
                    </p>
                  </motion.div>
                ) : results ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              Rank
                            </th>
                            <th className="text-left py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              Lookback
                            </th>
                            <th className="text-left py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              Threshold
                            </th>
                            <th className="text-left py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              SL
                            </th>
                            <th className="text-left py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              TP
                            </th>
                            <th className="text-left py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              Sharpe
                            </th>
                            <th className="text-left py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              CAGR
                            </th>
                            <th className="text-left py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              Win%
                            </th>
                            <th className="text-left py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              Max DD
                            </th>
                            <th className="text-right py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((row, i) => (
                            <motion.tr
                              key={row.rank}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className={`border-b border-border/30 hover:bg-accent/30 transition-colors ${
                                i === 0 ? "bg-primary/5" : ""
                              }`}
                            >
                              <td className="py-2 px-2">
                                {i === 0 ? (
                                  <Badge className="bg-primary/20 text-primary text-[10px] font-mono">
                                    #1
                                  </Badge>
                                ) : (
                                  <span className="text-xs font-mono text-muted-foreground">
                                    #{row.rank}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-xs font-mono">{row.lookback}d</td>
                              <td className="py-2 px-2 text-xs font-mono">{row.threshold}σ</td>
                              <td className="py-2 px-2 text-xs font-mono">{row.stopLoss}</td>
                              <td className="py-2 px-2 text-xs font-mono">{row.takeProfit}</td>
                              <td className="py-2 px-2 text-xs font-mono font-semibold text-primary">
                                {row.sharpe.toFixed(2)}
                              </td>
                              <td className="py-2 px-2 text-xs font-mono text-profit">
                                {row.cagr}%
                              </td>
                              <td className="py-2 px-2 text-xs font-mono">
                                {row.winRate}%
                              </td>
                              <td className="py-2 px-2 text-xs font-mono text-loss">
                                {row.maxDD}%
                              </td>
                              <td className="py-2 px-2 text-right">
                                <Button
                                  size="sm"
                                  variant={i === 0 ? "default" : "outline"}
                                  className="h-7 text-[10px] font-display"
                                  onClick={() =>
                                    toast.success(
                                      `Deploying parameter set #${row.rank} as bot...`
                                    )
                                  }
                                >
                                  <Rocket className="w-3 h-3 mr-1" />
                                  Deploy
                                </Button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
                      <BarChart3 className="w-6 h-6 text-primary/40" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      No optimization results yet
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      Configure parameters and click Run Optimization
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
