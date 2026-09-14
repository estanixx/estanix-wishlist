#!/usr/bin/env node
// scripts/sync-env.mjs — Syncs SSM parameters (/estanix-wishlist/prod/*) to Vercel.
//
// Dependency-free on purpose (AWS CLI + Node 20's native `fetch`): the only
// job that has secrets (cd.yml's vercel-deploy job) doesn't need `npm ci` to
// run this script.
//
// Non-negotiable rules (design.md's SSM -> Vercel Sync, ported verbatim from
// dcuero-app/scripts/sync-env.mjs, threat matrix "Subprocess invocation"):
//   - The name allowlist is a module-level constant, never read from env/argv.
//   - `aws` is invoked via `execFileSync` with an argv array -- never a shell
//     string -- so no metacharacter in SSM_PREFIX can reach a subshell.
//   - Only upserts (POST .../env?upsert=true); never lists or deletes
//     anything in Vercel, so unmanaged variables are left untouched.
//   - Logs and error messages only ever include the variable name and HTTP
//     status -- the value itself is never printed or embedded in an Error.

import { execFileSync } from 'node:child_process';

// Single source of truth for which variables get synced. Never read from env
// or argv -- design.md's SSM -> Vercel Sync section pins this exact list.
export const MANAGED_VARS = Object.freeze([
  'DYNAMODB_TABLE_NAME',
  'APP_AWS_REGION',
  'APP_AWS_ACCESS_KEY_ID',
  'APP_AWS_SECRET_ACCESS_KEY',
  'SESSION_SECRET',
  'ADMIN_PASSWORD',
]);

const VERCEL_API_VERSION = 'v10';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function ssmPrefix() {
  return requireEnv('SSM_PREFIX').replace(/\/+$/, '');
}

// Builds the full parameter names (`${SSM_PREFIX}/${NAME}`) exclusively from
// MANAGED_VARS. No external input (env, argv, HTTP response) participates.
function ssmParameterNames() {
  const prefix = ssmPrefix();
  return MANAGED_VARS.map(name => `${prefix}/${name}`);
}

// `aws ssm get-parameters` accepts at most 10 names per call (a hard,
// non-configurable API limit) -- kept even though MANAGED_VARS is currently
// under 10, since the list is expected to grow.
const SSM_GET_PARAMETERS_BATCH_LIMIT = 10;

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

// Reads the managed parameters in batches of at most 10 names each.
// `execFileSyncImpl` receives an explicit argv array -- no shell string is
// ever constructed, so `execFileSync` without `shell: true` runs the `aws`
// binary directly and no metacharacter (`;`, `|`, `$(...)`, etc.) present in
// SSM_PREFIX can escape into a subshell.
export function fetchSsmParameters({ execFileSyncImpl = execFileSync } = {}) {
  const prefix = ssmPrefix();
  const names = ssmParameterNames();
  const values = new Map();
  const invalidParameters = [];

  for (const batch of chunk(names, SSM_GET_PARAMETERS_BATCH_LIMIT)) {
    const args = ['ssm', 'get-parameters', '--with-decryption', '--names', ...batch, '--output', 'json'];

    let raw;
    try {
      raw = execFileSyncImpl('aws', args, { encoding: 'utf8' });
    } catch (e) {
      throw new Error(`Failed to read parameters from SSM: ${e.message}`);
    }

    const parsed = JSON.parse(raw);
    invalidParameters.push(...(parsed.InvalidParameters ?? []));
    for (const param of parsed.Parameters ?? []) {
      const shortName = param.Name.slice(prefix.length + 1);
      values.set(shortName, param.Value);
    }
  }

  if (invalidParameters.length > 0) {
    throw new Error(`Invalid or missing SSM parameters: ${invalidParameters.join(', ')}`);
  }

  for (const name of MANAGED_VARS) {
    if (!values.has(name)) {
      throw new Error(`SSM did not return a value for ${name}`);
    }
  }

  return values;
}

// Upserts ONE variable in Vercel. Never GET/LIST/DELETE -- only this POST.
// `value` never appears in the thrown Error or in any log: if the fetch
// fails or Vercel responds non-2xx, the message carries only `key` + HTTP
// status.
export async function upsertVercelEnvVar(key, value, { projectId, teamId, token, fetchImpl = fetch } = {}) {
  const url = new URL(`https://api.vercel.com/${VERCEL_API_VERSION}/projects/${projectId}/env`);
  url.searchParams.set('upsert', 'true');
  if (teamId) url.searchParams.set('teamId', teamId);

  let res;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key, value, type: 'encrypted', target: ['production', 'preview'] }),
    });
  } catch (e) {
    throw new Error(`Could not reach Vercel to upsert "${key}": ${e.message}`);
  }

  if (!res.ok) {
    throw new Error(`Vercel rejected the upsert of "${key}": HTTP ${res.status}`);
  }

  return res.status;
}

export async function syncEnv({ execFileSyncImpl = execFileSync, fetchImpl = fetch, log = console.log } = {}) {
  const projectId = requireEnv('VERCEL_PROJECT_ID');
  const teamId = process.env.VERCEL_ORG_ID;
  const token = requireEnv('VERCEL_TOKEN');

  const values = fetchSsmParameters({ execFileSyncImpl });

  for (const name of MANAGED_VARS) {
    const status = await upsertVercelEnvVar(name, values.get(name), { projectId, teamId, token, fetchImpl });
    log(`${name}: upserted (HTTP ${status})`); // never the value
  }
}

const isMainModule = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  syncEnv().catch(err => {
    console.error(`sync-env.mjs failed: ${err.message}`);
    process.exitCode = 1;
  });
}
