/**
 * `server-only` throws on import outside a React Server Component graph, which
 * includes Vitest. Aliased here so server modules can be unit-tested directly;
 * the real guard still applies to the app build.
 */
export {};
