"use client";

/**
 * Tiny session-storage cache with TTL.
 *
 * Why: the Flow page priorities call takes ~45s on Sonnet. If the user
 * navigates away and back, we don't want to refetch — the data is
 * effectively stable for several minutes.
 *
 * The cache is per-tab (sessionStorage), so opening a new tab gets fresh data.
 * It's cleared automatically when the tab closes.
 */

const PREFIX = "ailibra_cache_v1:";

type Entry<T> = { data: T; t: number };

export function getCache<T>(key: string, ttlMs: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry<T>;
    if (Date.now() - parsed.t > ttlMs) {
      sessionStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ data, t: Date.now() } as Entry<T>));
  } catch {
    // quota exceeded etc. — silent.
  }
}

export function clearCache(key?: string): void {
  if (typeof window === "undefined") return;
  if (key) {
    sessionStorage.removeItem(PREFIX + key);
    return;
  }
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  for (const k of keys) sessionStorage.removeItem(k);
}

/**
 * In-flight request dedupe — if the same key is being fetched,
 * subsequent callers wait on the same promise instead of starting a new one.
 * Lives in module memory only (cleared on full reload).
 */
const inflight = new Map<string, Promise<unknown>>();

export async function fetchWithDedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = fetcher().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}
