import { useEffect, useCallback } from "react";

type KeyMap = Record<string, () => void>;

export function useKeyboard(keyMap: KeyMap, enabled = true) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      const isInput = (e.target as HTMLElement)?.tagName === "INPUT" ||
        (e.target as HTMLElement)?.tagName === "TEXTAREA";

      const key = [
        e.metaKey ? "Cmd" : "",
        e.ctrlKey ? "Ctrl" : "",
        e.key.toUpperCase(),
      ]
        .filter(Boolean)
        .join("+");

      if (keyMap[key] && !(isInput && key.length === 1)) {
        e.preventDefault();
        keyMap[key]();
      }
    },
    [keyMap, enabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
