// lib/validation.ts — cross-cutting validation shared by lib/wish-repository.ts
// and (in a later phase) the admin CRUD routes.

// 25-item TransactWriteItems cap: a global reset transaction is
// 1 METADATA + N options, so N <= 24 is the hard architectural ceiling.
// 20 gives headroom and is a sane product limit (design.md Decision 3).
export const MAX_OPTIONS_PER_WISH = 20;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function assertOptionCountWithinLimit(count: number): void {
  if (count > MAX_OPTIONS_PER_WISH) {
    throw new ValidationError(`A wish cannot have more than ${MAX_OPTIONS_PER_WISH} options (got ${count}).`);
  }
}

export function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function assertValidOptionUrls(option: { imageUrl: string; link: string }): void {
  if (!isValidUrl(option.imageUrl)) {
    throw new ValidationError(`Option imageUrl is not a valid URL: ${option.imageUrl}`);
  }
  if (!isValidUrl(option.link)) {
    throw new ValidationError(`Option link is not a valid URL: ${option.link}`);
  }
}
