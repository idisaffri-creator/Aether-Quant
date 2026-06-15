import type { MarketData } from "@shared/types";

export default function MarketMovers({ data }: { data: MarketData[] }) {
  const sorted = [...data].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));

  return (
    <div className="glass-card rounded-xl p-4">
      <h2 className="text-sm font-semibold mb-3">Market Movers</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-muted-foreground uppercase tracking-wider text-[10px]">
              <th className="text-left pb-2 pr-4">Symbol</th>
              <th className="text-right pb-2 pr-4">Last</th>
              <th className="text-right pb-2 pr-4">Chg %</th>
              <th className="text-right pb-2 pr-4">Volume</th>
              <th className="text-right pb-2 pr-4">High</th>
              <th className="text-right pb-2">Low</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const isUp = item.change24h >= 0;
              return (
                <tr
                  key={item.symbol}
                  className="border-t border-border/30 hover:bg-accent/20 transition-colors"
                >
                  <td className="py-2 pr-4 font-semibold">{item.symbol}</td>
                  <td className="py-2 pr-4 text-right">${item.price.toFixed(2)}</td>
                  <td className={`py-2 pr-4 text-right font-medium ${isUp ? "text-green-500" : "text-red-500"}`}>
                    {isUp ? "+" : ""}{item.change24h.toFixed(2)}%
                  </td>
                  <td className="py-2 pr-4 text-right text-muted-foreground">
                    {(item.volume24h / 1000000).toFixed(1)}M
                  </td>
                  <td className="py-2 pr-4 text-right">${item.high24h.toFixed(2)}</td>
                  <td className="py-2 text-right">${item.low24h.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
