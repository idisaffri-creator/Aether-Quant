/**
 * Paper Trading page.
 *
 * - P&L card (paper balance, equity, unrealized, realized)
 * - Order form (symbol, side, type, qty, price)
 * - Open positions table
 * - Recent orders
 *
 * Connects to /ws for real-time order_filled + position_update events.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { useAtom } from "jotai";
import { userAtom, tokenAtom } from "@/store/auth";
import { api, setAuthToken } from "@/lib/api";
import {
  TrendingUp, TrendingDown, Wallet, Activity, RefreshCw, X, Send,
  CheckCircle2, AlertCircle, Loader2, Wifi, WifiOff, Download,
} from "lucide-react";
import { toast } from "sonner";
import CandleChart from "@/components/CandleChart";

interface Position {
  id: string;
  symbol: string;
  quantity: string;
  avgEntryPrice: string;
  realizedPnl: string;
  updatedAt: string;
}
interface Order {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop";
  quantity: string;
  limitPrice: string | null;
  stopPrice: string | null;
  status: string;
  filledQty: string;
  avgFillPrice: string | null;
  createdAt: string;
  filledAt: string | null;
}
interface Pnl {
  paperBalance: number;
  equity: number;
  unrealizedPnl: number;
  realizedPnl: number;
  positions: number;
  totalTradeCount: number;
}

const SYMBOLS = ["WTI", "BRENT", "NGAS", "GOLD", "SILVER", "COPPER", "HEATOIL", "GASOL"] as const;

export default function Trading() {
  usePageTitle("Paper Trading");
  const [user] = useAtom(userAtom);
  const [token, setToken] = useAtom(tokenAtom);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pnl, setPnl] = useState<Pnl | null>(null);
  const [quotes, setQuotes] = useState<Record<string, { price: number; change24h: number }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [orderForm, setOrderForm] = useState({
    symbol: "WTI",
    side: "buy" as "buy" | "sell",
    type: "market" as "market" | "limit" | "stop",
    quantity: 1,
    limitPrice: 0,
    stopPrice: 0,
  });
  const wsRef = useRef<WebSocket | null>(null);

  const refreshAll = useCallback(async () => {
    if (!token) return;
    try {
      const [posRes, ordRes, pnlRes, quoteRes] = await Promise.all([
        api.trading.getPositions(),
        api.trading.listOrders({ limit: 20 }),
        api.trading.getPnl(),
        api.market.quotes(),
      ]);
      setPositions(posRes.positions as any);
      setOrders(ordRes.orders as any);
      setPnl(pnlRes);
      const map: Record<string, { price: number; change24h: number }> = {};
      for (const q of quoteRes as any[]) map[q.symbol] = { price: q.price, change24h: q.change24h };
      setQuotes(map);
    } catch (err: any) {
      console.error("refresh failed", err);
    }
  }, [token]);

  // Initial load + auto-refresh every 15s
  useEffect(() => {
    refreshAll();
    const t = setInterval(refreshAll, 15_000);
    return () => clearInterval(t);
  }, [refreshAll]);

  // WebSocket for real-time fills + position updates
  useEffect(() => {
    if (!token) return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "order_filled" || msg.type === "position_update") {
          refreshAll();
        }
      } catch { /* ignore */ }
    };
    return () => ws.close();
  }, [token, refreshAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const data: any = {
        symbol: orderForm.symbol,
        side: orderForm.side,
        type: orderForm.type,
        quantity: orderForm.quantity,
      };
      if (orderForm.type === "limit" && orderForm.limitPrice > 0) data.limitPrice = orderForm.limitPrice;
      if (orderForm.type === "stop" && orderForm.stopPrice > 0) data.stopPrice = orderForm.stopPrice;
      const res = await api.trading.submitOrder(data);
      toast.success(`${res.order.side.toUpperCase()} ${res.order.quantity} ${res.order.symbol} @ ${res.order.avgFillPrice || "limit"}`);
      refreshAll();
    } catch (err: any) {
      toast.error(err?.message || "Order failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    try {
      await api.trading.cancelOrder(orderId);
      toast.success("Order cancelled");
      refreshAll();
    } catch (err: any) {
      toast.error(err?.message || "Cancel failed");
    }
  };

  if (!user) return <div className="p-8 text-center text-muted-foreground">Please log in to access paper trading.</div>;

  const equityClass = (pnl?.equity ?? 0) >= (pnl?.paperBalance ?? 0) ? "text-emerald-400" : "text-red-400";
  const unrealizedClass = (pnl?.unrealizedPnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400";
  const realizedClass = (pnl?.realizedPnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400";

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Paper Trading</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Simulated trading with $100,000 demo balance · Slippage 0.05% · {pnl?.totalTradeCount ?? 0} trades
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://aether-energy.ai/api/trading/orders/export.csv"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground"
            title="Export orders CSV"
          >
            <Download className="w-4 h-4" />
          </a>
          <span className={`flex items-center gap-1.5 text-xs ${wsConnected ? "text-emerald-400" : "text-muted-foreground"}`}>
            {wsConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {wsConnected ? "Live" : "Polling"}
          </span>
          <button onClick={refreshAll} className="p-2 rounded-lg hover:bg-accent/50" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* P&L cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PnlCard label="Paper Balance" value={`$${pnl?.paperBalance.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "—"}`} icon={<Wallet className="w-4 h-4" />} />
        <PnlCard label="Equity" value={`$${pnl?.equity.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "—"}`} className={equityClass} icon={<Activity className="w-4 h-4" />} />
        <PnlCard label="Unrealized" value={`${pnl && pnl.unrealizedPnl >= 0 ? "+" : ""}$${pnl?.unrealizedPnl.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "—"}`} className={unrealizedClass} icon={pnl && pnl.unrealizedPnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />} />
        <PnlCard label="Realized" value={`${pnl && pnl.realizedPnl >= 0 ? "+" : ""}$${pnl?.realizedPnl.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "—"}`} className={realizedClass} icon={<CheckCircle2 className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 glass-card rounded-xl p-5">
          <CandleChart symbol={orderForm.symbol} resolution="1h" height={280} onRefresh={refreshAll} />
        </div>

        {/* Order form */}
        <div className="glass-card rounded-xl p-5 lg:col-span-1 space-y-4">
          <h2 className="text-sm font-semibold">Submit Order</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Symbol</label>
              <select value={orderForm.symbol} onChange={(e) => setOrderForm({ ...orderForm, symbol: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50">
                {SYMBOLS.map((s) => <option key={s} value={s}>{s} {quotes[s] ? `($${quotes[s].price.toFixed(2)})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Side</label>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setOrderForm({ ...orderForm, side: "buy" })}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${orderForm.side === "buy" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" : "bg-accent/30 text-muted-foreground border border-transparent hover:bg-accent/50"}`}>
                  Buy / Long
                </button>
                <button type="button" onClick={() => setOrderForm({ ...orderForm, side: "sell" })}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${orderForm.side === "sell" ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-accent/30 text-muted-foreground border border-transparent hover:bg-accent/50"}`}>
                  Sell / Short
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</label>
              <select value={orderForm.type} onChange={(e) => setOrderForm({ ...orderForm, type: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50">
                <option value="market">Market (fill now)</option>
                <option value="limit">Limit (fill at price)</option>
                <option value="stop">Stop (fill if triggered)</option>
              </select>
            </div>
            {orderForm.type === "limit" && (
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Limit Price</label>
                <input type="number" step="0.01" min="0" value={orderForm.limitPrice} onChange={(e) => setOrderForm({ ...orderForm, limitPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50" />
              </div>
            )}
            {orderForm.type === "stop" && (
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Stop Price</label>
                <input type="number" step="0.01" min="0" value={orderForm.stopPrice} onChange={(e) => setOrderForm({ ...orderForm, stopPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50" />
              </div>
            )}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Quantity</label>
              <input type="number" step="0.1" min="0.1" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: parseFloat(e.target.value) || 1 })}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50" />
            </div>
            <button type="submit" disabled={submitting} className="btn-amber w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "Submitting..." : `Submit ${orderForm.side.toUpperCase()}`}
            </button>
          </form>
        </div>

        {/* Positions + Orders */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3">Open Positions ({positions.length})</h2>
            {positions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No open positions. Submit an order to start.</p>
            ) : (
              <div className="space-y-2">
                {positions.map((p) => {
                  const qty = parseFloat(p.quantity);
                  const entry = parseFloat(p.avgEntryPrice);
                  const mark = quotes[p.symbol]?.price || entry;
                  const unreal = qty * (mark - entry);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{p.symbol}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase ${qty >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                            {qty >= 0 ? "long" : "short"} {Math.abs(qty).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Entry ${entry.toFixed(2)} · Mark ${mark.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-mono ${unreal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {unreal >= 0 ? "+" : ""}${unreal.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">realized ${parseFloat(p.realizedPnl).toFixed(2)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-card rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3">Recent Orders</h2>
            {orders.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No orders yet.</p>
            ) : (
              <div className="space-y-1">
                {orders.slice(0, 15).map((o) => (
                  <div key={o.id} className="flex items-center justify-between p-2.5 rounded-lg bg-accent/20 hover:bg-accent/40 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${o.side === "buy" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{o.side}</span>
                      <span className="font-medium">{o.symbol}</span>
                      <span className="text-muted-foreground">{parseFloat(o.quantity).toFixed(2)} @ {o.avgFillPrice ? `$${parseFloat(o.avgFillPrice).toFixed(2)}` : `${o.type} ${o.limitPrice ? `$${parseFloat(o.limitPrice).toFixed(2)}` : o.stopPrice ? `stop $${parseFloat(o.stopPrice).toFixed(2)}` : ""}`}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                        o.status === "filled" ? "bg-emerald-500/20 text-emerald-400" :
                        o.status === "pending" ? "bg-amber/20 text-amber" :
                        o.status === "cancelled" ? "bg-white/10 text-muted-foreground" :
                        "bg-red-500/20 text-red-400"
                      }`}>{o.status}</span>
                      {o.status === "pending" && (
                        <button onClick={() => handleCancel(o.id)} className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400" title="Cancel">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PnlCard({ label, value, icon, className = "" }: { label: string; value: string; icon: React.ReactNode; className?: string }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-wider">
        {icon} {label}
      </div>
      <div className={`text-lg font-mono font-bold mt-1 ${className}`}>{value}</div>
    </div>
  );
}
