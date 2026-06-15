import type { TradeSignal } from "./signals.js";

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

function computeSMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1];
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function computeRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export class MomentumStrategy {
  readonly name = "Momentum";

  generateSignal(symbol: string, _marketData: MarketData, candles: Candle[]): TradeSignal | null {
    const closes = candles.map((c) => c.close);
    if (closes.length < 10) return null;

    const shortSMA = computeSMA(closes, 5);
    const longSMA = computeSMA(closes, 10);
    const rsi = computeRSI(closes, 7);

    if (shortSMA > longSMA && rsi > 50 && rsi < 80) {
      const strength = (shortSMA - longSMA) / longSMA;
      const confidence = Math.min(0.95, 0.5 + strength * 10 + (rsi - 50) / 100);
      return {
        id: "",
        symbol,
        direction: "long",
        confidence,
        strategy: this.name,
        reason: `${symbol} short-term MA crossed above long-term MA (RSI: ${rsi.toFixed(1)})`,
        indicators: { shortSMA, longSMA, rsi },
        timestamp: Date.now(),
        expiry: Date.now() + 3600000,
        acknowledged: false,
      };
    }

    if (shortSMA < longSMA && rsi < 50 && rsi > 20) {
      const strength = (longSMA - shortSMA) / longSMA;
      const confidence = Math.min(0.95, 0.5 + strength * 10 + (50 - rsi) / 100);
      return {
        id: "",
        symbol,
        direction: "short",
        confidence,
        strategy: this.name,
        reason: `${symbol} short-term MA crossed below long-term MA (RSI: ${rsi.toFixed(1)})`,
        indicators: { shortSMA, longSMA, rsi },
        timestamp: Date.now(),
        expiry: Date.now() + 3600000,
        acknowledged: false,
      };
    }

    return null;
  }
}

export class MeanReversionStrategy {
  readonly name = "Mean Reversion";

  generateSignal(symbol: string, marketData: MarketData, candles: Candle[]): TradeSignal | null {
    const closes = candles.map((c) => c.close);
    if (closes.length < 5) return null;

    const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
    const variance = closes.reduce((sum, v) => sum + (v - mean) ** 2, 0) / closes.length;
    const std = Math.sqrt(variance);
    const zScore = std > 0 ? (marketData.price - mean) / std : 0;

    if (zScore > 1.5) {
      return {
        id: "",
        symbol,
        direction: "short",
        confidence: Math.min(0.9, 0.4 + (zScore - 1.5) * 0.2),
        strategy: this.name,
        reason: `${symbol} z-score ${zScore.toFixed(2)} — price significantly above mean, reversion expected`,
        indicators: { zScore, mean, stdDev: std },
        timestamp: Date.now(),
        expiry: Date.now() + 3600000,
        acknowledged: false,
      };
    }

    if (zScore < -1.5) {
      return {
        id: "",
        symbol,
        direction: "long",
        confidence: Math.min(0.9, 0.4 + Math.abs(zScore + 1.5) * 0.2),
        strategy: this.name,
        reason: `${symbol} z-score ${zScore.toFixed(2)} — price significantly below mean, reversion expected`,
        indicators: { zScore, mean, stdDev: std },
        timestamp: Date.now(),
        expiry: Date.now() + 3600000,
        acknowledged: false,
      };
    }

    return null;
  }
}

export class VolumeBreakoutStrategy {
  readonly name = "Volume Breakout";

  generateSignal(symbol: string, _marketData: MarketData, candles: Candle[]): TradeSignal | null {
    if (candles.length < 5) return null;

    const volumes = candles.map((c) => c.volume);
    const avgVolume = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1);
    const lastVolume = volumes[volumes.length - 1];
    const volumeRatio = avgVolume > 0 ? lastVolume / avgVolume : 1;

    if (volumeRatio < 1.5) return null;

    const closes = candles.map((c) => c.close);
    const priceChange = (closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2];
    const absChange = Math.abs(priceChange);

    if (absChange < 0.003) return null;

    return {
      id: "",
      symbol,
      direction: priceChange > 0 ? "long" : "short",
      confidence: Math.min(0.85, 0.3 + (volumeRatio - 1.5) * 0.15 + absChange * 10),
      strategy: this.name,
      reason: `${symbol} volume spike ${volumeRatio.toFixed(1)}x average with ${priceChange > 0 ? "bullish" : "bearish"} price move of ${(absChange * 100).toFixed(2)}%`,
      indicators: { volumeRatio, priceChange: absChange, avgVolume },
      timestamp: Date.now(),
      expiry: Date.now() + 3600000,
      acknowledged: false,
    };
  }
}

export class SpreadStrategy {
  readonly name = "Spread Analysis";

  generateSignal(symbol: string, _marketData: MarketData, _candles: Candle[]): TradeSignal | null {
    if (symbol !== "WTI") return null;

    const wtiPrice = 78.50 + (Math.random() - 0.5) * 2;
    const brentPrice = 82.30 + (Math.random() - 0.5) * 2;
    const spread = wtiPrice - brentPrice;
    const meanSpread = -3.80;

    const deviation = spread - meanSpread;
    const absDev = Math.abs(deviation);

    if (absDev < 0.15) return null;

    const direction = deviation > 0 ? "short" : "long";
    const reason = deviation > 0
      ? `WTI/Brent spread narrowing: WTI at $${wtiPrice.toFixed(2)} vs Brent at $${brentPrice.toFixed(2)} (${spread.toFixed(2)}). WTI overvalued relative to Brent.`
      : `WTI/Brent spread widening: WTI at $${wtiPrice.toFixed(2)} vs Brent at $${brentPrice.toFixed(2)} (${spread.toFixed(2)}). WTI undervalued relative to Brent.`;

    return {
      id: "",
      symbol,
      direction,
      confidence: Math.min(0.85, 0.3 + absDev * 2),
      strategy: this.name,
      reason,
      indicators: { wtiPrice, brentPrice, spread, deviation },
      timestamp: Date.now(),
      expiry: Date.now() + 3600000,
      acknowledged: false,
    };
  }
}
