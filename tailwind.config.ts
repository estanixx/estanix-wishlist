import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Design tokens (SPEC.md §8: dark theme, minimalist, reduced palette
      // with one accent color). Values are CSS custom properties defined in
      // app/globals.css so components reference `bg-surface`/`text-foreground
      // -muted`/`border-border-strong`/etc. instead of raw `bg-zinc-900`/
      // `text-zinc-400`/`border-zinc-700`. `rgb(var(--x) / <alpha-value>)`
      // keeps opacity modifiers working (`bg-surface/60`) exactly like the
      // zinc utilities they replace.
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          strong: 'rgb(var(--color-surface-strong) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          strong: 'rgb(var(--color-border-strong) / <alpha-value>)',
          hover: 'rgb(var(--color-border-hover) / <alpha-value>)',
        },
        foreground: {
          DEFAULT: 'rgb(var(--color-foreground) / <alpha-value>)',
          strong: 'rgb(var(--color-foreground-strong) / <alpha-value>)',
          secondary: 'rgb(var(--color-foreground-secondary) / <alpha-value>)',
          muted: 'rgb(var(--color-foreground-muted) / <alpha-value>)',
          faint: 'rgb(var(--color-foreground-faint) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          hover: 'rgb(var(--color-accent-hover) / <alpha-value>)',
          foreground: 'rgb(var(--color-accent-foreground) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--color-danger) / <alpha-value>)',
          hover: 'rgb(var(--color-danger-hover) / <alpha-value>)',
          accent: 'rgb(var(--color-danger-accent) / <alpha-value>)',
          solid: 'rgb(var(--color-danger-solid) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--color-warning) / <alpha-value>)',
          accent: 'rgb(var(--color-warning-accent) / <alpha-value>)',
        },
      },
      // Subtle-animation baseline (SPEC.md §8 / Phase 3 instructions: "band
      // appears with a brief transition"). Phase 6 verifies/extends these
      // rather than duplicating -- ConfirmModal, ReservedBand, and now the
      // admin forms/skeletons all reuse the same two keyframes.
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
