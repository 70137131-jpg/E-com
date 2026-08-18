/**
 * Storefront 404s (an unpublished product, a bad slug) render inside the shop
 * chrome. The root not-found.tsx handles genuinely unmatched URLs and shares
 * this body, so the copy only exists once.
 */
export { default } from '../not-found';
