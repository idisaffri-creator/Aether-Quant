import type { Candle } from "../../shared/types";

export interface TechnicalAnalysisResult {
  symbol: string;
  timestamp: number;
  sma: { period: number; value: number }[];
  ema: { period: number; value: number }[];
  rsi: { value: number; signal: string };
  macd: { macd: number; signal: number; histogram: number; cross: string };
  bollinger: { upper: number; middle: number; lower: number; width: number; squeeze: boolean };
  atr: number;
  stochastic: { k: number; d: number; signal: string };
  obv: number;
}

export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result.push(sum / period);
  }
  return result;
}

export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  const smaSeed = calculateSMA(data, period);
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); }
    else if (i === period - 1) { result.push(smaSeed[i]); }
    else { result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]); }
  }
  return result;
}

export function calculateRSI(candles: Candle[], period = 14): { value: number; signal: "overbought" | "oversold" | "neutral" } {
  const closes = candles.map((c) => c.close);
  if (closes.length < period + 1) return { value: 50, signal: "neutral" };

  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const value = parseFloat((100 - 100 / (1 + rs)).toFixed(2));
  const signal = value >= 70 ? "overbought" : value <= 30 ? "oversold" : "neutral";
  return { value, signal };
}

export function calculateMACD(candles: Candle[]): { macd: number; signal: number; histogram: number; cross: "bullish" | "bearish" | "none" } {
  const closes = candles.map((c) => c.close);
  if (closes.length < 35) return { macd: 0, signal: 0, histogram: 0, cross: "none" };

  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (isNaN(ema12[i]) || isNaN(ema26[i])) { macdLine.push(NaN); }
    else { macdLine.push(ema12[i] - ema26[i]); }
  }

  const valid = macdLine.filter((v) => !isNaN(v));
  const signalLine = calculateEMA(valid, 9);

  if (valid.length < 10 || signalLine.length < 10) return { macd: 0, signal: 0, histogram: 0, cross: "none" };

  const last = valid.length - 1;
  const macd = valid[last];
  const signal = signalLine[signalLine.length - 1];
  const hist = macd - signal;
  const prevMacd = valid[last - 1];
  const prevSignal = signalLine[signalLine.length - 2];
  const cross = prevMacd <= prevSignal && macd > signal ? "bullish"
    : prevMacd >= prevSignal && macd < signal ? "bearish" : "none";

  return {
    macd: parseFloat(macd.toFixed(4)),
    signal: parseFloat(signal.toFixed(4)),
    histogram: parseFloat(hist.toFixed(4)),
    cross,
  };
}

export function calculateBollingerBands(candles: Candle[], period = 20, stdDev = 2): { upper: number; middle: number; lower: number; width: number; squeeze: boolean } {
  const closes = candles.map((c) => c.close);
  if (closes.length < period) return { upper: 0, middle: 0, lower: 0, width: 0, squeeze: false };

  const sma = calculateSMA(closes, period);
  const middle = sma[sma.length - 1];
  if (isNaN(middle)) return { upper: 0, middle: 0, lower: 0, width: 0, squeeze: false };

  const slice = closes.slice(closes.length - period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  const upper = middle + sd * stdDev;
  const lower = middle - sd * stdDev;
  const width = (upper - lower) / middle;

  const widths: number[] = [];
  for (let i = period; i < sma.length; i++) {
    if (isNaN(sma[i])) continue;
    const s = closes.slice(i - period + 1, i + 1);
    const m = s.reduce((a, b) => a + b, 0) / period;
    const v = s.reduce((sum, val) => sum + (val - m) ** 2, 0) / period;
    const d = Math.sqrt(v);
    widths.push(((m + d * stdDev) - (m - d * stdDev)) / m);
  }

  const avgWidth = widths.slice(-20).reduce((a, b) => a + b, 0) / Math.min(widths.length, 20);
  const squeeze = width < avgWidth * 0.5;

  return {
    upper: parseFloat(upper.toFixed(4)),
    middle: parseFloat(middle.toFixed(4)),
    lower: parseFloat(lower.toFixed(4)),
    width: parseFloat(width.toFixed(6)),
    squeeze,
  };
}

export function calculateATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;

  const tr: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  if (tr.length < period) return 0;

  let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < tr.length; i++) atr = (atr * (period - 1) + tr[i]) / period;
  return parseFloat(atr.toFixed(4));
}

export function calculateStochastic(candles: Candle[], period = 14): { k: number; d: number; signal: "overbought" | "oversold" | "neutral" } {
  if (candles.length < period) return { k: 50, d: 50, signal: "neutral" };

  const kValues: number[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const highest = Math.max(...slice.map((c) => c.high));
    const lowest = Math.min(...slice.map((c) => c.low));
    kValues.push(highest === lowest ? 50 : ((candles[i].close - lowest) / (highest - lowest)) * 100);
  }

  const k = kValues[kValues.length - 1];
  const d = kValues.length >= 3 ? kValues.slice(-3).reduce((a, b) => a + b, 0) / 3 : k;
  const signal = k >= 80 ? "overbought" : k <= 20 ? "oversold" : "neutral";
  return { k: parseFloat(k.toFixed(2)), d: parseFloat(d.toFixed(2)), signal };
}

export function calculateOBV(candles: Candle[]): number[] {
  const obv: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) obv.push(obv[i - 1] + candles[i].volume);
    else if (candles[i].close < candles[i - 1].close) obv.push(obv[i - 1] - candles[i].volume);
    else obv.push(obv[i - 1]);
  }
  return obv;
}

export function getFullAnalysis(symbol: string, candles: Candle[]): TechnicalAnalysisResult {
  const closes = candles.map((c) => c.close);

  const sma = [10, 20, 50].map((p) => {
    const v = calculateSMA(closes, p);
    const last = v[v.length - 1];
    return { period: p, value: isNaN(last) ? 0 : parseFloat(last.toFixed(4)) };
  });

  const ema = [12, 26].map((p) => {
    const v = calculateEMA(closes, p);
    const last = v[v.length - 1];
    return { period: p, value: isNaN(last) ? 0 : parseFloat(last.toFixed(4)) };
  });

  const obvArr = calculateOBV(candles);

  return {
    symbol,
    timestamp: Date.now(),
    sma,
    ema,
    rsi: calculateRSI(candles),
    macd: calculateMACD(candles),
    bollinger: calculateBollingerBands(candles),
    atr: calculateATR(candles),
    stochastic: calculateStochastic(candles),
    obv: parseFloat((obvArr[obvArr.length - 1] || 0).toFixed(0)),
  };
}
