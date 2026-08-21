@AGENTS.md

# Karakoram Threads — ecommerce demo

A Next.js 16 storefront built as a freelance portfolio piece: browse → cart → guest
checkout → admin. Not a production store, and never handed over as-is.

## The PRD is the spec

`../ecommerce-demo-prd.md` is the authority for every business rule, string, and
layout decision. Code comments cite it by section (`PRD 13.2`, `§7.1`). Before
inventing a rule, look it up. If the PRD is genuinely silent, say so rather than
guessing — the document's own instruction is to amend it first, then the code.

Two consequences worth internalising:

- **User-facing copy is specified verbatim** (§8). Error strings, button labels,
  empty states and stock indicators are literal. Do not paraphrase them; the zod
  schemas in `src/lib/validation/` already carry the exact wording.
- **Out of scope is a real boundary** (§3.2). No dark mode, no search, no shopper
  accounts, no discount codes, no tax lines, no i18n. If a change starts pulling
  one of those in, stop.

## Commands

```bash
npm run dev              # dev server (prefer the Browser pane / launch.json over bare bash)
npm run typecheck        # tsc --noEmit — the only automated check in the repo
npm run build
npm run db:generate      # write a migration from schema.ts changes
npm run db:migrate       # apply pending migrations (the path for any DB with data)
npm run db:push          # shove schema.ts straight at the DB; throwaway/local only
npm run db:seed          # truncate + reseed catalogue and order history; idempotent
npm run images:generate  # regenerate public/products/*.webp from catalog-data.ts
```

There is no test suite and no linter configured. `npm run typecheck` is the gate —
run it after any change.

## Architecture: two boundaries that must not leak

**1. The commerce boundary — `src/lib/commerce/`**

Nothing outside this directory imports Drizzle or touches `src/lib/db/`. Pages,
components and server actions import `commerce` from `@/lib/commerce` and speak
only in the types from `types.ts`. This is what makes a Shopify adapter a new
file rather than a rewrite (PRD §15.1), and it is the single most load-bearing
convention in the repo. `local/` is the Postgres implementation; `shopify/` is an
intentional stub that throws.

**2. The payment boundary — `src/lib/payments/`**

`PaymentProvider` has one method: `createIntent`. Stripe keys are *optional* — a
deviation from PRD §9.1 made so the demo is clickable before a Stripe account
exists. With keys absent, `mockProvider` runs: its "client secret" is an
HMAC-signed blob (`src/lib/signing.ts`) carrying the amount and cart token, and
`/api/mock-payment/confirm` verifies it. That route hard-refuses to run whenever
real Stripe keys are present, so it can never mint orders on a configured store.

Both modes converge on `fulfilPayment()` in `src/server/services/orders.ts`, which
is the *only* place a successful payment becomes an order. Order creation, stock
decrement, cart deletion and email are therefore identical in both modes — keep it
that way when touching either gateway.

## Rules that will bite you

- **Money is integer paisa. No floats, anywhere.** `src/lib/money.ts` is the only
  place minor units become a string. `450000` is Rs 4,500.
- **Timestamps are `timestamptz`, and dates are Karachi dates.** `src/lib/dates.ts`
  is the only place an instant becomes a string, and every formatter there pins
  `timeZone: 'Asia/Karachi'` — Vercel runs functions in UTC, so an unpinned
  formatter shows a Karachi admin the wrong day for five hours out of every
  twenty-four. Never add a bare `Intl.DateTimeFormat` or `toLocaleDateString`.
  Day-boundary queries do the zone maths in SQL (see `getDashboardStats`), never
  from the Node process clock.
- **The server recalculates every number.** The client submits variant IDs,
  quantities, an address and a shipping *key* — never a price, subtotal, shipping
  cost or total. `priceCart()` in `local/orders.ts` is the authority, and it runs
  twice: once when creating the intent, again inside the order transaction.
- **Order lines are snapshots.** `order_items` copies title, SKU, image and unit
  price at purchase time. Never render a historical order by joining to live
  catalogue rows.
- **The webhook creates the order, not the browser.** `createOrder` is idempotent
  via `orders.payment_intent_id UNIQUE`; a duplicate delivery returns the existing
  order. Do not build anything cleverer than that (PRD §13.3).
- **Stock decrement is guarded** (`WHERE stock >= qty`). `rowCount === 0` means
  someone took the last one: the order is written as `pending` with
  `stockConflict: true` rather than lost, because the money already moved.
- **Order status transitions are enforced server-side** in `ALLOWED_TRANSITIONS`,
  not just hidden in the UI. `fulfilled` and `cancelled` are terminal.
- **Catalogue routes are ISR (`revalidate = 60`).** Never read the cart cookie
  during their render — that opts them out of caching. `CartProvider` loads the
  cart client-side after mount for exactly this reason.
- **Server actions re-validate everything with zod** even though the client also
  validates. Client validation is convenience only.

## Styling

Tailwind v4 with tokens defined in `src/app/globals.css` under `@theme inline`.
Use the tokens and the custom utilities (`.container-page`, `.section`,
`.tap-target`, `.tabular`, `text-h1`/`text-h2`/`text-h3`/`text-price`) rather than
ad-hoc values — PRD §7 exists so visual decisions are made once. UI primitives in
`src/components/ui/` are hand-rolled in the shadcn style over Radix; there is no
`components.json`, so add primitives by hand rather than via the shadcn CLI.

Test at 320px. It is the width that breaks things.

## Data and images

`src/lib/db/catalog-data.ts` is the single source of truth for both the seed script
and the image generator — a product cannot exist without artwork. Images are
*generated* studio-style vector artwork rendered to 1200×1200 WebP via sharp, not
licensed photography; swapping in real photos means overwriting the files in
`public/products/` and keeping the filenames from `productImages()`.

Seeded stock is deliberately uneven: some variants at 1–3 (shows "Only n left"),
one at 0 (shows out of stock). Preserve that when editing seed data — it is what
makes the demo read as a real store.

## Environment

Copy `.env.example` to `.env.local`. Only `DATABASE_URL` and `ADMIN_COOKIE_SECRET`
(32+ chars) are truly required; Stripe keys, `RESEND_API_KEY` and `ADMIN_PASSWORD`
all degrade gracefully — missing Stripe falls back to the mock gateway, missing
Resend logs the rendered email instead of sending it. Never commit `.env.local`.

`next.config.ts` sets a CSP that explicitly allows `js.stripe.com` in `script-src`
and `frame-src`. Adding any third-party script means editing that list.

## Not built yet

Roughly PRD days 1–4 are in place. Still missing, and specced in the PRD:

- `/checkout/success` — `CheckoutForm` already routes there and
  `OrderConfirmation.tsx` + `lookupOrderByPaymentIntent()` exist unused; the page
  itself needs writing, with the polling behaviour from §6.6
- The whole `/admin` surface (§6.9–6.12) — provider methods, zod schemas and
  `src/lib/signing.ts` are ready; `middleware.ts` and the routes are not
- `src/server/actions/admin.ts` (§14)
- Static pages `/about`, `/shipping-returns`, `/contact` (§6.7)
- `sitemap.ts` and `robots.ts` (§17.2)
- `README.md` is still the create-next-app default
