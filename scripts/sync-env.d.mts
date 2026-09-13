// Hand-written type declarations for sync-env.mjs. tsconfig.json keeps
// `allowJs: false` project-wide (this project is TypeScript everywhere
// except this dependency-free CLI script -- see the module's own header
// comment for why), so TypeScript resolves this adjacent `.d.mts` file
// instead of inferring types from the `.mjs` source, letting
// tests/scripts/sync-env.test.ts import it without `implicit any` errors.

export declare const MANAGED_VARS: readonly string[];

export type ExecFileSyncImpl = (command: string, args: string[], options?: { encoding: 'utf8' }) => string;

export declare function fetchSsmParameters(options?: { execFileSyncImpl?: ExecFileSyncImpl }): Map<string, string>;

export declare function upsertVercelEnvVar(
  key: string,
  value: string,
  options: {
    projectId: string;
    teamId?: string;
    token: string;
    fetchImpl?: typeof fetch;
  },
): Promise<number>;

export declare function syncEnv(options?: {
  execFileSyncImpl?: ExecFileSyncImpl;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
}): Promise<void>;
