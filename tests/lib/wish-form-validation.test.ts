// tests/lib/wish-form-validation.test.ts — [RED] client-side validation for
// the admin WishForm (components/WishForm.tsx): required-title, per-option
// required fields, per-option URL shape, and the 20-option cap enforced in
// the form itself, not just server-side (apply-progress instructions,
// mirrors lib/validation.ts's MAX_OPTIONS_PER_WISH).

import { describe, expect, it } from 'vitest';
import { MAX_OPTIONS_PER_WISH } from '../../lib/validation';
import { canAddOption, validateWishForm, type WishFormOptionInput } from '../../lib/wish-form-validation';

function validOption(overrides: Partial<WishFormOptionInput> = {}): WishFormOptionInput {
  return {
    title: 'Zapatillas',
    description: 'Talle 42',
    imageUrl: 'https://example.com/shoes.jpg',
    link: 'https://store.example.com/shoes',
    ...overrides,
  };
}

describe('validateWishForm', () => {
  it('requires a non-blank title', () => {
    expect(validateWishForm({ title: '', options: [] })).toBeTruthy();
    expect(validateWishForm({ title: '   ', options: [] })).toBeTruthy();
  });

  it('accepts a title with no options', () => {
    expect(validateWishForm({ title: 'Bicicleta', options: [] })).toBeNull();
  });

  it('accepts a title with valid options', () => {
    expect(validateWishForm({ title: 'Zapatillas', options: [validOption()] })).toBeNull();
  });

  it('rejects an option missing any required field', () => {
    expect(validateWishForm({ title: 'Zapatillas', options: [validOption({ title: '' })] })).toBeTruthy();
    expect(validateWishForm({ title: 'Zapatillas', options: [validOption({ description: '' })] })).toBeTruthy();
    expect(validateWishForm({ title: 'Zapatillas', options: [validOption({ imageUrl: '' })] })).toBeTruthy();
    expect(validateWishForm({ title: 'Zapatillas', options: [validOption({ link: '' })] })).toBeTruthy();
  });

  it('rejects an option with a malformed imageUrl or link', () => {
    expect(validateWishForm({ title: 'Zapatillas', options: [validOption({ imageUrl: 'not-a-url' })] })).toBeTruthy();
    expect(validateWishForm({ title: 'Zapatillas', options: [validOption({ link: 'not-a-url' })] })).toBeTruthy();
  });

  it(`rejects more than ${MAX_OPTIONS_PER_WISH} options`, () => {
    const options = Array.from({ length: MAX_OPTIONS_PER_WISH + 1 }, () => validOption());
    expect(validateWishForm({ title: 'Zapatillas', options })).toBeTruthy();
  });

  it(`accepts exactly ${MAX_OPTIONS_PER_WISH} options`, () => {
    const options = Array.from({ length: MAX_OPTIONS_PER_WISH }, () => validOption());
    expect(validateWishForm({ title: 'Zapatillas', options })).toBeNull();
  });
});

describe('canAddOption', () => {
  it(`is true below the ${MAX_OPTIONS_PER_WISH}-option cap`, () => {
    expect(canAddOption(0)).toBe(true);
    expect(canAddOption(MAX_OPTIONS_PER_WISH - 1)).toBe(true);
  });

  it(`is false at or above the ${MAX_OPTIONS_PER_WISH}-option cap`, () => {
    expect(canAddOption(MAX_OPTIONS_PER_WISH)).toBe(false);
    expect(canAddOption(MAX_OPTIONS_PER_WISH + 1)).toBe(false);
  });
});
