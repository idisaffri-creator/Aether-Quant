import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MarketData, OrderBook, Candle } from "@shared/types";
import { usePageTitle } from "@/lib/usePageTitle";
import { api } from "@/lib/api";
import SignalPanel from "@/components/trade/SignalPanel";
import { Zap } from "lucide-react";
import TerminalTicker from "@/components/trade/TerminalTicker";
import MarketMovers from "@/components/trade/MarketMovers";
import NewsFeed from "@/components/trade/NewsFeed";
import VolatilityView from "@/components/trade/VolatilityView";

type Tab = "CHART" | "DEPTH" | "NEWS" | "VOLATILITY" | "MOVERS";

const tabs: Tab[] = ["CHART", "DEPTH", "NEWS", "VOLATILITY", "MOVERS"];

function DepthChart({ orderBook }: { orderBook: OrderBook | null }) {
  if (!orderBook) return <div className="h-96 flex items-center justify-center text-sm text-muted-foreground">Loading depth data...</div>;

  const maxAskTotal = Math.max(...orderBook.asks.slice(0, 15).map(l => l.total), 1);
  const maxBidTotal = Math.max(...orderBook.bids.slice(0, 15).map(l => l.total), 1);

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <h3 className="text-[10px] text-red-500 uppercase tracking-wider font-semibold mb-2">Asks</h3>
        <div className="space-y-0.5">
          {orderBook.asks.slice(0, 15).reverse().map((level, i) => (
            <div key={i} className="relative grid grid-cols-3 gap-2 text-[11px] font-mono py-0.5">
              <div
                className="absolute right-0 top-0 bottom-0 rounded-l-sm bg-red-500/15"
                style={{ width: `${(level.total / maxAskTotal) * 100}%` }}
              />
              <span className="relative z-10 text-red-500">{level.price.toFixed(2)}</span>
              <span className="relative z-10 text-right">{level.size.toFixed(1)}</span>
              <span className="relative z-10 text-right text-muted-foreground">{level.total.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-[10px] text-green-500 uppercase tracking-wider font-semibold mb-2">Bids</h3>
        <div className="space-y-0.5">
          {orderBook.bids.slice(0, 15).map((level, i) => (
            <div key={i} className="relative grid grid-cols-3 gap-2 text-[11px] font-mono py-0.5">
              <div
                className="absolute left-0 top-0 bottom-0 rounded-r-sm bg-green-500/15"
                style={{ width: `${(level.total / maxBidTotal) * 100}%` }}
              />
              <span className="relative z-10">{level.price.toFixed(2)}</span>
              <span className="relative z-10 text-right">{level.size.toFixed(1)}</span>
              <span className="relative z-10 text-right text-muted-foreground">{level.total.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Trade() {
  usePageTitle("Trade");
  const [symbol, setSymbol] = useState("WTI");
  const [quote, setQuote] = useState<MarketData | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [chartData, setChartData] = useState<Candle[]>([]);
  const [quotes, setQuotes] = useState<MarketData[]>([]);
  const [side, setSide] = useState<"long" | "short">("long");
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop">("market");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [signalCount, setSignalCount] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("CHART");

  const symbols = ["WTI", "BRENT", "NGAS", "GASOL", "BHEL"];

  useEffect(() => {
    api.agents.signals().then((d) => setSignalCount(d.signals.length)).catch(() => {});
    const interval = setInterval(() => {
      api.agents.signals().then((d) => setSignalCount(d.signals.length)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api.market.quote(symbol).then(setQuote).catch(() => {});
    api.market.orderbook(symbol).then(setOrderBook).catch(() => {});
    api.market.history(symbol, "5m", 200).then(setChartData).catch(() => {});
    api.market.quotes().then(setQuotes).catch(() => {});

    const interval = setInterval(() => {
      api.market.quote(symbol).then(setQuote).catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [symbol]);

  const spread = quote ? ((quote.ask - quote.bid) / quote.price * 100).toFixed(3) : "0.000";

  function renderMainPanel() {
    switch (activeTab) {
      case "CHART":
        return (
          <>
            <div className="flex items-center gap-2 mb-4 overflow-x-auto">
              {symbols.map((s) => (
                <button
                  key={s}
                  onClick={() => setSymbol(s)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-all ${
                    symbol === s
                      ? "bg-amber text-black"
                      : "bg-accent/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-3">
                {quote && (
                  <>
                    <span className="text-lg font-mono font-bold">${quote.price.toFixed(2)}</span>
                    <span className={`text-xs font-medium ${quote.change24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {quote.change24h >= 0 ? "+" : ""}{quote.change24h.toFixed(2)}%
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString()} hide />
                  <YAxis domain={["auto", "auto"]} hide />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.15 0.009 260)",
                      border: "1px solid oklch(1 0 0 / 8%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(t) => new Date(t).toLocaleString()}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="oklch(0.72 0.18 60)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        );
      case "DEPTH":
        return <DepthChart orderBook={orderBook} />;
      case "NEWS":
        return <NewsFeed />;
      case "VOLATILITY":
        return <VolatilityView />;
      case "MOVERS":
        return <MarketMovers data={quotes} />;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Trade</h1>
        {signalCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber/10 border border-amber/20 text-amber text-[11px] font-medium">
            <Zap className="w-3.5 h-3.5" />
            {signalCount} signal{signalCount > 1 ? "s" : ""}
          </div>
        )}
      </div>
      </div>

      <TerminalTicker />

      <div className="flex items-center gap-1 bg-accent/20 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-xs font-semibold tracking-wider rounded-md transition-all ${
              activeTab === tab
                ? "bg-amber text-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 glass-card rounded-xl p-4">
          {renderMainPanel()}
        </div>

        <div className="glass-card rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold">Order Entry</h2>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSide("long")}
              className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                side === "long"
                  ? "bg-green-500/20 text-green-500 border border-green-500/30"
                  : "bg-accent/50 text-muted-foreground"
              }`}
            >
              Buy / Long
            </button>
            <button
              onClick={() => setSide("short")}
              className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                side === "short"
                  ? "bg-red-500/20 text-red-500 border border-red-500/30"
                  : "bg-accent/50 text-muted-foreground"
              }`}
            >
              Sell / Short
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {(["market", "limit", "stop"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wider transition-all ${
                  orderType === t
                    ? "bg-amber/10 text-amber border border-amber/20"
                    : "bg-accent/50 text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {orderType !== "market" && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Limit Price</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={quote?.price ? `$${quote.price.toFixed(2)}` : "$0.00"}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm font-mono focus:outline-none focus:border-amber/50"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Quantity (contracts)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm font-mono focus:outline-none focus:border-amber/50"
            />
          </div>

          <div className="p-3 rounded-lg bg-accent/30 space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Est. Total</span>
              <span className="font-mono">
                ${(parseFloat(amount || "0") * (quote?.price || 0)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Spread</span>
              <span className="font-mono">{spread}%</span>
            </div>
          </div>

          <button className={`w-full py-3 rounded-lg text-sm font-semibold transition-all ${
            side === "long"
              ? "bg-green-500/20 text-green-500 border border-green-500/30 hover:bg-green-500/30"
              : "bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30"
          }`}>
            {side === "long" ? "Place Buy Order" : "Place Sell Order"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Order Book — {symbol}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                <span>Price</span>
                <span className="text-right">Size</span>
                <span className="text-right">Total</span>
              </div>
              <div className="space-y-0.5">
                {orderBook?.asks.slice(0, 10).reverse().map((level, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                    <span className="text-red-500">{level.price.toFixed(2)}</span>
                    <span className="text-right">{level.size.toFixed(1)}</span>
                    <span className="text-right text-muted-foreground">{level.total.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                <span>Price</span>
                <span className="text-right">Size</span>
                <span className="text-right">Total</span>
              </div>
              <div className="space-y-0.5">
                {orderBook?.bids.slice(0, 10).map((level, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                    <span className="text-green-500">{level.price.toFixed(2)}</span>
                    <span className="text-right">{level.size.toFixed(1)}</span>
                    <span className="text-right text-muted-foreground">{level.total.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <SignalPanel />

        <div className="glass-card rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Market Details — {symbol}</h2>
          {quote && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Bid", value: `$${quote.bid.toFixed(2)}` },
                { label: "Ask", value: `$${quote.ask.toFixed(2)}` },
                { label: "Spread", value: `${spread}%` },
                { label: "24h High", value: `$${quote.high24h.toFixed(2)}` },
                { label: "24h Low", value: `$${quote.low24h.toFixed(2)}` },
                { label: "24h Volume", value: `${(quote.volume24h / 1000000).toFixed(2)}M` },
                { label: "24h Change", value: `${quote.change24h >= 0 ? "+" : ""}${quote.change24h.toFixed(2)}%`,
                  className: quote.change24h >= 0 ? "text-green-500" : "text-red-500" },
              ].map((item) => (
                <div key={item.label} className="p-2.5 rounded-lg bg-accent/30">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</div>
                  <div className={`text-sm font-mono font-medium mt-1 ${item.className || ""}`}>{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
