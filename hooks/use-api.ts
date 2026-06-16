"use client";

import { useEffect, useState } from "react";

/**
 * Tiny client data-fetching hook for our JSON API. Calls `url`, unwraps the
 * `{ success, data, error }` envelope (see `lib/api/response.ts`), and exposes
 * `{ data, loading, error, status, reload }`. Re-fetches whenever `url` changes
 * (or `reload()` is called); pass `null` to skip fetching until an id is known.
 *
 * `loading` is DERIVED (true until the latest response for the current url/nonce
 * arrives) rather than set synchronously inside the effect — this avoids the
 * cascading-render pattern the lint rules flag. Dependency-free by design (no
 * SWR/React Query) to match the project's lean client stack. For server-owned
 * reads that needn't be visible browser calls, fetch in a Server Component.
 */
export type ApiResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Status code of the last response (e.g. 404), or null on network failure. */
  status: number | null;
  reload: () => void;
};

type Snapshot<T> = {
  url: string;
  nonce: number;
  data: T | null;
  error: string | null;
  status: number | null;
};

export function useApi<T>(url: string | null): ApiResult<T> {
  const [nonce, setNonce] = useState(0);
  const [snap, setSnap] = useState<Snapshot<T> | null>(null);

  useEffect(() => {
    if (!url) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!active) return;
        const ok = res.ok && !json?.error;
        setSnap({
          url,
          nonce,
          status: res.status,
          data: ok ? ((json?.data ?? null) as T) : null,
          error: ok
            ? null
            : json?.error?.message || `Request failed (${res.status})`,
        });
      } catch (err) {
        if (!active) return;
        setSnap({
          url,
          nonce,
          status: null,
          data: null,
          error: err instanceof Error ? err.message : "Something went wrong",
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [url, nonce]);

  const fresh = snap !== null && snap.url === url && snap.nonce === nonce;
  return {
    data: fresh ? snap.data : null,
    loading: Boolean(url) && !fresh,
    error: fresh ? snap.error : null,
    status: fresh ? snap.status : null,
    reload: () => setNonce((n) => n + 1),
  };
}
