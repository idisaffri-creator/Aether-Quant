/* ============================================================
   AETHER ENERGY — Hero Section
   Design: Elemental Precision — Full-bleed dark hero with
   amber energy streams, animated price ticker, asymmetric layout
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Shield, Zap } from "lucide-react";

const tickerItems = [
  { symbol: "WTI CRUDE", price: "$78.42", change: "+0.72%", up: true },
  { symbol: "BRENT CRUDE", price: "$82.15", change: "+0.58%", up: true },
  { symbol: "NATURAL GAS", price: "$2.84", change: "-1.23%", up: false },
  { symbol: "HEATING OIL", price: "$2.67", change: "+0.34%", up: true },
  { symbol: "GASOLINE", price: "$2.41", change: "-0.18%", up: false },
  { symbol: "OPEC BASKET", price: "$80.91", change: "+0.91%", up: true },
  { symbol: "WTI CRUDE", price: "$78.42", change: "+0.72%", up: true },
  { symbol: "BRENT CRUDE", price: "$82.15", change: "+0.58%", up: true },
  { symbol: "NATURAL GAS", price: "$2.84", change: "-1.23%", up: false },
  { symbol: "HEATING OIL", price: "$2.67", change: "+0.34%", up: true },
  { symbol: "GASOLINE", price: "$2.41", change: "-0.18%", up: false },
  { symbol: "OPEC BASKET", price: "$80.91", change: "+0.91%", up: true },
];

function useCountUp(target: number, duration: number = 2000, start: boolean = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

export default function HeroSection() {
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const users = useCountUp(1000, 2200, statsVisible);
  const strategies = useCountUp(50, 1800, statsVisible);
  const uptime = useCountUp(99, 1500, statsVisible);

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.11_0.008_260)] via-[oklch(0.15_0.009_260)] to-[oklch(0.08_0.008_260)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.72_0.18_60/5%)] via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-[oklch(0.72_0.18_60/5%)] blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-[oklch(0.60_0.15_250/5%)] blur-3xl" />
      </div>

      {/* Ticker bar */}
      <div className="relative z-10 mt-16 lg:mt-18 border-b border-white/8 bg-[oklch(0.11_0.008_260/80%)] backdrop-blur-sm overflow-hidden">
        <div className="flex items-center">
          <div className="shrink-0 px-4 py-2.5 bg-amber-500/20 border-r border-amber-500/30 text-amber-400 text-xs font-data font-semibold tracking-widest uppercase">
            LIVE
          </div>
          <div className="overflow-hidden flex-1">
            <div className="ticker-scroll flex items-center gap-8 py-2.5 px-6 whitespace-nowrap">
              {tickerItems.map((item, i) => (
                <span key={i} className="flex items-center gap-2.5 text-xs" style={{ fontFamily: "'Space Grotesk', monospace" }}>
                  <span className="text-white/50 tracking-wider font-medium">{item.symbol}</span>
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

      {/* Main hero content */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="container py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 mb-6 animate-fade-up">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400 text-xs font-data font-600 tracking-wider uppercase">
                  Now in Private Beta
                </span>
              </div>

              <h1 className="font-display text-5xl lg:text-6xl xl:text-7xl font-700 text-white leading-[1.05] tracking-tight mb-6 animate-fade-up-delay-1">
                The Element of{" "}
                <span className="shimmer-text">Intelligent</span>
                <br />
                Oil Trading
              </h1>

              <p className="text-white/60 text-lg leading-relaxed mb-8 animate-fade-up-delay-2">
                Aether Energy democratizes institutional-grade algorithmic oil trading
                through an intuitive no-code platform. Build, backtest, and deploy
                AI-powered strategies — no programming required.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 animate-fade-up-delay-3">
                <a href="/register">
                  <Button
                    className="btn-amber px-6 py-3 text-base rounded-xl pulse-glow group cursor-pointer"
                  >
                    Start Trading Free
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
                <Button
                  variant="outline"
                  onClick={() => {
                    const el = document.querySelector("#platform");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-6 py-3 text-base rounded-xl border-white/20 text-white/80 hover:bg-white/8 hover:text-white hover:border-white/30 transition-all"
                >
                  See How It Works
                </Button>
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-6 mt-10 pt-8 border-t border-white/8">
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <Shield className="w-4 h-4 text-amber-400/70" />
                  <span>Institutional-grade security</span>
                </div>
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <TrendingUp className="w-4 h-4 text-emerald-400/70" />
                  <span>Paper trading included</span>
                </div>
              </div>
            </div>

            {/* Right: Dashboard mockup */}
            <div className="relative hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 aspect-[4/3] glass-card flex items-center justify-center">
                <div className="p-6 text-center">
                  <div className="text-4xl font-display font-bold text-amber mb-2">AETHER</div>
                  <div className="text-xs text-muted-foreground">Terminal · Dashboard Preview</div>
                  <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    All systems operational
                  </div>
                </div>
                <div className="absolute inset-0 rounded-2xl ring-1 ring-amber-500/20 pointer-events-none" />
              </div>
              {/* Floating stat cards */}
              <div className="absolute -left-6 top-1/4 glass-card rounded-xl px-4 py-3 border border-amber-500/20 shadow-xl">
                <div className="text-amber-400 text-xs font-data font-600 mb-1">Sharpe Ratio</div>
                <div className="text-white text-2xl font-display font-700">1.42</div>
                <div className="text-emerald-400 text-xs mt-0.5">↑ Above benchmark</div>
              </div>
              <div className="absolute -right-4 bottom-1/4 glass-card rounded-xl px-4 py-3 border border-blue-500/20 shadow-xl">
                <div className="text-blue-400 text-xs font-data font-600 mb-1">Win Rate</div>
                <div className="text-white text-2xl font-display font-700">67%</div>
                <div className="text-emerald-400 text-xs mt-0.5">↑ 12% vs avg</div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div ref={statsRef} className="mt-16 lg:mt-20 grid grid-cols-3 gap-6 lg:gap-12 max-w-2xl">
            <div className="group">
              <div className="font-display text-3xl lg:text-4xl font-bold text-white mb-1">
                {statsVisible ? `${users}+` : "0+"}
              </div>
              <div className="text-white/50 text-sm">Beta Users</div>
              <div className="mt-2 h-0.5 w-8 bg-amber-500/40 rounded-full" />
            </div>
            <div className="group">
              <div className="font-display text-3xl lg:text-4xl font-bold text-white mb-1">
                {statsVisible ? `${strategies}+` : "0+"}
              </div>
              <div className="text-white/50 text-sm">Strategy Templates</div>
              <div className="mt-2 h-0.5 w-8 bg-amber-500/40 rounded-full" />
            </div>
            <div className="group">
              <div className="font-display text-3xl lg:text-4xl font-bold text-white mb-1">
                {statsVisible ? `${uptime}.5%` : "0%"}
              </div>
              <div className="text-white/50 text-sm">Platform Uptime</div>
              <div className="mt-2 h-0.5 w-8 bg-amber-500/40 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[oklch(0.11_0.008_260)] to-transparent z-10 pointer-events-none" />
    </section>
  );
}
