/**
 * Runs once when the server boots, before it serves anything.
 *
 * The env audit lives here rather than inside a helper so a misconfigured
 * deployment fails immediately and visibly, instead of quietly serving a store
 * that advertises localhost or takes no money. See src/lib/env.ts.
 */
export async function register() {
  // Only the Node.js runtime has process.env in full; the edge copy would report
  // false problems for server-only secrets it cannot see.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { assertEnv } = await import('./lib/env');
  assertEnv();
}
