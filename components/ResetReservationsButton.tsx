'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

// components/ResetReservationsButton.tsx -- "Resetear reservaciones"
// (spec.md §7, locked decision: global only, no per-wish scope). Reuses the
// SAME ConfirmModal built in Phase 3 for the reserve flow -- explicit
// instruction, no second confirm dialog.
export function ResetReservationsButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmReset() {
    setPending(true);
    try {
      const response = await fetch('/api/admin/reset-reservations', { method: 'POST' });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'No se pudo resetear las reservaciones.');
        return;
      }
      setOpen(false);
      setError(null);
      router.refresh();
    } catch {
      setError('No se pudo conectar. Intentá de nuevo.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-danger-accent/40 px-4 py-2 text-sm font-medium text-danger transition duration-200 hover:border-danger-accent hover:bg-danger-accent/10"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Resetear reservaciones
      </button>
      <ConfirmModal
        open={open}
        description="Esto libera TODAS las reservas de TODOS los deseos. No se puede deshacer."
        pending={pending}
        error={error}
        onConfirm={confirmReset}
        onCancel={() => {
          if (pending) return;
          setOpen(false);
          setError(null);
        }}
      />
    </>
  );
}
