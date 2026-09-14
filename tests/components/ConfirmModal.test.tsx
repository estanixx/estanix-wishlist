// @vitest-environment jsdom
// tests/components/ConfirmModal.test.tsx -- [RED->GREEN] spec.md §6.3's
// reservation flow: "Volver" must close the modal and make no reserve call;
// "Sí" must call the reserve endpoint exactly once. Exercised through
// ReserveButton (the real caller), not just ConfirmModal in isolation, so
// "no reserve call" is proven against the actual wiring, not a mock of it.

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReserveButton } from '../../components/ReserveButton';
import { ConfirmModal } from '../../components/ConfirmModal';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

function installFakeStorage(): Storage {
  const store = new Map<string, string>();
  return {
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
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockClear();
});

describe('ConfirmModal (standalone)', () => {
  it('renders nothing when closed', () => {
    render(<ConfirmModal open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clicking "Volver" calls onCancel and never onConfirm', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmModal open onConfirm={onConfirm} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('clicking "Sí" calls onConfirm', () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal open onConfirm={onConfirm} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('ReserveButton + ConfirmModal (wired)', () => {
  it('"Regalaré esto" -> "Volver" closes the modal and makes NO reserve call', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<ReserveButton wishId="w1" optionId="o1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Regalaré esto' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('"Regalaré esto" -> "Sí" POSTs the reserve endpoint exactly once and saves the claim on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, option: { reservedAt: '2026-01-01T00:00:00.000Z' } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('localStorage', installFakeStorage());
    vi.stubGlobal('sessionStorage', installFakeStorage());

    render(<ReserveButton wishId="w1" optionId="o1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Regalaré esto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/wishes/w1/options/o1/reserve', { method: 'POST' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(localStorage.getItem('wishlist_reservation:w1:o1')).toContain('2026-01-01T00:00:00.000Z');
    expect(sessionStorage.getItem('wishlist_reservation:w1:o1')).toContain('2026-01-01T00:00:00.000Z');
    expect(refresh).toHaveBeenCalled();
  });

  it('on 409 shows the error inside the modal and still refreshes (never leaves stale UI)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Alguien más acaba de reservar esta opción.', reason: 'option_taken' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ReserveButton wishId="w1" optionId="o1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Regalaré esto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));

    await waitFor(() => expect(screen.getByText('Alguien más acaba de reservar esta opción.')).toBeInTheDocument());
    expect(refresh).toHaveBeenCalled();
    // error state hides the confirm action, only a close button remains
    expect(screen.queryByRole('button', { name: 'Sí' })).not.toBeInTheDocument();
  });
});
