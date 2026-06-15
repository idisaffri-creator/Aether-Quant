import { Router } from "express";
import type { MarketData, OrderBook, Candle } from "../../shared/types";

const router = Router();

const MOCK_SYMBOLS = ["WTI", "BRENT", "NGAS", "GASOL", "BHEL"];

const mockPrices: Record<string, number> = {
  WTI: 78.43,
  BRENT: 82.17,
  NGAS: 2.14,
  GASOL: 2.51,
  BHEL: 68.90,
};

function generateMockMarketData(symbol: string): MarketData {
  const basePrice = mockPrices[symbol] || 50;
  const change = (Math.random() - 0.5) * 4;
  const price = basePrice + change;
  const change24h = ((price - basePrice) / basePrice) * 100;

  return {
    symbol,
    price: parseFloat(price.toFixed(2)),
    change24h: parseFloat(change24h.toFixed(2)),
    volume24h: parseFloat((Math.random() * 1000000 + 500000).toFixed(0)),
    high24h: parseFloat((price * 1.03).toFixed(2)),
    low24h: parseFloat((price * 0.97).toFixed(2)),
    bid: parseFloat((price * 0.999).toFixed(2)),
    ask: parseFloat((price * 1.001).toFixed(2)),
    spread: parseFloat((price * 0.002).toFixed(3)),
    timestamp: Date.now(),
  };
}

function generateMockOrderBook(symbol: string): OrderBook {
  const basePrice = mockPrices[symbol] || 50;
  const bids: OrderBook["bids"] = [];
  const asks: OrderBook["asks"] = [];

  for (let i = 0; i < 15; i++) {
    const bidPrice = basePrice * (1 - (i + 1) * 0.001);
    const askPrice = basePrice * (1 + (i + 1) * 0.001);
    const bidSize = Math.random() * 1000 + 100;
    const askSize = Math.random() * 1000 + 100;

    bids.push({
      price: parseFloat(bidPrice.toFixed(2)),
      size: parseFloat(bidSize.toFixed(2)),
      total: 0,
    });
    asks.push({
      price: parseFloat(askPrice.toFixed(2)),
      size: parseFloat(askSize.toFixed(2)),
      total: 0,
    });
  }

  let bidTotal = 0;
  let askTotal = 0;
  for (let i = 0; i < 15; i++) {
    bidTotal += bids[i].size;
    asks[14 - i].total = parseFloat((askTotal += asks[14 - i].size).toFixed(2));
    bids[i].total = parseFloat(bidTotal.toFixed(2));
  }

  return { symbol, bids, asks, timestamp: Date.now() };
}

router.get("/quotes", (_req, res) => {
  const quotes = MOCK_SYMBOLS.map(generateMockMarketData);
  res.json(quotes);
});

router.get("/quotes/:symbol", (req, res) => {
  const { symbol } = req.params;
  if (!MOCK_SYMBOLS.includes(symbol.toUpperCase())) {
    res.status(404).json({ code: "NOT_FOUND", message: `Symbol ${symbol} not found`, status: 404 });
    return;
  }
  res.json(generateMockMarketData(symbol.toUpperCase()));
});

router.get("/orderbook/:symbol", (req, res) => {
  const { symbol } = req.params;
  if (!MOCK_SYMBOLS.includes(symbol.toUpperCase())) {
    res.status(404).json({ code: "NOT_FOUND", message: `Symbol ${symbol} not found`, status: 404 });
    return;
  }
  res.json(generateMockOrderBook(symbol.toUpperCase()));
});

router.get("/history/:symbol", (req, res) => {
  const { symbol } = req.params;
  const resolution = (req.query.resolution as string) || "1h";
  const count = parseInt(req.query.count as string) || 100;

  const basePrice = mockPrices[symbol.toUpperCase()] || 50;
  const candles: Candle[] = [];

  for (let i = count; i > 0; i--) {
    const volatility = resolution === "1m" ? 0.002 : resolution === "5m" ? 0.005 : 0.02;
    const open = basePrice * (1 + (Math.random() - 0.5) * volatility * 10);
    const close = open * (1 + (Math.random() - 0.5) * volatility);
    const high = Math.max(open, close) * (1 + Math.random() * volatility);
    const low = Math.min(open, close) * (1 - Math.random() * volatility);
    const interval = resolution === "1m" ? 60000 : resolution === "5m" ? 300000 : 3600000;

    candles.push({
      timestamp: Date.now() - i * interval,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat((Math.random() * 10000 + 1000).toFixed(0)),
    });
  }

  res.json(candles);
});

export default router;
