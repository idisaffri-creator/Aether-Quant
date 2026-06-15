import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, TrendingUp, Zap, AlertTriangle, Info, Activity } from "lucide-react";
import { useNotificationContext, type Notification } from "@/contexts/NotificationContext";

const typeIcons: Record<string, typeof TrendingUp> = {
  trade: TrendingUp,
  signal: Zap,
  alert: AlertTriangle,
  system: Info,
  position: Activity,
};

function typeColor(type: string): string {
  switch (type) {
    case "trade": return "text-green-500";
    case "signal": return "text-amber";
    case "alert": return "text-red-500";
    case "system": return "text-steel";
    case "position": return "text-blue-500";
    default: return "text-muted-foreground";
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, refresh } = useNotificationContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber text-[9px] font-bold text-black flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 glass-card rounded-xl border border-border shadow-2xl z-50 max-h-[70vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Bell className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">No notifications</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((n: Notification) => {
                const Icon = typeIcons[n.type] || Info;
                return (
                  <button
                    key={n.id}
                    onClick={() => { markRead(n.id); }}
                    className={`w-full text-left px-4 py-3 transition-all hover:bg-accent/30 flex items-start gap-3 ${
                      !n.read ? "bg-accent/10 border-l-2 border-l-amber" : ""
                    }`}
                  >
                    <div className={`mt-0.5 ${typeColor(n.type)}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${!n.read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono ml-auto shrink-0">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{n.message}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
