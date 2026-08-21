import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

/**
 * Flat config, run through the ESLint CLI. `next lint` was removed in Next.js 16
 * — see node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md.
 *
 * core-web-vitals promotes the rules that affect LCP/CLS from warnings to
 * errors, which matters here: PRD 17.1 sets Lighthouse targets, and the most
 * common way to lose them is a raw <img> or an unoptimised font slipping in.
 */
export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Generated: vector artwork output and drizzle migration snapshots.
    'public/**',
    'src/lib/db/migrations/**',
  ]),

  {
    rules: {
      // Unused vars are a real signal in this codebase, but an `_`-prefixed
      // argument is the documented way to say "required by the signature,
      // deliberately unused" — e.g. login(_prev, formData).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  {
    // Tests mock modules and assert on loosely-typed fixtures; `any` there is a
    // deliberate shortcut, not a type hole in shipped code.
    files: ['**/*.test.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]);
