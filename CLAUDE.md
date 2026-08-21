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
npm run lint             # eslint . — `next lint` was REMOVED in Next.js 16
npm run typecheck        # tsc --noEmit
npm test                 # vitest run — unit tests, no database needed
npm run build
npm run db:generate      # write a migration from schema.ts changes
npm run db:migrate       # apply pending migrations (the deploy path)
npm run db:push          # sync schema.ts straight to the DB — local scratch only
npm run db:seed          # truncate + reseed catalogue and order history; idempotent
npm run images:generate  # fallback: re-render vector artwork over the photography
```

`npm run lint && npm run typecheck && npm test` is the gate; CI runs all three
plus the build.

**`next lint` does not exist in this version** — it was removed in Next.js 16 in
favour of the ESLint CLI, so linting is `eslint .` against `eslint.config.mjs`
(flat config). The config uses `core-web-vitals`, which promotes the rules that
affect LCP and CLS from warnings to errors; PRD 17.1 sets Lighthouse targets and
a raw `<img>` is the usual way to lose them. `public/` and the drizzle migration
snapshots are ignored as generated output.

**Schema changes go through migrations, not `db:push`.** Push diffs the schema
and applies the result directly: no version history, no rollback, and it will
drop a column it believes is gone. That is fine against a scratch database and
unacceptable once real orders exist. Edit `schema.ts`, run `db:generate`, commit
the SQL under `src/lib/db/migrations/`, and let `db:migrate` apply it. A database
that predates the migrations adopts the baseline once with
`npm run db:migrate -- --baseline`, which records 0000 as applied without
executing it.

### What the tests cover, and why those things

`npm test` is deliberately unit-only so it runs offline in under a second. It
covers the pure rules where a silent change costs money: the shipping table and
its free-shipping boundary, the order status machine, HMAC sign/verify (every
test there is an attack), the rate limiter, and the money helpers.

Two things worth knowing before adding to it:

- **`formatMoney` uses a non-breaking space** (U+00A0), so `formatMoney(450000)`
  is `"Rs 4,500"`. An assertion written with a normal space fails while
  looking identical in the diff. Normalise, or match with `\s` — which does
  cover U+00A0.
- **`server-only` throws when imported outside a Server Component graph**, which
  includes Vitest. `vitest.config.ts` aliases it to a stub so server modules are
  testable; the real guard still applies to the app build.

`priceCart()` and `fulfilPayment()` are not unit-tested — both open a database
pool at import. Testing them needs a throwaway Neon branch, which is the
integration tier and is not built yet.

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
  validates. Client validation is convenience only. Validate with `z.enum`, not
  a `key in TABLE` check: `in` walks the prototype chain, so `__proto__` and
  `constructor` passed `isShippingMethodKey()` and turned an order total into
  `NaN` via `SHIPPING_METHODS['__proto__'].priceCents`. Use
  `Object.prototype.hasOwnProperty.call`.
- **Do not add CSRF tokens to admin forms.** Next already does it: server
  actions are POST-only, compare `Origin` against `Host`/`X-Forwarded-Host` and
  reject mismatches, and ship encrypted action IDs; the admin cookie is
  `sameSite: 'lax'`. All three admin mutations are server actions. The two route
  handlers are not, and carry their own auth instead — Stripe signature
  verification, and an HMAC token on the mock gateway that self-disables when
  Stripe is configured. If this ever runs behind a proxy on a different host,
  set `serverActions.allowedOrigins` rather than inventing tokens.
- **Rate limiting is in-process and therefore per-instance** (`lib/rate-limit.ts`).
  Two instances behind a load balancer allow twice the traffic, and a
  per-request serverless isolate disables it entirely. It is applied to admin
  login, where one shared password plus unlimited guesses is the whole attack.
  The interface matches `@upstash/ratelimit` so moving to Redis is a change of
  implementation, not of call sites. A throttled attempt returns the same
  "Incorrect password." string as a wrong one — saying "rate limited" confirms
  both that the endpoint exists and how long to wait.
- **Cart quantity clamps, it does not reject** (PRD 6.4). The drawer's stepper
  stays live at the stock ceiling (`allowServerClamp`) so the attempt reaches
  `updateLine()`, which clamps and returns "Only {n} left. Quantity reduced." for
  the line to render. Disabling the button at `max` looks tidier but makes that
  specified string unreachable — and `max` is only the stock the client last
  heard about. The product page keeps the bounded stepper; only the cart opts in.
- **The cart drawer restores focus by hand.** It is opened programmatically and
  has no Radix `Trigger`, so Radix's own `onCloseAutoFocus` calls
  `preventDefault()` and then focuses a null ref — focus lands on `<body>` and
  keyboard users lose their place. `openCart(opener)` records the control and
  `restoreOpenerFocus()` returns focus on close. Pass the opener **explicitly**
  from inside a transition (`AddToCartButton`): by the time the action resolves
  that button is disabled by its own loading state and `document.activeElement`
  has already moved to `<body>`.

## Logging and alerts

`lib/log.ts`, not `console.*`. One JSON line per entry in production, readable
in development. The `event` field is a stable machine key — dashboards and alert
rules are built on those strings, so renaming one is a breaking change.

`log.alert()` is reserved for the failures that cost money quietly, enumerated in
`ALERT_EVENTS` so they can be listed in an alerting rule:

- `webhook.failed` — Stripe took the money and the order may not exist. The
  handler still returns 200 so Stripe stops retrying (PRD 13.3), which is
  exactly why the failure needs to be loud somewhere else. A duplicate delivery
  losing the unique-constraint race (Postgres `23505`) is *not* an incident and
  is logged at info.
- `order.stock_conflict` — payment succeeded, the guarded decrement did not, so
  the order is `pending` and someone has been charged for stock that may not
  exist (PRD 13.4).
- `email.failed` — the shopper paid and will hear nothing. Deliberately silent
  to the shopper so mail cannot break checkout, which is the whole reason it
  needs an alert.

`setAlertSink()` is the seam for Sentry, PagerDuty or a Slack webhook — one
place, no hard dependency. A throwing sink is swallowed: an alerting failure
must never become an order-creation failure.

### Audit trail

`audit_log` records every admin mutation — status changes, price and stock
edits, publish toggles — via `recordAudit()` in `server/services/audit.ts`.
Price and stock are separate actions so "who discounted this" is not buried in
stock corrections, and a no-op edit is not recorded.

The two admin mutations on `CommerceProvider` return the row **as it was before
the change** rather than `void`, which is how the diff is captured without a
getter on the interface or a second round trip. A Shopify adapter has to honour
that too.

Two properties worth keeping:

- **Best-effort and post-hoc.** It runs after the mutation commits, and a write
  failure is logged (`audit.write_failed`), never thrown — refusing a price
  change because the audit insert failed is worse than the missing row. The
  honest limit: this is good enough to answer "who changed the price and when",
  and not good enough to be evidence. A tamper-evident trail needs
  same-transaction writes and an append-only grant at the database level.
- **Attribution is only as good as the auth.** `/admin` is one shared password,
  so `actor` is the constant `'admin'` and `actorIp` is the only distinguishing
  detail. Per-person attribution needs per-user accounts (Phase 2).

`db:seed` truncates `audit_log` along with the commerce tables, so a reseed does
not leave entries pointing at entity ids that no longer exist. A real deployment
must never truncate it.

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
and the image scripts — a product cannot exist without artwork. Images are 1200×1200
WebP (the hero is 2400×1400) written to the filenames `productImages()` derives from
the slug, so swapping any image is overwriting a file, never a database change.

Seeded stock is deliberately uneven: some variants at 1–3 (shows "Only n left"),
one at 0 (shows out of stock). Preserve that when editing seed data — it is what
makes the demo read as a real store.

**`npm run db:seed` does not invalidate any cache.** It writes straight to
Postgres, so it never calls `updateTag(CATALOGUE_TAG)` the way an admin mutation
does, and it cannot touch the on-disk ISR cache either. After reseeding, the
storefront keeps serving the previous catalogue — through a full server restart,
because `.next/cache` survives one. Symptoms are alarming and misleading: a
product you just restored still 404s, an old price persists, an item stays
missing from its collection. The fix is to rebuild:

```bash
rm -rf .next/cache && npm run build
```

Reseed *before* the build, never between the build and the demo.

## Environment

Copy `.env.example` to `.env.local`. Only `DATABASE_URL` and `ADMIN_COOKIE_SECRET`
(32+ chars) are truly required; Stripe keys, `RESEND_API_KEY` and `ADMIN_PASSWORD`
all degrade gracefully — missing Stripe falls back to the mock gateway, missing
Resend logs the rendered email instead of sending it. Never commit `.env.local`.

`next.config.ts` sets a CSP that explicitly allows `js.stripe.com` in `script-src`
and `frame-src`. Adding any third-party script means editing that list.

### DEMO_MODE is the go-live gate

Every fallback above is **silent**, which is right for a demo and dangerous for a
real store: forget `NEXT_PUBLIC_SITE_URL` and the sitemap advertises localhost;
forget Stripe and the shop hands out product for free. `src/lib/env.ts` audits
the environment from `instrumentation.ts` at boot.

- `DEMO_MODE=true` — fallbacks allowed, each one logged as a `[env] WARN`.
  Required to run this repo; it is set in `.env.example`.
- unset — those same fallbacks are **fatal**. Next reports a failed
  instrumentation hook and every request returns 500, so a platform health check
  fails the deploy instead of promoting a store that takes no money.

Handover is therefore: drop `DEMO_MODE`, read what it refuses on, fix each one.
`GO-LIVE.md` is the runbook. Keep new fallbacks honest — if you add one that
would embarrass a real store, add it to `auditEnv()` in the same commit.

Two demo tells already self-disable on `stripeConfigured()`, verified against a
production build with placeholder keys: `/api/mock-payment/confirm` returns 404,
and the "Demo store — use card 4242…" note on checkout is gated on
`mode === 'mock'`. Anything else that says "demo" out loud belongs behind the
same check, not in a handover checklist a human has to remember.

## Route structure

Storefront routes live under `src/app/(shop)/` and get the header, footer and cart
drawer from that group's layout. `/admin` sits outside it with its own chrome, so
the root layout holds only the document, font and toaster. Two consequences:

- Adding a storefront page means putting it inside `(shop)`, or it renders
  chrome-less.
- `revalidatePath` from an admin action must use the **route-group qualified**
  path, and a dynamic segment needs the pattern form plus an explicit type:
  `revalidatePath('/(shop)/products/[slug]', 'page')`. A bare
  `revalidatePath('/', 'layout')` will not reach the prerendered product pages.

The prose pages (`/about`, `/shipping-returns`, `/contact`) sit in a nested
`(static)` group inside `(shop)`. Its layout is the whole design: single column,
`max-w-[65ch]`, `.prose-page` (PRD 6.7). A new prose page goes in that group and
inherits the measure — do not hand-roll widths per page.

## SEO surface

`src/app/robots.ts` and `src/app/sitemap.ts` are Next metadata routes, not files
in `public/`. Both build absolute URLs from `siteUrl()` in `src/lib/brand.ts`,
which falls back to `http://localhost:3000` when `NEXT_PUBLIC_SITE_URL` is
unset — so a deploy that forgets that variable publishes a sitemap full of
localhost links. It is the one env var whose absence fails silently.

