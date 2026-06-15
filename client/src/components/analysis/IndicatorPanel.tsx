import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface IndicatorPanelProps {
  name: string;
  value: string;
  signal: string;
  status: "bullish" | "bearish" | "overbought" | "oversold" | "neutral" | "squeeze" | "cross";
  sparklineData: { v: number }[];
}

const statusColor: Record<string, string> = {
  bullish: "text-green-500 bg-green-500/10",
  bearish: "text-red-500 bg-red-500/10",
  overbought: "text-red-500 bg-red-500/10",
  oversold: "text-green-500 bg-green-500/10",
  neutral: "text-amber bg-amber/10",
  squeeze: "text-amber bg-amber/10",
  cross: "text-steel bg-steel/10",
};

export default function IndicatorPanel({ name, value, signal, status, sparklineData }: IndicatorPanelProps) {
  const statusClass = statusColor[status] || statusColor.neutral;
  const gradId = `spark-${name.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{name}</span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusClass}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-lg font-display font-bold">{value}</span>
      </div>
      <div className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{signal}</div>
      <div className="h-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparklineData}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.72 0.18 60)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="oklch(0.72 0.18 60)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="oklch(0.72 0.18 60)" strokeWidth={1.5} fill={`url(#${gradId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
