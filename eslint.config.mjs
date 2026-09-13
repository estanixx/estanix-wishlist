// eslint.config.mjs — Flat config (ESLint 9) for the App Router.
// `eslint-config-next` already brings React/Next/Hooks/Core Web Vitals
// rules; this only declares file scope and a few build-artifact ignores.

import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // next-env.d.ts's triple-slash references are Next.js's own generated
    // content (re-written by `next dev`/`next build`), not authored code --
    // see https://nextjs.org/docs/app/api-reference/config/typescript.
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts'],
  },
];

export default eslintConfig;
