/* ============================================================
   AETHER ENERGY — Bloomberg Terminal-Inspired Section
   Design: Elemental Precision — Dark terminal UI with amber
   accents, adapted from feremabraz/bloomberg-terminal for
   oil & energy markets. Self-contained with local state.
   ============================================================ */
import { useEffect, useRef, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, BarChart, Bar
} from "recharts";
import {
  Activity, TrendingUp, TrendingDown, RefreshCw, Newspaper,
  BarChart2, Zap, AlertTriangle, ChevronUp, ChevronDown
} from "lucide-react";

// ─── Color palette (Bloomberg-style, amber-tinted for Aether) ─────────────
const T = {
  bg:       "#0a0a0c",
  surface:  "#111115",
  header:   "#0d0d10",
  border:   "#1e1e26",
  text:     "#e8e8e0",
  textSec:  "#666670",
  amber:    "#f59e0b",
  amberDim: "#92600a",
  green:    "#22c55e",
  red:      "#ef4444",
  blue:     "#3b82f6",
  gray:     "#444450",
};

// ─── Oil market data ───────────────────────────────────────────────────────
const OIL_MARKETS = [
  { id: "WTI CRUDE",    region: "Americas", value: 78.42,  change:  0.56, pctChange:  0.72, ytd:  3.21, time: "10:46", vol: 18.4 },
  { id: "BRENT CRUDE",  region: "Europe",   value: 82.15,  change:  0.47, pctChange:  0.58, ytd:  2.87, time: "10:46", vol: 17.9 },
  { id: "NATURAL GAS",  region: "Americas", value:  2.84,  change: -0.035,pctChange: -1.23, ytd: -8.42, time: "10:45", vol: 42.1 },
  { id: "HEATING OIL",  region: "Americas", value:  2.67,  change:  0.009,pctChange:  0.34, ytd:  1.92, time: "10:44", vol: 22.3 },
  { id: "GASOLINE",     region: "Americas", value:  2.41,  change: -0.004,pctChange: -0.18, ytd: -1.14, time: "10:43", vol: 19.8 },
  { id: "OPEC BASKET",  region: "Middle East",value:80.91, change:  0.73, pctChange:  0.91, ytd:  4.12, time: "10:42", vol: 15.2 },
  { id: "DUBAI CRUDE",  region: "Middle East",value:79.34, change:  0.61, pctChange:  0.77, ytd:  3.55, time: "10:41", vol: 16.7 },
  { id: "URALS CRUDE",  region: "Europe",   value: 68.20,  change: -0.42, pctChange: -0.61, ytd: -6.34, time: "10:40", vol: 28.9 },
  { id: "LNG SPOT",     region: "Asia",     value: 12.45,  change:  0.18, pctChange:  1.47, ytd:  9.21, time: "10:39", vol: 35.6 },
  { id: "COAL API2",    region: "Europe",   value: 92.10,  change: -1.20, pctChange: -1.29, ytd:-12.44, time: "10:38", vol: 31.2 },
  { id: "CARBON ETS",   region: "Europe",   value: 64.80,  change:  0.95, pctChange:  1.49, ytd: 18.72, time: "10:37", vol: 24.8 },
  { id: "PALM OIL",     region: "Asia",     value: 3842.0, change: 28.00, pctChange:  0.73, ytd:  5.44, time: "10:36", vol: 20.1 },
];

const NEWS_ITEMS = [
  { time: "10:42", headline: "OPEC+ confirms output cut extension through Q3 2026", tag: "OPEC", impact: "bullish" },
  { time: "10:31", headline: "EIA crude inventory draw of 4.2M barrels beats estimates", tag: "EIA", impact: "bullish" },
  { time: "10:18", headline: "Fed signals higher-for-longer rates; dollar strengthens", tag: "MACRO", impact: "bearish" },
  { time: "10:05", headline: "Libya force majeure lifted; 300k bpd returns to market", tag: "SUPPLY", impact: "bearish" },
  { time: "09:52", headline: "Strait of Hormuz shipping traffic rises 8% week-on-week", tag: "SHIPPING", impact: "neutral" },
  { time: "09:41", headline: "IEA raises 2026 oil demand forecast by 200k bpd", tag: "DEMAND", impact: "bullish" },
  { time: "09:28", headline: "Saudi Aramco maintains official selling price for Asia", tag: "PRICING", impact: "neutral" },
  { time: "09:15", headline: "US shale rig count falls 12 to 478 — Baker Hughes", tag: "SUPPLY", impact: "bullish" },
  { time: "08:57", headline: "China crude imports hit 11.2M bpd in May, second highest ever", tag: "DEMAND", impact: "bullish" },
  { time: "08:44", headline: "Russia oil export revenues decline 3.1% amid price cap", tag: "GEOPOLITICS", impact: "neutral" },
];

