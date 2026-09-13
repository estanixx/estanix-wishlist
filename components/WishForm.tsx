'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { WishWithOptions } from '@/lib/types';
import { MAX_OPTIONS_PER_WISH } from '@/lib/validation';
import { canAddOption, validateWishForm } from '@/lib/wish-form-validation';
import { OptionForm, type OptionFormValue } from './OptionForm';
import { ConfirmModal } from './ConfirmModal';

export type WishFormMode = 'create' | 'edit';

function emptyOption(): OptionFormValue {
  return { title: '', description: '', imageUrl: '', link: '' };
}

function toOptionFormValues(wish?: WishWithOptions): OptionFormValue[] {
  if (!wish) return [];
  return wish.options.map(option => ({
    id: option.id,
    title: option.title,
    description: option.description,
    imageUrl: option.imageUrl,
    link: option.link,
  }));
}

function optionChanged(original: OptionFormValue, current: OptionFormValue): boolean {
  return (
    original.title !== current.title ||
    original.description !== current.description ||
    original.imageUrl !== current.imageUrl ||
    original.link !== current.link
  );
}

async function throwOnError(response: Response): Promise<void> {
  if (response.ok) return;
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  throw new Error(body?.error ?? `La operación falló (HTTP ${response.status}).`);
}

// components/WishForm.tsx -- create/edit a wish + its options (spec.md §7).
// All edits (title/description/oneIsEnough/reservable + options
// added/edited/removed) are staged in local state and only reach the API on
// submit ("Multiple options addable/removable in the form before submit").
//
// Create mode: a single POST /api/admin/wishes creates the wish and every
// option together (design.md access pattern #3, transactional).
// Edit mode: PATCH the wish fields, then diff the options array against
// wish.options -- DELETE removed ones, PATCH changed ones, POST new ones.
export function WishForm({ mode, wish }: { mode: WishFormMode; wish?: WishWithOptions }) {
  const router = useRouter();
  const [title, setTitle] = useState(wish?.title ?? '');
  const [description, setDescription] = useState(wish?.description ?? '');
  const [oneIsEnough, setOneIsEnough] = useState(wish?.oneIsEnough ?? false);
  const [reservable, setReservable] = useState(wish?.reservable ?? true);
  const [options, setOptions] = useState<OptionFormValue[]>(toOptionFormValues(wish));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const originalOptions = toOptionFormValues(wish);

  function updateOption(index: number, value: OptionFormValue) {
    setOptions(current => current.map((option, i) => (i === index ? value : option)));
  }

  function addOption() {
    if (!canAddOption(options.length)) {
      setError(`Un deseo no puede tener más de ${MAX_OPTIONS_PER_WISH} opciones.`);
      return;
    }
    setError(null);
    setOptions(current => [...current, emptyOption()]);
  }

  function removeOption(index: number) {
    setOptions(current => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateWishForm({ title, options });
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(true);
    setError(null);

    try {
      if (mode === 'create') {
        const response = await fetch('/api/admin/wishes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, oneIsEnough, reservable, options }),
        });
        await throwOnError(response);
      } else if (wish) {
        await throwOnError(
          await fetch(`/api/admin/wishes/${wish.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, oneIsEnough, reservable }),
          }),
        );

        const currentIds = new Set(options.filter(option => option.id).map(option => option.id));
        for (const original of originalOptions) {
          if (original.id && !currentIds.has(original.id)) {
            const response = await fetch(`/api/admin/wishes/${wish.id}/options/${original.id}`, { method: 'DELETE' });
            if (!response.ok && response.status !== 404) await throwOnError(response);
          }
        }

        for (const option of options) {
          if (option.id) {
            const original = originalOptions.find(candidate => candidate.id === option.id);
            if (original && optionChanged(original, option)) {
              await throwOnError(
                await fetch(`/api/admin/wishes/${wish.id}/options/${option.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: option.title,
                    description: option.description,
                    imageUrl: option.imageUrl,
                    link: option.link,
                  }),
                }),
              );
            }
          } else {
            await throwOnError(
              await fetch(`/api/admin/wishes/${wish.id}/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: option.title,
                  description: option.description,
                  imageUrl: option.imageUrl,
                  link: option.link,
                }),
              }),
            );
          }
        }
      }

      router.push('/me');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el deseo.');
    } finally {
      setPending(false);
    }
  }

  async function confirmDeleteWish() {
    if (!wish) return;
    setDeletePending(true);
    try {
      const response = await fetch(`/api/admin/wishes/${wish.id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 404) await throwOnError(response);
      router.push('/me');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el deseo.');
      setDeleteOpen(false);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-300">Título</span>
        <input
          value={title}
          onChange={event => setTitle(event.target.value)}
          required
          disabled={pending}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-300">Descripción</span>
        <textarea
          value={description}
          onChange={event => setDescription(event.target.value)}
          rows={3}
          disabled={pending}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={oneIsEnough}
            onChange={event => setOneIsEnough(event.target.checked)}
            disabled={pending}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
          />
          Con una opción alcanza
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={reservable}
            onChange={event => setReservable(event.target.checked)}
            disabled={pending}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
          />
          Reservable
        </label>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-300">
            Opciones ({options.length}/{MAX_OPTIONS_PER_WISH})
          </h2>
          <button
            type="button"
            onClick={addOption}
            disabled={pending || !canAddOption(options.length)}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-100 transition duration-200 hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Agregar opción
          </button>
        </div>

        {options.length === 0 && <p className="text-sm text-zinc-500">Todavía no hay opciones.</p>}

        {options.map((option, index) => (
          <OptionForm
            key={option.id ?? `new-${index}`}
            value={option}
            onChange={value => updateOption(index, value)}
            onRemove={() => removeOption(index)}
            disabled={pending}
          />
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition duration-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Guardando…' : 'Guardar'}
        </button>

        {mode === 'edit' && (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={pending}
            className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 transition duration-200 hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Eliminar deseo
          </button>
        )}
      </div>

      {mode === 'edit' && (
        <ConfirmModal
          open={deleteOpen}
          description="Esto elimina el deseo y todas sus opciones. No se puede deshacer."
          pending={deletePending}
          onConfirm={confirmDeleteWish}
          onCancel={() => {
            if (deletePending) return;
            setDeleteOpen(false);
          }}
        />
      )}
    </form>
  );
}