The sitemap enumerates products through `commerce.getProducts()`, which returns
published products only, so unpublishing a product drops it from the sitemap for
free. Adding a storefront route means adding it to `staticPages` there and
checking it against the `disallow` list in `robots.ts` (`/admin`, `/api`,
`/checkout`, `/cart`).

## Next.js 16 notes

`AGENTS.md` is not boilerplate — this Next.js differs from training data. Two
things already bitten:

- **`middleware.ts` is deprecated and renamed `proxy.ts`.** Same behaviour; it
  defaults to the Node.js runtime in v16, which is why the admin gate can verify
  an HMAC with `node:crypto` there.
- **`notFound()` and `redirect()` return HTTP 200 on streamed responses.** The
  status is already sent by the time they run. The correct body renders and Next
  injects `<meta name="robots" content="noindex">`, so this is a soft 404 by
  design, not a bug to chase. Unmatched URLs still return a real 404.

Check `node_modules/next/dist/docs/` before assuming an API works the way you
remember.

## Testing UI in the browser

Synthetic events are unreliable here and have produced two false bug reports
already. When the Browser pane's document is not focused (`document.hasFocus()`
is false), `el.blur()` fires no event, so any save-on-blur handler silently never
runs. Radix controls are worse: clicking the hidden native `input[type=radio]`
does nothing, because the real control is the sibling `[role="radio"]`.

