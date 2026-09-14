'use client';

import { Trash2 } from 'lucide-react';

// components/OptionForm.tsx -- one option's editable fields inside
// WishForm's dynamic options list (spec.md §7: "each option: title,
// description, imageUrl, link... addable/removable before submit"). Purely
// controlled -- no fetch calls of its own -- so WishForm owns the full
// create/edit/diff-on-submit flow and this component stays a plain,
// reusable field group. `imageUrl` is a plain text input (locked decision:
// external URL only, no upload/file picker).
export type OptionFormValue = {
  /** Present only for an option that already exists in DynamoDB (edit mode); absent for one still local-only. */
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  link: string;
};

export function OptionForm({
  value,
  onChange,
  onRemove,
  disabled = false,
}: {
  value: OptionFormValue;
  onChange: (value: OptionFormValue) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  function set<K extends keyof OptionFormValue>(key: K, next: OptionFormValue[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/40 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Título" value={value.title} onChange={next => set('title', next)} disabled={disabled} required />
        <Field
          label="Enlace"
          value={value.link}
          onChange={next => set('link', next)}
          disabled={disabled}
          required
          placeholder="https://..."
        />
        <Field
          label="URL de imagen"
          value={value.imageUrl}
          onChange={next => set('imageUrl', next)}
          disabled={disabled}
          required
          placeholder="https://..."
        />
        <Field label="Descripción" value={value.description} onChange={next => set('description', next)} disabled={disabled} required />
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="inline-flex w-fit items-center gap-1.5 self-start text-sm font-medium text-danger transition duration-200 hover:text-danger-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Quitar opción
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground-secondary">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        className="rounded-lg border border-border-strong bg-background px-3 py-2 text-foreground outline-none focus:border-border-hover disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}
