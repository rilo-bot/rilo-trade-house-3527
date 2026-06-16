"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Hides the marketing footer on app screens where it looks out of place: auth
 * pages (`/auth/*`) and the signed-in account/dashboard areas. The footer stays
 * a Server Component — it's passed in as `children` and this client wrapper only
 * decides whether to show it.
 */
const HIDE_FOOTER_PREFIXES = ["/auth", "/account", "/dashboard", "/admin"];

export function ConditionalFooter({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (HIDE_FOOTER_PREFIXES.some((p) => pathname?.startsWith(p))) return null;
  return <>{children}</>;
}
