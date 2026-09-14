import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Mirrors tsconfig.json's "@/*": ["./*"] -- component tests import
    // components/lib via the same '@/...' alias the app code itself uses.
    alias: { '@': rootDir },
  },
  // tsconfig.json pins "jsx": "preserve" (Next's own compiler owns the real
  // build's JSX transform), so esbuild needs its own explicit setting here
  // -- otherwise it falls back to the classic `React.createElement` runtime
  // and component tests fail with "React is not defined" (no such import
  // exists anywhere in this React 19 / new-JSX-runtime codebase).
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    // Default stays 'node' (fast, matches Phase 1/2 lib-level tests). Any
    // test file that needs a DOM (component tests) opts in per-file via a
    // `// @vitest-environment jsdom` docblock instead of flipping this
    // globally -- keeps the existing lib suite's speed untouched.
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
