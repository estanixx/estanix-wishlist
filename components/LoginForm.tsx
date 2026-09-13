'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <label htmlFor="admin-password" className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-300">Contraseña</span>
        <input
          id="admin-password"
          name="password"
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          required
          autoFocus
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
        />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition duration-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
