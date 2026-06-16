"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { UIStoreProvider } from "@/stores/ui-store-provider";
import { FavoritesStoreProvider } from "@/stores/favorites-store-provider";
import { AssistantStoreProvider } from "@/stores/assistant-store-provider";

/**
 * Single place to compose all client-side context providers (theme, Zustand
 * stores, query client, etc.). Keeping them here keeps the root layout a Server
 * Component and avoids nesting providers ad hoc.
 *
 * `ThemeProvider` toggles a `dark` class on <html> (matching the `.dark`
 * tokens in globals.css). It needs `suppressHydrationWarning` on <html> — set
 * in app/layout.tsx — because it sets the class before React hydrates.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <UIStoreProvider>
        <FavoritesStoreProvider>
          <AssistantStoreProvider>{children}</AssistantStoreProvider>
        </FavoritesStoreProvider>
      </UIStoreProvider>
    </ThemeProvider>
  );
}
