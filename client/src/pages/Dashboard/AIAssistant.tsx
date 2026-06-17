/*
 * AI Assistant — chat with Aether about strategies, markets, risk.
 * Multi-provider: OpenAI (gpt-4o-mini) → Ollama (llama3.1:8b) → mock.
 */
import { useState, useEffect, useRef } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Loader2, Bot, User, Trash2, Settings, Zap, TrendingUp, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { useAtom } from "jotai";
import { tokenAtom } from "@/store/auth";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
  provider?: string;
}

const STORAGE_KEY = "aether-ai-history";

const QUICK_PROMPTS = [
  { icon: <TrendingUp className="w-4 h-4" />, text: "What's a good mean reversion strategy for WTI?" },
  { icon: <Shield className="w-4 h-4" />, text: "How should I size positions in a volatile market?" },
  { icon: <Zap className="w-4 h-4" />, text: "Explain the Sharpe ratio of my last backtest" },
  { icon: <Sparkles className="w-4 h-4" />, text: "Recommend a low-risk strategy for NGAS over 30 days" },
];

const SYMBOLS = [
  { value: "WTI", label: "WTI Crude" },
  { value: "BRENT", label: "Brent Crude" },
  { value: "NGAS", label: "Natural Gas" },
  { value: "GOLD", label: "Gold" },
  { value: "SILVER", label: "Silver" },
  { value: "COPPER", label: "Copper" },
  { value: "HEATOIL", label: "Heating Oil" },
  { value: "GASOL", label: "Gasoline" },
];

export default function AIAssistant() {
  usePageTitle("AI Assistant");
  const [token] = useAtom(tokenAtom);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<string>("mock");
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("WTI");
  const [horizonDays, setHorizonDays] = useState(30);
  const [riskTolerance, setRiskTolerance] = useState<"low" | "medium" | "high">("medium");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) {
      api.ai.status().then((r) => setProvider(r.provider)).catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50))); } catch {}
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: msg, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const r = await api.ai.chat({
        messages: [...messages, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content })),
      });
      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: r.content,
        ts: Date.now(),
        provider: r.provider,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      toast.error(err?.message || "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  async function getStrategyRecommendation() {
    setLoading(true);
    try {
      const r = await api.ai.strategy({
        symbol: selectedSymbol,
        horizonDays,
        riskTolerance,
      });
      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: r.recommendation,
        ts: Date.now(),
        provider: r.provider,
      };
      const userQuery = `Strategy recommendation for ${selectedSymbol} (${horizonDays}d, ${riskTolerance} risk)`;
      setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", content: userQuery, ts: Date.now() }, aiMsg]);
      setShowStrategyModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Strategy recommendation failed");
    } finally {
      setLoading(false);
    }
  }

  function clearHistory() {
    if (confirm("Clear all chat history?")) {
      setMessages([]);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" /> AI Assistant
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Chat with Aether about strategies, markets, and risk. Powered by <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-accent/50">{provider}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowStrategyModal(true)} className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs hover:border-primary/50 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Get strategy
          </button>
          {messages.length > 0 && (
            <button onClick={clearHistory} className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs hover:border-red-500/50 text-muted-foreground hover:text-red-400 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 glass-card rounded-xl overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <Bot className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-display font-semibold mb-1">Ask Aether anything</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Get strategy recommendations, risk advice, and market insights. Powered by AI with caching for fast responses.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
                {QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(p.text)}
                    className="text-left p-3 bg-card/50 hover:bg-accent/30 border border-border rounded-lg text-sm transition-colors flex items-start gap-2"
                  >
                    <span className="text-primary mt-0.5">{p.icon}</span>
                    <span className="text-muted-foreground">{p.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
              >
                {m.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                  <div className={`text-[10px] mt-1 ${m.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(m.ts).toLocaleTimeString()} {m.provider && m.role === "assistant" && ` · ${m.provider}`}
                  </div>
                </div>
                {m.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border bg-background/30">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about strategies, risk, markets…"
              className="flex-1 bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={loading || !token}
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !token}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      <AnimatePresence>
        {showStrategyModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowStrategyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card rounded-2xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-display font-bold">Get strategy recommendation</h2>
                  <p className="text-sm text-muted-foreground">AI will recommend a strategy based on symbol, horizon, and risk tolerance.</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Symbol</label>
                  <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm">
                    {SYMBOLS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Horizon (days)</label>
                  <input type="number" value={horizonDays} onChange={e => setHorizonDays(Number(e.target.value))} min={1} max={365} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Risk tolerance</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["low", "medium", "high"] as const).map(r => (
                      <button key={r} onClick={() => setRiskTolerance(r)} className={`px-3 py-2 rounded-lg text-xs font-medium capitalize ${riskTolerance === r ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:border-primary/50"}`}>{r}</button>
                    ))}
                  </div>
                </div>
                <button onClick={getStrategyRecommendation} disabled={loading} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Get recommendation
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
