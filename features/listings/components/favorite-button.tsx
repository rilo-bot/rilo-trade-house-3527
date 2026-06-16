"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useFavoritesStore } from "@/stores/favorites-store-provider";
import { cn } from "@/lib/utils";

/**
 * Save-to-wishlist heart shown on property cards and detail pages.
 *
 * - With a `listingId`, it's wired to the favorites store: optimistic toggle +
 *   POST/DELETE to `/api/favorites`, reverting on failure. Guests are sent to
 *   sign-in. The saved state is shared across the app via the store, so every
 *   heart for the same listing (and the navbar badge) updates together.
 * - Without a `listingId` (demo/placeholder cards), it falls back to local-only
 *   visual state so the UI still works.
 */
export function FavoriteButton({
  listingId,
  label = "Save to wishlist",
  className,
}: {
  listingId?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthed = Boolean(session?.user);

  // Connected (store) state when we have a real id; local stub otherwise.
  const savedInStore = useFavoritesStore((s) =>
    listingId ? s.ids.has(listingId) : false,
  );
  const add = useFavoritesStore((s) => s.add);
  const remove = useFavoritesStore((s) => s.remove);

  const [localSaved, setLocalSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const saved = listingId ? savedInStore : localSaved;

  const handleClick = async (e: React.MouseEvent) => {
    // The card is usually wrapped in a <Link>; don't navigate when toggling.
    e.preventDefault();
    e.stopPropagation();

    if (!listingId) {
      setLocalSaved((s) => !s);
      return;
    }

    if (!isAuthed) {
      router.push("/auth/sign-in");
      return;
    }

    const next = !saved;
    // Optimistic update.
    if (next) add(listingId);
    else remove(listingId);
    setPending(true);
    try {
      const res = next
        ? await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listingId }),
          })
        : await fetch(`/api/favorites/${listingId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Request failed");
    } catch {
      // Revert on failure.
      if (next) remove(listingId);
      else add(listingId);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={handleClick}
      className={cn(
        "bg-background/90 text-foreground grid size-9 place-items-center rounded-full shadow-sm backdrop-blur transition-transform hover:scale-105 active:scale-95 disabled:opacity-70",
        className,
      )}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Heart
          className={cn(
            "size-4 transition-colors",
            saved && "fill-destructive text-destructive",
          )}
        />
      )}
    </button>
  );
}
