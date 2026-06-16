"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";

/**
 * Light/dark switch for the site header. The icons swap via the `dark:` CSS
 * variant (driven by the `dark` class on <html>), so the correct icon shows as
 * soon as the theme class is applied. `mounted` only gates the dynamic
 * `aria-label` (kept stable across SSR/first paint to avoid a hydration
 * mismatch). Styled for the navy brand bar it lives on.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        mounted
          ? `Switch to ${isDark ? "light" : "dark"} theme`
          : "Toggle light and dark theme"
      }
      className="text-brand-foreground/80 hover:text-brand-foreground hover:bg-brand-foreground/10 grid size-9 place-items-center rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
    >
      <Sun className="hidden size-5 dark:block" />
      <Moon className="size-5 dark:hidden" />
    </button>
  );
}
