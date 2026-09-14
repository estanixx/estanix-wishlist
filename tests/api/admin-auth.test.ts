// tests/api/admin-auth.test.ts — [RED] design.md's threat matrix "Route
// authorization" case: every /api/admin/* handler must reject an absent,
// malformed, expired, or tampered session cookie with 401, without ever
// reaching the database. Exercises the real Route Handler exports directly
// (not a mock of requireAuth), so adding a route without the guard fails
// this suite exactly as the threat matrix demands.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sign } from '../../lib/session';
import { SESSION_COOKIE } from '../../lib/session-guard';

import * as wishesRoute from '../../app/api/admin/wishes/route';
import * as wishRoute from '../../app/api/admin/wishes/[wishId]/route';
import * as optionsRoute from '../../app/api/admin/wishes/[wishId]/options/route';
import * as optionRoute from '../../app/api/admin/wishes/[wishId]/options/[optionId]/route';
import * as resetRoute from '../../app/api/admin/reset-reservations/route';
import * as statsRoute from '../../app/api/admin/stats/route';

const SECRET = 'admin-auth-test-secret-0123456789';

function requestWithCookie(cookie: string | null): Request {
  const headers = new Headers();
  if (cookie !== null) headers.set('cookie', `${SESSION_COOKIE}=${cookie}`);
  return new Request('http://localhost/api/admin/test', { method: 'POST', headers });
}

function paramsOf(value: Record<string, string>) {
  return { params: Promise.resolve(value) };
}

// Every Route Handler below has a different `params` shape; this suite only
// ever passes a superset of keys ({ wishId, optionId }) and asserts on
// response.status, so a loosely-typed handler signature is the right tool
// here -- not a real `any` leak into production code (test-only file).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (request: Request, ctx: { params: Promise<any> }) => Promise<Response>;

// Every admin route + HTTP method, called with wishId/optionId placeholders
// that are never reached because requireAuth() must short-circuit first.
const routes: { name: string; handler: Handler }[] = [
  { name: 'GET /api/admin/wishes', handler: wishesRoute.GET },
  { name: 'POST /api/admin/wishes', handler: wishesRoute.POST },
  { name: 'GET /api/admin/wishes/:wishId', handler: wishRoute.GET },
  { name: 'PATCH /api/admin/wishes/:wishId', handler: wishRoute.PATCH },
  { name: 'DELETE /api/admin/wishes/:wishId', handler: wishRoute.DELETE },
  { name: 'POST /api/admin/wishes/:wishId/options', handler: optionsRoute.POST },
  { name: 'PATCH /api/admin/wishes/:wishId/options/:optionId', handler: optionRoute.PATCH },
  { name: 'DELETE /api/admin/wishes/:wishId/options/:optionId', handler: optionRoute.DELETE },
  { name: 'POST /api/admin/reset-reservations', handler: resetRoute.POST },
  { name: 'GET /api/admin/stats', handler: statsRoute.GET },
];

describe('admin route authorization (threat matrix: absent/malformed/expired/tampered cookie)', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.SESSION_SECRET;
  });

  for (const { name, handler } of routes) {
    describe(name, () => {
      it('401s with an absent cookie', async () => {
        const response = await handler(requestWithCookie(null), paramsOf({ wishId: 'w1', optionId: 'o1' }));
        expect(response.status).toBe(401);
      });

      it('401s with a malformed cookie', async () => {
        const response = await handler(requestWithCookie('not-a-valid-token'), paramsOf({ wishId: 'w1', optionId: 'o1' }));
        expect(response.status).toBe(401);
      });

      it('401s with an expired cookie', async () => {
        const expired = sign({ sub: 'admin', exp: Date.now() - 1000 });
        const response = await handler(requestWithCookie(expired), paramsOf({ wishId: 'w1', optionId: 'o1' }));
        expect(response.status).toBe(401);
      });

      it('401s with a tampered cookie', async () => {
        const valid = sign({ sub: 'admin', exp: Date.now() + 60_000 });
        const [body] = valid.split('.');
        const tampered = `${body}.deadbeefdeadbeefdeadbeefdeadbeefdeadbeef`;
        const response = await handler(requestWithCookie(tampered), paramsOf({ wishId: 'w1', optionId: 'o1' }));
        expect(response.status).toBe(401);
      });
    });
  }
});
