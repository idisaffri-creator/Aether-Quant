/*
 * Position sizing calculator — trader utility.
 * Computes position size based on account equity, risk %, entry, stop.
 * Helps users follow 1-2% risk rule per trade.
 */
import { useState, useEffect } from "react";
import { Calculator, DollarSign, Target, TrendingDown, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { num, money, fixed } from "@/lib/format";

const SYMBOLS = ["CL", "BZ", "NG", "GC", "SI", "HG", "HO", "RB"];

export default function PositionSizing() {
  const [symbol, setSymbol] = useState("CL");
  const [accountEquity, setAccountEquity] = useState(100000);
  const [riskPct, setRiskPct] = useState(1); // % risk per trade
  const [entryPrice, setEntryPrice] = useState(78.42);
  const [stopPrice, setStopPrice] = useState(77.00);
  const [quote, setQuote] = useState<{ price: number } | null>(null);

  // Fetch live price for selected symbol
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`/api/market/quotes/${symbol}`);
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled && d?.price) {
          setQuote({ price: Number(d.price) });
          setEntryPrice(Number(d.price));
          // Default stop: 2% below entry
          setStopPrice(Number((Number(d.price) * 0.98).toFixed(2)));
        }
      } catch {
        // ignore
      }
    }
    load();
    return () => { cancelled = true; };
  }, [symbol]);

  const equity = num(accountEquity);
  const riskAmount = equity * (num(riskPct) / 100);
  const riskPerUnit = Math.abs(num(entryPrice) - num(stopPrice));
  const positionSize = riskPerUnit > 0 ? riskAmount / riskPerUnit : 0;
  const positionValue = positionSize * num(entryPrice);
  const leverage = equity > 0 ? positionValue / equity : 0;
  const rMultiple = riskPerUnit > 0 ? 1 : 0;
  const stopDistancePct = num(entryPrice) > 0 ? (Math.abs(num(entryPrice) - num(stopPrice)) / num(entryPrice)) * 100 : 0;

  // Warnings
  const warnings: string[] = [];
  if (leverage > 2) warnings.push("Leverage > 2x is aggressive");
  if (leverage > 10) warnings.push("Leverage > 10x is extremely risky");
  if (stopDistancePct > 5) warnings.push("Wide stop (>5%) — high volatility");
  if (riskPct > 2) warnings.push("Risk > 2% per trade violates Kelly-safe sizing");
  if (positionSize > 1000) warnings.push("Very large position — verify risk limits");

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
          <Calculator className="w-7 h-7 text-primary" /> Position Sizing Calculator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Know your size before you click buy. Disciplined sizing = survival.
        </p>
      </div>

      <div className="glass-card rounded-xl p-6 space-y-5">
        {/* Symbol + live price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Symbol</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            >
              {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Live Price</label>
            <div className="mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono">
              {quote ? `$${quote.price.toFixed(2)}` : <span className="text-muted-foreground">Loading...</span>}
            </div>
          </div>
        </div>

        {/* Equity + risk */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Account Equity ($)</label>
            <input
              type="number"
              value={accountEquity}
              onChange={(e) => setAccountEquity(Number(e.target.value))}
              className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Risk per Trade (%)</label>
            <input
              type="number"
              step="0.1"
              value={riskPct}
              onChange={(e) => setRiskPct(Number(e.target.value))}
              className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            />
            <div className="text-[10px] text-muted-foreground mt-1">Pro tip: 1% is the disciplined standard</div>
          </div>
        </div>

        {/* Entry + stop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Entry Price ($)</label>
            <input
              type="number"
              step="0.01"
              value={entryPrice}
              onChange={(e) => setEntryPrice(Number(e.target.value))}
              className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Stop Price ($)</label>
            <input
              type="number"
              step="0.01"
              value={stopPrice}
              onChange={(e) => setStopPrice(Number(e.target.value))}
              className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            />
            <div className="text-[10px] text-muted-foreground mt-1">Stop distance: {fixed(stopDistancePct, 2)}%</div>
          </div>
        </div>

        {/* Result */}
        <div className="pt-4 border-t border-border">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Recommended Position</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Result icon={DollarSign} label="Risk Amount" value={money(riskAmount, 2)} sub={`${fixed(riskPct, 1)}% of equity`} />
            <Result icon={Target} label="Position Size" value={`${fixed(positionSize, 2)} units`} sub={symbol} />
            <Result icon={DollarSign} label="Position Value" value={money(positionValue, 0)} sub={`${fixed(leverage, 2)}x leverage`} highlight />
            <Result icon={TrendingDown} label="If Stop Hits" value={`-${money(riskAmount, 2)}`} sub="Max loss on 1 trade" />
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="pt-4 border-t border-border space-y-2">
            {warnings.map((w, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{w}</span>
              </motion.div>
            ))}
          </div>
        )}

        <div className="pt-2 text-xs text-muted-foreground">
          Formula: <span className="font-mono">position_size = (equity × risk%) / |entry − stop|</span>. Risk per trade capped at your preferred %. Leverage auto-calculated.
        </div>
      </div>
    </div>
  );
}

function Result({ icon: Icon, label, value, sub, highlight }: { icon: any; label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-xl border ${highlight ? "bg-primary/5 border-primary/30" : "bg-card/40 border-border/50"}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className={`text-lg font-display font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{sub}</div>}
    </div>
  );
}