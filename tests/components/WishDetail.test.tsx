// @vitest-environment jsdom
// tests/components/WishDetail.test.tsx -- [RED->GREEN] spec.md §6.2, locked:
// a wish with exactly one option renders NO nested option card (no
// OptionCard's own title/card wrapper) -- its fields are integrated
// directly into the page via SingleOptionLayout. A wish with 2+ options DOES
// render one card per option, each carrying its own title.

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { WishDetail } from '../../components/WishDetail';
import type { Option, WishWithOptions } from '../../lib/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function makeOption(overrides: Partial<Option> = {}): Option {
  return {
    id: 'o1',
    wishId: 'w1',
    title: 'Option title',
    description: 'Option description',
    imageUrl: 'https://example.com/a.png',
    link: 'https://example.com',
    reserved: false,
    reservedAt: null,
    ...overrides,
  };
}

function makeWish(options: Option[], overrides: Partial<WishWithOptions> = {}): WishWithOptions {
  return {
    id: 'w1',
    title: 'A wish',
    description: 'A description',
    oneIsEnough: false,
    reservable: true,
    order: 0,
    reservedCount: options.filter(o => o.reserved).length,
    optionCount: options.length,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    options,
    ...overrides,
  };
}

afterEach(() => cleanup());

describe('WishDetail', () => {
  it('single-option wish renders no nested option card (no option-level heading)', () => {
    const option = makeOption({ id: 'o1', title: 'Solo Option' });
    render(<WishDetail wish={makeWish([option])} />);

    // The wish's own <h1> is present...
    expect(screen.getByRole('heading', { level: 1, name: 'A wish' })).toBeInTheDocument();
    // ...but no option-level <h3> card heading is rendered for it.
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByText('Solo Option')).not.toBeInTheDocument();
    // The option's real content (description + actions) IS present, just inline.
    expect(screen.getByText('Option description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regalaré esto' })).toBeInTheDocument();
  });

  it('multi-option wish renders one card (with its own title) per option', () => {
    const options = [makeOption({ id: 'o1', title: 'First' }), makeOption({ id: 'o2', title: 'Second' })];
    render(<WishDetail wish={makeWish(options)} />);

    expect(screen.getByRole('heading', { level: 3, name: 'First' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Second' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Regalaré esto' })).toHaveLength(2);
  });

  it('oneIsEnough=true fully reserved shows ONE page-level message and disables every option button, no per-card band', () => {
    const options = [makeOption({ id: 'o1', title: 'First', reserved: true }), makeOption({ id: 'o2', title: 'Second', reserved: false })];
    render(<WishDetail wish={makeWish(options, { oneIsEnough: true, reservedCount: 1 })} />);

    expect(screen.getByText(/Ya reservado/)).toBeInTheDocument();
    expect(screen.queryByText('Opción reservada')).not.toBeInTheDocument();
    for (const button of screen.getAllByRole('button', { name: 'Regalaré esto' })) {
      expect(button).toBeDisabled();
    }
  });

  it('oneIsEnough=false with one reserved option shows a per-card band, other option stays reservable', () => {
    const options = [makeOption({ id: 'o1', title: 'First', reserved: true }), makeOption({ id: 'o2', title: 'Second', reserved: false })];
    render(<WishDetail wish={makeWish(options, { oneIsEnough: false, reservedCount: 1 })} />);

    expect(screen.getByText('Opción reservada')).toBeInTheDocument();
    expect(screen.queryByText(/^Ya reservado/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Regalaré esto' })).toHaveLength(1);
  });

  it('wish.reservable=false renders no "Regalaré esto" button anywhere', () => {
    const options = [makeOption({ id: 'o1' }), makeOption({ id: 'o2' })];
    render(<WishDetail wish={makeWish(options, { reservable: false })} />);

    expect(screen.queryByRole('button', { name: 'Regalaré esto' })).not.toBeInTheDocument();
    // "Ir al sitio" stays available (informational only).
    expect(screen.getAllByText('Ir al sitio')).toHaveLength(2);
  });
});
