/**
 * AI assistant — strategy recommendations, market analysis, code help.
 *
 * Providers (auto-detected):
 *   1. OpenAI (OPENAI_API_KEY) — best quality, costs $
 *   2. Ollama (OLLAMA_URL) — local, free, slower
 *   3. Mock (no provider) — returns canned response
 *
 * Endpoints:
 *   POST /api/ai/chat          — chat completion
 *   POST /api/ai/strategy      — get strategy recommendation for symbol
 *   POST /api/ai/explain       — explain a strategy or backtest result
 */
import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";

const router = Router();

type Provider = "openai" | "ollama" | "mock";

function getProvider(): Provider {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.OLLAMA_URL) return "ollama";
  return "mock";
}

const CACHE_TTL = 3600; // 1 hour

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are Aether, an AI assistant for the Aether Energy trading platform.
You help traders with:
- Energy commodities markets (crude oil, natural gas, gold, silver, copper)
- Trading strategies (mean reversion, momentum, RSI, MACD, MA crosses)
- Risk management (position sizing, stop losses, portfolio diversification)
- Backtesting (interpreting Sharpe ratio, max drawdown, win rate)

Be concise. Use specific numbers when possible. Always mention risks.
If asked about specific trades, remind the user that past performance doesn't guarantee future results.`;

async function callOpenAI(messages: ChatMessage[]): Promise<string> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`OpenAI ${r.status}: ${err.slice(0, 200)}`);
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content || "";
}

async function callOllama(messages: ChatMessage[]): Promise<string> {
  const url = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.1:8b";
  const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n\n") + "\n\nassistant:";
  const r = await fetch(`${url}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false, options: { num_predict: 500 } }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Ollama ${r.status}: ${err.slice(0, 200)}`);
  }
  const j = await r.json();
  return j.response || "";
}

function mockResponse(prompt: string): string {
  // Canned response for demo
  return `I'm currently in mock mode (no AI provider configured). To enable AI assistance, set either:
- OPENAI_API_KEY for OpenAI (best quality)
- OLLAMA_URL for local Ollama (free, requires ~5GB RAM)

Your question was: "${prompt.slice(0, 100)}..."

In the meantime, here's a general tip: for energy commodities, consider mean reversion strategies on oversold conditions (RSI < 30) with tight stop losses. Always diversify across at least 3-4 symbols and use position sizing of 1-2% per trade.`;
}

async function chat(messages: ChatMessage[]): Promise<{ content: string; provider: Provider; cached: boolean }> {
  const cacheKey = `ai:chat:${Buffer.from(messages.map(m => `${m.role}:${m.content}`).join("|")).toString("base64").slice(0, 64)}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return { content: cached, provider: getProvider(), cached: true };
    }
  } catch {
    // ignore cache errors
  }

  const provider = getProvider();
  let content: string;
  if (provider === "openai") {
    content = await callOpenAI([{ role: "system", content: SYSTEM_PROMPT }, ...messages]);
  } else if (provider === "ollama") {
    content = await callOllama([{ role: "system", content: SYSTEM_PROMPT }, ...messages]);
  } else {
    content = mockResponse(messages[messages.length - 1]?.content || "");
  }

  try {
    await redis.set(cacheKey, content, "EX", CACHE_TTL);
  } catch {
    // ignore
  }
  return { content, provider, cached: false };
}

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().min(1).max(2000),
  })).min(1).max(20),
});

router.post("/chat", authMiddleware, async (req, res) => {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message || "Invalid messages", status: 400 });
      return;
    }
    const start = Date.now();
    const result = await chat(parsed.data.messages);
    logger.info({ userId: req.user!.userId, provider: result.provider, cached: result.cached, ms: Date.now() - start }, "ai chat");
    res.json({
      content: result.content,
      provider: result.provider,
      cached: result.cached,
      latencyMs: Date.now() - start,
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "ai chat failed");
    res.status(500).json({ code: "INTERNAL", message: (err as Error).message });
  }
});

const strategySchema = z.object({
  symbol: z.string().min(1).max(20),
  horizonDays: z.number().int().min(1).max(365).optional(),
  riskTolerance: z.enum(["low", "medium", "high"]).optional(),
});

router.post("/strategy", authMiddleware, async (req, res) => {
  try {
    const parsed = strategySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message || "Invalid input", status: 400 });
      return;
    }
    const prompt = `Recommend a trading strategy for ${parsed.data.symbol} over ${parsed.data.horizonDays || 30} days with ${parsed.data.riskTolerance || "medium"} risk tolerance. Include entry/exit conditions, position sizing, and stop loss levels.`;
    const result = await chat([{ role: "user", content: prompt }]);
    res.json({ symbol: parsed.data.symbol, recommendation: result.content, provider: result.provider });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: (err as Error).message });
  }
});

router.get("/status", authMiddleware, (_req, res) => {
  res.json({
    provider: getProvider(),
    model: process.env.OPENAI_MODEL || process.env.OLLAMA_MODEL || "mock",
    openai: !!process.env.OPENAI_API_KEY,
    ollama: !!process.env.OLLAMA_URL,
  });
});

export default router;
