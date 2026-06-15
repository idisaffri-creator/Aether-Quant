import { ArrowLeft, Star, Trash2, Archive, Reply, Forward } from "lucide-react";
import type { MailItem } from "./MailList";

export default function MailView({
  mail,
  body,
  onBack,
}: {
  mail: MailItem;
  body: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors lg:hidden">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground">
          <Archive className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        <div>
          <h2 className="text-lg font-display font-bold">{mail.subject}</h2>
          <div className="flex items-center gap-3 mt-3">
            <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center text-sm font-bold text-amber shrink-0">
              {mail.from.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium">{mail.from}</div>
              <div className="text-xs text-muted-foreground">{mail.email}</div>
            </div>
            <div className="flex-1" />
            <div className="text-xs text-muted-foreground font-mono">{mail.date}</div>
            <button className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors">
              <Star className={`w-4 h-4 ${mail.starred ? "text-amber fill-amber" : "text-muted-foreground"}`} />
            </button>
          </div>
        </div>

        <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {body || "No content available."}
        </div>
      </div>

      <div className="flex items-center gap-2 p-4 border-t border-border">
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-accent/50 text-muted-foreground hover:text-foreground transition-all">
          <Reply className="w-3.5 h-3.5" />
          Reply
        </button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-accent/50 text-muted-foreground hover:text-foreground transition-all">
          <Forward className="w-3.5 h-3.5" />
          Forward
        </button>
      </div>
    </div>
  );
}
