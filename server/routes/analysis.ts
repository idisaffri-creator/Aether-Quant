import { Router } from "express";
import type { Candle } from "../../shared/types";
import {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateStochastic,
  calculateOBV,
  getFullAnalysis,
} from "../services/technicalAnalysis.js";

const router = Router();

const MOCK_SYMBOLS = ["WTI", "BRENT", "NGAS", "GASOL", "BHEL"];

const mockPrices: Record<string, number> = {
  WTI: 78.43,
  BRENT: 82.17,
  NGAS: 2.14,
  GASOL: 2.51,
  BHEL: 68.90,
};

function generateMockCandles(symbol: string, resolution: string, count: number): Candle[] {
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

  return candles;
}

function validateSymbol(symbol: string): boolean {
  return MOCK_SYMBOLS.includes(symbol.toUpperCase());
}

router.get("/:symbol", (req, res) => {
  const { symbol } = req.params;
  if (!validateSymbol(symbol)) {
    res.status(404).json({ code: "NOT_FOUND", message: `Symbol ${symbol} not found`, status: 404 });
    return;
  }

  const resolution = (req.query.resolution as string) || "1h";
  const count = parseInt(req.query.count as string) || 100;
  const candles = generateMockCandles(symbol.toUpperCase(), resolution, count);
  const analysis = getFullAnalysis(symbol.toUpperCase(), candles);

  res.json(analysis);
});

router.get("/:symbol/rsi", (req, res) => {
  const { symbol } = req.params;
  if (!validateSymbol(symbol)) {
    res.status(404).json({ code: "NOT_FOUND", message: `Symbol ${symbol} not found`, status: 404 });
    return;
  }

  const resolution = (req.query.resolution as string) || "1h";
  const count = parseInt(req.query.count as string) || 100;
  const candles = generateMockCandles(symbol.toUpperCase(), resolution, count);
  const rsi = calculateRSI(candles);

  res.json({ symbol: symbol.toUpperCase(), timestamp: Date.now(), ...rsi });
});

router.get("/:symbol/macd", (req, res) => {
  const { symbol } = req.params;
  if (!validateSymbol(symbol)) {
    res.status(404).json({ code: "NOT_FOUND", message: `Symbol ${symbol} not found`, status: 404 });
    return;
  }

  const resolution = (req.query.resolution as string) || "1h";
  const count = parseInt(req.query.count as string) || 100;
  const candles = generateMockCandles(symbol.toUpperCase(), resolution, count);
  const macd = calculateMACD(candles);

  res.json({ symbol: symbol.toUpperCase(), timestamp: Date.now(), ...macd });
});

router.get("/:symbol/bollinger", (req, res) => {
  const { symbol } = req.params;
  if (!validateSymbol(symbol)) {
    res.status(404).json({ code: "NOT_FOUND", message: `Symbol ${symbol} not found`, status: 404 });
    return;
  }

  const resolution = (req.query.resolution as string) || "1h";
  const count = parseInt(req.query.count as string) || 100;
  const candles = generateMockCandles(symbol.toUpperCase(), resolution, count);
  const bollinger = calculateBollingerBands(candles);

  res.json({ symbol: symbol.toUpperCase(), timestamp: Date.now(), ...bollinger });
});

router.get("/:symbol/atr", (req, res) => {
  const { symbol } = req.params;
  if (!validateSymbol(symbol)) {
    res.status(404).json({ code: "NOT_FOUND", message: `Symbol ${symbol} not found`, status: 404 });
    return;
  }

  const resolution = (req.query.resolution as string) || "1h";
  const count = parseInt(req.query.count as string) || 100;
  const candles = generateMockCandles(symbol.toUpperCase(), resolution, count);
  const atr = calculateATR(candles);

  res.json({ symbol: symbol.toUpperCase(), timestamp: Date.now(), atr });
});

router.get("/:symbol/stochastic", (req, res) => {
  const { symbol } = req.params;
  if (!validateSymbol(symbol)) {
    res.status(404).json({ code: "NOT_FOUND", message: `Symbol ${symbol} not found`, status: 404 });
    return;
  }

  const resolution = (req.query.resolution as string) || "1h";
  const count = parseInt(req.query.count as string) || 100;
  const candles = generateMockCandles(symbol.toUpperCase(), resolution, count);
  const stochastic = calculateStochastic(candles);

  res.json({ symbol: symbol.toUpperCase(), timestamp: Date.now(), ...stochastic });
});

router.get("/:symbol/obv", (req, res) => {
  const { symbol } = req.params;
  if (!validateSymbol(symbol)) {
    res.status(404).json({ code: "NOT_FOUND", message: `Symbol ${symbol} not found`, status: 404 });
    return;
  }

  const resolution = (req.query.resolution as string) || "1h";
  const count = parseInt(req.query.count as string) || 100;
  const candles = generateMockCandles(symbol.toUpperCase(), resolution, count);
  const obvArray = calculateOBV(candles);
  const obv = obvArray.length > 0 ? obvArray[obvArray.length - 1] : 0;

  res.json({ symbol: symbol.toUpperCase(), timestamp: Date.now(), obv: parseFloat(obv.toFixed(0)) });
});

export default router;
