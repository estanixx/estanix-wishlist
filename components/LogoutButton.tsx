'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

// components/LogoutButton.tsx -- spec.md's "logout action" for /me. Not in
// tasks.md's literal component list -- same justified addition pattern as
// Phase 2/3's VisitCounterEffect/WishDetail: app/me/page.tsx is an async
// Server Component (can't itself hold client state/handlers), so the
// interactive bit needs its own tiny client boundary.
export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/me/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-foreground-secondary transition duration-200 hover:border-border-hover hover:bg-surface-strong"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Cerrar sesión
    </button>
  );
}
