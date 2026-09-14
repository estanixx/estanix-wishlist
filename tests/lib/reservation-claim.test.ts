// tests/lib/reservation-claim.test.ts — [RED] dual-write localStorage +
// sessionStorage helper for a visitor's own reservation (spec.md §6.3 /
// apply-progress instructions: "save {wishId, optionId, reservedAt} to BOTH
// localStorage (persistent) AND sessionStorage (session-only)... purely
// informational client-side state, the real/shared state lives in
// DynamoDB"). Mirrors tests/lib/visitor-storage.test.ts's fake-storage
// pattern (Phase 2 precedent) -- fails safe, never throws when storage is
// unavailable.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getReservationClaim, hasReservationClaim, reservationClaimKey, saveReservationClaim } from '../../lib/reservation-claim';

function installFakeStorage(): Storage {
  const store = new Map<string, string>();
  const fake: Storage = {
    getItem: key => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: key => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: index => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  return fake;
}

describe('reservation-claim', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', installFakeStorage());
    vi.stubGlobal('sessionStorage', installFakeStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saveReservationClaim writes the same claim to BOTH localStorage and sessionStorage', () => {
    saveReservationClaim({ wishId: 'w1', optionId: 'o1', reservedAt: '2026-01-01T00:00:00.000Z' });

    const key = reservationClaimKey('w1', 'o1');
    expect(localStorage.getItem(key)).toBe(JSON.stringify({ wishId: 'w1', optionId: 'o1', reservedAt: '2026-01-01T00:00:00.000Z' }));
    expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ wishId: 'w1', optionId: 'o1', reservedAt: '2026-01-01T00:00:00.000Z' }));
  });

  it('hasReservationClaim is false before any claim is saved for that wish/option', () => {
    expect(hasReservationClaim('w1', 'o1')).toBe(false);
  });

  it('hasReservationClaim is true after saveReservationClaim for that exact wish/option', () => {
    saveReservationClaim({ wishId: 'w1', optionId: 'o1', reservedAt: '2026-01-01T00:00:00.000Z' });
    expect(hasReservationClaim('w1', 'o1')).toBe(true);
  });

  it('hasReservationClaim does not leak across different options of the same wish', () => {
    saveReservationClaim({ wishId: 'w1', optionId: 'o1', reservedAt: '2026-01-01T00:00:00.000Z' });
    expect(hasReservationClaim('w1', 'o2')).toBe(false);
  });

  it('getReservationClaim returns the parsed claim', () => {
    saveReservationClaim({ wishId: 'w1', optionId: 'o1', reservedAt: '2026-01-01T00:00:00.000Z' });
    expect(getReservationClaim('w1', 'o1')).toEqual({ wishId: 'w1', optionId: 'o1', reservedAt: '2026-01-01T00:00:00.000Z' });
  });

  it('getReservationClaim returns null when nothing was saved', () => {
    expect(getReservationClaim('w1', 'o1')).toBeNull();
  });

  it('fails safe (never throws) when both storages are unavailable', () => {
    vi.stubGlobal('localStorage', undefined);
    vi.stubGlobal('sessionStorage', undefined);

    expect(() => saveReservationClaim({ wishId: 'w1', optionId: 'o1', reservedAt: '2026-01-01T00:00:00.000Z' })).not.toThrow();
    expect(hasReservationClaim('w1', 'o1')).toBe(false);
    expect(getReservationClaim('w1', 'o1')).toBeNull();
  });

  it('still saves to localStorage even when sessionStorage alone is unavailable', () => {
    vi.stubGlobal('sessionStorage', undefined);

    saveReservationClaim({ wishId: 'w1', optionId: 'o1', reservedAt: '2026-01-01T00:00:00.000Z' });

    expect(hasReservationClaim('w1', 'o1')).toBe(true);
  });
});
