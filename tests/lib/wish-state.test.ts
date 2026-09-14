// tests/lib/wish-state.test.ts — truth table across
// oneIsEnough x reservable x reservedCount x optionCount
// (design.md's Testing Strategy). Pure functions, no mocks.

import { describe, expect, it } from 'vitest';
import { canReserveOption, deriveWishState } from '../../lib/wish-state';
import type { Option, Wish } from '../../lib/types';

function makeWish(overrides: Partial<Wish> = {}): Wish {
  return {
    id: 'w1',
    title: 'A wish',
    description: '',
    oneIsEnough: false,
    reservable: true,
    order: 0,
    reservedCount: 0,
    optionCount: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeOption(overrides: Partial<Option> = {}): Option {
  return {
    id: 'o1',
    wishId: 'w1',
    title: 'An option',
    description: '',
    imageUrl: 'https://example.com/a.png',
    link: 'https://example.com',
    reserved: false,
    reservedAt: null,
    ...overrides,
  };
}

describe('deriveWishState', () => {
  const cases: Array<{
    name: string;
    wish: Partial<Wish>;
    expected: { fullyReserved: boolean; partiallyReserved: boolean; canReserveAny: boolean };
  }> = [
    {
      name: 'oneIsEnough=false, reservable=true, reservedCount=0, optionCount=3 -> nothing reserved, can reserve',
      wish: { oneIsEnough: false, reservable: true, reservedCount: 0, optionCount: 3 },
      expected: { fullyReserved: false, partiallyReserved: false, canReserveAny: true },
    },
    {
      name: 'oneIsEnough=false, reservable=true, reservedCount=1, optionCount=3 -> partial badge, can still reserve others',
      wish: { oneIsEnough: false, reservable: true, reservedCount: 1, optionCount: 3 },
      expected: { fullyReserved: false, partiallyReserved: true, canReserveAny: true },
    },
    {
      name: 'oneIsEnough=false, reservable=true, reservedCount=3, optionCount=3 -> all reserved, not "partial" (all, not some)',
      wish: { oneIsEnough: false, reservable: true, reservedCount: 3, optionCount: 3 },
      expected: { fullyReserved: false, partiallyReserved: false, canReserveAny: true },
    },
    {
      name: 'oneIsEnough=true, reservable=true, reservedCount=0, optionCount=3 -> nothing reserved yet',
      wish: { oneIsEnough: true, reservable: true, reservedCount: 0, optionCount: 3 },
      expected: { fullyReserved: false, partiallyReserved: false, canReserveAny: true },
    },
    {
      name: 'oneIsEnough=true, reservable=true, reservedCount=1, optionCount=3 -> band, cannot reserve any more',
      wish: { oneIsEnough: true, reservable: true, reservedCount: 1, optionCount: 3 },
      expected: { fullyReserved: true, partiallyReserved: false, canReserveAny: false },
    },
    {
      name: 'oneIsEnough=true, reservable=false, reservedCount=0, optionCount=3 -> not reservable overrides canReserveAny',
      wish: { oneIsEnough: true, reservable: false, reservedCount: 0, optionCount: 3 },
      expected: { fullyReserved: false, partiallyReserved: false, canReserveAny: false },
    },
    {
      name: 'oneIsEnough=false, reservable=false, reservedCount=1, optionCount=3 -> partial badge but not reservable',
      wish: { oneIsEnough: false, reservable: false, reservedCount: 1, optionCount: 3 },
      expected: { fullyReserved: false, partiallyReserved: true, canReserveAny: false },
    },
    {
      name: 'oneIsEnough=true, reservable=false, reservedCount=1, optionCount=3 -> fully reserved AND not reservable',
      wish: { oneIsEnough: true, reservable: false, reservedCount: 1, optionCount: 3 },
      expected: { fullyReserved: true, partiallyReserved: false, canReserveAny: false },
    },
    {
      name: 'oneIsEnough=false, reservable=true, reservedCount=0, optionCount=0 -> no options at all',
      wish: { oneIsEnough: false, reservable: true, reservedCount: 0, optionCount: 0 },
      expected: { fullyReserved: false, partiallyReserved: false, canReserveAny: true },
    },
  ];

  it.each(cases)('$name', ({ wish, expected }) => {
    expect(deriveWishState(makeWish(wish))).toEqual(expected);
  });
});

describe('canReserveOption', () => {
  it('false when the option itself is already reserved, even if the wish would otherwise allow it', () => {
    const wish = makeWish({ oneIsEnough: false, reservable: true, reservedCount: 1, optionCount: 3 });
    const option = makeOption({ reserved: true });
    expect(canReserveOption(wish, option)).toBe(false);
  });

  it('false when the wish is fully reserved (oneIsEnough cascade), even if this specific option is free', () => {
    const wish = makeWish({ oneIsEnough: true, reservable: true, reservedCount: 1, optionCount: 3 });
    const option = makeOption({ reserved: false });
    expect(canReserveOption(wish, option)).toBe(false);
  });

  it('false when the wish is not reservable', () => {
    const wish = makeWish({ oneIsEnough: false, reservable: false, reservedCount: 0, optionCount: 3 });
    const option = makeOption({ reserved: false });
    expect(canReserveOption(wish, option)).toBe(false);
  });

  it('true when the option is free, the wish is reservable, and not fully reserved', () => {
    const wish = makeWish({ oneIsEnough: false, reservable: true, reservedCount: 1, optionCount: 3 });
    const option = makeOption({ reserved: false });
    expect(canReserveOption(wish, option)).toBe(true);
  });
});
