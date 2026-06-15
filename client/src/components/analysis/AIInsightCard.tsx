interface KeyLevels {
  support: number;
  resistance: number;
  pivot: number;
}

interface RiskMetrics {
  var95: number;
  expectedShortfall: number;
  betaToWTI: number;
}

interface AIInsightCardProps {
  summary: string;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  levels: KeyLevels;
  risk: RiskMetrics;
  opportunity: string;
}

const sentimentColors = {
  bullish: { text: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" },
  bearish: { text: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  neutral: { text: "text-amber", bg: "bg-amber/10", border: "border-amber/20" },
};

export default function AIInsightCard({ summary, sentiment, confidence, levels, risk, opportunity }: AIInsightCardProps) {
  const sc = sentimentColors[sentiment];

  return (
    <div className="glass-card rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI Market Summary</span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${sc.bg} ${sc.text} ${sc.border} border`}>
          {sentiment.toUpperCase()} {confidence.toFixed(0)}%
        </span>
      </div>
      <p className="text-xs leading-relaxed text-foreground/80">{summary}</p>

      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Key Levels</span>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-accent/30 text-center">
            <div className="text-[10px] text-muted-foreground">Support</div>
            <div className="text-sm font-mono font-bold text-green-500">${levels.support.toFixed(2)}</div>
          </div>
          <div className="p-2 rounded-lg bg-accent/30 text-center">
            <div className="text-[10px] text-muted-foreground">Pivot</div>
            <div className="text-sm font-mono font-bold text-amber">${levels.pivot.toFixed(2)}</div>
          </div>
          <div className="p-2 rounded-lg bg-accent/30 text-center">
            <div className="text-[10px] text-muted-foreground">Resistance</div>
            <div className="text-sm font-mono font-bold text-red-500">${levels.resistance.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Risk Metrics</span>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-accent/30 text-center">
            <div className="text-[10px] text-muted-foreground">VaR 95%</div>
            <div className="text-xs font-mono font-bold text-red-500">{risk.var95.toFixed(1)}%</div>
          </div>
          <div className="p-2 rounded-lg bg-accent/30 text-center">
            <div className="text-[10px] text-muted-foreground">Exp. Shortfall</div>
            <div className="text-xs font-mono font-bold text-red-500">{risk.expectedShortfall.toFixed(1)}%</div>
          </div>
          <div className="p-2 rounded-lg bg-accent/30 text-center">
            <div className="text-[10px] text-muted-foreground">Beta to WTI</div>
            <div className="text-xs font-mono font-bold">{risk.betaToWTI.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-amber/5 border border-amber/10">
        <div className="text-[10px] font-semibold text-amber mb-1">Top Opportunity</div>
        <div className="text-xs text-foreground/80">{opportunity}</div>
      </div>
    </div>
  );
}
