'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveReservationClaim } from '@/lib/reservation-claim';
import { ConfirmModal } from './ConfirmModal';

// components/ReserveButton.tsx -- "Regalaré esto" (spec.md §6.2/6.3's
// reservation flow, design.md's Data Flow race-critical path). Owns the
// full click -> confirm -> POST -> settle cycle for one option:
//
//   1. click "Regalaré esto"        -> open ConfirmModal
//   2. "Volver"                     -> close modal, no-op (no fetch)
//   3. "Sí"                         -> POST /api/wishes/:w/options/:o/reserve
//        200 -> dual-write the claim (lib/reservation-claim.ts) + close
//               modal + router.refresh() so the force-dynamic page re-reads
//               DynamoDB and every other option/band reflects real state
//        409/403/404 -> keep the modal open in its error state (see
//               ConfirmModal) + router.refresh() anyway, so a losing
//               reserver never sees stale "still available" UI
export function ReserveButton({ wishId, optionId, disabled = false }: { wishId: string; optionId: string; disabled?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setError(null);
    setOpen(true);
  }

  function closeModal() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  async function confirmReserve() {
    setPending(true);
    try {
      const response = await fetch(`/api/wishes/${wishId}/options/${optionId}/reserve`, { method: 'POST' });
      const body = (await response.json().catch(() => null)) as { error?: string; option?: { reservedAt?: string } } | null;

      if (response.ok) {
        saveReservationClaim({ wishId, optionId, reservedAt: body?.option?.reservedAt ?? new Date().toISOString() });
        setOpen(false);
        setError(null);
        router.refresh();
        return;
      }

      // 409/403/404 -- someone else won the race, or state changed under us.
      // Never leave stale UI: refresh the page's server-rendered state too.
      setError(body?.error ?? 'No se pudo completar la reserva.');
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
        onClick={openModal}
        disabled={disabled}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        Regalaré esto
      </button>
      <ConfirmModal
        open={open}
        description="Vas a reservar este regalo. Los demás visitantes dejarán de poder elegirlo."
        pending={pending}
        error={error}
        onConfirm={confirmReserve}
        onCancel={closeModal}
      />
    </>
  );
}
