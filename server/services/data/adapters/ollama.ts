/**
 * Optional Ollama sentiment scoring.
 * Uses local Ollama API (no key, no cost).
 * Endpoint: OLLAMA_URL (default http://127.0.0.1:11434)
 * Model:   OLLAMA_MODEL (default llama3.1:8b)
 *
 * Skipped silently if Ollama isn't running (returns null).
 */
import { logger } from "../../../lib/logger";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const TIMEOUT_MS = 10000;

export interface SentimentResult {
  score: number; // -1 to +1
  label: "bearish" | "neutral" | "bullish";
  confidence: number; // 0-1
  latencyMs: number;
}

const PROMPT = (text: string) =>
  `Analyze the financial-market sentiment of the following headline. Respond with ONLY a JSON object of shape {"score": <number between -1 and 1>, "label": "<bearish|neutral|bullish>", "confidence": <0-1>}. Headline: "${text.replace(/"/g, "'")}"`;

let ollamaReachable: boolean | null = null;

export async function getOllamaStatus(): Promise<{ reachable: boolean; model: string }> {
  if (ollamaReachable === null) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2000);
      const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: ctrl.signal });
      clearTimeout(t);
      ollamaReachable = r.ok;
    } catch {
      ollamaReachable = false;
    }
  }
  return { reachable: !!ollamaReachable, model: OLLAMA_MODEL };
}

export async function scoreSentiment(text: string): Promise<SentimentResult | null> {
  const status = await getOllamaStatus();
  if (!status.reachable) return null;
  const t0 = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: PROMPT(text),
        stream: false,
        format: "json",
      }),
    });
    if (!r.ok) throw new Error(`Ollama HTTP ${r.status}`);
    const json = (await r.json()) as { response: string };
    const parsed = JSON.parse(json.response);
    return {
      score: clamp(Number(parsed.score) || 0, -1, 1),
      label: (["bearish", "neutral", "bullish"] as const).includes(parsed.label) ? parsed.label : "neutral",
      confidence: clamp(Number(parsed.confidence) || 0, 0, 1),
      latencyMs: Date.now() - t0,
    };
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "ollama sentiment failed");
    return null;
  } finally {
    clearTimeout(t);
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
