// lib/wish-form-validation.ts — pure client-side validation for the admin
// WishForm (components/WishForm.tsx). Mirrors lib/validation.ts's rules
// (MAX_OPTIONS_PER_WISH, URL shape) so the admin gets immediate feedback
// before hitting the API. The server-side checks in lib/validation.ts and
// lib/wish-repository.ts remain authoritative -- this never replaces them.

import { isValidUrl, MAX_OPTIONS_PER_WISH } from './validation';

export type WishFormOptionInput = {
  title: string;
  description: string;
  imageUrl: string;
  link: string;
};

export type WishFormInput = {
  title: string;
  options: WishFormOptionInput[];
};

export function validateWishForm(input: WishFormInput): string | null {
  if (!input.title.trim()) return 'El título es obligatorio.';

  if (input.options.length > MAX_OPTIONS_PER_WISH) {
    return `Un deseo no puede tener más de ${MAX_OPTIONS_PER_WISH} opciones.`;
  }

  for (const option of input.options) {
    if (!option.title.trim() || !option.description.trim() || !option.imageUrl.trim() || !option.link.trim()) {
      return 'Todas las opciones necesitan título, descripción, URL de imagen y enlace.';
    }
    if (!isValidUrl(option.imageUrl) || !isValidUrl(option.link)) {
      return 'La URL de imagen y el enlace deben ser URLs válidas (http:// o https://).';
    }
  }

  return null;
}

export function canAddOption(currentCount: number): boolean {
  return currentCount < MAX_OPTIONS_PER_WISH;
}
