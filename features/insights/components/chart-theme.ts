import type { CSSProperties } from "react";

/** Shared Recharts styling, wired to the app's theme tokens (adapts to dark). */
export const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 } as const;

export const TOOLTIP_STYLE: CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "var(--shadow-soft)",
};
