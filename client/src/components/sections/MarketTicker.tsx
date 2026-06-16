import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  pctChange: number;
}

const INITIAL_TICKERS: TickerItem[] = [
  { symbol: "CL", name: "WTI Crude", price: 78.42, change: 0.72, pctChange: 0.92 },
  { symbol: "BZ", name: "Brent Crude", price: 82.15, change: 0.58, pctChange: 0.71 },
  { symbol: "NG", name: "Nat Gas", price: 2.84, change: -0.06, pctChange: -2.1 },
  { symbol: "GC", name: "Gold", price: 2048.30, change: -3.68, pctChange: -0.18 },
  { symbol: "SI", name: "Silver", price: 24.15, change: 0.32, pctChange: 1.34 },
  { symbol: "HG", name: "Copper", price: 3.85, change: 0.04, pctChange: 1.05 },
  { symbol: "HO", name: "Heating Oil", price: 2.58, change: 0.02, pctChange: 0.78 },
  { symbol: "RB", name: "RBOB Gas", price: 2.41, change: -0.01, pctChange: -0.5 },
  { symbol: "ZW", name: "Wheat", price: 612.50, change: 8.25, pctChange: 1.37 },
  { symbol: "ES", name: "E-mini S&P", price: 5234.50, change: 12.75, pctChange: 0.24 },
];

function simulatePriceUpdate(tickers: TickerItem[]): TickerItem[] {
  return tickers.map((t) => {
    const volatility = t.symbol === "NG" ? 0.008 : t.symbol === "GC" ? 0.001 : 0.003;
    const delta = (Math.random() - 0.48) * t.price * volatility;
    const newPrice = +(t.price + delta).toFixed(2);
    const newChange = +(newPrice - (t.price - t.change)).toFixed(2);
    const newPct = +((newChange / (newPrice - newChange)) * 100).toFixed(2);
    return { ...t, price: newPrice, change: newChange, pctChange: newPct };
  });
}

function TickerItemView({ item, flash }: { item: TickerItem; flash: "up" | "down" | null }) {
  const isUp = item.pctChange >= 0;
  return (
    <span className="inline-flex items-center gap-2 px-4 shrink-0">
      <span className="text-white/40 text-[10px] font-mono font-bold tracking-wider">{item.symbol}</span>
      <span className="text-white/80 text-[11px] font-mono font-medium">${item.price.toFixed(2)}</span>
      <span
        className={`text-[10px] font-mono font-bold transition-colors duration-300 ${
          flash === "up" ? "text-emerald-400" : flash === "down" ? "text-red-400" : isUp ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {isUp ? "+" : ""}{item.pctChange.toFixed(2)}%
      </span>
      <span className="w-px h-3 bg-white/8 mx-1" />
    </span>
  );
}

export default function MarketTicker() {
  const [tickers, setTickers] = useState(INITIAL_TICKERS);
  const [flashes, setFlashes] = useState<Record<string, "up" | "down" | null>>({});
  const prevRef = useRef(INITIAL_TICKERS);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute flashes reactively when tickers change
  useEffect(() => {
    const newFlashes: Record<string, "up" | "down" | null> = {};
    tickers.forEach((t, i) => {
      if (prevRef.current[i]) {
        if (t.price > prevRef.current[i].price) newFlashes[t.symbol] = "up";
        else if (t.price < prevRef.current[i].price) newFlashes[t.symbol] = "down";
      }
    });
    prevRef.current = tickers;
    setFlashes(newFlashes);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setFlashes({}), 600);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [tickers]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickers((prev) => simulatePriceUpdate(prev));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const tickerContent = [...tickers, ...tickers].map((item, i) => (
    <TickerItemView key={`${item.symbol}-${i}`} item={item} flash={flashes[item.symbol] || null} />
  ));

  return (
    <div className="w-full border-b border-white/5 bg-white/[0.01] backdrop-blur-md overflow-hidden relative z-40">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <div className="flex h-9 items-center">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 40, ease: "linear", repeat: Infinity }}
        >
          {tickerContent}
        </motion.div>
      </div>
    </div>
  );
}
