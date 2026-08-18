import 'server-only';
import { localProvider } from './local';
import type { CommerceProvider } from './types';

/**
 * The single entry point every server component and action uses.
 *
 * COMMERCE_PROVIDER=shopify is phase 2 (PRD 3.3). The adapter directory exists
 * so the swap is a file, not a refactor; until it lands, an explicit throw is
 * more honest than silently falling back to local data.
 */
function resolveProvider(): CommerceProvider {
  if (process.env.COMMERCE_PROVIDER === 'shopify') {
    throw new Error(
      'COMMERCE_PROVIDER=shopify is not implemented yet. See src/lib/commerce/shopify/README.md',
    );
  }
  return localProvider;
}

export const commerce: CommerceProvider = resolveProvider();

export * from './types';
export { COLLECTION_DEFS, COLLECTION_SLUGS, collectionDef } from './local/collections';
