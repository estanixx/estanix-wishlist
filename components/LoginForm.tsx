'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';

// components/LoginForm.tsx -- /me/login (spec.md `admin-auth`). POSTs
// {password} to /api/admin/login; on 200 the HMAC-signed session cookie is
// already set by the response, so we just navigate to /me and refresh so
// the dashboard's Server Component re-reads the now-valid cookie.
export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setError('Contraseña incorrecta.');
        return;
      }

      router.push('/me');
      router.refresh();
    } catch {
      setError('No se pudo conectar. Intentá de nuevo.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4 rounded-2xl border border-border bg-surface/60 p-6">
      <label htmlFor="admin-password" className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-foreground-secondary">Contraseña</span>
        <input
          id="admin-password"
          name="password"
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          required
          autoFocus
          className="rounded-lg border border-border-strong bg-background px-3 py-2 text-foreground outline-none focus:border-border-hover"
        />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {pending ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
