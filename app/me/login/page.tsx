import { redirect } from 'next/navigation';
import { hasValidPageSession } from '@/lib/session-guard';
import { LoginForm } from '@/components/LoginForm';

// app/me/login/page.tsx -- public login page (spec.md §7). Bounces an
// already-authenticated visitor straight to /me; this check, like the rest
// of the /me page guards, is UX-only (design.md Decision 9's boundary
// note) -- the real security boundary is requireAuth() on every
// /api/admin/* Route Handler.
export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await hasValidPageSession()) {
    redirect('/me');
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="text-center">
          <h1 className="text-xl font-semibold text-zinc-100">Panel de administración</h1>
          <p className="mt-1 text-sm text-zinc-400">Ingresá la contraseña para continuar.</p>
        </header>
        <LoginForm />
      </div>
    </main>
  );
}
