// tests/lib/visitor-storage.test.ts — [RED] dedup behavior for the
// once-per-visitor visit counter (spec.md `visit-counter` requirement).
// Mocks localStorage and injects a fake fetch impl; deliberately does NOT
// touch the real DynamoDB-backed /api/visits endpoint (per apply-progress
// instructions -- that atomic-increment path is already covered by the
// repository/route layer, not this unit).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasCountedVisit, markVisitCounted, registerVisitOnce, VISIT_COUNTED_KEY } from '../../lib/visitor-storage';

function installFakeLocalStorage(): Storage {
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
  vi.stubGlobal('localStorage', fake);
  return fake;
}

describe('visitor-storage', () => {
  beforeEach(() => {
    installFakeLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hasCountedVisit is false when the dedup key is absent', () => {
    expect(hasCountedVisit()).toBe(false);
  });

  it('markVisitCounted sets the dedup key so a later check reports true', () => {
    markVisitCounted();
    expect(hasCountedVisit()).toBe(true);
    expect(localStorage.getItem(VISIT_COUNTED_KEY)).toBe('true');
  });

  it('hasCountedVisit returns true when localStorage is unavailable (fail safe, never re-fire)', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(hasCountedVisit()).toBe(true);
  });

  it('registerVisitOnce calls the injected fetch exactly once and marks counted on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });

    await registerVisitOnce(fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith('/api/visits', { method: 'POST' });
    expect(hasCountedVisit()).toBe(true);
  });

  it('registerVisitOnce does not call fetch again once already counted', async () => {
    markVisitCounted();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });

    await registerVisitOnce(fetchImpl);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('registerVisitOnce does not mark counted when the response is not ok, so a later load retries', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false });

    await registerVisitOnce(fetchImpl);

    expect(hasCountedVisit()).toBe(false);
  });

  it('registerVisitOnce does not mark counted when fetch itself rejects (network failure)', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(registerVisitOnce(fetchImpl)).resolves.toBeUndefined();
    expect(hasCountedVisit()).toBe(false);
  });
});
