interface FactorContribution {
  factor: string;
  contribution: number;
  direction: "positive" | "negative";
  consistency: number;
}

interface FactorBreakdownProps {
  factors: FactorContribution[];
}

export default function FactorBreakdown({ factors }: FactorBreakdownProps) {
  const maxAbs = Math.max(...factors.map((f) => Math.abs(f.contribution)));

  return (
    <div className="glass-card rounded-xl p-4">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-4">Factor Contribution to P&L</span>
      <div className="space-y-3">
        {factors.map((f) => {
          const barWidth = (Math.abs(f.contribution) / maxAbs) * 100;
          return (
            <div key={f.factor}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{f.factor}</span>
                  <span className={`text-[10px] font-medium px-1 py-0.5 rounded ${
                    f.direction === "positive" ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"
                  }`}>
                    {f.direction === "positive" ? "+" : ""}{f.contribution.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i < Math.round(f.consistency / 20) ? "bg-amber" : "bg-accent/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{f.consistency.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-accent/30 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    f.direction === "positive" ? "bg-green-500" : "bg-red-500"
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
