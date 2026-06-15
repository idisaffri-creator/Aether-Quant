import type {
  MarketData,
  OrderBook,
  Candle,
  AuthResponse,
  User,
  WSMessage,
  TradeSignal,
  MailMessage,
  MailFolder,
} from "@shared/types";

interface AnalysisRsiResult { value: number; signal: string }
interface AnalysisMacdResult { macd: number; signal: number; histogram: number; cross: string }
interface AnalysisFullResult {
  symbol: string; timestamp: number;
  sma: { period: number; value: number }[];
  ema: { period: number; value: number }[];
  rsi: AnalysisRsiResult;
  macd: AnalysisMacdResult;
  bollinger: { upper: number; middle: number; lower: number; width: number; squeeze: boolean };
  atr: number;
  stochastic: { k: number; d: number; signal: string };
  obv: number;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

let token: string | null = localStorage.getItem("aether_token");

export function setAuthToken(newToken: string | null) {
  token = newToken;
  if (newToken) {
    localStorage.setItem("aether_token", newToken);
  } else {
    localStorage.removeItem("aether_token");
  }
}

export function getAuthToken(): string | null {
  return token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    register: (data: { email: string; username: string; password: string }) =>
      request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    me: () => request<User>("/auth/me"),
  },
  agents: {
    signals: () => request<{ signals: TradeSignal[] }>("/agents/signals"),
    acknowledgeSignal: (id: string) =>
      request<{ message: string; signal: TradeSignal }>(`/agents/signals/${id}/acknowledge`, { method: "POST" }),
  },
  market: {
    quotes: () => request<MarketData[]>("/market/quotes"),
    quote: (symbol: string) => request<MarketData>(`/market/quotes/${symbol}`),
    orderbook: (symbol: string) => request<OrderBook>(`/market/orderbook/${symbol}`),
    history: (symbol: string, resolution = "1h", count = 100) =>
      request<Candle[]>(`/market/history/${symbol}?resolution=${resolution}&count=${count}`),
  },
  analysis: {
    full: (symbol: string, resolution = "1h", count = 100) =>
      request<AnalysisFullResult>(`/analysis/${symbol}?resolution=${resolution}&count=${count}`),
    rsi: (symbol: string, resolution = "1h", count = 100) =>
      request<AnalysisRsiResult>(`/analysis/${symbol}/rsi?resolution=${resolution}&count=${count}`),
    macd: (symbol: string, resolution = "1h", count = 100) =>
      request<AnalysisMacdResult>(`/analysis/${symbol}/macd?resolution=${resolution}&count=${count}`),
  },
  mail: {
    folders: () => request<{ folders: MailFolder[] }>("/mail/folders"),
    list: (folder: string) => request<{ emails: MailMessage[] }>(`/mail/list/${folder}`),
    get: (id: string) => request<{ email: MailMessage }>(`/mail/${id}`),
    markRead: (id: string) => request<{ email: MailMessage }>(`/mail/${id}/read`, { method: "PUT" }),
    send: (data: { to: string; subject: string; body: string }) =>
      request<{ message: string; id: string }>("/mail/send", { method: "POST", body: JSON.stringify(data) }),
  },
};

export function createWebSocket(): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${API_BASE.replace(/^http/, "ws") || `${protocol}//${window.location.host}`}/ws`;
  return new WebSocket(wsUrl);
}
