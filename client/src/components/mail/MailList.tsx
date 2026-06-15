import { Star, Paperclip, Archive } from "lucide-react";

export interface MailItem {
  id: string;
  from: string;
  email: string;
  subject: string;
  preview: string;
  date: string;
  timestamp: number;
  unread: boolean;
  starred: boolean;
  hasAttachments: boolean;
  category: string;
}

export default function MailList({
  emails,
  selectedId,
  onSelect,
}: {
  emails: MailItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">No messages in this folder</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {emails.map((mail) => (
        <button
          key={mail.id}
          onClick={() => onSelect(mail.id)}
          className={`w-full text-left px-4 py-3 transition-all hover:bg-accent/30 ${
            selectedId === mail.id ? "bg-accent/40 border-l-2 border-l-amber" : ""
          } ${mail.unread ? "" : "opacity-70"}`}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-steel/20 flex items-center justify-center text-[11px] font-semibold text-steel shrink-0 mt-0.5">
              {mail.from.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm truncate ${mail.unread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {mail.from}
                </span>
                {mail.starred && <Star className="w-3 h-3 text-amber fill-amber shrink-0" />}
                {mail.hasAttachments && <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />}
              </div>
              <div className={`text-sm truncate mt-0.5 ${mail.unread ? "text-foreground" : "text-muted-foreground"}`}>
                {mail.subject}
              </div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">{mail.preview}</div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground font-mono">{mail.date}</span>
              {mail.unread && <div className="w-2 h-2 rounded-full bg-amber" />}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
