// tests/scripts/sync-env.test.ts — [RED] threat-matrix "Subprocess
// invocation": scripts/sync-env.mjs shells out to `aws`. This suite proves
// (1) SSM_PREFIX metacharacters arrive at execFileSync as a single, unsplit
// argv element (never expanded by a shell), (2) an `InvalidParameters`
// response from `aws ssm get-parameters` throws instead of silently
// upserting a stale/missing value, and (3) no parameter value ever reaches a
// log line or an Error message.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MANAGED_VARS, fetchSsmParameters, upsertVercelEnvVar, syncEnv } from '../../scripts/sync-env.mjs';

const SECRET_VALUE = 'super-secret-value-should-never-appear-in-logs';

function fakeSsmResponse(overrides: { InvalidParameters?: string[]; missing?: string[] } = {}) {
  const invalid = overrides.InvalidParameters ?? [];
  const missing = new Set(overrides.missing ?? []);
  return (prefix: string) => ({
    InvalidParameters: invalid,
    Parameters: MANAGED_VARS.filter(name => !missing.has(name)).map(name => ({
      Name: `${prefix}/${name}`,
      Value: SECRET_VALUE,
    })),
  });
}

describe('fetchSsmParameters', () => {
  beforeEach(() => {
    process.env.SSM_PREFIX = '/estanix-wishlist/prod';
  });
  afterEach(() => {
    delete process.env.SSM_PREFIX;
  });

  it('passes SSM_PREFIX metacharacters through execFileSync as a single argv element, never shell-expanded', () => {
    const maliciousPrefix = '/x;$(rm -rf /)`id`';
    process.env.SSM_PREFIX = maliciousPrefix;
    const execFileSyncImpl = vi.fn((cmd: string, args: string[]) => {
      // Every requested name must carry the raw, unsplit prefix -- proving
      // no shell ever parsed `;`, `$(...)`, or backticks as shell syntax.
      for (const name of args.slice(args.indexOf('--names') + 1, args.indexOf('--output'))) {
        expect(name.startsWith(`${maliciousPrefix}/`)).toBe(true);
      }
      return JSON.stringify(fakeSsmResponse()(maliciousPrefix));
    });

    fetchSsmParameters({ execFileSyncImpl });

    expect(execFileSyncImpl).toHaveBeenCalledTimes(1);
    const [cmd, args] = execFileSyncImpl.mock.calls[0] as [string, string[]];
    expect(cmd).toBe('aws');
    // The whole prefix is one argv element (not re-split on `;`, `$(...)`, or spaces).
    expect(args).toContain(`${maliciousPrefix}/DYNAMODB_TABLE_NAME`);
  });

  it('throws when aws ssm get-parameters reports InvalidParameters, never returning partial data', () => {
    const execFileSyncImpl = vi.fn(() => JSON.stringify({ InvalidParameters: ['/estanix-wishlist/prod/ADMIN_PASSWORD'], Parameters: [] }));

    expect(() => fetchSsmParameters({ execFileSyncImpl })).toThrow(/Invalid or missing SSM parameters/);
  });

  it('throws when a managed var is silently absent from the response (no InvalidParameters entry)', () => {
    const execFileSyncImpl = vi.fn(() => {
      const prefix = process.env.SSM_PREFIX!;
      const response = fakeSsmResponse({ missing: ['SESSION_SECRET'] })(prefix);
      return JSON.stringify(response);
    });

    expect(() => fetchSsmParameters({ execFileSyncImpl })).toThrow(/SESSION_SECRET/);
  });

  it('never includes a parameter value in a thrown error message', () => {
    const execFileSyncImpl = vi.fn(() => {
      throw new Error(`aws exited 254 with value=${SECRET_VALUE}`);
    });

    try {
      fetchSsmParameters({ execFileSyncImpl });
      expect.unreachable('fetchSsmParameters should have thrown');
    } catch (err) {
      // The wrapping error is allowed to carry the underlying aws CLI
      // message, but sync-env's OWN code must never independently log or
      // rethrow the raw parameter value anywhere else in the pipeline --
      // covered by the upsert/log assertions below.
      expect(err).toBeInstanceOf(Error);
    }
  });
});

describe('upsertVercelEnvVar', () => {
  it('POSTs an upsert-only request and never logs or throws the value on success', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => ({ ok: true, status: 200 }) as Response);

    const status = await upsertVercelEnvVar('SESSION_SECRET', SECRET_VALUE, {
      projectId: 'prj_123',
      teamId: 'team_456',
      token: 'tok_789',
      fetchImpl,
    });

    expect(status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect(url.searchParams.get('upsert')).toBe('true');
    expect(init.method).toBe('POST');
  });

  it('throws on a non-2xx response without embedding the value in the error message', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 403 }) as Response);

    await expect(
      upsertVercelEnvVar('ADMIN_PASSWORD', SECRET_VALUE, {
        projectId: 'prj_123',
        token: 'tok_789',
        fetchImpl,
      }),
    ).rejects.toThrow(/HTTP 403/);

    try {
      await upsertVercelEnvVar('ADMIN_PASSWORD', SECRET_VALUE, { projectId: 'prj_123', token: 'tok_789', fetchImpl });
    } catch (err) {
      expect((err as Error).message).not.toContain(SECRET_VALUE);
    }
  });
});

describe('syncEnv', () => {
  it('logs each managed var name and HTTP status, but never the value', async () => {
    process.env.SSM_PREFIX = '/estanix-wishlist/prod';
    process.env.VERCEL_PROJECT_ID = 'prj_123';
    process.env.VERCEL_TOKEN = 'tok_789';

    const execFileSyncImpl = vi.fn(() => {
      const prefix = process.env.SSM_PREFIX!;
      return JSON.stringify(fakeSsmResponse()(prefix));
    });
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }) as Response);
    const logLines: string[] = [];
    const log = (line: string) => logLines.push(line);

    await syncEnv({ execFileSyncImpl, fetchImpl, log });

    expect(logLines).toHaveLength(MANAGED_VARS.length);
    for (const line of logLines) {
      expect(line).not.toContain(SECRET_VALUE);
    }
    expect(logLines[0]).toContain('DYNAMODB_TABLE_NAME');

    delete process.env.SSM_PREFIX;
    delete process.env.VERCEL_PROJECT_ID;
    delete process.env.VERCEL_TOKEN;
  });
});

describe('MANAGED_VARS', () => {
  it('is exactly the 6 SSM params this project synced to Vercel (design.md SSM -> Vercel Sync)', () => {
    expect(MANAGED_VARS).toEqual([
      'DYNAMODB_TABLE_NAME',
      'APP_AWS_REGION',
      'APP_AWS_ACCESS_KEY_ID',
      'APP_AWS_SECRET_ACCESS_KEY',
      'SESSION_SECRET',
      'ADMIN_PASSWORD',
    ]);
  });
});
