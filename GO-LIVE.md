# Go-live runbook

Everything here needs credentials, DNS access, or a deploy target, so it is done
by a human with accounts — not by an agent. The code side is already in place;
this is the wiring.

**The gate:** `DEMO_MODE` in the deployed environment. While it is `true`, the
app runs with fallbacks (mock payments, console-only email, fictional brand).
Remove it and the server refuses to serve — returning 500 to every request and
logging exactly what is still missing, so the deploy fails its health check
rather than promoting a store that takes no money. See `src/lib/env.ts`.

Work top to bottom. Re-deploy without `DEMO_MODE` at the end; if it boots, you
are done.

---

## 1. Stripe

1. Create a Stripe account and complete business verification. Payouts need a
   bank account and tax details — start this early, verification is not instant.
2. Copy the **live** keys into the deploy environment:
   - `STRIPE_SECRET_KEY` (`sk_live_…`) — server only, never `NEXT_PUBLIC_`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_live_…`)
3. Register the webhook endpoint against the deployed URL:
   `https://<your-domain>/api/webhooks/stripe`
   Subscribe to exactly the two events the handler implements — anything else is
   acknowledged and ignored:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` (`whsec_…`). Without it
   the route returns 400 to every delivery.

### Verify before taking real money

Do this in **test mode first**, on a deployed URL (not localhost — Stripe cannot
reach it). Cards are in PRD §9.4.

- [ ] `4242 4242 4242 4242` — order created, status `paid`, appears in `/admin`
- [ ] `4000 0000 0000 9995` — declined, reason shown, form stays filled and
      re-submittable, **no order created**
- [ ] `4000 0025 0000 3155` — 3-D Secure challenge completes, then order created
- [ ] Replay a `payment_intent.succeeded` delivery from the Stripe dashboard —
      the second one must return the existing order, not a duplicate
      (`orders.payment_intent_id UNIQUE`)
- [ ] Disable the endpoint mid-checkout, pay, and confirm the success page shows
      the polling-timeout copy rather than hanging or inventing an order
- [ ] Confirm the mock gateway is gone: `POST /api/mock-payment/confirm` must
      return **404**, and the checkout page must render Stripe Elements

The last one matters. The route self-disables whenever `stripeConfigured()` is
true, but verify it in staging rather than assuming — it is the difference
between a store and a giveaway.

---

## 2. Email

1. Create a Resend account and add the sending domain.
2. Add the DNS records Resend gives you and wait for verification:
   - **SPF** (TXT) and **DKIM** (CNAME) — required for delivery
   - **DMARC** (TXT) — start at `p=none` and tighten once you see reports
3. Set the env vars:
   - `RESEND_API_KEY`
   - `EMAIL_FROM` — must be **on the verified domain**, e.g.
     `Acme <orders@acme.com>`. The fallback sends from `onboarding@resend.dev`,
     which fails SPF/DKIM alignment for your domain and lands in spam.

### Verify

- [ ] Place a test order — confirmation arrives within 60 seconds
- [ ] Check the raw headers: SPF **pass**, DKIM **pass**, DMARC **pass**
- [ ] Send to a Gmail and an Outlook address; confirm neither goes to spam
- [ ] Confirm the reply-to address reaches a mailbox somebody reads

### Bounces

Not built. Today a Resend failure is logged and swallowed so a mail problem can
never break checkout — correct, but it means nobody finds out. Before real
volume, either add a Resend webhook to record bounces against the order, or at
minimum alert on the existing `[email] send failed` / `[email] send threw` log
lines. A silently bouncing confirmation looks identical to a working one.

---

## 3. Brand and legal content

`src/lib/brand.ts` is the single source for name, email, phone, address and
tagline — change it there, not in components. Set `NEXT_PUBLIC_BRAND_NAME` too,
since the env value wins.

**The demo disclaimers must be removed.** These currently say, in the client's
own storefront, that the shop is not real:

- `src/app/(shop)/(static)/about/page.tsx` — "is a fictional brand built for a
  portfolio", plus the whole brand story
- `src/app/(shop)/(static)/contact/page.tsx` — same disclaimer
- `src/components/layout/Footer.tsx` — "A demonstration store — no real orders
  are …"

Then rewrite the prose. This is the client's content, not a find-and-replace:

- **About** — their story
- **Shipping & Returns** — must match `src/lib/shipping.ts` exactly. Change the
  rates there and the page follows; the two are specified to agree word for word
  (PRD §12.3), and a mismatch between advertised and charged shipping is a
  consumer-law problem, not a copy nit.
- **Contact** — a monitored address and phone
- **Terms and Privacy** — do not exist yet. A store taking payments and storing
  addresses needs both, and in most jurisdictions a privacy notice is a legal
  requirement. Have them supplied or drafted by someone qualified; do not
  generate them.

Also replace the imagery. The current product shots are generated artwork plus
Unsplash textures (`public/products/CREDITS.md`), which is right for a demo and
wrong for selling real garments.

---

## 4. Deployment environment

Set every one of these on the host:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string |
| `ADMIN_COOKIE_SECRET` | 32+ random bytes. Rotating it logs everyone out |
| `ADMIN_PASSWORD` | Long and random |
| `NEXT_PUBLIC_SITE_URL` | `https://…`, no trailing slash |
| `STRIPE_SECRET_KEY` · `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` · `STRIPE_WEBHOOK_SECRET` | §1 |
| `RESEND_API_KEY` · `EMAIL_FROM` | §2 |
| `NEXT_PUBLIC_BRAND_NAME` | §3 |
| `DEMO_MODE` | **Do not set.** Its absence is the go-live gate |

`NEXT_PUBLIC_*` values are inlined at build time, so changing them requires a
rebuild, not just a restart.

### Verify

- [ ] Boot logs contain no `[env]` warnings
- [ ] `/sitemap.xml` and `/robots.txt` show the real domain, not localhost
- [ ] `view-source` on a product page: canonical and OG URLs use the real domain
- [ ] `/admin` redirects to login when signed out, over HTTPS

---

## Known gaps at go-live

Shipping these is a decision, not an oversight. Each is Phase 2 (PRD §3.3, §17.5):

- No rate limiting on checkout, admin login, or the webhook
- No CSRF tokens on admin forms
- No audit log of who changed a price or cancelled an order
- No error monitoring, and no alerting on failed webhooks or orders written
  `pending` with `stockConflict: true` — both cost money silently
- No automated tests around the payment or stock paths
- Schema is applied with `db:push`; there are no migration files and no rollback
- Admin is one shared password with no accounts or roles
- No tax calculation, refunds/returns workflow, or partial fulfilment
