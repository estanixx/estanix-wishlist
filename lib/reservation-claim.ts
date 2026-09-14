// lib/reservation-claim.ts -- purely informational client-side record of
// "I (this browser) reserved this option", persisted per spec.md §6.3:
// "save {wishId, optionId, reservedAt} to BOTH localStorage (persistent) AND
// sessionStorage (session-only)... the real/shared state lives in DynamoDB".
// Same fail-safe shape as lib/visitor-storage.ts (Phase 2): never throws,
// degrades to "no claim" when storage is unreachable.

export type ReservationClaim = {
  wishId: string;
  optionId: string;
  reservedAt: string;
};

export function reservationClaimKey(wishId: string, optionId: string): string {
  return `wishlist_reservation:${wishId}:${optionId}`;
}

function getStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  // Bare global lookup (not `window.x`) keeps this file import-safe from
  // server code without a 'use client' directive of its own -- on the
  // server / in a test without a stub it's simply `undefined`.
  const storage = kind === 'localStorage' ? localStorage : sessionStorage;
  if (typeof storage === 'undefined') return null;
  return storage;
}

/** Best-effort dual write -- a single storage failing never blocks the other, and never throws up to the caller. */
export function saveReservationClaim(claim: ReservationClaim): void {
  const key = reservationClaimKey(claim.wishId, claim.optionId);
  const serialized = JSON.stringify(claim);

  for (const kind of ['localStorage', 'sessionStorage'] as const) {
    const storage = getStorage(kind);
    if (!storage) continue;
    try {
      storage.setItem(key, serialized);
    } catch {
      // ignore -- storage unavailable/full, this is informational only
    }
  }
}

/** Reads localStorage first (persistent), falling back to sessionStorage. */
export function hasReservationClaim(wishId: string, optionId: string): boolean {
  return getReservationClaim(wishId, optionId) !== null;
}

export function getReservationClaim(wishId: string, optionId: string): ReservationClaim | null {
  const key = reservationClaimKey(wishId, optionId);

  for (const kind of ['localStorage', 'sessionStorage'] as const) {
    const storage = getStorage(kind);
    if (!storage) continue;
    try {
      const raw = storage.getItem(key);
      if (raw) return JSON.parse(raw) as ReservationClaim;
    } catch {
      // ignore -- corrupt/unreachable storage, try the next one
    }
  }

  return null;
}
