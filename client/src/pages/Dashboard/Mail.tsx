import { useState, useEffect, useMemo, useCallback } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { Search, PenSquare, RefreshCw, Inbox, Send, FileText, AlertTriangle, Trash2 } from "lucide-react";
import MailList from "@/components/mail/MailList";
import type { MailItem } from "@/components/mail/MailList";
import MailView from "@/components/mail/MailView";
import ComposeMail from "@/components/mail/ComposeMail";
import { api } from "@/lib/api";
import type { MailMessage, MailFolder } from "@shared/types";

function toMailItem(m: MailMessage): MailItem {
  return {
    id: m.id,
    from: m.from,
    email: m.email,
    subject: m.subject,
    preview: m.preview,
    date: m.date,
    timestamp: m.timestamp,
    unread: m.unread,
    starred: m.starred,
    hasAttachments: m.hasAttachments,
    category: m.category,
  };
}

const folderIcons: Record<string, typeof Inbox> = {
  inbox: Inbox, sent: Send, drafts: FileText, spam: AlertTriangle, trash: Trash2,
};

export default function Mail() {
  usePageTitle("Mail");
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [emails, setEmails] = useState<MailMessage[]>([]);
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmails = useCallback(async () => {
    try {
      const [mailRes, folderRes] = await Promise.all([
        api.mail.list(activeFolder),
        api.mail.folders(),
      ]);
      setEmails(mailRes.emails);
      setFolders(folderRes.folders);
    } catch {
      /* use empty state */
    } finally {
      setLoading(false);
    }
  }, [activeFolder]);

  useEffect(() => {
    setLoading(true);
    setSelectedId(null);
    fetchEmails();
  }, [fetchEmails]);

  const mailItems = useMemo(() => emails.map(toMailItem), [emails]);

  const filtered = useMemo(() => {
    if (!search.trim()) return mailItems;
    const q = search.toLowerCase();
    return mailItems.filter((m) =>
      m.subject.toLowerCase().includes(q) ||
      m.from.toLowerCase().includes(q) ||
      m.preview.toLowerCase().includes(q)
    );
  }, [mailItems, search]);

  const selectedMail = selectedId
    ? emails.find((m) => m.id === selectedId) ?? null
    : null;

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    const email = emails.find((m) => m.id === id);
    if (email?.unread) {
      api.mail.markRead(id).then(() => {
        setEmails((prev) => prev.map((m) => m.id === id ? { ...m, unread: false } : m));
      });
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Mail</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="text-amber font-medium">aether-energy.ai</span> — Business Email
          </p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="btn-amber px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2"
        >
          <PenSquare className="w-4 h-4" />
          Compose
        </button>
      </div>

      <div className="flex-1 glass-card rounded-xl overflow-hidden flex flex-col lg:flex-row">
        <div className="lg:w-56 border-b lg:border-b-0 lg:border-r border-border p-3 shrink-0">
          <div className="space-y-1">
            {folders.length > 0 ? folders.map((f) => {
              const Icon = folderIcons[f.id] || Inbox;
              return (
                <button
                  key={f.id}
                  onClick={() => { setActiveFolder(f.id); setSelectedId(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeFolder === f.id
                      ? "bg-amber/10 text-amber border border-amber/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left capitalize">{f.label}</span>
                  {f.count > 0 && (
                    <span className="text-[10px] font-mono bg-accent/50 px-1.5 py-0.5 rounded-full">
                      {f.count}
                    </span>
                  )}
                </button>
              );
            }) : (
              <>
                {["inbox", "sent", "drafts", "spam", "trash"].map((fid) => {
                  const Icon = folderIcons[fid] || Inbox;
                  return (
                    <button
                      key={fid}
                      onClick={() => { setActiveFolder(fid); setSelectedId(null); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeFolder === fid
                          ? "bg-amber/10 text-amber border border-amber/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1 text-left capitalize">{fid}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search emails..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-accent/50 border border-border text-xs focus:outline-none focus:border-amber/50"
              />
            </div>
            <button
              onClick={fetchEmails}
              className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors text-muted-foreground"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-amber border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">Loading emails...</span>
              </div>
            </div>
          ) : (
            <>
              {selectedMail && (
                <div className="flex-1 hidden lg:block">
                  <MailView mail={toMailItem(selectedMail)} body={selectedMail.body} onBack={() => setSelectedId(null)} />
                </div>
              )}
              <div className={`flex-1 overflow-auto ${selectedMail && "hidden lg:block"}`}>
                <MailList emails={filtered} selectedId={selectedId} onSelect={handleSelect} />
              </div>
              {selectedMail && (
                <div className="flex-1 lg:hidden overflow-auto">
                  <MailView mail={toMailItem(selectedMail)} body={selectedMail.body} onBack={() => setSelectedId(null)} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCompose && <ComposeMail onClose={() => setShowCompose(false)} />}
    </div>
  );
}
