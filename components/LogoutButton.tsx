'use client';

import { useRouter } from 'next/navigation';

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
      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-300 transition duration-200 hover:border-zinc-500 hover:bg-zinc-800"
    >
      Cerrar sesión
    </button>
  );
}
