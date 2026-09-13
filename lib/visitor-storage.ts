// lib/visitor-storage.ts -- once-per-visitor dedup for the atomic visit
// counter (design.md Decision 6 area / spec.md `visit-counter` requirement:
// "Once-per-visitor dedup, both entry points"). Pure, browser-storage-only
// logic with no DynamoDB/network knowledge beyond firing the already-built
// `POST /api/visits` route -- deliberately shared by both `/shared` (Phase 2,
// this module) and `/shared/[wishId]` (Phase 3) via the same localStorage key,
// so the dedup rule can never drift between the two entry points.

export const VISIT_COUNTED_KEY = 'wishlist_visit_counted';

function getStorage(): Storage | null {
  // `localStorage` is a bare global (not `window.localStorage`) so this file
  // stays import-safe from server code (RSC) without needing a `'use client'`
  // directive itself -- on the server / in a test without a stub it is simply
  // `undefined`, and every accessor below fails safe around that.
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

/**
 * Whether this visitor has already been counted. Fails safe to `true`
 * (i.e. "already counted, do nothing") whenever storage is unreachable --
 * on the server, or if the browser blocks storage (private mode) -- so a
 * missing localStorage can never cause a POST retry loop.
 */
export function hasCountedVisit(): boolean {
  const storage = getStorage();
  if (!storage) return true;
  try {
    return storage.getItem(VISIT_COUNTED_KEY) === 'true';
  } catch {
    return true;
  }
}

/** Best-effort marker write -- a storage failure here just means a future load may re-fire, never a crash. */
export function markVisitCounted(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(VISIT_COUNTED_KEY, 'true');
  } catch {
    // ignore -- storage unavailable/full, nothing else to do
  }
}

/**
 * Fires `POST /api/visits` at most once per visitor. Safe to call on every
 * mount of `VisitCounterEffect` (Phase 2 and Phase 3 both render it): it is a
 * no-op once `markVisitCounted()` has run, and it deliberately does NOT mark
 * counted on a failed/errored request, so a real failed increment gets
 * retried on the visitor's next page load instead of being silently lost.
 */
export async function registerVisitOnce(fetchImpl: typeof fetch = fetch): Promise<void> {
  if (hasCountedVisit()) return;
  try {
    const response = await fetchImpl('/api/visits', { method: 'POST' });
    if (response.ok) markVisitCounted();
  } catch {
    // network failure -- leave uncounted so a later load retries
  }
}
