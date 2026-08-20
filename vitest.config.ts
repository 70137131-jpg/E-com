import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Throws on import outside a Server Component graph, which includes
      // Vitest. Stubbed so server-side modules are unit-testable; the real
      // guard still applies to the app build.
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // Integration tests reach a real Postgres and skip themselves without
    // TEST_DATABASE_URL, so the default run stays offline and fast.
    env: {
      ADMIN_COOKIE_SECRET: 'test-secret-at-least-thirty-two-characters-long',
    },
  },
});
