"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

// The backend host may need up to a minute to wake from sleep; don't spin forever after that.
const TIMEOUT_MS = 75_000;

/** Calls /api/admin/*. Throws ApiError with the server's message on failure (status 0 = no response). */
export async function adminFetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new ApiError(
      err instanceof DOMException && err.name === "TimeoutError"
        ? "The server took too long to respond. It may be starting up; please try again."
        : "Couldn't reach the server. Check your internet connection and try again.",
      0,
    );
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const fallback = res.status >= 500 ? "The server isn't responding right now. Please try again in a minute." : "Something went wrong";
    throw new ApiError(data.error ?? fallback, res.status);
  }
  return data;
}

// Last response per admin path, kept for this browser tab only. Revisiting a page shows it
// instantly while a fresh copy loads in the background.
const cache = new Map<string, unknown>();

/** Forget cached admin data (on login/logout, so one session never sees another's). */
export function clearAdminCache() {
  cache.clear();
}

/**
 * Loads `path` on mount and whenever it changes; `reload` refetches, `setData` applies a
 * mutation's response. Cached data for the path is returned immediately, then refreshed.
 */
export function useAdminData<T>(path: string | null) {
  const router = useRouter();
  const [entry, setEntry] = useState<{ path: string | null; data: T | null }>(() => ({
    path,
    data: path ? ((cache.get(path) as T | undefined) ?? null) : null,
  }));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latestPath = useRef(path);
  useEffect(() => {
    latestPath.current = path;
  }, [path]);

  // On a path change, show that path's cached copy (if any) until the fresh one arrives.
  const data = entry.path === path ? entry.data : path ? ((cache.get(path) as T | undefined) ?? null) : null;

  const setData = useCallback(
    (next: T) => {
      if (path) cache.set(path, next);
      setEntry({ path, data: next });
    },
    [path],
  );

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await adminFetch<T>(path);
      // A slower response for an older path (e.g. a previous filter) must not overwrite this one.
      if (latestPath.current !== path) return;
      cache.set(path, fresh);
      setEntry({ path, data: fresh });
      setError(null);
    } catch (err) {
      if (latestPath.current !== path) return;
      // Session expired: log in again, then come back here.
      if (err instanceof ApiError && err.status === 401) {
        router.replace(`/admin/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      setError(err instanceof Error ? err.message : "Couldn't load");
    } finally {
      setLoading(false);
    }
  }, [path, router]);

  useEffect(() => {
    // Data comes from the backend API; fetch whenever the requested path changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  return { data, setData, error, loading, reload };
}

/** Runs a mutation and tracks busy/error state for its button or form. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, run, setError };
}
