# Karakoram Threads — ecommerce demo

A working storefront and admin panel: browse → cart → guest checkout → payment →
order appears in admin. Built to the spec in [`../ecommerce-demo-prd.md`](../ecommerce-demo-prd.md).

**This is a demonstration build, not a delivered client project.** The brand is
fictional, no real payments are taken, and no orders are fulfilled.

## Demo credentials

| What | Where |
|---|---|
| Storefront | `/` |
| Admin | `/admin` |
| Admin password | value of `ADMIN_PASSWORD` in your `.env.local` |
| Test card | `4242 4242 4242 4242`, any future expiry, any CVC |

Two more test cards, in either payment mode: `4000 0000 0000 9995` declines with
insufficient funds, `4000 0000 0000 0002` declines generically.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill it in — see below
npm run db:push              # create the schema
npm run db:seed              # 21 products, 87 variants, 5 historical orders
npm run dev
```

Only two variables are actually required:

- `DATABASE_URL` — a Postgres connection string (Neon's free tier is fine)
- `ADMIN_COOKIE_SECRET` — 32+ random characters, signs the admin session

Everything else degrades gracefully, which is what makes the demo runnable
before any third-party account exists:

| Missing | Behaviour |
|---|---|
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Falls back to the built-in mock gateway |
| `RESEND_API_KEY` | Confirmation email is logged to the console instead of sent |
| `ADMIN_PASSWORD` | Admin login rejects every attempt |
| `NEXT_PUBLIC_BRAND_NAME` | Defaults to "Karakoram Threads" |

## Payment modes

The checkout runs against one of two gateways, chosen automatically:

**Stripe** (when both Stripe keys are set) — real Stripe Elements in test mode.
Order creation is driven by the `payment_intent.succeeded` webhook, so you need
the forwarder running locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Mock** (when they are not) — a built-in gateway that mirrors Stripe's test-card
behaviour. Its "client secret" is an HMAC-signed blob carrying the amount and
cart token, so the browser cannot tamper with either, and
`/api/mock-payment/confirm` refuses to run at all when real Stripe keys are
present.

Both modes converge on the same `fulfilPayment()` call, so order creation, stock
decrement, cart deletion and email are the identical code path either way.

## Commands

```bash
npm run dev              # dev server
npm run build            # production build
npm run typecheck        # tsc --noEmit — the project's only automated gate
npm run db:push          # apply schema changes
npm run db:seed          # reset catalogue + order history (destructive, idempotent)
npm run images:generate  # regenerate product imagery from catalog-data.ts
```

## What's here

**Storefront** — home with hero and featured grid, three collections with URL-driven
sort, product pages with variant selection and live stock state, cart drawer and
page, guest checkout with server-recalculated totals, order confirmation with
webhook polling, About / Shipping & Returns / Contact, 404 and error boundaries.

**Admin** — password gate with a signed 24-hour session, dashboard (today's orders
and revenue, awaiting fulfilment, recent orders, low stock), order list with status
filters, order detail with fulfil and cancel, product table with inline price,
stock and published editing that reaches the storefront immediately.

**Platform** — responsive 320px to 1440px, `Product` + `Offer` and `BreadcrumbList`
JSON-LD, per-route metadata, sitemap, robots, security headers with a CSP, and
order confirmation email.

## Architecture notes

Two boundaries carry the design:

- **`src/lib/commerce/`** — nothing outside it imports Drizzle. Swapping Postgres
  for Shopify means writing one adapter against `CommerceProvider`, not touching
  the UI.
- **`src/lib/payments/`** — the gateway behind a one-method interface, which is
  what makes the mock mode possible without forking the checkout.

Money is integer paisa everywhere; there are no floats in the codebase. The
server recalculates every monetary value at request time — the client submits
variant IDs, quantities, an address and a shipping key, and nothing else.

See [`CLAUDE.md`](CLAUDE.md) for the conventions in more depth.

## Known deviations from the PRD

- **`middleware.ts` is `proxy.ts`.** The convention was renamed in Next.js 16;
  behaviour is identical.
- **Stripe keys are optional** (PRD §9.1 lists them as required) so the demo is
  clickable before a Stripe account exists.
- **404s on prerendered dynamic routes return HTTP 200** with the 404 page body.
  This is documented Next.js behaviour — a streamed response has already sent its
  status before `notFound()` is reached. Next injects `<meta name="robots"
  content="noindex">` on these, so they stay out of search results. Returning a
  true 404 status would mean querying the database in `proxy.ts` on every product
  URL, which is a poor trade here.
- **Product imagery is mixed.** The hero, collection tiles and the fabric-detail
  frame on each product are real Unsplash photographs; the primary garment shot
  is generated artwork so the grid keeps one consistent art direction. No photo
  contains an identifiable person or a third-party brand mark — see
  `public/products/CREDITS.md` and the sourcing rules in
  `scripts/fetch-photography.ts`.
- **Source images exceed the 200KB figure in PRD §16** (up to ~500KB). `next/image`
  re-encodes per viewport, so what a phone actually downloads is 12–38KB. The
  spec's intent is page weight, and that is met.

## Not included

Deliberately out of scope, and priced separately: shopper accounts, search,
filters beyond collection and sort, reviews, wishlists, discount codes, tax
calculation, multi-currency, refunds workflow, abandoned-cart email, analytics,
CMS. Production hardening — rate limiting, CSRF tokens, audit logging, error
monitoring, backups, a test suite — is Phase 2 work, named in PRD §3.3 and §17.5.
