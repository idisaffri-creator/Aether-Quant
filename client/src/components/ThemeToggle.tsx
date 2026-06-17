/**
 * Theme toggle — dark/light/auto, persisted to user preferences.
 */
import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { userAtom } from "@/store/auth";
import { api } from "@/lib/api";
import { Sun, Moon, Monitor } from "lucide-react";
import { toast } from "sonner";

type Theme = "dark" | "light" | "auto";

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const effective = theme === "auto" ? getSystemTheme() : theme;
  root.classList.remove("light", "dark");
  root.classList.add(effective);
  root.style.colorScheme = effective;
}

export function useTheme() {
  const [user, setUser] = useAtom(userAtom);
  const [theme, setThemeState] = useState<Theme>(
    () => (user?.preferences as any)?.appearance?.theme || "dark",
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => applyTheme("auto");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  async function setTheme(t: Theme) {
    setThemeState(t);
    applyTheme(t);
    if (user) {
      try {
        const prefs = { appearance: { theme: t as "dark" | "light" | "system" } } as any;
        const updated = await api.auth.updatePreferences(prefs);
        if (updated?.preferences) {
          setUser({ ...user, preferences: updated.preferences as any });
        }
      } catch (err) {
        toast.error("Failed to save theme preference");
      }
    }
  }

  return { theme, setTheme };
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="inline-flex bg-card border border-border rounded-lg p-0.5">
      {[
        { v: "dark", icon: <Moon className="w-3.5 h-3.5" /> },
        { v: "light", icon: <Sun className="w-3.5 h-3.5" /> },
        { v: "auto", icon: <Monitor className="w-3.5 h-3.5" /> },
      ].map(opt => (
        <button
          key={opt.v}
          onClick={() => setTheme(opt.v as Theme)}
          className={`p-1.5 rounded transition-colors ${
            theme === opt.v
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title={opt.v}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}
