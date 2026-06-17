/*
 * Notification center — in-app notification history.
 */
import { useState, useEffect } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, Loader2, X, BellOff, ShoppingCart, Shield, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatDistanceToNow } from "@/lib/dateUtils";

interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string;
  meta: any;
  read: boolean;
  createdAt: string;
}

const KIND_ICONS: Record<string, any> = {
  trade_fill: ShoppingCart,
  kyc_status: Shield,
  signal_alert: TrendingUp,
  security_alert: AlertTriangle,
  system: Info,
};
const KIND_COLORS: Record<string, string> = {
  trade_fill: "text-emerald-400 bg-emerald-500/10",
  kyc_status: "text-blue-400 bg-blue-500/10",
  signal_alert: "text-amber-400 bg-amber-500/10",
  security_alert: "text-red-400 bg-red-500/10",
  system: "text-foreground bg-accent",
};

export default function Notifications() {
  usePageTitle("Notifications");
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  async function load() {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        api.notifications.list(100),
        api.notifications.unreadCount(),
      ]);
      setItems(r1.notifications || []);
      setUnread(r2.count || 0);
    } catch (err) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function markRead(id: string) {
    try {
      await api.notifications.markRead(id);
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (err) {
      toast.error("Failed to mark as read");
    }
  }

  async function markAllRead() {
    try {
      await api.notifications.markAllRead();
      setItems(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
      toast.success("All marked as read");
    } catch (err) {
      toast.error("Failed to mark all read");
    }
  }

  async function deleteOne(id: string) {
    try {
      await api.notifications.delete(id);
      setItems(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      toast.error("Failed to delete");
    }
  }

  const filtered = filter === "unread" ? items.filter(n => !n.read) : items;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary" /> Notifications
            {unread > 0 && <span className="text-sm px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono">{unread}</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Trade fills, KYC status, security alerts, and system notifications.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-card border border-border rounded-lg p-0.5 text-xs">
            <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded ${filter === "all" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}>All</button>
            <button onClick={() => setFilter("unread")} className={`px-3 py-1.5 rounded ${filter === "unread" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}>Unread ({unread})</button>
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs hover:border-primary/50 flex items-center gap-1.5">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          {filter === "unread" ? <BellOff className="w-12 h-12 text-muted-foreground mx-auto mb-3" /> : <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />}
          <h3 className="text-lg font-display font-semibold mb-1">{filter === "unread" ? "All caught up" : "No notifications yet"}</h3>
          <p className="text-sm text-muted-foreground">
            {filter === "unread" ? "You've read all your notifications." : "Trade fills, KYC updates, and alerts will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map((n) => {
              const Icon = KIND_ICONS[n.kind] || Info;
              const colorClass = KIND_COLORS[n.kind] || KIND_COLORS.system;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className={`glass-card rounded-xl p-4 flex gap-3 ${!n.read ? "border-l-2 border-l-primary" : "opacity-70"}`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-display font-semibold text-sm">{n.title}</div>
                      <div className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(n.createdAt))}</div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{n.body}</div>
                    <div className="flex items-center gap-2 mt-2">
                      {!n.read && (
                        <button onClick={() => markRead(n.id)} className="text-xs text-primary hover:underline flex items-center gap-1">
                          <Check className="w-3 h-3" /> Mark read
                        </button>
                      )}
                      <button onClick={() => deleteOne(n.id)} className="text-xs text-muted-foreground hover:text-red-400 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