Front the tab and use the `computer` tool for anything involving focus, blur or a
Radix primitive. Reserve `javascript_tool` for reading state.

### Streamed pages appear frozen on their skeleton — this is the pane, not a bug

If the Browser pane is not displayed it does not composite frames, so
`requestAnimationFrame` never fires. React 19 does not swap a Suspense boundary
inline any more: it queues the reveal in `$RB` and flushes it from `$RV` behind a
rAF callback. No rAF, no reveal — **the `loading.tsx` fallback stays on screen
forever**, and in a production build it surfaces as `Minified React error #441`.

Only streamed routes are affected, which is why it looks like an `/admin` bug:
every admin page reads cookies and so renders dynamically, while every storefront
page is static or ISR and ships its content inside the shell. Soft navigation is
fine — it never streams.

This cost a full day's misdiagnosis and nearly had the admin skeletons deleted.
Before blaming app code, check `document.hidden` and `typeof $RT`; `undefined`
means no rAF has run. To unstick a page for inspection:

```js
if (window.$RB && window.$RB.length) window.$RV(window.$RB);
```

Rule of thumb: a boundary that never resolves *and* leaves its
`template[id^="B:"]` in the DOM is this, every time. A real hang has different
symptoms — no content in the matching `div[hidden][id^="S:"]`.

