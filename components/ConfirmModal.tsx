'use client';

// components/ConfirmModal.tsx -- custom "¿Estás seguro?" confirm dialog,
// spec.md §6.3: "custom modal/floating window, NOT native confirm()".
// Deliberately a plain controlled overlay (not the native <dialog> element's
// showModal()) so it renders in jsdom without a `not implemented` error and
// stays trivially reusable for Phase 4's admin reset flow (design.md: "used
// for both reserve and admin reset"), which needs the exact same
// confirm/cancel shape with different copy.
export type ConfirmModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  /** When set, the modal switches to an error state: hides the confirm
   * action (retrying a resolved reservation attempt is meaningless) and
   * shows only a close button (spec.md: "show an error message ... refresh
   * the page's reservation state"). */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title = '¿Estás seguro?',
  description,
  confirmLabel = 'Sí',
  cancelLabel = 'Volver',
  pending = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={error ? 'No se pudo reservar' : title}
        className="w-full max-w-sm animate-scale-in rounded-2xl border border-border bg-surface p-6 shadow-xl"
        onClick={event => event.stopPropagation()}
      >
        <p className="text-base font-medium text-foreground">{error ? 'No se pudo reservar' : title}</p>
        {description && !error && <p className="mt-2 text-sm text-foreground-muted">{description}</p>}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          {error ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition duration-200 hover:bg-accent-hover"
            >
              Cerrar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onCancel}
                disabled={pending}
                className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-foreground transition duration-200 hover:border-border-hover hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? 'Reservando…' : confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
