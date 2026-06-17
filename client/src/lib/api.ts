import type {
  MarketData,
  OrderBook,
  Candle,
  AuthResponse,
  User,
  UserPreferences,
  WSMessage,
  TradeSignal,
  MailMessage,
  MailFolder,
  AdminMailMessage,
  AdminMailContact,
  AdminMailTemplate,
  AdminMailCampaign,
  AdminMailStats,
  AdminMailFolder,
  AdminMailCategory,
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

interface BenchmarkSummary {
  totalTests: number;
  passed: number;
  averageScore: number;
  lastRun: string | null;
  results: { id: string; agentId: string; agentName: string; testCase: string; category: string; score: number; passed: boolean; details: string; timestamp: number }[];
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
    forgotPassword: (email: string) =>
      request<{ message: string; devToken: string | null; resetUrl: string | null }>(
        "/auth/forgot-password",
        { method: "POST", body: JSON.stringify({ email }) }
      ),
    resetPassword: (token: string, newPassword: string) =>
      request<{ message: string; email: string; userId: string }>(
        "/auth/reset-password",
        { method: "POST", body: JSON.stringify({ token, newPassword }) }
      ),
    validateResetToken: (token: string) =>
      request<{ valid: boolean; email?: string; expiresAt?: string; code?: string; message?: string }>(
        `/auth/reset-password/validate?token=${encodeURIComponent(token)}`
      ),
    updateProfile: (data: { email?: string; username?: string; walletAddress?: string | null }) =>
      request<{ message: string; user: User | null; token: string | null }>("/auth/profile", { method: "PUT", body: JSON.stringify(data) }),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<{ message: string }>("/auth/change-password", { method: "POST", body: JSON.stringify(data) }),
    getPreferences: () => request<{ preferences: UserPreferences }>("/auth/preferences"),
    updatePreferences: (data: UserPreferences) =>
      request<{ preferences: UserPreferences }>("/auth/preferences", { method: "PUT", body: JSON.stringify(data) }),
    getSession: () =>
      request<{ sessionId: string | null; userId: string; email: string; issuedAt: string | null; expiresAt: string | null; remainingMs: number; ip: string; userAgent: string; browser: string; os: string; device: string }>("/auth/session"),
    completeOnboarding: () =>
      request<{ preferences: UserPreferences & { onboardingCompleted?: boolean } }>("/auth/onboarding/complete", { method: "POST" }),
    exportData: () => request<{ exportedAt: string; user: any; consentLog: any[]; orders: any[]; positions: any[]; strategyRuns: any[]; kycSubmissions: any[]; backtests: any[]; auditLog: any[] }>("/auth/me/export"),
    deleteAccount: () => request<{ message: string }>("/auth/me", { method: "DELETE" }),
    getSession: () =>
      request<{ sessionId: string | null; userId: string; email: string; issuedAt: string | null; expiresAt: string | null; remainingMs: number; ip: string; userAgent: string; browser: string; os: string; device: string }>("/auth/session"),
  },
  agents: {
    signals: () => request<{ signals: TradeSignal[] }>("/agents/signals"),
    acknowledgeSignal: (id: string) =>
      request<{ message: string; signal: TradeSignal }>(`/agents/signals/${id}/acknowledge`, { method: "POST" }),
  },
  benchmark: {
    list: () => request<{ summaries: Record<string, BenchmarkSummary>; history: { date: string; score: number }[] }>("/benchmark"),
  },
  market: {
    quotes: () => request<MarketData[]>("/market/quotes"),
    quote: (symbol: string) => request<MarketData>(`/market/quotes/${symbol}`),
    orderbook: (symbol: string) => request<OrderBook>(`/market/orderbook/${symbol}`),
    history: (symbol: string, resolution = "1h", count = 100) =>
      request<Candle[]>(`/market/history/${symbol}?resolution=${resolution}&count=${count}`),
  },
  data: {
    status: () => request<{
      yahoo: { healthy: boolean; latencyMs: number; lastFetch: string | null; symbolCount: number; error?: string };
      eia: { healthy: boolean; configured: boolean; lastFetch: string | null; error?: string };
      newsapi: { healthy: boolean; configured: boolean; lastFetch: string | null; remaining: number | null; error?: string };
      gdelt: { healthy: boolean; lastFetch: string | null; error?: string };
      ollama: { reachable: boolean; model: string };
      lastRun: { quotes: string | null; eia: string | null; news: string | null; signals: string | null };
      ingestHealthy: boolean;
      eiaSeries: { id: string; name: string; unit: string }[];
      upgrade: { eia: string | null; newsapi: string | null; ollama: string | null };
    }>("/data/status"),
  },
  news: {
    list: (params: { limit?: number; ticker?: string; sentiment?: "bullish" | "bearish" | "neutral"; source?: "newsapi" | "gdelt" | "mock" } = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") qs.append(k, String(v)); });
      return request<{ articles: Array<{
        title: string;
        description: string | null;
        url: string;
        source: string;
        author: string | null;
        publishedAt: string;
        urlToImage: string | null;
        content: string | null;
        tickers: string[];
        sentiment?: "bullish" | "bearish" | "neutral";
        sentimentScore?: number;
      }>; total: number; source: string }>(`/news?${qs.toString()}`);
    },
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
  adminMail: {
    ping: () => request<{ ok: boolean; scope: string; time: string }>("/admin/mail/ping"),
    folders: () => request<{ folders: { id: AdminMailFolder; label: string; icon: string; count: number }[]; totalMessages: number; totalUnread: number }>("/admin/mail/folders"),
    messages: (params: { folder?: AdminMailFolder; category?: AdminMailCategory; search?: string; status?: string; priority?: string; starred?: boolean; limit?: number; offset?: number; includeSnoozed?: boolean } = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") qs.append(k, String(v)); });
      return request<{ messages: AdminMailMessage[]; total: number; limit: number; offset: number }>(`/admin/mail/messages?${qs.toString()}`);
    },
    snoozed: () => request<{ messages: AdminMailMessage[]; total: number }>("/admin/mail/messages/snoozed"),
    message: (id: string) => request<{ message: AdminMailMessage }>(`/admin/mail/messages/${id}`),
    thread: (threadId: string) => request<{ messages: AdminMailMessage[]; count: number }>(`/admin/mail/thread/${threadId}`),
    updateMessage: (id: string, patch: Partial<AdminMailMessage>) =>
      request<{ message: AdminMailMessage }>(`/admin/mail/messages/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
    deleteMessage: (id: string) =>
      request<{ message: string; id: string }>(`/admin/mail/messages/${id}`, { method: "DELETE" }),
    bulk: (data: {
      ids: string[];
      action: "markRead" | "markUnread" | "star" | "unstar" | "delete" | "move" | "categorize" | "tag" | "untag" | "snooze" | "unsnooze" | "setPriority";
      folder?: AdminMailFolder; category?: AdminMailCategory; tags?: string[]; priority?: AdminMailMessage["priority"]; snoozeMinutes?: number;
    }) => request<{ message: string; affected: number; updated: AdminMailMessage[] }>("/admin/mail/bulk", { method: "POST", body: JSON.stringify(data) }),
    markFolderRead: (folder: AdminMailFolder) =>
      request<{ message: string; count: number }>("/admin/mail/mark-folder-read", { method: "POST", body: JSON.stringify({ folder }) }),
    send: (data: {
      to: string[]; cc?: string[]; bcc?: string[]; subject: string; body: string;
      category?: AdminMailCategory; priority?: AdminMailMessage["priority"];
      templateId?: string; campaignId?: string; inReplyTo?: string; threadId?: string;
      attachments?: { name: string; size: number; type: string }[];
      scheduledAt?: string;
    }) => request<{ message: string; sent?: number; ids?: string[]; scheduledAt?: number; sample?: AdminMailMessage }>("/admin/mail/send", { method: "POST", body: JSON.stringify(data) }),
    purge: (filter: { folder?: AdminMailFolder; category?: AdminMailCategory; beforeDays?: number; status?: string; contactId?: string; campaignId?: string; all?: boolean }) =>
      request<{ message: string; purged: number; ids: string[] }>("/admin/mail/purge", { method: "POST", body: JSON.stringify(filter) }),
    mailMergePreview: (data: { contactIds: string[]; templateId?: string; subject?: string; body?: string }) =>
      request<{ previews: { contactId: string; name: string; email: string; subject: string; body: string; missingVariables: string[] }[]; total: number }>("/admin/mail/mail-merge/preview", { method: "POST", body: JSON.stringify(data) }),

    snippets: (params: { search?: string } = {}) => {
      const qs = params.search ? `?search=${encodeURIComponent(params.search)}` : "";
      return request<{ snippets: { id: string; name: string; subject?: string; body: string; tags?: string[]; createdAt: string; updatedAt: string }[]; total: number }>(`/admin/mail/snippets${qs}`);
    },
    createSnippet: (data: { name: string; subject?: string; body: string; tags?: string[] }) =>
      request<{ snippet: { id: string; name: string; subject?: string; body: string; tags?: string[]; createdAt: string; updatedAt: string } }>("/admin/mail/snippets", { method: "POST", body: JSON.stringify(data) }),
    updateSnippet: (id: string, data: { name?: string; subject?: string; body?: string; tags?: string[] }) =>
      request<{ snippet: { id: string; name: string; subject?: string; body: string; tags?: string[]; createdAt: string; updatedAt: string } }>(`/admin/mail/snippets/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteSnippet: (id: string) =>
      request<{ message: string; id: string }>(`/admin/mail/snippets/${id}`, { method: "DELETE" }),

    drafts: () => request<{ drafts: { id: string; to: string; subject: string; body: string; category: AdminMailCategory; updatedAt: string }[]; total: number }>("/admin/mail/drafts"),
    getDraft: (id: string) => request<{ draft: { id: string; to: string; subject: string; body: string; category: AdminMailCategory; updatedAt: string } }>(`/admin/mail/drafts/${id}`),
    saveDraft: (data: { id?: string; to: string; subject: string; body: string; category?: AdminMailCategory }) =>
      request<{ draft: { id: string; to: string; subject: string; body: string; category: AdminMailCategory; updatedAt: string } }>("/admin/mail/drafts", { method: "POST", body: JSON.stringify(data) }),
    deleteDraft: (id: string) =>
      request<{ message: string; id: string }>(`/admin/mail/drafts/${id}`, { method: "DELETE" }),

    contacts: (params: { search?: string; status?: string; source?: string; tag?: string } = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v) qs.append(k, String(v)); });
      return request<{ contacts: AdminMailContact[]; total: number }>(`/admin/mail/contacts?${qs.toString()}`);
    },
    createContact: (data: Partial<AdminMailContact>) =>
      request<{ contact: AdminMailContact }>("/admin/mail/contacts", { method: "POST", body: JSON.stringify(data) }),
    updateContact: (id: string, data: Partial<AdminMailContact>) =>
      request<{ contact: AdminMailContact }>(`/admin/mail/contacts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteContact: (id: string) =>
      request<{ message: string; id: string }>(`/admin/mail/contacts/${id}`, { method: "DELETE" }),
    importContacts: (data: { csv: string; defaultSource?: AdminMailContact["source"]; defaultStatus?: AdminMailContact["status"]; dryRun?: boolean }) =>
      request<{ message: string; imported: number; updated: number; skipped: number; errors: { row: number; reason: string }[]; dryRun: boolean }>("/admin/mail/contacts/import", { method: "POST", body: JSON.stringify(data) }),
    exportContactsUrl: () => `${API_BASE}/api/admin/mail/contacts/export.csv`,

    templates: (params: { category?: AdminMailCategory } = {}) => {
      const qs = params.category ? `?category=${params.category}` : "";
      return request<{ templates: AdminMailTemplate[]; total: number }>(`/admin/mail/templates${qs}`);
    },
    createTemplate: (data: Partial<AdminMailTemplate>) =>
      request<{ template: AdminMailTemplate }>("/admin/mail/templates", { method: "POST", body: JSON.stringify(data) }),
    updateTemplate: (id: string, data: Partial<AdminMailTemplate>) =>
      request<{ template: AdminMailTemplate }>(`/admin/mail/templates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteTemplate: (id: string) =>
      request<{ message: string; id: string }>(`/admin/mail/templates/${id}`, { method: "DELETE" }),
    renderTemplate: (id: string, vars: Record<string, string>) =>
      request<{ subject: string; body: string; missingVariables: string[] }>(`/admin/mail/templates/${id}/render`, { method: "POST", body: JSON.stringify(vars) }),

    campaigns: (params: { status?: string } = {}) => {
      const qs = params.status ? `?status=${params.status}` : "";
      return request<{ campaigns: AdminMailCampaign[]; total: number }>(`/admin/mail/campaigns${qs}`);
    },
    createCampaign: (data: Partial<AdminMailCampaign>) =>
      request<{ campaign: AdminMailCampaign }>("/admin/mail/campaigns", { method: "POST", body: JSON.stringify(data) }),
    updateCampaign: (id: string, data: Partial<AdminMailCampaign>) =>
      request<{ campaign: AdminMailCampaign }>(`/admin/mail/campaigns/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    sendCampaign: (id: string) =>
      request<{ campaign: AdminMailCampaign; sent: number }>(`/admin/mail/campaigns/${id}/send`, { method: "POST" }),
    deleteCampaign: (id: string) =>
      request<{ message: string; id: string }>(`/admin/mail/campaigns/${id}`, { method: "DELETE" }),

    stats: () => request<AdminMailStats>("/admin/mail/stats"),

    trackOpen: (id: string) => request<{ ok: boolean }>(`/admin/mail/messages/${id}/open`, { method: "POST" }),
    trackClick: (id: string) => request<{ ok: boolean }>(`/admin/mail/messages/${id}/click`, { method: "POST" }),
    trackingPixelUrl: (id: string) => `${API_BASE}/api/admin/mail/track/open/${id}.png`,
    trackingClickUrl: (id: string) => `${API_BASE}/api/admin/mail/track/click/${id}`,

    savedSearches: () => request<{ savedSearches: { id: string; name: string; params: Record<string, string>; createdAt: string }[]; total: number }>("/admin/mail/saved-searches"),
    createSavedSearch: (data: { name: string; params: Record<string, string> }) =>
      request<{ savedSearch: { id: string; name: string; params: Record<string, string>; createdAt: string } }>("/admin/mail/saved-searches", { method: "POST", body: JSON.stringify(data) }),
    deleteSavedSearch: (id: string) =>
      request<{ message: string; id: string }>(`/admin/mail/saved-searches/${id}`, { method: "DELETE" }),
  },
  adminUsers: {
    list: (params: { search?: string; tier?: string; status?: string; role?: string } = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v) qs.append(k, String(v)); });
      return request<{ users: Array<{ id: string; email: string; username: string; tier: string; role: string; status: string; createdAt: string; lastLoginAt: string | null; emailVerified: boolean; walletAddress?: string }>; total: number }>(`/admin/users?${qs.toString()}`);
    },
    create: (data: { email: string; username: string; password: string; tier?: string; role?: string }) =>
      request<{ user: { id: string; email: string; username: string; tier: string; role: string; status: string; createdAt: string }; temporaryPassword: string }>("/admin/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { username?: string; tier?: string; role?: string; status?: string; email?: string; walletAddress?: string }) =>
      request<{ user: { id: string; email: string; username: string; tier: string; role: string; status: string; createdAt: string } }>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    resetPassword: (id: string, data: { newPassword?: string; generateTemp?: boolean } = {}) =>
      request<{ message: string; userId: string; email: string; temporaryPassword: string; generatedTemp: boolean }>(`/admin/users/${id}/reset-password`, { method: "POST", body: JSON.stringify(data) }),
    suspend: (id: string) => request<{ message: string; user: unknown }>(`/admin/users/${id}/suspend`, { method: "POST" }),
    activate: (id: string) => request<{ message: string; user: unknown }>(`/admin/users/${id}/activate`, { method: "POST" }),
    delete: (id: string) => request<{ message: string; id: string }>(`/admin/users/${id}`, { method: "DELETE" }),
    stats: () => request<{ total: number; active: number; suspended: number; pending: number; admins: number; byTier: Record<string, number> }>("/admin/users/stats"),
  },
  trading: {
    submitOrder: (data: { symbol: string; side: "buy" | "sell"; type: "market" | "limit" | "stop"; quantity: number; limitPrice?: number; stopPrice?: number; strategyId?: string }) =>
      request<{ order: { id: string; userId: string; strategyId: string | null; symbol: string; side: string; type: string; quantity: string; limitPrice: string | null; stopPrice: string | null; status: string; filledQty: string; avgFillPrice: string | null; rejectionReason: string | null; createdAt: string; filledAt: string | null; cancelledAt: string | null } }>("/trading/orders", { method: "POST", body: JSON.stringify(data) }),
    listOrders: (params: { status?: string; symbol?: string; limit?: number; offset?: number } = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") qs.append(k, String(v)); });
      return request<{ orders: Array<{ id: string; symbol: string; side: string; type: string; quantity: string; limitPrice: string | null; stopPrice: string | null; status: string; filledQty: string; avgFillPrice: string | null; createdAt: string; filledAt: string | null }>; total: number }>(`/trading/orders?${qs.toString()}`);
    },
    cancelOrder: (id: string) => request<{ ok: boolean }>(`/trading/orders/${id}`, { method: "DELETE" }),
    getPositions: () => request<{ positions: Array<{ id: string; symbol: string; quantity: string; avgEntryPrice: string; realizedPnl: string; updatedAt: string }> }>("/trading/positions"),
    getPnl: () => request<{ paperBalance: number; equity: number; unrealizedPnl: number; realizedPnl: number; positions: number; totalTradeCount: number }>("/trading/pnl"),
    setMode: (mode: "paper" | "live") =>
      request<{ ok: boolean; message: string }>("/trading/mode", { method: "POST", body: JSON.stringify({ mode }) }),
  },
  backtest: {
    run: (data: { strategy: string; symbol: string; startDate: string; endDate: string; initialBalance: number; params?: any }) =>
      request<{ jobId: string; status: string }>("/backtest/run", { method: "POST", body: JSON.stringify(data) }),
    getJob: (jobId: string) => request<{ state: string; progress: number; result?: any; error?: string }>(`/backtest/job/${jobId}`),
    get: (id: string) => request<any>(`/backtest/${id}`),
    list: (limit = 20) => request<{ backtests: any[] }>(`/backtest?limit=${limit}`),
  },
  tournaments: {
    list: () => request<{ tournaments: any[] }>("/tournaments"),
    get: (id: string) => request<{ tournament: any; leaderboard: any[] }>(`/tournaments/${id}`),
    join: (id: string) => request<{ id: string; message: string }>(`/tournaments/${id}/join`, { method: "POST" }),
    leave: (id: string) => request<{ message: string }>(`/tournaments/${id}/leave`, { method: "DELETE" }),
  },
  strategies: {
    listCustom: () => request<{ strategies: any[] }>("/strategies/custom"),
    createCustom: (data: any) => request<{ id: string }>("/strategies/custom", { method: "POST", body: JSON.stringify(data) }),
    updateCustom: (id: string, data: any) => request<{ message: string }>(`/strategies/custom/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteCustom: (id: string) => request<{ message: string }>(`/strategies/custom/${id}`, { method: "DELETE" }),
    listMarketplace: (params: { search?: string; symbol?: string } = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v) qs.append(k, String(v)); });
      return request<{ strategies: any[] }>(`/strategies/marketplace?${qs}`);
    },
    publish: (id: string) => request<{ message: string }>(`/strategies/custom/${id}/publish`, { method: "POST" }),
    unpublish: (id: string) => request<{ message: string }>(`/strategies/custom/${id}/unpublish`, { method: "POST" }),
    clone: (id: string, name?: string) => request<{ id: string; message: string }>(`/strategies/custom/${id}/clone`, { method: "POST", body: JSON.stringify({ name }) }),
    rate: (id: string, rating: number) => request<{ message: string }>(`/strategies/custom/${id}/rate`, { method: "POST", body: JSON.stringify({ rating }) }),
  },
  leaderboard: {
    list: () => request<{ leaderboard: Array<{ rank: number; userId: string; username: string; tier: string; totalPnl: number; totalTrades: number; totalPositions: number; exposure: number }> }>("/leaderboard"),
    me: () => request<{ rank: number; totalUsers: number; totalPnl: number; totalTrades: number; totalPositions: number; exposure: number }>("/leaderboard/me"),
  },
  kyc: {
    submit: (data: any) => request<{ message: string; status: string; id: string }>("/kyc/submit", { method: "POST", body: JSON.stringify(data) }),
    status: () => request<{ submitted: boolean; status?: string; legalName?: string; country?: string; submittedAt?: string; reviewedAt?: string }>("/kyc/status"),
    createInquiry: () => request<{ id: string; providerRef: string; url: string; status: string }>("/kyc/inquiry", { method: "POST" }),
  },
  notifications: {
    list: (limit = 50) => request<{ notifications: Array<{ id: string; kind: string; title: string; body: string; meta: any; read: boolean; createdAt: string }> }>(`/notifications?limit=${limit}`),
    unreadCount: () => request<{ count: number }>("/notifications/unread-count"),
    markRead: (id: string) => request<{ ok: boolean }>(`/notifications/${id}/read`, { method: "POST" }),
    markAllRead: () => request<{ ok: boolean }>("/notifications/read-all", { method: "POST" }),
    delete: (id: string) => request<{ ok: boolean }>(`/notifications/${id}`, { method: "DELETE" }),
  },
  storage: {
    status: () => request<{ configured: boolean; buckets: string[] }>("/storage/status"),
    documents: () => request<{ objects: Array<{ key: string; size: number; lastModified: string }>; configured: boolean }>("/storage/kyc/list"),
  },
  ai: {
    chat: (data: { messages: Array<{ role: "user" | "assistant" | "system"; content: string }> }) =>
      request<{ content: string; provider: string; cached: boolean; latencyMs: number }>("/ai/chat", { method: "POST", body: JSON.stringify(data) }),
    strategy: (data: { symbol: string; horizonDays?: number; riskTolerance?: "low" | "medium" | "high" }) =>
      request<{ symbol: string; recommendation: string; provider: string }>("/ai/strategy", { method: "POST", body: JSON.stringify(data) }),
    explain: (data: any) => request<{ explanation: string; provider: string }>("/ai/explain", { method: "POST", body: JSON.stringify(data) }),
    status: () => request<{ provider: string; model: string; openai: boolean; ollama: boolean }>("/ai/status"),
  },
};

export function createWebSocket(): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${API_BASE.replace(/^http/, "ws") || `${protocol}//${window.location.host}`}/ws`;
  return new WebSocket(wsUrl);
}