## Performance

Measured against a production build (`next start`), median of 7:

| Route | Before | After |
|---|---|---|
| `/`, `/products/[slug]`, static pages | 3 ms | 3 ms |
| `/collections/[slug]?sort=` | 671 ms | 12 ms |
| `/admin`, `/admin/orders` | ~430 ms | ~235 ms |
| `/admin/products` | 440 ms | ~450 ms (network-bound, see below) |

What did it:

- **Catalogue reads are cached** (`unstable_cache`, 60s, tagged `CATALOGUE_TAG`)
  in `lib/commerce/local/catalog.ts`. `includeUnpublished` bypasses the cache —
  admin must never read a shared or stale catalogue.
- **Admin mutations call `updateTag(CATALOGUE_TAG)`**, not `revalidateTag`. This
  is a read-your-own-writes case: `revalidateTag`'s recommended `profile="max"`
  serves the stale value once before refreshing, which would break the "change a
  price, see it live" moment in PRD 6.12. Verified end to end.
- **`getCollection` no longer scans the whole catalogue** to compute one count,
  and the collection page skips it entirely — its title and description are
  static copy and its result count comes from the products it already loaded.
- **List views pass `withItems: false`** so the orders table stops loading every
  order's line items to render columns that never show them.

### The remaining floor is network latency

A warm `SELECT 1` against Neon costs **~220 ms** from here. That is the floor for
any uncached route, and it dwarfs anything the query does. Two consequences:

- Reducing the *number* of sequential round trips matters; micro-optimising SQL
  does not.
