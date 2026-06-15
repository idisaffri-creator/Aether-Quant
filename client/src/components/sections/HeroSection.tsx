import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, TrendingDown, Activity } from "lucide-react";

const tickerItems = [
  { symbol: "WTI CRUDE", price: "$78.42", change: "+0.72%", up: true },
  { symbol: "BRENT CRUDE", price: "$82.15", change: "+0.58%", up: true },
  { symbol: "NATURAL GAS", price: "$2.84", change: "-1.23%", up: false },
  { symbol: "HEATING OIL", price: "$2.67", change: "+0.34%", up: true },
  { symbol: "GASOLINE", price: "$2.41", change: "-0.18%", up: false },
  { symbol: "OPEC BASKET", price: "$80.91", change: "+0.91%", up: true },
  { symbol: "S&P 500", price: "5,842", change: "+1.23%", up: true },
  { symbol: "DXY", price: "104.32", change: "-0.21%", up: false },
  { symbol: "BTC/USD", price: "68,420", change: "+2.84%", up: true },
];

function MatrixRain({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const chars = "0123456789ABCDEF";
    const fontSize = 11;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array.from({ length: columns }, () => Math.floor(Math.random() * canvas.height / fontSize));
    const draw = () => {
      ctx.fillStyle = "rgba(10, 10, 14, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.98) drops[i] = 0;
        drops[i]++;
      }
    };
    const interval = setInterval(draw, 60);
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize);
    return () => { clearInterval(interval); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className={`absolute inset-0 pointer-events-none ${className ?? ""}`} />;
}

export default function HeroSection() {
  const [hoverChart, setHoverChart] = useState<string | null>(null);

  const liveMarkets = [
    { symbol: "WTI", price: "78.42", change: "+0.72", dir: "up" as const },
    { symbol: "BRENT", price: "82.15", change: "+0.58", dir: "up" as const },
    { symbol: "NG", price: "2.84", change: "-1.23", dir: "down" as const },
    { symbol: "GOLD", price: "2,341", change: "+0.31", dir: "up" as const },
    { symbol: "SPX", price: "5,842", change: "+1.23", dir: "up" as const },
  ];

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.08_0.010_260)] via-[oklch(0.12_0.009_260)] to-[oklch(0.06_0.010_260)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/3 via-transparent to-transparent" />
        <div className="absolute top-0 -left-48 w-[40rem] h-[40rem] rounded-full bg-amber-500/4 blur-[120px]" />
        <div className="absolute bottom-0 -right-48 w-[40rem] h-[40rem] rounded-full bg-blue-500/3 blur-[120px]" />
        <MatrixRain className="opacity-40" />
      </div>

      <div className="relative z-10 mt-16 border-b border-white/8 bg-[oklch(0.08_0.010_260/90%)] backdrop-blur-md overflow-hidden">
        <div className="flex items-center">
          <div className="shrink-0 px-4 py-2.5 bg-amber-500/20 border-r border-amber-500/30 text-amber-400 text-[11px] font-mono font-bold tracking-[0.15em] uppercase">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-2 align-middle" />
            LIVE
          </div>
          <div className="overflow-hidden flex-1">
            <div className="ticker-scroll flex items-center gap-8 py-2.5 px-6 whitespace-nowrap">
              {tickerItems.map((item, i) => (
                <span key={i} className="flex items-center gap-2.5 text-xs font-mono">
                  <span className="text-white/50 tracking-wider">{item.symbol}</span>
                  <span className="text-white font-semibold">{item.price}</span>
                  <span className={item.up ? "text-emerald-400" : "text-red-400"}>
                    {item.change}
                  </span>
                  <span className="text-white/20">·</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex items-center">
        <div className="container py-12 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 mb-6">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-[11px] font-mono font-bold tracking-wider uppercase">
                  Markets Open · High Volatility
                </span>
              </div>

              <h1 className="font-display text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6">
                Quant Trading,{" "}
                <span className="text-amber-400">No Code</span>
                <br />
                Required
              </h1>

              <p className="text-white/55 text-lg leading-relaxed mb-8">
                Aether Quant gives you institutional-grade algorithmic trading — AI-powered
                strategy builder, real-time terminal, Monte Carlo simulation, and multi-exchange
                execution. All from your browser.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a href="/register">
                  <Button className="btn-amber px-6 py-3 text-base rounded-xl group cursor-pointer">
                    Launch Terminal
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
                <Button
                  variant="outline"
                  onClick={() => document.querySelector("#terminal")?.scrollIntoView({ behavior: "smooth" })}
                  className="px-6 py-3 text-base rounded-xl border-white/20 text-white/80 hover:bg-white/8 transition-all"
                >
                  View Live Data
                </Button>
              </div>

              <div className="flex items-center gap-6 mt-10 pt-8 border-t border-white/8">
                {[
                  { label: "Strategies Deployed", value: "2,400+" },
                  { label: "Avg. Sharpe", value: "1.42" },
                  { label: "Uptime SLA", value: "99.95%" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="font-mono text-lg font-bold text-white">{s.value}</div>
                    <div className="text-white/40 text-xs">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 bg-[oklch(0.09_0.008_260)]">
                <div className="px-4 py-2.5 border-b border-white/8 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  </div>
                  <span className="font-mono text-[10px] text-white/30">AETHER QUANT · MARKET OVERVIEW</span>
                  <span className="font-mono text-[10px] text-emerald-400">● CONNECTED</span>
                </div>
                <div className="p-4 space-y-2">
                  {liveMarkets.map((m) => (
                    <div
                      key={m.symbol}
                      onMouseEnter={() => setHoverChart(m.symbol)}
                      onMouseLeave={() => setHoverChart(null)}
                      className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer"
                      style={{ background: hoverChart === m.symbol ? "rgba(245,158,11,0.06)" : "transparent" }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-white/80 w-16">{m.symbol}</span>
                        <div className="flex gap-0.5 items-end h-6">
                          {Array.from({ length: 8 }, (_, i) => (
                            <div
                              key={i}
                              className="w-1 rounded-t transition-all duration-300"
                              style={{
                                height: `${20 + Math.sin(i * 1.2 + parseFloat(m.price)) * 15 + 8}px`,
                                background: m.dir === "up"
                                  ? `oklch(0.7 0.2 145 / ${0.3 + i * 0.07})`
                                  : `oklch(0.6 0.2 30 / ${0.3 + i * 0.07})`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-white">${m.price}</div>
                        <div className={`font-mono text-[10px] font-semibold ${m.dir === "up" ? "text-emerald-400" : "text-red-400"}`}>
                          {m.dir === "up" ? "▲" : "▼"} {m.change}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -left-6 top-8 glass-card rounded-xl px-4 py-3 border border-amber-500/20 shadow-xl">
                <div className="text-amber-400 text-[10px] font-mono font-bold mb-1 tracking-wider">SHARPE RATIO</div>
                <div className="text-white text-xl font-display font-bold">1.42</div>
                <div className="text-emerald-400 text-[10px] font-mono mt-0.5">↑ Top quartile</div>
              </div>
              <div className="absolute -right-4 bottom-8 glass-card rounded-xl px-4 py-3 border border-blue-500/20 shadow-xl">
                <div className="text-blue-400 text-[10px] font-mono font-bold mb-1 tracking-wider">WIN RATE</div>
                <div className="text-white text-xl font-display font-bold">67%</div>
                <div className="text-emerald-400 text-[10px] font-mono mt-0.5">↑ Above avg</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[oklch(0.08_0.010_260)] to-transparent z-10 pointer-events-none" />
    </section>
  );
}