// ─── Sparkline canvas component ────────────────────────────────────────────
function Sparkline({ data, color, width = 72, height = 18 }: {
  data: number[]; color: string; width?: number; height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    if (data.length < 2) return;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 2;
    const xStep = (width - pad * 2) / (data.length - 1);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    data.forEach((v, i) => {
      const x = pad + i * xStep;
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [data, color, width, height]);
  return <canvas ref={ref} className="inline-block align-middle" />;
}

// ─── Generate deterministic sparkline data ─────────────────────────────────
function genSparkline(seed: number, base: number, len = 20): number[] {
  let s = seed;
  const next = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  const arr: number[] = [base];
  for (let i = 1; i < len; i++) arr.push(Math.max(0.01, arr[i-1] * (1 + (next() - 0.49) * 0.04)));
  return arr;
}

// ─── Generate chart data ────────────────────────────────────────────────────
function genAreaData(seed: number, base: number, points = 30) {
  const data = genSparkline(seed, base, points);
  return data.map((v, i) => ({ t: i, v: +v.toFixed(2) }));
}

function genVolData(seed: number, points = 20) {
  let s = seed * 7;
  const next = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  return Array.from({ length: points }, (_, i) => ({ t: i, v: +(next() * 40 + 10).toFixed(1) }));
}

// ─── Main Terminal Section ─────────────────────────────────────────────────
type View = "market" | "news" | "movers" | "volatility";

export default function TerminalSection() {
  const [view, setView] = useState<View>("market");
  const [sortKey, setSortKey] = useState<"pctChange" | "value" | "vol">("pctChange");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [selectedRow, setSelectedRow] = useState<string | null>("WTI CRUDE");
  const [tick, setTick] = useState(0);
  const [flashCells, setFlashCells] = useState<Record<string, boolean>>({});
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Intersection observer for entrance animation
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1 });
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  // Simulated live tick
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      // Flash a random cell
      const row = OIL_MARKETS[Math.floor(Math.random() * OIL_MARKETS.length)];
      setFlashCells(prev => ({ ...prev, [row.id]: true }));
      setTimeout(() => setFlashCells(prev => ({ ...prev, [row.id]: false })), 600);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const handleSort = (key: typeof sortKey) => {
    if (key === sortKey) setSortDir(d => d === 1 ? -1 : 1);
    else { setSortKey(key); setSortDir(-1); }
  };

  const sorted = [...OIL_MARKETS].sort((a, b) => (b[sortKey] - a[sortKey]) * sortDir);
  const selected = OIL_MARKETS.find(m => m.id === selectedRow) || OIL_MARKETS[0];
  const chartData = genAreaData(selected.id.charCodeAt(0) * 7, selected.value, 40);
  const volData = genVolData(selected.id.charCodeAt(0) * 3);

  const SortIcon = ({ k }: { k: typeof sortKey }) => (
    sortKey === k
      ? (sortDir === -1 ? <ChevronDown className="w-3 h-3 inline ml-0.5 text-amber-400" /> : <ChevronUp className="w-3 h-3 inline ml-0.5 text-amber-400" />)
      : null
  );

  return (
    <section
      ref={sectionRef}
      id="terminal"
      className="py-24 lg:py-32 relative overflow-hidden"
    >
      {/* Subtle background grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="container relative z-10">
        {/* Section header */}
        <div className={`mb-10 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="section-number mb-3">Live Intelligence</div>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            Bloomberg-Grade{" "}
            <span className="text-amber-400">Terminal Interface</span>
          </h2>
          <p className="text-white/55 text-lg max-w-2xl leading-relaxed">
            Aether's market intelligence layer is modelled after institutional terminal UX — real-time oil market data,
            multi-view analytics, and sparkline tracking across every major energy benchmark.
          </p>
        </div>

        {/* Terminal window */}
        <div
          className={`rounded-2xl overflow-hidden border border-white/8 shadow-2xl shadow-black/60 transition-all duration-700 delay-150 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          style={{ background: T.bg }}
        >
          {/* Terminal title bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b"
            style={{ background: T.header, borderColor: T.border }}>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="font-mono text-xs" style={{ color: T.amber }}>
                AETHER TERMINAL — ENERGY MARKETS
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-xs" style={{ color: T.textSec }}>
                LIVE · {new Date().toLocaleTimeString("en-US", { hour12: false })}
              </span>
            </div>
          </div>

          {/* View selector bar */}
          <div className="flex items-center gap-0 border-b overflow-x-auto"
            style={{ background: T.surface, borderColor: T.border }}>
            {([
              { key: "market",     label: "MARKET",     icon: Activity },
              { key: "news",       label: "NEWS",       icon: Newspaper },
              { key: "movers",     label: "MOVERS",     icon: TrendingUp },
              { key: "volatility", label: "VOLATILITY", icon: BarChart2 },
            ] as { key: View; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className="flex items-center gap-1.5 px-4 py-2.5 font-mono text-xs font-bold transition-all shrink-0 border-b-2"
                style={{
                  color: view === key ? T.amber : T.textSec,
                  borderBottomColor: view === key ? T.amber : "transparent",
                  background: view === key ? `${T.bg}` : "transparent",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 px-3">
              <button
                className="flex items-center gap-1 px-2 py-1 rounded font-mono text-xs transition-colors"
                style={{ color: T.textSec, background: T.border }}
                onClick={() => setTick(t => t + 1)}
              >
                <RefreshCw className="w-3 h-3" />
                REFRESH
              </button>
            </div>
          </div>

          {/* ── MARKET VIEW ─────────────────────────────────────────── */}
          {view === "market" && (
            <div className="flex flex-col lg:flex-row">
              {/* Left: market table */}
              <div className="flex-1 overflow-x-auto">
                <table className="w-full font-mono text-xs" style={{ color: T.text }}>
                  <thead>
                    <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
                      <th className="text-left px-3 py-2" style={{ color: T.amber }}>INSTRUMENT</th>
                      <th className="text-center px-2 py-2" style={{ color: T.textSec }}>REGION</th>
                      <th className="text-center px-2 py-2 w-20" style={{ color: T.textSec }}>5D TREND</th>
                      <th
                        className="text-right px-3 py-2 cursor-pointer hover:text-amber-400 transition-colors"
                        style={{ color: sortKey === "value" ? T.amber : T.textSec }}
                        onClick={() => handleSort("value")}
                      >
                        PRICE <SortIcon k="value" />
                      </th>
                      <th className="text-right px-3 py-2" style={{ color: T.textSec }}>NET CHG</th>
                      <th
                        className="text-right px-3 py-2 cursor-pointer hover:text-amber-400 transition-colors"
                        style={{ color: sortKey === "pctChange" ? T.amber : T.textSec }}
                        onClick={() => handleSort("pctChange")}
                      >
                        %CHG <SortIcon k="pctChange" />
                      </th>
                      <th
                        className="text-right px-3 py-2 cursor-pointer hover:text-amber-400 transition-colors hidden md:table-cell"
                        style={{ color: sortKey === "vol" ? T.amber : T.textSec }}
                        onClick={() => handleSort("vol")}
                      >
                        VOL% <SortIcon k="vol" />
                      </th>
                      <th className="text-right px-3 py-2 hidden sm:table-cell" style={{ color: T.textSec }}>YTD%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((item, idx) => {
                      const isPos = item.pctChange >= 0;
                      const isSelected = selectedRow === item.id;
                      const isFlashing = flashCells[item.id];
                      const sparkData = genSparkline(item.id.charCodeAt(0) * 13, item.value, 20);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedRow(item.id)}
                          className="cursor-pointer transition-all duration-300"
                          style={{
                            background: isSelected
                              ? "rgba(245,158,11,0.08)"
                              : isFlashing
                              ? "rgba(245,158,11,0.05)"
                              : idx % 2 === 0 ? T.bg : T.surface,
                            borderBottom: `1px solid ${T.border}`,
                            outline: isSelected ? `1px solid rgba(245,158,11,0.3)` : "none",
                          }}
                        >
                          <td className="px-3 py-1.5">
                            <span style={{ color: T.amber }} className="font-bold">{item.id}</span>
                          </td>
                          <td className="px-2 py-1.5 text-center" style={{ color: T.textSec }}>{item.region}</td>
                          <td className="px-2 py-1.5 text-center">
                            <Sparkline
                              data={sparkData}
                              color={isPos ? T.green : T.red}
                              width={72}
                              height={18}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right" style={{ color: "#f5f5b8" }}>
                            {item.value.toFixed(2)}
                          </td>
                          <td className="px-3 py-1.5 text-right" style={{ color: isPos ? T.green : T.red }}>
                            {isPos ? "+" : ""}{item.change.toFixed(3)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-bold" style={{ color: isPos ? T.green : T.red }}>
                            {isPos ? "+" : ""}{item.pctChange.toFixed(2)}%
                          </td>
                          <td className="px-3 py-1.5 text-right hidden md:table-cell" style={{ color: T.textSec }}>
                            {item.vol.toFixed(1)}
                          </td>
                          <td className="px-3 py-1.5 text-right hidden sm:table-cell"
                            style={{ color: item.ytd >= 0 ? T.green : T.red }}>
                            {item.ytd >= 0 ? "+" : ""}{item.ytd.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Right: detail chart panel */}
              <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l flex flex-col"
                style={{ borderColor: T.border, background: T.surface }}>
                <div className="px-4 pt-4 pb-2 border-b" style={{ borderColor: T.border }}>
                  <div className="font-mono text-xs" style={{ color: T.amber }}>{selected.id}</div>
                  <div className="font-mono text-xl font-bold mt-1" style={{ color: "#f5f5b8" }}>
                    {selected.value.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-sm font-bold"
                      style={{ color: selected.pctChange >= 0 ? T.green : T.red }}>
                      {selected.pctChange >= 0 ? "▲" : "▼"} {Math.abs(selected.pctChange).toFixed(2)}%
                    </span>
                    <span className="font-mono text-xs" style={{ color: T.textSec }}>
                      {selected.pctChange >= 0 ? "+" : ""}{selected.change.toFixed(3)}
                    </span>
                  </div>
                </div>

                {/* Area chart */}
                <div className="px-2 pt-3 pb-1">
                  <div className="font-mono text-xs mb-2 px-2" style={{ color: T.textSec }}>30-DAY PRICE</div>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={chartData} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={selected.pctChange >= 0 ? T.green : T.red} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={selected.pctChange >= 0 ? T.green : T.red} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke={T.border} />
                      <XAxis dataKey="t" hide />
                      <YAxis tick={{ fontSize: 9, fill: T.textSec }} tickLine={false} axisLine={false} domain={["dataMin - 1", "dataMax + 1"]} />
                      <Tooltip
                        contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 10, fontFamily: "monospace", color: T.text }}
                        formatter={(v: number) => [v.toFixed(2), selected.id]}
                        labelFormatter={() => ""}
                      />
                      <Area type="monotone" dataKey="v" stroke={selected.pctChange >= 0 ? T.green : T.red} strokeWidth={1.5} fill="url(#areaGrad)" dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Vol chart */}
                <div className="px-2 pb-3">
                  <div className="font-mono text-xs mb-1 px-2" style={{ color: T.textSec }}>IMPLIED VOL</div>
                  <ResponsiveContainer width="100%" height={60}>
                    <BarChart data={volData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke={T.border} />
                      <XAxis dataKey="t" hide />
                      <YAxis tick={{ fontSize: 9, fill: T.textSec }} tickLine={false} axisLine={false} />
                      <Bar dataKey="v" fill={T.amberDim} radius={[1, 1, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Stats */}
                <div className="mt-auto border-t px-4 py-3 grid grid-cols-2 gap-2" style={{ borderColor: T.border }}>
                  {[
                    { label: "52W HIGH", value: (selected.value * 1.18).toFixed(2) },
                    { label: "52W LOW",  value: (selected.value * 0.78).toFixed(2) },
                    { label: "VOL (30D)", value: `${selected.vol.toFixed(1)}%` },
                    { label: "YTD",      value: `${selected.ytd >= 0 ? "+" : ""}${selected.ytd.toFixed(2)}%` },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="font-mono text-[10px]" style={{ color: T.textSec }}>{s.label}</div>
                      <div className="font-mono text-xs font-bold" style={{ color: T.text }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── NEWS VIEW ───────────────────────────────────────────── */}
          {view === "news" && (
            <div className="p-0">
              <div className="px-4 py-2 border-b font-mono text-xs flex items-center gap-2"
                style={{ background: T.surface, borderColor: T.border, color: T.amber }}>
                <Newspaper className="w-3.5 h-3.5" />
                ENERGY MARKET NEWS — REAL-TIME FEED
              </div>
              <div>
                {NEWS_ITEMS.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-4 py-3 border-b transition-colors hover:bg-white/[0.02] cursor-pointer"
                    style={{ borderColor: T.border }}
                  >
                    <span className="font-mono text-xs shrink-0 mt-0.5" style={{ color: T.textSec }}>{item.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs leading-relaxed" style={{ color: T.text }}>{item.headline}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: T.border, color: T.amber }}>{item.tag}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          background: item.impact === "bullish" ? "rgba(34,197,94,0.15)" : item.impact === "bearish" ? "rgba(239,68,68,0.15)" : "rgba(100,100,120,0.2)",
                          color: item.impact === "bullish" ? T.green : item.impact === "bearish" ? T.red : T.textSec,
                        }}>
                        {item.impact.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── MOVERS VIEW ─────────────────────────────────────────── */}
          {view === "movers" && (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top gainers */}
                <div className="rounded-lg overflow-hidden border" style={{ borderColor: T.border }}>
                  <div className="px-3 py-2 font-mono text-xs font-bold flex items-center gap-2"
                    style={{ background: T.surface, color: T.green }}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    TOP GAINERS
                  </div>
                  {[...OIL_MARKETS].sort((a, b) => b.pctChange - a.pctChange).slice(0, 5).map((item, i) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 border-b"
                      style={{ borderColor: T.border, background: i % 2 === 0 ? T.bg : T.surface }}>
                      <div>
                        <div className="font-mono text-xs font-bold" style={{ color: T.amber }}>{item.id}</div>
                        <div className="font-mono text-[10px]" style={{ color: T.textSec }}>{item.region}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xs font-bold" style={{ color: T.green }}>
                          +{item.pctChange.toFixed(2)}%
                        </div>
                        <div className="font-mono text-[10px]" style={{ color: T.textSec }}>
                          {item.value.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Top losers */}
                <div className="rounded-lg overflow-hidden border" style={{ borderColor: T.border }}>
                  <div className="px-3 py-2 font-mono text-xs font-bold flex items-center gap-2"
                    style={{ background: T.surface, color: T.red }}>
                    <TrendingDown className="w-3.5 h-3.5" />
                    TOP DECLINERS
                  </div>
                  {[...OIL_MARKETS].sort((a, b) => a.pctChange - b.pctChange).slice(0, 5).map((item, i) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 border-b"
                      style={{ borderColor: T.border, background: i % 2 === 0 ? T.bg : T.surface }}>
                      <div>
                        <div className="font-mono text-xs font-bold" style={{ color: T.amber }}>{item.id}</div>
                        <div className="font-mono text-[10px]" style={{ color: T.textSec }}>{item.region}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xs font-bold" style={{ color: T.red }}>
                          {item.pctChange.toFixed(2)}%
                        </div>
                        <div className="font-mono text-[10px]" style={{ color: T.textSec }}>
                          {item.value.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spread chart */}
              <div className="mt-4 rounded-lg border p-4" style={{ borderColor: T.border, background: T.surface }}>
                <div className="font-mono text-xs font-bold mb-3" style={{ color: T.amber }}>
                  WTI / BRENT SPREAD — 30 DAY
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={Array.from({ length: 30 }, (_, i) => {
                    const wti = genSparkline(42, 78.42, 30)[i];
                    const brent = genSparkline(99, 82.15, 30)[i];
                    return { t: i, spread: +(brent - wti).toFixed(2) };
                  })} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke={T.border} />
                    <XAxis dataKey="t" hide />
                    <YAxis tick={{ fontSize: 9, fill: T.textSec }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 10, fontFamily: "monospace", color: T.text }}
                      formatter={(v: number) => [`$${v.toFixed(2)}`, "Spread"]}
                      labelFormatter={() => ""}
                    />
                    <Line type="monotone" dataKey="spread" stroke={T.amber} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── VOLATILITY VIEW ─────────────────────────────────────── */}
          {view === "volatility" && (
            <div className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Vol surface table */}
                <div className="rounded-lg overflow-hidden border" style={{ borderColor: T.border }}>
                  <div className="px-3 py-2 font-mono text-xs font-bold"
                    style={{ background: T.surface, color: T.amber }}>
                    IMPLIED VOLATILITY SURFACE
                  </div>
                  <table className="w-full font-mono text-xs" style={{ color: T.text }}>
                    <thead>
                      <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
                        <th className="text-left px-3 py-1.5" style={{ color: T.textSec }}>INSTRUMENT</th>
                        <th className="text-right px-2 py-1.5" style={{ color: T.textSec }}>1M</th>
                        <th className="text-right px-2 py-1.5" style={{ color: T.textSec }}>3M</th>
                        <th className="text-right px-2 py-1.5" style={{ color: T.textSec }}>6M</th>
                        <th className="text-right px-3 py-1.5" style={{ color: T.textSec }}>1Y</th>
                      </tr>
                    </thead>
                    <tbody>
                      {OIL_MARKETS.slice(0, 6).map((item, i) => {
                        const base = item.vol;
                        return (
                          <tr key={item.id} style={{ background: i % 2 === 0 ? T.bg : T.surface, borderBottom: `1px solid ${T.border}` }}>
                            <td className="px-3 py-1.5 font-bold" style={{ color: T.amber }}>{item.id}</td>
                            <td className="px-2 py-1.5 text-right">{base.toFixed(1)}%</td>
                            <td className="px-2 py-1.5 text-right">{(base * 0.92).toFixed(1)}%</td>
                            <td className="px-2 py-1.5 text-right">{(base * 0.87).toFixed(1)}%</td>
                            <td className="px-3 py-1.5 text-right">{(base * 0.82).toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Vol chart */}
                <div className="rounded-lg border p-4" style={{ borderColor: T.border, background: T.surface }}>
                  <div className="font-mono text-xs font-bold mb-3" style={{ color: T.amber }}>
                    WTI 30-DAY REALIZED VOL
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={genVolData(77, 30)} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={T.amber} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={T.amber} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke={T.border} />
                      <XAxis dataKey="t" hide />
                      <YAxis tick={{ fontSize: 9, fill: T.textSec }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 10, fontFamily: "monospace", color: T.text }}
                        formatter={(v: number) => [`${v.toFixed(1)}%`, "Realized Vol"]}
                        labelFormatter={() => ""}
                      />
                      <Area type="monotone" dataKey="v" stroke={T.amber} strokeWidth={1.5} fill="url(#volGrad)" dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Terminal status bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-t"
            style={{ background: T.header, borderColor: T.border }}>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px]" style={{ color: T.textSec }}>
                {OIL_MARKETS.length} INSTRUMENTS
              </span>
              <span className="font-mono text-[10px]" style={{ color: T.textSec }}>
                {OIL_MARKETS.filter(m => m.pctChange > 0).length} UP · {OIL_MARKETS.filter(m => m.pctChange < 0).length} DOWN
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px]" style={{ color: T.amberDim }}>
                AETHER ENERGY v2.1
              </span>
              <span className="font-mono text-[10px]" style={{ color: T.textSec }}>
                DATA DELAYED 15MIN
              </span>
            </div>
          </div>
        </div>

        {/* Caption */}
        <p className="mt-4 text-center text-white/30 text-xs font-mono">
          Terminal UI adapted from Bloomberg Terminal design patterns · All data is simulated for demonstration purposes
        </p>
      </div>
    </section>
  );
}
