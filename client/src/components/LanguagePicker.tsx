/**
 * Language picker — lets users switch UI language.
 * Persists choice in localStorage.
 */
import { Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { setLocale, getLocale, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

export function LanguagePicker() {
  const [current, setCurrent] = useState<Locale>(getLocale());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.03] border border-white/5 text-xs hover:bg-white/[0.06] transition-colors"
        title="Change language"
      >
        <Globe className="w-3 h-3 text-white/60" />
        <span className="font-mono uppercase">{current}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50">
          {SUPPORTED_LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLocale(l.code); setCurrent(l.code); setOpen(false); window.location.reload(); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors ${current === l.code ? "bg-primary/10 text-primary" : ""}`}
            >
              <span>{l.flag}</span>
              <span className="flex-1 text-left">{l.label}</span>
              <span className="text-xs text-muted-foreground font-mono uppercase">{l.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}