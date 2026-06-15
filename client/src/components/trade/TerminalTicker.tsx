const tickerItems = [
  { symbol: "WTI", price: 78.42, change: 1.24 },
  { symbol: "BRENT", price: 82.15, change: -0.87 },
  { symbol: "NGAS", price: 2.84, change: 3.42 },
  { symbol: "GASOL", price: 2.45, change: -0.32 },
  { symbol: "BHEL", price: 145.20, change: 2.15 },
  { symbol: "CL", price: 78.40, change: 1.23 },
  { symbol: "HO", price: 2.68, change: -0.54 },
  { symbol: "RB", price: 2.41, change: 0.76 },
];

export default function TerminalTicker() {
  return (
    <div className="glass-card rounded-xl p-2 overflow-hidden">
      <div className="flex ticker-scroll gap-0 whitespace-nowrap">
        {[...tickerItems, ...tickerItems].map((item, i) => (
          <div key={i} className="inline-flex items-center gap-2 px-4 py-1 border-r border-border/50">
            <span className="text-xs font-mono font-semibold">{item.symbol}</span>
            <span className="text-xs font-mono">${item.price.toFixed(2)}</span>
            <span className={`text-[10px] font-mono font-medium ${item.change >= 0 ? "text-green-500" : "text-red-500"}`}>
              {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
