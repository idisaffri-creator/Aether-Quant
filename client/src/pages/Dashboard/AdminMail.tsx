import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { useLocation } from "wouter";
import { useAtomValue } from "jotai";
import { userAtom } from "@/store/auth";
import { api } from "@/lib/api";
import type {
  AdminMailMessage,
  AdminMailContact,
  AdminMailTemplate,
  AdminMailCampaign,
  AdminMailFolder,
  AdminMailCategory,
  AdminMailStats,
} from "@shared/types";
import {
  Inbox, Send, Search, RefreshCw, Star, Paperclip, Archive, Trash2, Reply,
  ChevronLeft, Plus, Filter, Users, FileText, BarChart3, Mail, Pencil,
  Megaphone, Settings2, Sparkles, X, Check, AlertTriangle, ChevronRight,
  ShieldCheck, Key, UserPlus, Power, PowerOff, Database, Eye, EyeOff,
  RotateCw, ListChecks, Globe2, Tag, Briefcase, ZapOff, HelpCircle,
  Clock, Keyboard,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AdminTab = "inbox" | "compose" | "campaigns" | "templates" | "contacts" | "users" | "stats";

type BulkAction = "markRead" | "markUnread" | "star" | "unstar" | "delete" | "snooze" | "unsnooze" | "setPriority";
type BulkActionExtra = { folder?: AdminMailFolder; priority?: AdminMailMessage["priority"]; snoozeMinutes?: number };
type BulkActionFn = (action: BulkAction, extra?: BulkActionExtra) => void;
type ReplyDialogProps = { source: AdminMailMessage; onSent: () => void };

const CATEGORY_META: Record<AdminMailCategory, { label: string; color: string; icon: typeof Mail }> = {
  lead: { label: "Lead", color: "text-amber bg-amber/10 border-amber/20", icon: Sparkles },
  marketing: { label: "Marketing", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: Megaphone },
  support: { label: "Support", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: ShieldCheck },
  blast: { label: "Blast", color: "text-purple-400 bg-purple-500/10 border-purple-500/20", icon: Globe2 },
  system: { label: "System", color: "text-muted-foreground bg-accent border-border", icon: Settings2 },
  general: { label: "General", color: "text-foreground bg-accent border-border", icon: Mail },
  sales: { label: "Sales", color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20", icon: Briefcase },
  partnership: { label: "Partnership", color: "text-pink-400 bg-pink-500/10 border-pink-500/20", icon: Users },
};

const PRIORITY_META: Record<AdminMailMessage["priority"], { label: string; color: string }> = {
  low: { label: "Low", color: "text-muted-foreground bg-accent" },
  normal: { label: "Normal", color: "text-foreground bg-accent/50" },
  high: { label: "High", color: "text-amber bg-amber/10" },
  urgent: { label: "Urgent", color: "text-red-400 bg-red-500/10" },
};

function CategoryBadge({ category }: { category: AdminMailCategory }) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${meta.color}`}>
      <Icon className="w-2.5 h-2.5" />{meta.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: AdminMailMessage["priority"] }) {
  const meta = PRIORITY_META[priority];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

function initials(name: string) {
  return name.split(/\s+/).map(s => s[0]).join("").slice(0, 2).toUpperCase();
}

export default function AdminMail() {
  usePageTitle("Admin Mail");
  const [, setLocation] = useLocation();
  const user = useAtomValue(userAtom);
  const [tab, setTab] = useState<AdminTab>("inbox");
  const [folder, setFolder] = useState<AdminMailFolder>("inbox");
  const [folders, setFolders] = useState<{ id: AdminMailFolder; label: string; icon: string; count: number }[]>([]);
  const [messages, setMessages] = useState<AdminMailMessage[]>([]);
  const [selected, setSelected] = useState<AdminMailMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AdminMailCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AdminMailMessage["status"] | "all">("all");
  const [stats, setStats] = useState<AdminMailStats | null>(null);
  // ── NEW: bulk select, auto-refresh, keyboard shortcuts ──────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // ── Guard: only admin can access ──────────────────────────────────────
  useEffect(() => {
    if (user && user.role !== "admin" && user.tier !== "admin") {
      toast.error("Admin access required");
      setLocation("/dashboard/overview");
    }
  }, [user, setLocation]);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await api.adminMail.folders();
      setFolders(res.folders);
    } catch (e) {
      toast.error("Failed to load folders");
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminMail.messages({
        folder,
        search: search || undefined,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 200,
      });
      setMessages(res.messages);
      setLastUpdated(Date.now());
    } catch (e) {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [folder, search, categoryFilter, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      setStats(await api.adminMail.stats());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);
  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { if (tab === "stats") fetchStats(); }, [tab, fetchStats]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (tab !== "inbox") return;
    const id = setInterval(() => { fetchMessages(); }, 30_000);
    return () => clearInterval(id);
  }, [tab, fetchMessages]);

  // Open a message
  const openMessage = async (m: AdminMailMessage) => {
    setSelected(m);
    if (m.status === "unread") {
      try {
        await api.adminMail.updateMessage(m.id, { status: "read" });
        setMessages(prev => prev.map(x => x.id === m.id ? { ...x, status: "read" } : x));
      } catch { /* ignore */ }
    }
    // For sent messages, fire read-receipt tracking (mock)
    if (m.folder === "sent" || m.folder === "blasts") {
      try {
        const res = await api.adminMail.trackOpen(m.id).catch(() => null);
        if (res?.ok) {
          setMessages(prev => prev.map(x => x.id === m.id ? { ...x, openedAt: new Date().toISOString() } : x));
        }
      } catch { /* ignore */ }
    }
  };

  const toggleStar = async (m: AdminMailMessage) => {
    try {
      const { message } = await api.adminMail.updateMessage(m.id, { starred: !m.starred });
      setMessages(prev => prev.map(x => x.id === m.id ? message : x));
      if (selected?.id === m.id) setSelected(message);
    } catch (e) { toast.error("Failed to update"); }
  };

  const moveToTrash = async (m: AdminMailMessage) => {
    try {
      await api.adminMail.updateMessage(m.id, { folder: "trash" });
      setMessages(prev => prev.filter(x => x.id !== m.id));
      setSelectedIds(prev => prev.filter(id => id !== m.id));
      if (selected?.id === m.id) setSelected(null);
      toast.success("Moved to trash");
      fetchFolders();
    } catch (e) { toast.error("Failed to delete"); }
  };

  const markRead = async (m: AdminMailMessage) => {
    try {
      const { message } = await api.adminMail.updateMessage(m.id, { status: m.status === "unread" ? "read" : "unread" });
      setMessages(prev => prev.map(x => x.id === m.id ? message : x));
      if (selected?.id === m.id) setSelected(message);
    } catch (e) { toast.error("Failed to update"); }
  };

  // ── Bulk operations ──────────────────────────────────────────────────
  const bulkAction = useCallback(async (action: BulkAction, extra?: BulkActionExtra) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await api.adminMail.bulk({ ids: selectedIds, action, ...extra });
      toast.success(res.message);
      setSelectedIds([]);
      if (action === "delete") { setSelected(null); }
      fetchMessages(); fetchFolders();
    } catch (e: any) { toast.error(e?.message || "Bulk action failed"); }
  }, [selectedIds, fetchMessages, fetchFolders]);

  const snooze = useCallback(async (minutes: number) => {
    await bulkAction("snooze", { snoozeMinutes: minutes });
  }, [bulkAction]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "inbox") return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInput && e.key !== "Escape") return;
      const filtered = messages.filter(m => statusFilter !== ("starred" as any) || m.starred);
      if (e.key === "Escape") { setSelected(null); setSelectedIds([]); return; }
      if (e.key === "j") {
        e.preventDefault();
        const idx = selected ? filtered.findIndex(m => m.id === selected.id) : -1;
        openMessage(filtered[Math.min(idx + 1, filtered.length - 1)]);
      } else if (e.key === "k") {
        e.preventDefault();
        const idx = selected ? filtered.findIndex(m => m.id === selected.id) : 0;
        openMessage(filtered[Math.max(idx - 1, 0)]);
      } else if (e.key === "r" && selected) { e.preventDefault(); /* reply handled in dialog */ }
      else if (e.key === "e" && selected) { e.preventDefault(); moveToTrash(selected); }
      else if (e.key === "#" && selected) { e.preventDefault(); moveToTrash(selected); }
      else if (e.key === "s" && selected) { e.preventDefault(); toggleStar(selected); }
      else if (e.key === "x" && selected) { e.preventDefault(); bulkAction("snooze", { snoozeMinutes: 60 }); setSelectedIds([selected.id]); }
      else if (e.key === "u" && selected) { e.preventDefault(); bulkAction("unsnooze"); setSelectedIds([selected.id]); }
      else if (e.key === "c") { e.preventDefault(); setTab("compose"); }
      else if (e.key === "/") { e.preventDefault(); const s = document.querySelector('input[placeholder*="Search subject"]') as HTMLInputElement; s?.focus(); }
      else if (e.key === "?") { e.preventDefault(); setShowShortcuts(true); }
      else if (e.key === "1") setTab("inbox");
      else if (e.key === "2") setTab("compose");
      else if (e.key === "3") setTab("campaigns");
      else if (e.key === "4") setTab("templates");
      else if (e.key === "5") setTab("contacts");
      else if (e.key === "6") setTab("users");
      else if (e.key === "7") setTab("stats");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tab, messages, selected, statusFilter, openMessage, moveToTrash, toggleStar, bulkAction]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-amber" />
            Admin Webmail
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber/10 text-amber border border-amber/20">ADMIN</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Leads · Marketing · Blasts · Support — all in one inbox</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">
              Updated {Math.max(1, Math.floor((Date.now() - lastUpdated) / 1000))}s ago
            </span>
          )}
          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-accent/50 text-muted-foreground hover:text-foreground transition-all"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { fetchMessages(); fetchFolders(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/50 text-muted-foreground hover:text-foreground transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as AdminTab)}>
        <TabsList className="bg-accent/30 w-fit">
          <TabsTrigger value="inbox" className="gap-1.5"><Inbox className="w-3.5 h-3.5" />Inbox</TabsTrigger>
          <TabsTrigger value="compose" className="gap-1.5"><Pencil className="w-3.5 h-3.5" />Compose</TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5"><Megaphone className="w-3.5 h-3.5" />Campaigns</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5"><FileText className="w-3.5 h-3.5" />Templates</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5"><Users className="w-3.5 h-3.5" />Contacts</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><ShieldCheck className="w-3.5 h-3.5" />Users</TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Stats</TabsTrigger>
        </TabsList>

        {/* ── INBOX ──────────────────────────────────────────────────────── */}
        <TabsContent value="inbox" className="mt-4">
          <InboxView
            folders={folders} folder={folder} setFolder={setFolder}
            messages={messages} loading={loading} search={search} setSearch={setSearch}
            categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            selected={selected} setSelected={setSelected}
            openMessage={openMessage} toggleStar={toggleStar}
            moveToTrash={moveToTrash} markRead={markRead}
            onPurgeFolder={async () => {
              const confirmed = window.confirm(`Purge ALL messages in "${folder}"? This cannot be undone.`);
              if (!confirmed) return;
              try {
                const res = await api.adminMail.purge({ folder });
                toast.success(res.message);
                fetchMessages(); fetchFolders();
              } catch { toast.error("Purge failed"); }
            }}
            selectedIds={selectedIds} setSelectedIds={setSelectedIds}
            onSnooze={snooze}
            onBulkAction={bulkAction}
          />
        </TabsContent>

        {/* ── COMPOSE ────────────────────────────────────────────────────── */}
        <TabsContent value="compose" className="mt-4">
          <ComposeView onSent={() => { setTab("inbox"); fetchMessages(); fetchFolders(); }} />
        </TabsContent>

        {/* ── CAMPAIGNS ──────────────────────────────────────────────────── */}
        <TabsContent value="campaigns" className="mt-4">
          <CampaignsView onChanged={() => { fetchMessages(); fetchFolders(); }} />
        </TabsContent>

        {/* ── TEMPLATES ──────────────────────────────────────────────────── */}
        <TabsContent value="templates" className="mt-4">
          <TemplatesView />
        </TabsContent>

        {/* ── CONTACTS ───────────────────────────────────────────────────── */}
        <TabsContent value="contacts" className="mt-4">
          <ContactsView />
        </TabsContent>

        {/* ── USERS ──────────────────────────────────────────────────────── */}
        <TabsContent value="users" className="mt-4">
          <UsersView />
        </TabsContent>

        {/* ── STATS ──────────────────────────────────────────────────────── */}
        <TabsContent value="stats" className="mt-4">
          <StatsView stats={stats} onRefresh={fetchStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KEYBOARD SHORTCUTS MODAL
// ─────────────────────────────────────────────────────────────────────────────
const SHORTCUTS: { key: string; description: string }[] = [
  { key: "j / k", description: "Next / previous message" },
  { key: "r", description: "Reply to selected" },
  { key: "e / #", description: "Move to trash" },
  { key: "s", description: "Star / unstar" },
  { key: "x", description: "Snooze 1h" },
  { key: "u", description: "Unsnooze" },
  { key: "c", description: "Compose new" },
  { key: "/", description: "Focus search" },
  { key: "Esc", description: "Clear selection / close" },
  { key: "1-7", description: "Jump to tab (Inbox / Compose / Campaigns / Templates / Contacts / Users / Stats)" },
  { key: "?", description: "Show this help" },
];

function KeyboardShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
          <motion.div initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.97 }} className="w-full sm:max-w-md glass-card rounded-xl border border-amber/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Keyboard className="w-4 h-4 text-amber" />Keyboard shortcuts</h3>
              <button onClick={onClose} className="p-1 rounded hover:bg-accent/50"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 grid grid-cols-1 gap-1.5 text-xs">
              {SHORTCUTS.map(s => (
                <div key={s.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/30">
                  <span className="text-muted-foreground">{s.description}</span>
                  <kbd className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber/10 text-amber border border-amber/20 whitespace-nowrap">{s.key}</kbd>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SNOOZE DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
function SnoozeMenu({ onSnooze }: { onSnooze: (minutes: number) => void }) {
  const [open, setOpen] = useState(false);
  const opts = [
    { label: "1 hour", minutes: 60 },
    { label: "3 hours", minutes: 180 },
    { label: "Tomorrow morning", minutes: 60 * 14 }, // ~14h to next 9am
    { label: "Next week", minutes: 60 * 24 * 7 },
  ];
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-accent text-muted-foreground hover:text-foreground border border-border">
        <Clock className="w-3 h-3" />Snooze
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-10 w-44 glass-card rounded-lg border border-border shadow-2xl p-1">
          {opts.map(o => (
            <button key={o.minutes} onClick={() => { onSnooze(o.minutes); setOpen(false); }} className="w-full text-left px-2 py-1.5 text-[11px] rounded hover:bg-accent/40 text-foreground">
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function InboxView({
  folders, folder, setFolder,
  messages, loading, search, setSearch,
  categoryFilter, setCategoryFilter, statusFilter, setStatusFilter,
  selected, setSelected, openMessage, toggleStar, moveToTrash, markRead,
  onPurgeFolder, selectedIds, setSelectedIds, onSnooze, onBulkAction,
}: {
  folders: { id: AdminMailFolder; label: string; icon: string; count: number }[];
  folder: AdminMailFolder; setFolder: (f: AdminMailFolder) => void;
  messages: AdminMailMessage[]; loading: boolean;
  search: string; setSearch: (s: string) => void;
  categoryFilter: AdminMailCategory | "all"; setCategoryFilter: (c: AdminMailCategory | "all") => void;
  statusFilter: AdminMailMessage["status"] | "all"; setStatusFilter: (s: AdminMailMessage["status"] | "all") => void;
  selected: AdminMailMessage | null; setSelected: (m: AdminMailMessage | null) => void;
  openMessage: (m: AdminMailMessage) => void;
  toggleStar: (m: AdminMailMessage) => void;
  moveToTrash: (m: AdminMailMessage) => void;
  markRead: (m: AdminMailMessage) => void;
  onPurgeFolder: () => void;
  selectedIds: string[]; setSelectedIds: (ids: string[]) => void;
  onSnooze: (minutes: number) => void;
  onBulkAction: BulkActionFn;
}) {
  const allSelected = messages.length > 0 && messages.every(m => selectedIds.includes(m.id));
  const toggleAll = () => setSelectedIds(allSelected ? [] : messages.map(m => m.id));
  const toggleOne = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Saved-search state (lifted here so the chip row in the InboxView can render)
  const [savedSearches, setSavedSearches] = useState<{ id: string; name: string; params: Record<string, string>; createdAt: string }[]>([]);
  useEffect(() => {
    api.adminMail.savedSearches().then(r => setSavedSearches(r.savedSearches)).catch(() => {});
  }, []);
  const applySavedSearch = (params: Record<string, string>) => {
    if (params.folder) {/* folder change triggers reload */ }
    if (params.category) setCategoryFilter(params.category as AdminMailCategory);
    if (params.status) setStatusFilter(params.status as any);
    if (params.search !== undefined) setSearch(params.search);
  };
  const removeSavedSearch = (id: string) => {
    api.adminMail.deleteSavedSearch(id).then(() => {
      setSavedSearches(prev => prev.filter(s => s.id !== id));
      toast.success("View removed");
    }).catch(() => toast.error("Failed to remove"));
  };
  const saveCurrentAsView = async () => {
    const name = window.prompt("Name this view:", `${categoryFilter !== "all" ? categoryFilter + " " : ""}${statusFilter !== "all" ? statusFilter : ""}`.trim() || "My view");
    if (!name) return;
    const params: Record<string, string> = {};
    if (categoryFilter !== "all") params.category = categoryFilter;
    if (statusFilter !== "all") params.status = statusFilter;
    if (search) params.search = search;
    try {
      const res = await api.adminMail.createSavedSearch({ name, params });
      setSavedSearches(prev => [...prev, res.savedSearch].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success("View saved");
    } catch { toast.error("Failed to save view"); }
  };

  return (
    <div className="h-[calc(100vh-12rem)] grid grid-cols-1 lg:grid-cols-[220px_1fr_1.2fr] gap-3">
      {/* Folder rail */}
      <div className="glass-card rounded-xl p-2 overflow-y-auto no-scrollbar">
        {folders.map(f => (
          <button
            key={f.id}
            onClick={() => { setFolder(f.id); setSelected(null); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              folder === f.id
                ? "bg-amber/10 text-amber border border-amber/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/30 border border-transparent"
            }`}
          >
            <span className="text-base w-5 text-center">{f.icon}</span>
            <span className="flex-1 text-left">{f.label}</span>
            {f.count > 0 && <span className="text-[10px] font-mono bg-accent/50 px-1.5 py-0.5 rounded-full">{f.count}</span>}
          </button>
        ))}
        {folder !== "inbox" && folder !== "sent" && folder !== "blasts" && (
          <button
            onClick={onPurgeFolder}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent transition-all"
          >
            <ZapOff className="w-3.5 h-3.5" />
            Purge folder
          </button>
        )}
      </div>

      {/* List + filters */}
      <div className="glass-card rounded-xl flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="accent-amber w-3.5 h-3.5"
              title="Select all"
            />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subject, sender, tags... (/)"
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-accent/50 border border-border text-xs focus:outline-none focus:border-amber/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <button onClick={() => setCategoryFilter("all")} className={`text-[10px] px-2 py-0.5 rounded font-medium ${categoryFilter === "all" ? "bg-amber/15 text-amber border border-amber/20" : "bg-accent text-muted-foreground border border-border"}`}>All</button>
            {Object.entries(CATEGORY_META).map(([k, v]) => (
              <button key={k} onClick={() => setCategoryFilter(k as AdminMailCategory)} className={`text-[10px] px-2 py-0.5 rounded font-medium ${categoryFilter === k ? v.color : "bg-accent text-muted-foreground border border-border"}`}>
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {(["all", "unread", "read", "replied", "starred"] as const).map(s => (
              <button
                key={s}
                onClick={() => {
                  if (s === "starred") {
                    setStatusFilter(statusFilter === "starred" as any ? "all" : "starred" as any);
                  } else {
                    setStatusFilter(s);
                  }
                }}
                className={`text-[10px] px-2 py-0.5 rounded font-medium capitalize ${(s === "starred" ? statusFilter === "starred" : statusFilter === s) ? "bg-foreground text-background" : "bg-accent text-muted-foreground border border-border"}`}
              >
                {s}
              </button>
            ))}
          </div>
          {savedSearches.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-muted-foreground px-1">Views:</span>
              {savedSearches.map(ss => (
                <span key={ss.id} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <button onClick={() => applySavedSearch(ss.params)} className="hover:underline">{ss.name}</button>
                  <button onClick={() => removeSavedSearch(ss.id)} className="text-muted-foreground hover:text-red-400 ml-0.5">×</button>
                </span>
              ))}
              <button onClick={saveCurrentAsView} className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-accent text-muted-foreground hover:text-foreground border border-border flex items-center gap-0.5" title="Save current filters as a view">
                <Plus className="w-2.5 h-2.5" />Save view
              </button>
            </div>
          )}
          {savedSearches.length === 0 && (categoryFilter !== "all" || statusFilter !== "all" || search) && (
            <div className="flex items-center gap-1">
              <button onClick={saveCurrentAsView} className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-accent text-muted-foreground hover:text-foreground border border-border flex items-center gap-0.5">
                <Plus className="w-2.5 h-2.5" />Save as view
              </button>
            </div>
          )}
          {selectedIds.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1 flex-wrap p-2 rounded-lg bg-amber/10 border border-amber/20">
              <span className="text-[10px] font-mono text-amber px-1">{selectedIds.length} selected</span>
              <button onClick={() => onBulkAction("markRead")} className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-foreground hover:bg-accent/70 flex items-center gap-1"><Check className="w-2.5 h-2.5" />Read</button>
              <button onClick={() => onBulkAction("markUnread")} className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-foreground hover:bg-accent/70">Unread</button>
              <button onClick={() => onBulkAction("star")} className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-foreground hover:bg-accent/70 flex items-center gap-1"><Star className="w-2.5 h-2.5" />Star</button>
              <button onClick={() => onBulkAction("unstar")} className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-foreground hover:bg-accent/70">Unstar</button>
              <SnoozeMenu onSnooze={(m) => onBulkAction("snooze", { snoozeMinutes: m })} />
              <button onClick={() => onBulkAction("move", { folder: "archive" })} className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-foreground hover:bg-accent/70 flex items-center gap-1"><Archive className="w-2.5 h-2.5" />Archive</button>
              <button onClick={() => { if (window.confirm("Delete " + selectedIds.length + " messages?")) onBulkAction("delete"); }} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 hover:bg-red-500/25 flex items-center gap-1"><Trash2 className="w-2.5 h-2.5" />Delete</button>
              <button onClick={() => setSelectedIds([])} className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground ml-auto">Clear</button>
            </motion.div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-5 h-5 border-2 border-amber border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
              <Inbox className="w-10 h-10 mb-2 opacity-30" />
              <p>No messages</p>
              {folder === "inbox" && <p className="text-xs mt-1">Press <kbd className="font-mono px-1 rounded bg-accent text-foreground">c</kbd> to compose, <kbd className="font-mono px-1 rounded bg-accent text-foreground">?</kbd> for shortcuts</p>}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {messages
                .filter(m => statusFilter !== ("starred" as any) || m.starred)
                .map(m => (
                <div
                  key={m.id}
                  className={`w-full text-left transition-all hover:bg-accent/30 group ${
                    selected?.id === m.id ? "bg-accent/40 border-l-2 border-l-amber" : ""
                  } ${m.status === "unread" ? "" : "opacity-80"} ${selectedIds.includes(m.id) ? "bg-amber/5" : ""}`}
                >
                  <div className="flex items-center px-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(m.id)}
                      onChange={(e) => { e.stopPropagation(); toggleOne(m.id); }}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-amber w-3.5 h-3.5 mr-1.5 shrink-0"
                    />
                    <button
                      onClick={() => openMessage(m)}
                      className="flex-1 min-w-0 text-left px-2 py-1.5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber/20 flex items-center justify-center text-[11px] font-bold text-amber shrink-0 mt-0.5">
                          {initials(m.from)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm truncate ${m.status === "unread" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                              {m.from}
                            </span>
                            {m.starred && <Star className="w-3 h-3 text-amber fill-amber shrink-0" />}
                            {m.hasAttachments && <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />}
                            <CategoryBadge category={m.category} />
                            {m.priority !== "normal" && <PriorityBadge priority={m.priority} />}
                            {m.snoozedUntil && m.snoozedUntil > Date.now() && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />snoozed
                              </span>
                            )}
                          </div>
                          <div className={`text-sm truncate mt-0.5 ${m.status === "unread" ? "text-foreground" : "text-muted-foreground"}`}>
                            {m.subject}
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{m.preview}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] text-muted-foreground font-mono">{m.date}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(m.timestamp)}</span>
                          {m.status === "unread" && <div className="w-2 h-2 rounded-full bg-amber" />}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail pane */}
      <div className="glass-card rounded-xl flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="flex items-center gap-2 p-3 border-b border-border">
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors lg:hidden">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex-1" />
              <button onClick={() => markRead(selected)} className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground" title={selected.status === "unread" ? "Mark as read" : "Mark as unread"}>
                {selected.status === "unread" ? <Check className="w-4 h-4" /> : <RotateCw className="w-4 h-4" />}
              </button>
              <button onClick={() => toggleStar(selected)} className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground">
                <Star className={`w-4 h-4 ${selected.starred ? "text-amber fill-amber" : ""}`} />
              </button>
              <SnoozeMenu onSnooze={(m) => { setSelectedIds([selected.id]); onSnooze(m); }} />
              <button onClick={() => moveToTrash(selected)} className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors text-muted-foreground hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CategoryBadge category={selected.category} />
                  {selected.priority !== "normal" && <PriorityBadge priority={selected.priority} />}
                  {selected.tags?.map(t => (
                    <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent text-muted-foreground">#{t}</span>
                  ))}
                  {selected.snoozedUntil && selected.snoozedUntil > Date.now() && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />Snoozed until {new Date(selected.snoozedUntil).toLocaleString()}
                    </span>
                  )}
                  {(selected.folder === "sent" || selected.folder === "blasts") && (
                    <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title={`Opened: ${selected.openedAt || "not yet"} | Clicked: ${selected.clickedAt || "not yet"}`}>
                      {selected.openedAt ? <Eye className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5 opacity-30" />}
                      {selected.openedAt ? "Opened" : "Awaiting open"}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-display font-bold mt-2">{selected.subject}</h2>
                <div className="flex items-center gap-3 mt-3">
                  <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center text-sm font-bold text-amber shrink-0">
                    {initials(selected.from)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{selected.from}</div>
                    <div className="text-xs text-muted-foreground truncate">{selected.fromEmail}</div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <div>{selected.date}</div>
                    <div>{timeAgo(selected.timestamp)}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  <span className="font-medium">To:</span> {selected.to.join(", ")}
                </div>
              </div>

              <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap border-t border-border pt-4">
                {selected.body || "(empty body)"}
              </div>

              {selected.attachments && selected.attachments.length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground mb-2">Attachments</p>
                  <div className="space-y-1">
                    {selected.attachments.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-accent/30 text-xs">
                        <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="flex-1 truncate">{a.name}</span>
                        <span className="text-muted-foreground font-mono">{(a.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 p-3 border-t border-border">
              <ReplyDialog source={selected} onSent={() => { /* refresh */ }} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <Mail className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Select a message to view</p>
            <p className="text-xs mt-1">Press <kbd className="font-mono px-1 rounded bg-accent text-foreground">?</kbd> for keyboard shortcuts</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPLY DIALOG
// ─────────────────────────────────────────────────────────────────────────────
function ReplyDialog(props) {
  const { source, onSent } = props;
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<AdminMailCategory>(source.category);
  const [quoteOriginal, setQuoteOriginal] = useState(true);
  const [sending, setSending] = useState(false);

  const quotedBody = quoteOriginal
    ? `\n\n--- Original message from ${source.from} on ${source.date} ---\n${source.body}`
    : "";

  const send = async () => {
    const fullBody = body + quotedBody;
    if (!body.trim()) return;
    setSending(true);
    try {
      await api.adminMail.send({
        to: [source.fromEmail],
        subject: source.subject.startsWith("Re:") ? source.subject : `Re: ${source.subject}`,
        body: fullBody,
        category,
        inReplyTo: source.id,
        threadId: source.threadId,
      });
      toast.success("Reply sent");
      setOpen(false);
      setBody("");
      onSent();
    } catch (e) {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber/10 text-amber border border-amber/20 hover:bg-amber/20 transition-all">
        <Reply className="w-3.5 h-3.5" />Reply
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.97 }} className="w-full sm:max-w-2xl sm:rounded-xl bg-card border border-border shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">Reply to {source.from}</h3>
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-accent/50"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3">
                <div className="text-xs text-muted-foreground">To: {source.fromEmail}</div>
                <div className="text-xs text-muted-foreground">Subject: {source.subject.startsWith("Re:") ? source.subject : `Re: ${source.subject}`}</div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as AdminMailCategory)} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50">
                    {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} placeholder="Write your reply..." className="w-full px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50 resize-none" />
                {quoteOriginal && source.body && (
                  <details className="text-[10px] text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">Quote original message</summary>
                    <pre className="mt-1 p-2 rounded bg-accent/30 whitespace-pre-wrap font-mono text-[10px] max-h-32 overflow-y-auto">{source.body}</pre>
                  </details>
                )}
                <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={quoteOriginal} onChange={(e) => setQuoteOriginal(e.target.checked)} className="accent-amber" />
                  Include quoted original in reply
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
                <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-muted-foreground">Cancel</button>
                <button onClick={send} disabled={sending || !body.trim()} className="btn-amber px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 disabled:opacity-50">
                  {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEND LATER MENU
// ─────────────────────────────────────────────────────────────────────────────
function SendLaterMenu({ options, onSchedule, disabled }: { options: { label: string; ts: () => string }[]; onSchedule: (iso: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        className="px-3 py-2 rounded-lg text-xs font-medium bg-accent text-muted-foreground hover:text-foreground border border-border flex items-center gap-1.5 disabled:opacity-50"
        title="Schedule send"
      >
        <Clock className="w-3.5 h-3.5" />Send later
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 bottom-full mb-1 w-56 z-20 glass-card rounded-lg border border-border shadow-2xl p-1"
          >
            {options.map((o, i) => (
              <button
                key={i}
                onClick={() => { onSchedule(o.ts()); setOpen(false); }}
                className="w-full text-left px-2 py-1.5 text-[11px] rounded hover:bg-accent/40 text-foreground"
              >
                {o.label}
                <div className="text-[10px] text-muted-foreground font-mono">{new Date(o.ts()).toLocaleString()}</div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSE VIEW (new email / blast)
// ─────────────────────────────────────────────────────────────────────────────
function ComposeView({ onSent }: { onSent: () => void }) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<AdminMailCategory>("general");
  const [priority, setPriority] = useState<AdminMailMessage["priority"]>("normal");
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<AdminMailTemplate[]>([]);
  const [contacts, setContacts] = useState<AdminMailContact[]>([]);
  const [snippets, setSnippets] = useState<{ id: string; name: string; body: string; tags?: string[] }[]>([]);
  const [showMergePreview, setShowMergePreview] = useState(false);
  const [mergePreviews, setMergePreviews] = useState<{ contactId: string; name: string; email: string; subject: string; body: string; missingVariables: string[] }[]>([]);
  const [sending, setSending] = useState(false);
  // Send-later + drafts
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<{ id: string; to: string; subject: string; body: string; category: AdminMailCategory; updatedAt: string }[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"" | "saving" | "saved">("");

  useEffect(() => {
    api.adminMail.templates().then(r => setTemplates(r.templates)).catch(() => {});
    api.adminMail.contacts().then(r => setContacts(r.contacts)).catch(() => {});
    api.adminMail.snippets().then(r => setSnippets(r.snippets)).catch(() => {});
    api.adminMail.drafts().then(r => setDrafts(r.drafts)).catch(() => {});
  }, []);

  // Auto-save: every 5s, if any field has content, save the draft (debounced).
  useEffect(() => {
    if (!subject && !body && !to) return;
    setAutoSaveStatus("saving");
    const t = setTimeout(async () => {
      try {
        const res = await api.adminMail.saveDraft({ id: draftId || undefined, to, subject, body, category });
        if (!draftId) setDraftId(res.draft.id);
        setAutoSaveStatus("saved");
      } catch {
        setAutoSaveStatus("");
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [to, subject, body, category, draftId]);

  const loadDraft = async (id: string) => {
    try {
      const res = await api.adminMail.getDraft(id);
      setTo(res.draft.to);
      setSubject(res.draft.subject);
      setBody(res.draft.body);
      setCategory(res.draft.category);
      setDraftId(res.draft.id);
      toast.success("Draft loaded");
    } catch { toast.error("Failed to load draft"); }
  };

  const deleteDraftAndClear = async () => {
    if (!draftId) return;
    try { await api.adminMail.deleteDraft(draftId); setDraftId(null); toast.success("Draft discarded"); }
    catch { /* ignore */ }
  };

  const scheduleOptions = [
    { label: "In 1 hour", ts: () => new Date(Date.now() + 60 * 60_000).toISOString() },
    { label: "Tomorrow 9 AM", ts: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.toISOString(); } },
    { label: "Next Monday 9 AM", ts: () => { const d = new Date(); const day = d.getDay(); const diff = (1 + 7 - day) % 7 || 7; d.setDate(d.getDate() + diff); d.setHours(9, 0, 0, 0); return d.toISOString(); } },
    { label: "In 1 week", ts: () => new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString() },
  ];


  const previewMailMerge = async () => {
    const recipients = to.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    if (recipients.length === 0) {
      toast.error("Add at least one recipient first");
      return;
    }
    // Resolve contactIds from emails
    const contactIds = contacts.filter(c => recipients.includes(c.email)).map(c => c.id);
    if (contactIds.length === 0) {
      toast.error("Recipients must be from your contacts for mail-merge preview");
      return;
    }
    try {
      const res = await api.adminMail.mailMergePreview({
        contactIds,
        templateId: templateId || undefined,
        subject: subject || undefined,
        body: body || undefined,
      });
      setMergePreviews(res.previews);
      setShowMergePreview(true);
    } catch (e: any) {
      toast.error(e?.message || "Preview failed");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">To (comma or space separated)</label>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="email1@example.com, email2@example.com" className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">CC (optional)</label>
            <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@example.com" className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as AdminMailCategory)} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50">
              {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as AdminMailMessage["priority"])} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Template</label>
            <select value={templateId} onChange={(e) => loadTemplate(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50">
              <option value="">— None —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Message</label>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Snippets:</span>
              {snippets.slice(0, 4).map(s => (
                <button key={s.id} onClick={() => insertSnippet(s)} className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-foreground hover:bg-accent/70 border border-border" title={s.body.slice(0, 60) + "..."}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} placeholder="Write your message..." className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50 resize-none font-mono" />
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>Sending as <span className="text-amber font-mono">admin@aether-energy.ai</span></span>
            {autoSaveStatus && (
              <span className="flex items-center gap-1 font-mono">
                {autoSaveStatus === "saving" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-emerald-400" />}
                {autoSaveStatus === "saving" ? "Saving draft…" : "Draft saved"}
              </span>
            )}
            {drafts.length > 0 && (
              <select onChange={(e) => { if (e.target.value) loadDraft(e.target.value); e.target.value = ""; }} className="text-[10px] px-1 py-0.5 rounded bg-accent text-foreground border border-border">
                <option value="">Recent drafts ({drafts.length})</option>
                {drafts.slice(0, 5).map(d => <option key={d.id} value={d.id}>{d.subject || "(no subject)"} — {new Date(d.updatedAt).toLocaleString()}</option>)}
              </select>
            )}
            {draftId && <button onClick={deleteDraftAndClear} className="text-[10px] text-red-400 hover:underline">Discard draft</button>}
          </div>
          <div className="flex items-center gap-2">
            {to.split(/[,;\s]+/).filter(Boolean).length > 1 && (
              <button onClick={previewMailMerge} className="px-3 py-2 rounded-lg text-xs font-medium bg-accent text-muted-foreground hover:text-foreground border border-border flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />Preview merge
              </button>
            )}
            <SendLaterMenu options={scheduleOptions} onSchedule={(iso) => send(iso)} disabled={sending} />
            <button onClick={() => send()} disabled={sending} className="btn-amber px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 disabled:opacity-50">
              {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send {to.split(/[,;\s]+/).filter(Boolean).length > 1 && `(to ${to.split(/[,;\s]+/).filter(Boolean).length})`}
            </button>
          </div>
        </div>
      </div>

      {/* Quick contacts */}
      <div className="glass-card rounded-xl p-3">
        <h3 className="text-xs font-semibold flex items-center gap-2 mb-2"><Users className="w-3.5 h-3.5 text-amber" />Quick contacts</h3>
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {contacts.map(c => (
            <button
              key={c.id}
              onClick={() => setTo(prev => prev ? `${prev}, ${c.email}` : c.email)}
              className="w-full text-left p-2 rounded-lg hover:bg-accent/30 transition-colors"
            >
              <div className="text-xs font-medium truncate">{c.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{c.email}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mail-merge preview modal */}
      <AnimatePresence>
        {showMergePreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowMergePreview(false)}>
            <motion.div initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.97 }} className="w-full sm:max-w-2xl max-h-[80vh] overflow-auto glass-card rounded-xl border border-amber/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Eye className="w-4 h-4 text-amber" />Mail-merge preview ({mergePreviews.length} recipients)</h3>
                <button onClick={() => setShowMergePreview(false)} className="p-1 rounded hover:bg-accent/50"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3">
                {mergePreviews.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border bg-accent/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{p.email}</div>
                      </div>
                      {p.missingVariables.length > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber/15 text-amber">Missing: {p.missingVariables.join(", ")}</span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">Subject: {p.subject}</div>
                    <div className="text-[10px] text-foreground/70 whitespace-pre-wrap font-mono mt-1 max-h-32 overflow-y-auto">{p.body}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGNS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function CampaignsView({ onChanged }: { onChanged: () => void }) {
  const [campaigns, setCampaigns] = useState<AdminMailCampaign[]>([]);
  const [contacts, setContacts] = useState<AdminMailContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", subject: "", body: "", category: "marketing" as AdminMailCategory, contactIds: [] as string[] });
  const [filter, setFilter] = useState<AdminMailCampaign["status"] | "all">("all");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, contactsRes] = await Promise.all([
        api.adminMail.campaigns(),
        api.adminMail.contacts(),
      ]);
      setCampaigns(c.campaigns);
      setContacts(contactsRes.contacts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const sendCampaign = async (id: string) => {
    const confirmed = window.confirm("Send this campaign now? Recipients will receive the email immediately.");
    if (!confirmed) return;
    try {
      const res = await api.adminMail.sendCampaign(id);
      toast.success(`Campaign sent to ${res.sent} recipient(s)`);
      fetchAll();
      onChanged();
    } catch (e: any) { toast.error(e?.message || "Send failed"); }
  };

  const createDraft = async () => {
    if (!draft.name || !draft.subject || !draft.body) { toast.error("Name, subject and body required"); return; }
    if (draft.contactIds.length === 0) { toast.error("Pick at least one contact"); return; }
    try {
      await api.adminMail.createCampaign({
        ...draft,
        audience: { contactIds: draft.contactIds, tags: [], estimated: draft.contactIds.length },
        status: "draft",
      });
      toast.success("Campaign created");
      setCreating(false);
      setDraft({ name: "", subject: "", body: "", category: "marketing", contactIds: [] });
      fetchAll();
    } catch (e: any) { toast.error(e?.message || "Create failed"); }
  };

  const deleteCampaign = async (id: string) => {
    if (!window.confirm("Delete this campaign?")) return;
    try { await api.adminMail.deleteCampaign(id); toast.success("Deleted"); fetchAll(); }
    catch { toast.error("Delete failed"); }
  };

  const filtered = campaigns.filter(c => filter === "all" || c.status === filter);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {(["all", "draft", "scheduled", "sending", "sent", "paused", "failed"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`text-[10px] px-2 py-1 rounded font-medium capitalize ${filter === s ? "bg-amber/15 text-amber border border-amber/20" : "bg-accent text-muted-foreground border border-border"}`}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={() => setCreating(true)} className="btn-amber px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />New campaign
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-5 h-5 text-amber animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl py-12 text-center text-muted-foreground">
          <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No campaigns</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold">{c.name}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      c.status === "sent" ? "bg-emerald-500/10 text-emerald-400" :
                      c.status === "sending" ? "bg-blue-500/10 text-blue-400" :
                      c.status === "draft" ? "bg-accent text-muted-foreground" :
                      c.status === "scheduled" ? "bg-amber/10 text-amber" :
                      "bg-red-500/10 text-red-400"
                    }`}>{c.status}</span>
                    <CategoryBadge category={c.category} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.subject}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground font-mono">
                    <span>👥 {c.audience.contactIds.length} recipients</span>
                    {c.stats.sent > 0 && <span>📤 {c.stats.sent} sent</span>}
                    {c.stats.opened > 0 && <span>👁 {c.stats.opened} opened</span>}
                    {c.stats.clicked > 0 && <span>🖱 {c.stats.clicked} clicked</span>}
                    {c.sentAt && <span>📅 {new Date(c.sentAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {c.status === "draft" && (
                    <button onClick={() => sendCampaign(c.id)} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-amber/10 text-amber border border-amber/20 hover:bg-amber/20 flex items-center gap-1">
                      <Send className="w-3 h-3" />Send
                    </button>
                  )}
                  <button onClick={() => deleteCampaign(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.97 }} className="w-full sm:max-w-2xl sm:rounded-xl bg-card border border-border shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">New campaign</h3>
                <button onClick={() => setCreating(false)} className="p-1 rounded-lg hover:bg-accent/50"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Name</label>
                  <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Q3 Enterprise Outreach" className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Subject</label>
                  <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Category</label>
                  <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as AdminMailCategory })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50">
                    {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Body</label>
                  <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={6} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50 resize-none font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Recipients ({draft.contactIds.length} selected)</label>
                  <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-border p-2 space-y-1">
                    {contacts.map(c => (
                      <label key={c.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/30 cursor-pointer text-xs">
                        <input type="checkbox" checked={draft.contactIds.includes(c.id)} onChange={(e) => {
                          setDraft(d => ({ ...d, contactIds: e.target.checked ? [...d.contactIds, c.id] : d.contactIds.filter(x => x !== c.id) }));
                        }} className="accent-amber" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{c.name} <span className="text-muted-foreground">— {c.email}</span></div>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{c.status}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
                <button onClick={() => setCreating(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-muted-foreground">Cancel</button>
                <button onClick={createDraft} className="btn-amber px-4 py-1.5 rounded-lg text-xs font-semibold">Save draft</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES VIEW
// ─────────────────────────────────────────────────────────────────────────────
function TemplatesView() {
  const [templates, setTemplates] = useState<AdminMailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AdminMailCategory | "all">("all");
  const [editing, setEditing] = useState<AdminMailTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Partial<AdminMailTemplate>>({ name: "", category: "general", subject: "", body: "" });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.adminMail.templates(filter === "all" ? {} : { category: filter });
      setTemplates(r.templates);
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const save = async () => {
    if (!draft.name || !draft.subject || !draft.body || !draft.category) { toast.error("Fill all fields"); return; }
    try {
      if (creating) {
        await api.adminMail.createTemplate(draft);
        toast.success("Template created");
      } else if (editing) {
        await api.adminMail.updateTemplate(editing.id, draft);
        toast.success("Template updated");
      }
      setCreating(false); setEditing(null); setDraft({ name: "", category: "general", subject: "", body: "" });
      fetchAll();
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
  };

  const remove = async (t: AdminMailTemplate) => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    try { await api.adminMail.deleteTemplate(t.id); toast.success("Deleted"); fetchAll(); }
    catch (e: any) { toast.error(e?.message || "Delete failed"); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 flex-wrap">
        <button onClick={() => setFilter("all")} className={`text-[10px] px-2 py-1 rounded font-medium ${filter === "all" ? "bg-amber/15 text-amber border border-amber/20" : "bg-accent text-muted-foreground border border-border"}`}>All</button>
        {Object.entries(CATEGORY_META).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k as AdminMailCategory)} className={`text-[10px] px-2 py-1 rounded font-medium ${filter === k ? v.color : "bg-accent text-muted-foreground border border-border"}`}>{v.label}</button>
        ))}
        <div className="flex-1" />
        <button onClick={() => { setCreating(true); setDraft({ name: "", category: "general", subject: "", body: "" }); }} className="btn-amber px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />New template
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-5 h-5 text-amber animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="glass-card rounded-xl py-12 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No templates</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map(t => (
            <div key={t.id} className="glass-card rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold">{t.name}</h3>
                    {t.isSystem && <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-amber/10 text-amber border border-amber/20">SYSTEM</span>}
                    <CategoryBadge category={t.category} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.subject}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing(t); setDraft(t); }} className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {!t.isSystem && (
                    <button onClick={() => remove(t)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{t.body}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                <span>Used {t.useCount}x</span>
                {t.variables.length > 0 && <span>· Vars: {t.variables.join(", ")}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / create dialog */}
      <AnimatePresence>
        {(editing || creating) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.97 }} className="w-full sm:max-w-2xl sm:rounded-xl bg-card border border-border shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">{editing ? "Edit template" : "New template"}</h3>
                <button onClick={() => { setEditing(null); setCreating(false); }} className="p-1 rounded-lg hover:bg-accent/50"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Name</label>
                    <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Category</label>
                    <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as AdminMailCategory })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50">
                      {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Subject</label>
                  <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Body (use {"{{variable}}"} placeholders)</label>
                  <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={12} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm focus:outline-none focus:border-amber/50 resize-none font-mono" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
                <button onClick={() => { setEditing(null); setCreating(false); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-muted-foreground">Cancel</button>
                <button onClick={save} className="btn-amber px-4 py-1.5 rounded-lg text-xs font-semibold">{editing ? "Save" : "Create"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACTS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ContactsView() {
  const [contacts, setContacts] = useState<AdminMailContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Partial<AdminMailContact>>({ source: "manual", status: "new", tags: [] });
  const importRef = useRef<HTMLInputElement | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.adminMail.contacts({ search: search || undefined, status: statusFilter === "all" ? undefined : statusFilter });
      setContacts(r.contacts);
    } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { const t = setTimeout(fetchAll, 200); return () => clearTimeout(t); }, [fetchAll]);

  const onImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const res = await api.adminMail.importContacts({ csv: text, defaultSource: "manual" });
      toast.success(res.message);
      fetchAll();
    } catch (err: any) {
      toast.error(err?.message || "Import failed");
    }
    e.target.value = "";
  };

  const create = async () => {
    if (!draft.name || !draft.email) { toast.error("Name and email required"); return; }
    try {
      await api.adminMail.createContact(draft);
      toast.success("Contact added");
      setCreating(false);
      setDraft({ source: "manual", status: "new", tags: [] });
      fetchAll();
    } catch (e: any) { toast.error(e?.message || "Create failed"); }
  };

  const remove = async (c: AdminMailContact) => {
    if (!window.confirm(`Delete contact ${c.name}?`)) return;
    try { await api.adminMail.deleteContact(c.id); toast.success("Deleted"); fetchAll(); }
    catch { toast.error("Delete failed"); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, company, tag..." className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-accent/50 border border-border text-xs focus:outline-none focus:border-amber/50" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-1.5 rounded-lg bg-accent/50 border border-border text-xs">
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="unqualified">Unqualified</option>
          <option value="customer">Customer</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
        <a href={api.adminMail.exportContactsUrl()} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-muted-foreground hover:text-foreground border border-border flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5" />Export
        </a>
        <button onClick={() => importRef.current?.click()} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-muted-foreground hover:text-foreground border border-border flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5" />Import CSV
        </button>
        <input ref={importRef} type="file" accept=".csv,text/csv" onChange={onImportCSV} className="hidden" />
        <button onClick={() => setCreating(true)} className="btn-amber px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
          <UserPlus className="w-3.5 h-3.5" />Add contact
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 text-amber animate-spin" /></div>
      ) : contacts.length === 0 ? (
        <div className="glass-card rounded-xl py-12 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No contacts</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-accent/20">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Company</th>
                  <th className="text-left p-2">Source</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Tags</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id} className="border-t border-border/50 hover:bg-accent/20">
                    <td className="p-2 font-medium">{c.name}</td>
                    <td className="p-2 text-muted-foreground">{c.email}</td>
                    <td className="p-2 text-muted-foreground">{c.company || "—"}</td>
                    <td className="p-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground font-mono">{c.source}</span></td>
                    <td className="p-2"><span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      c.status === "customer" ? "bg-emerald-500/10 text-emerald-400" :
                      c.status === "qualified" ? "bg-amber/10 text-amber" :
                      c.status === "unqualified" || c.status === "unsubscribed" ? "bg-red-500/10 text-red-400" :
                      "bg-accent text-muted-foreground"
                    }`}>{c.status}</span></td>
                    <td className="p-2"><div className="flex flex-wrap gap-1">{c.tags.slice(0, 3).map(t => <span key={t} className="text-[9px] font-mono px-1 py-0.5 rounded bg-accent text-muted-foreground">#{t}</span>)}</div></td>
                    <td className="p-2 text-right">
                      <button onClick={() => remove(c)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add contact */}
      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.97 }} className="w-full sm:max-w-xl sm:rounded-xl bg-card border border-border shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">Add new contact</h3>
                <button onClick={() => setCreating(false)} className="p-1 rounded-lg hover:bg-accent/50"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Name *</label>
                  <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Email *</label>
                  <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Company</label>
                  <input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Role</label>
                  <input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Source</label>
                  <select value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value as AdminMailContact["source"] })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm">
                    <option value="manual">Manual</option>
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="campaign">Campaign</option>
                    <option value="event">Event</option>
                    <option value="social">Social</option>
                    <option value="cold_outreach">Cold outreach</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</label>
                  <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as AdminMailContact["status"] })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm">
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="unqualified">Unqualified</option>
                    <option value="customer">Customer</option>
                    <option value="unsubscribed">Unsubscribed</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tags (comma separated)</label>
                  <input value={(draft.tags || []).join(", ")} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Notes</label>
                  <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={3} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm resize-none" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
                <button onClick={() => setCreating(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-muted-foreground">Cancel</button>
                <button onClick={create} className="btn-amber px-4 py-1.5 rounded-lg text-xs font-semibold">Add contact</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS MANAGEMENT (add new user / reset password / suspend / delete / purge)
// ─────────────────────────────────────────────────────────────────────────────
function UsersView() {
  const [users, setUsers] = useState<Array<{ id: string; email: string; username: string; tier: string; role: string; status: string; createdAt: string; lastLoginAt: string | null; emailVerified: boolean }>>([]);
  const [stats, setStats] = useState<{ total: number; active: number; suspended: number; pending: number; admins: number; byTier: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<{ email: string; username: string; password: string; tier: string; role: string }>({ email: "", username: "", password: "", tier: "free", role: "user" });
  const [newAccountInfo, setNewAccountInfo] = useState<{ email: string; username: string; temporaryPassword: string } | null>(null);
  const [resetInfo, setResetInfo] = useState<{ userId: string; email: string; temporaryPassword: string; generatedTemp: boolean } | null>(null);
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([
        api.adminUsers.list({ search: search || undefined, tier: tierFilter === "all" ? undefined : tierFilter, status: statusFilter === "all" ? undefined : statusFilter }),
        api.adminUsers.stats(),
      ]);
      setUsers(u.users);
      setStats(s);
    } finally { setLoading(false); }
  }, [search, tierFilter, statusFilter]);

  useEffect(() => { const t = setTimeout(fetchAll, 200); return () => clearTimeout(t); }, [fetchAll]);

  const create = async () => {
    if (!draft.email || !draft.username || !draft.password) { toast.error("All fields required"); return; }
    if (draft.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    try {
      const res = await api.adminUsers.create({ ...draft, tier: draft.tier as any, role: draft.role as any });
      setNewAccountInfo({ email: res.user.email, username: res.user.username, temporaryPassword: res.temporaryPassword });
      setCreating(false);
      setDraft({ email: "", username: "", password: "", tier: "free", role: "user" });
      fetchAll();
    } catch (e: any) { toast.error(e?.message || "Create failed"); }
  };

  const resetPassword = async (id: string) => {
    const generateTemp = window.confirm("Click OK to generate a temporary password (or Cancel to type your own)");
    let newPassword: string | undefined;
    if (!generateTemp) {
      newPassword = window.prompt("Enter new password (min 8 chars):") || undefined;
      if (!newPassword) return;
    }
    try {
      const res = await api.adminUsers.resetPassword(id, { newPassword, generateTemp });
      setResetInfo(res);
      toast.success("Password reset");
    } catch (e: any) { toast.error(e?.message || "Reset failed"); }
  };

  const suspend = async (id: string) => {
    if (!window.confirm("Suspend this user?")) return;
    try { await api.adminUsers.suspend(id); toast.success("User suspended"); fetchAll(); }
    catch { toast.error("Failed"); }
  };

  const activate = async (id: string) => {
    try { await api.adminUsers.activate(id); toast.success("User activated"); fetchAll(); }
    catch { toast.error("Failed"); }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Permanently delete this user? This cannot be undone.")) return;
    try { await api.adminUsers.delete(id); toast.success("User deleted"); fetchAll(); }
    catch (e: any) { toast.error(e?.message || "Delete failed"); }
  };

  return (
    <div className="space-y-3">
      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Active", value: stats.active, color: "text-emerald-400" },
            { label: "Suspended", value: stats.suspended, color: "text-red-400" },
            { label: "Pending", value: stats.pending, color: "text-amber" },
            { label: "Admins", value: stats.admins, color: "text-amber" },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-accent/50 border border-border text-xs focus:outline-none focus:border-amber/50" />
        </div>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="px-2 py-1.5 rounded-lg bg-accent/50 border border-border text-xs">
          <option value="all">All tiers</option>
          <option value="free">Free</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
          <option value="admin">Admin</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-1.5 rounded-lg bg-accent/50 border border-border text-xs">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
        <button onClick={() => setCreating(true)} className="btn-amber px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
          <UserPlus className="w-3.5 h-3.5" />Add user
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 text-amber animate-spin" /></div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-accent/20">
                <tr>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Tier</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Last login</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t border-border/50 hover:bg-accent/20">
                    <td className="p-2">
                      <div className="font-medium">{u.username}</div>
                      <div className="text-[10px] text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="p-2"><span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${u.role === "admin" ? "bg-amber/10 text-amber border border-amber/20" : "bg-accent text-muted-foreground"}`}>{u.role}</span></td>
                    <td className="p-2"><span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-accent text-muted-foreground">{u.tier}</span></td>
                    <td className="p-2"><span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      u.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                      u.status === "suspended" ? "bg-red-500/10 text-red-400" :
                      "bg-amber/10 text-amber"
                    }`}>{u.status}</span></td>
                    <td className="p-2 text-muted-foreground font-mono">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—"}</td>
                    <td className="p-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => resetPassword(u.id)} className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-amber" title="Reset password">
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        {u.status === "active" ? (
                          <button onClick={() => suspend(u.id)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400" title="Suspend">
                            <PowerOff className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button onClick={() => activate(u.id)} className="p-1 rounded hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400" title="Activate">
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {u.id !== "admin-user-id" && (
                          <button onClick={() => remove(u.id)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add user dialog */}
      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.97 }} className="w-full sm:max-w-md sm:rounded-xl bg-card border border-border shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">Add new user / email</h3>
                <button onClick={() => setCreating(false)} className="p-1 rounded-lg hover:bg-accent/50"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Email *</label>
                  <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="newuser@company.com" className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Username *</label>
                  <input value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Password * (min 8 chars)</label>
                  <input type="text" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tier</label>
                    <select value={draft.tier} onChange={(e) => setDraft({ ...draft, tier: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm">
                      <option value="free">Free</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Role</label>
                    <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-sm">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
                <button onClick={() => setCreating(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-muted-foreground">Cancel</button>
                <button onClick={create} className="btn-amber px-4 py-1.5 rounded-lg text-xs font-semibold">Create user</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New account info modal */}
      <AnimatePresence>
        {newAccountInfo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.97 }} className="w-full sm:max-w-md sm:rounded-xl bg-card border border-amber/30 shadow-2xl">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Check className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold">Account created</h3>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground">Send these credentials to the new user. They can change the password after first login.</p>
                <div className="p-3 rounded-lg bg-accent/30 space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span className="font-mono">{newAccountInfo.email}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Username:</span><span className="font-mono">{newAccountInfo.username}</span></div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Password:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono">{showPasswordFor === newAccountInfo.email ? newAccountInfo.temporaryPassword : "••••••••"}</span>
                      <button onClick={() => setShowPasswordFor(showPasswordFor === newAccountInfo.email ? null : newAccountInfo.email)} className="p-1 hover:bg-accent rounded text-muted-foreground">
                        {showPasswordFor === newAccountInfo.email ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(newAccountInfo.temporaryPassword); toast.success("Password copied"); }} className="p-1 hover:bg-accent rounded text-muted-foreground">Copy</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end px-4 py-3 border-t border-border">
                <button onClick={() => setNewAccountInfo(null)} className="btn-amber px-4 py-1.5 rounded-lg text-xs font-semibold">Done</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset password info modal */}
      <AnimatePresence>
        {resetInfo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.97 }} className="w-full sm:max-w-md sm:rounded-xl bg-card border border-amber/30 shadow-2xl">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Key className="w-5 h-5 text-amber" />
                <h3 className="text-sm font-semibold">Password reset</h3>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground">Password for <span className="font-mono text-foreground">{resetInfo.email}</span> has been reset.</p>
                <div className="p-3 rounded-lg bg-accent/30 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{resetInfo.generatedTemp ? "Temporary password:" : "New password:"}</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono">{showPasswordFor === resetInfo.userId ? resetInfo.temporaryPassword : "••••••••"}</span>
                      <button onClick={() => setShowPasswordFor(showPasswordFor === resetInfo.userId ? null : resetInfo.userId)} className="p-1 hover:bg-accent rounded text-muted-foreground">
                        {showPasswordFor === resetInfo.userId ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(resetInfo.temporaryPassword); toast.success("Password copied"); }} className="p-1 hover:bg-accent rounded text-muted-foreground">Copy</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end px-4 py-3 border-t border-border">
                <button onClick={() => setResetInfo(null)} className="btn-amber px-4 py-1.5 rounded-lg text-xs font-semibold">Done</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function StatsView({ stats, onRefresh }: { stats: AdminMailStats | null; onRefresh: () => void }) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-5 h-5 text-amber animate-spin" />
      </div>
    );
  }
  const o = stats.overview;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold">Mail analytics</h2>
        <button onClick={onRefresh} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/50 text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total messages", value: o.totalMessages, color: "text-foreground" },
          { label: "Unread (inbox)", value: o.unreadCount, color: "text-amber" },
          { label: "Contacts", value: o.totalContacts, color: "text-blue-400" },
          { label: "Active campaigns", value: o.activeCampaigns, color: "text-purple-400" },
          { label: "Sent today", value: o.emailsSentToday, color: "text-emerald-400" },
          { label: "Sent this week", value: o.emailsSentThisWeek, color: "text-emerald-400" },
          { label: "Avg response time", value: o.averageResponseTime, color: "text-foreground" },
          { label: "Response rate", value: `${(o.responseRate * 100).toFixed(0)}%`, color: "text-foreground" },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={`text-2xl font-display font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-xs font-semibold mb-3 flex items-center gap-2"><Tag className="w-3.5 h-3.5 text-amber" />By category</h3>
          <div className="space-y-1.5">
            {Object.entries(stats.byCategory).filter(([_, v]) => v > 0).map(([k, v]) => {
              const meta = CATEGORY_META[k as AdminMailCategory];
              const max = Math.max(...Object.values(stats.byCategory).filter(x => x > 0), 1);
              return (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-xs w-24 text-muted-foreground">{meta?.label || k}</span>
                  <div className="flex-1 h-2 rounded-full bg-accent/30 overflow-hidden">
                    <div className="h-full rounded-full bg-amber transition-all" style={{ width: `${(v / max) * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono w-10 text-right">{v}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-xs font-semibold mb-3 flex items-center gap-2"><ListChecks className="w-3.5 h-3.5 text-amber" />Recent activity</h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {stats.recentActivity.map(a => (
              <div key={a.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/20 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-amber shrink-0" />
                <span className="flex-1 truncate">{a.description}</span>
                <span className="text-[10px] text-muted-foreground font-mono shrink-0">{timeAgo(a.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
