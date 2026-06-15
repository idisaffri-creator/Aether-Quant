import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface FactorCardProps {
  name: string;
  value: number;
  signal: "bullish" | "bearish" | "neutral";
}

const colorMap = {
  bullish: { text: "text-green-500", border: "border-green-500/20", bar: "bg-green-500" },
  bearish: { text: "text-red-500", border: "border-red-500/20", bar: "bg-red-500" },
  neutral: { text: "text-amber", border: "border-amber/20", bar: "bg-amber" },
};

const trendIcon = {
  bullish: TrendingUp,
  bearish: TrendingDown,
  neutral: Minus,
};

export default function FactorCard({ name, value, signal }: FactorCardProps) {
  const colors = colorMap[signal];
  const Icon = trendIcon[signal];

  return (
    <div className={`glass-card rounded-xl p-3 border ${colors.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{name}</span>
        <Icon className={`w-3 h-3 ${colors.text}`} />
      </div>
      <div className={`text-lg font-display font-bold ${colors.text}`}>{value.toFixed(1)}</div>
      <div className="mt-2 h-1.5 rounded-full bg-accent/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colors.bar}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
