import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wishlist',
  description: 'Lista de deseos',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      {/* Dark theme baseline (SPEC.md §8: dark, minimalist) -- Phase 2 is the
          first page to actually render content, so this is where the root
          background/foreground get set. */}
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
