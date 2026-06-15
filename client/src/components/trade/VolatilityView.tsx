import { AreaChart, Area, ResponsiveContainer } from "recharts";

const sparklineData = [
  { v: 22.1 }, { v: 23.4 }, { v: 21.8 }, { v: 24.2 }, { v: 25.7 },
  { v: 24.9 }, { v: 26.3 }, { v: 25.1 }, { v: 24.6 }, { v: 23.8 },
  { v: 24.2 }, { v: 23.5 }, { v: 22.9 }, { v: 23.1 }, { v: 24.0 },
];

const volMetrics = [
  { label: "Implied Vol (30d)", value: "24.8%", change: "+0.6" },
  { label: "Historical Vol (10d)", value: "21.2%", change: "-1.3" },
  { label: "Historical Vol (30d)", value: "22.7%", change: "+0.4" },
  { label: "IV / HV Spread", value: "+2.1%", change: "" },
];

function Gauge({ value, label }: { value: number; label: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = clamped < 33 ? "text-green-500" : clamped < 66 ? "text-amber" : "text-red-500";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-10 overflow-hidden">
        <div className="absolute inset-0 rounded-t-full border-4 border-accent/30 border-b-0" />
        <div
          className="absolute bottom-0 left-1/2 w-1 h-5 rounded-full origin-bottom transition-all"
          style={{
            backgroundColor: "oklch(0.72 0.18 60)",
            transform: `translateX(-50%) rotate(${-90 + (clamped / 100) * 180}deg)`,
            transformOrigin: "bottom center",
          }}
        />
      </div>
      <span className={`text-xs font-mono font-semibold mt-1 ${color}`}>{label}</span>
    </div>
  );
}

export default function VolatilityView() {
  return (
    <div className="glass-card rounded-xl p-4 space-y-4">
      <h2 className="text-sm font-semibold">Volatility Dashboard</h2>

      <div className="flex items-center justify-around">
        <Gauge value={38} label="LOW" />
        <Gauge value={62} label="MED" />
        <Gauge value={85} label="HIGH" />
      </div>

      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparklineData}>
            <defs>
              <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.72 0.18 60)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="oklch(0.72 0.18 60)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="oklch(0.72 0.18 60)" strokeWidth={1.5} fill="url(#volGradient)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {volMetrics.map((m) => (
          <div key={m.label} className="p-2.5 rounded-lg bg-accent/30">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-mono font-semibold">{m.value}</span>
              {m.change && (
                <span className={`text-[10px] font-mono ${m.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
                  {m.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