- A full `select()` on `variants` costs ~410 ms versus ~205 ms for narrow
  columns — the `optionValues` jsonb payload is worth a whole extra round trip.
  Dropping it would halve `/admin/products`, but `optionValues` is real data the
  `Variant` type promises, so it is not stubbed out. If that screen ever needs to
  be faster, give the admin table its own narrower type rather than lying in the
  shared one.
- Do not add `Promise.all` around queries expecting a win on a cold pool: a
  second concurrent query forces a second TLS connection to Neon (~1.5 s), which
  is slower than reusing one warm connection. It only pays off once the pool is
  warm.

The real fix for the admin screens is co-locating the database with the app
region, not more application code.

## Skeletons

`.skeleton` in `globals.css` carries a left-slanted highlight that sweeps across
while content loads. The slant is the gradient angle, exposed as
`--skeleton-angle` (default `115deg`); `65deg` mirrors the lean.

- Skeletons use `--skeleton` / `--skeleton-highlight`, not `--muted`. `--muted`
  is 96% lightness, so a light band sweeping over it is invisible.
- The sweep loops for 1.4s, over the 200ms ceiling in PRD 7.6. That rule is about
  state transitions feeling instant; a continuous loading indicator has to be slow
  enough to read as motion. Under `prefers-reduced-motion` the highlight is
  removed entirely rather than shortened, or the global 0.01ms override would
  freeze the band mid-element as a permanent diagonal stripe.
- `Skeleton` blocks are `aria-hidden`; wrap a loading region in `SkeletonRegion`
  so screen readers hear "loading" once instead of a wall of empty boxes.
- **Loading is not the same state as empty.** `CartProvider` exposes `loading`
  precisely because `cart === null` used to mean both, which flashed "Your cart is
  empty." on every page load and "Pay Rs 0" on checkout.

## Imagery

**Every image in `public/products/` is a photograph** — hero, collection tiles and
all two-to-three frames of every product — fetched and encoded by
`scripts/fetch-photography.ts`, which is the source of truth for that directory.

`scripts/generate-images.ts` still renders the original vector silhouettes and
still writes the same filenames, so running `npm run images:generate` reverts the
storefront to artwork. It is kept as the fallback for a catalogue change made
without network access; re-run the photography script afterwards.

`FRAMES` in the photography script is asserted exhaustive over `CATALOG` at
startup — frame count must equal `imageCount`, no product may repeat a photograph
within its own gallery, and **frame 1 must be unique across products** because it
is the grid thumbnail and a repeat there reads as a broken catalogue. Add a
product without adding its frames and the script refuses to run.

### Sourcing rules — do not relax these

- **Unsplash License only.** Free for commercial use, no attribution required.
- **No identifiable people.** The licence covers the photograph, not the depicted
  person's likeness; there is no model release. The best-matching South Asian
  apparel shots on Unsplash are all editorial portraits, and every one of them is
  unusable for that reason.
- **No third-party brand marks.** Many garment-only stock shots carry visible
  labels and hangers ("ZARA", "BROOTZ", printed slogan tees). PRD 16 forbids
  competitor imagery.

That combination rules out the editorial apparel photography that dominates a
search for any Pakistani garment — every good match is a portrait of a model. What
survives is garment-only work: pieces on a hanger or a rail, flat lays, folded
stacks and fabric close-ups. That is what the catalogue is built from, so the
frames are chosen for consistent light and a neutral ground rather than for
literal accuracy to a shalwar kameez silhouette, which stock does not have
without a person wearing it.

Candidates rejected on review are recorded in `public/products/CREDITS.md` so the
next pass does not re-litigate them. Review new ids on a contact sheet before
adding them — several images in the pool carry a brand label, a stray object or a
colour cast that is invisible in the alt text and obvious at thumbnail size.

### Do not select textures by file size

PRD 16 caps images at 200KB. `next/image` re-encodes per viewport, so a 500KB
source ships as ~38KB at 384px and the cap is not what reaches a phone. An
earlier pass selected smooth low-detail textures to satisfy the cap literally and
produced flat colour fields that looked like paint swatches. Select on how the
image looks; the delivered weight is already handled.
