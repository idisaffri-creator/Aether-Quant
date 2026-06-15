const newsItems = [
  { id: 1, source: "Reuters", time: "2m ago", headline: "OPEC+ maintains production cuts through Q3 amid demand uncertainty", category: "OPEC" as const },
  { id: 2, source: "Bloomberg", time: "15m ago", headline: "WTI crude holds above $78 as US inventories draw 4.2M barrels", category: "Energy" as const },
  { id: 3, source: "CNBC", time: "32m ago", headline: "Fed minutes signal potential rate hold, boosting oil demand outlook", category: "Macro" as const },
  { id: 4, source: "S&P Global", time: "47m ago", headline: "ExxonMobil Q2 trading revenue beats estimates on refining margins", category: "Earnings" as const },
  { id: 5, source: "FT", time: "1h ago", headline: "European gas storage hits 85% capacity ahead of winter season", category: "Energy" as const },
  { id: 6, source: "Reuters", time: "1.5h ago", headline: "Saudi Arabia raises July OSP to Asia amid tightening supply", category: "OPEC" as const },
];

const categoryColors: Record<string, string> = {
  OPEC: "bg-amber/20 text-amber",
  Energy: "bg-steel/20 text-steel",
  Macro: "bg-purple-500/20 text-purple-400",
  Earnings: "bg-green-500/20 text-green-500",
};

export default function NewsFeed() {
  return (
    <div className="glass-card rounded-xl p-4">
      <h2 className="text-sm font-semibold mb-3">Energy News Feed</h2>
      <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
        {newsItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/20 transition-colors"
          >
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${categoryColors[item.category]}`}>
              {item.category}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium leading-snug truncate">{item.headline}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground">{item.source}</span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">{item.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
