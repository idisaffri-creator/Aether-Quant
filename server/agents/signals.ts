import { EventEmitter } from "events";
import {
  MomentumStrategy,
  MeanReversionStrategy,
  VolumeBreakoutStrategy,
  SpreadStrategy,
} from "./signalStrategies.js";
import { nanoid } from "nanoid";

export interface TradeSignal {
  id: string;
  symbol: string;
  direction: "long" | "short";
  confidence: number;
  strategy: string;
  reason: string;
  indicators: Record<string, number>;
  timestamp: number;
  expiry: number;
  acknowledged: boolean;
}

interface MockCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MockMarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

const BASE_PRICES: Record<string, number> = {
  WTI: 78.50,
  BRENT: 82.30,
  NGAS: 2.15,
  GASOL: 2.45,
  BHEL: 145.00,
};

function generateCandles(symbol: string, count: number): MockCandle[] {
  const base = BASE_PRICES[symbol] || 50;
  const candles: MockCandle[] = [];
  let price = base;
  const now = Date.now();

  for (let i = count; i >= 0; i--) {
    const change = (Math.random() - 0.48) * base * 0.015;
    price += change;
    const volatility = base * 0.008;
    const high = price + Math.random() * volatility;
    const low = price - Math.random() * volatility;
    candles.push({
      timestamp: now - i * 300000,
      open: price - change,
      high: Math.max(price, high),
      low: Math.min(price, low),
      close: price,
      volume: Math.floor(Math.random() * 5000 + 1000),
    });
  }
  return candles;
}

function makeMarketData(symbol: string, candles: MockCandle[]): MockMarketData {
  const last = candles[candles.length - 1];
  const first = candles[0];
  return {
    symbol,
    price: last.close,
    change24h: candles.length > 1 ? ((last.close - first.open) / first.open) * 100 : 0,
    volume24h: candles.reduce((sum, c) => sum + c.volume, 0),
    high24h: Math.max(...candles.map((c) => c.high)),
    low24h: Math.min(...candles.map((c) => c.low)),
    timestamp: last.timestamp,
  };
}

export class SignalAgent extends EventEmitter {
  private running = false;
  private signals: TradeSignal[] = [];
  private signalsGenerated = 0;
  private generationInterval: ReturnType<typeof setInterval> | null = null;

  private strategies = [
    new MomentumStrategy(),
    new MeanReversionStrategy(),
    new VolumeBreakoutStrategy(),
    new SpreadStrategy(),
  ];

  getStatus() {
    return {
      signalsGenerated: this.signalsGenerated,
      activeSignals: this.getActiveSignals().length,
      running: this.running,
    };
  }

  async start() {
    if (this.running) return;
    this.running = true;
    this.generateSignals(["WTI", "BRENT", "NGAS", "GASOL", "BHEL"]);
    this.generationInterval = setInterval(() => {
      this.generateSignals(["WTI", "BRENT", "NGAS", "GASOL", "BHEL"]);
    }, 60000);
    this.emit("started");
  }

  async stop() {
    this.running = false;
    if (this.generationInterval) {
      clearInterval(this.generationInterval);
      this.generationInterval = null;
    }
    this.emit("stopped");
  }

  generateSignals(symbols: string[]): TradeSignal[] {
    const newSignals: TradeSignal[] = [];
    const candleMap: Record<string, MockCandle[]> = {};

    for (const symbol of symbols) {
      candleMap[symbol] = generateCandles(symbol, 20);
    }

    for (const symbol of symbols) {
      const candles = candleMap[symbol];
      const marketData = makeMarketData(symbol, candles);

      for (const strategy of this.strategies) {
        const signal = strategy.generateSignal(symbol, marketData, candles);
        if (signal) {
          signal.id = nanoid();
          newSignals.push(signal);
        }
      }
    }

    this.signals.push(...newSignals);
    this.signalsGenerated += newSignals.length;

    const cutoff = Date.now() - 86400000;
    this.signals = this.signals.filter((s) => s.expiry > cutoff);

    if (newSignals.length > 0) {
      this.emit("signals:generated", newSignals);
    }

    return newSignals;
  }

  getActiveSignals(): TradeSignal[] {
    const now = Date.now();
    return this.signals.filter((s) => !s.acknowledged && s.expiry > now);
  }

  acknowledgeSignal(id: string) {
    const signal = this.signals.find((s) => s.id === id);
    if (signal) {
      signal.acknowledged = true;
      this.emit("signal:acknowledged", { id });
    }
  }
}
