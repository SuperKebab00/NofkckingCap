# NEXT_MIGRATION_MAP.md

Migration map for a possible future move from the current vanilla static ecommerce app to Next.js/React/TypeScript.

This document is planning-only. It does not introduce Next.js, new dependencies, route folders, components, or runtime changes.

## 1. Obiettivo della migrazione

Migrate gradually to Next.js, React, and TypeScript without breaking:

- checkout flow;
- Supabase client/server usage;
- Cloudflare deployment assumptions;
- current UX, layout, and visible content;
- public API contracts;
- security posture around secrets, payments, and RLS.

The migration should reduce coupling and improve maintainability, not change business behavior as a side effect.

## 2. Cosa preservare

Preserve these parts as hard compatibility targets:

- Existing API contracts:
  - `/api/contact/create`
  - `/api/checkout/create`
  - `/api/checkout/capture`
  - `/api/checkout/stripe/verify`
  - `/api/stripe/webhook`
- Checkout flow and server-side authority for prices, totals, stock, payment state, and order status.
- Real Supabase schema and RLS model documented in `DATABASE.md`.
- Security headers and CSP intent from `_headers`.
- Current `Img/` assets and their paths or an explicit path compatibility layer.
- Existing order statuses, including `prenotato`, `pending-payment`, `pagato`, `in-lavorazione`, `spedito`, `completato`, and `annullato`.
- Existing payment modes, including `in-shop`, `paypal`, and `stripe`.
- Current user-facing UX, content, legal pages, local business information, product presentation, and admin workflows.

## 3. Mappatura file attuali -> Next.js

- `index.html` -> layout, pages, and React components.
  Split by page/view: home, shop, checkout, admin, legal pages, modals/drawers. Preserve text and DOM-dependent behavior carefully.
- `styles.css` -> global CSS plus optional CSS modules/component styles.
  Start with global CSS to reduce visual regression risk. Component styles can be extracted later.
- `app.js` -> state management, event handlers, React components, hooks.
  Main migration hotspot. Split into cart, checkout, admin, consent, routing, and UI state.
- `js/repository.js` -> data access layer.
  Keep a framework-independent data layer first. Separate Supabase reads/writes from localStorage fallback.
- `js/supabase-client.js` -> Supabase client config.
  Keep browser anon client separate from server-side service-role usage. Never share service role with client bundles.
- `functions/api/*` -> keep Cloudflare Functions or migrate to Next route handlers.
  Decide only after hosting choice. Preserve endpoint contracts either way.
- `_headers` -> Next/Cloudflare deployment headers equivalent.
  Recreate CSP, frame, referrer, permissions, cache, and HSTS behavior in the target hosting model.
- `DATABASE.md` -> database contract documentation.
  Use as source of truth for current real Supabase schema during migration.
- `AGENTS.md` -> agent/project rules.
  Keep as operational guidance for future tasks.
- `tests/security-smoke-tests.mjs` -> baseline smoke checks.
  Keep and extend with migration-specific checks.

## 4. Strategia consigliata

Do not rewrite the whole app in one pass.

Recommended order:

1. Isolate the data layer while still in vanilla JS.
2. Isolate checkout and payment return handling behind stable functions.
3. Migrate static UI/page sections into React components while preserving CSS and content.
4. Migrate cart and checkout UI with compatibility tests.
5. Migrate admin last, because it combines auth, privileged workflows, Supabase writes, and operational risk.
6. Evaluate API migration only after hosting is decided and endpoint parity is testable.

The safest path is to make the current vanilla app more modular before introducing Next.js.

## 5. Decisione hosting

### Opzione A: Next.js su Cloudflare Pages/Workers

Pros:

- Keeps the project close to the current Cloudflare Pages deployment model.
- Can preserve Cloudflare-oriented headers, Functions mindset, and edge runtime assumptions.
- Good fit if the project should stay Cloudflare-first.

Cons:

- Next.js support on Cloudflare may require adapter/runtime constraints.
- Some Node APIs or Next features may not work the same as on Vercel.
- Route handlers, middleware, and server runtime behavior must be verified against Cloudflare.

Project-specific risks:

- Existing `functions/api` behavior may need endpoint-by-endpoint compatibility work.
- Stripe webhook raw body handling must be verified carefully.
- CSP and `_headers` equivalent must be recreated without accidentally loosening payment/script restrictions.

### Opzione B: Next.js su Vercel

Pros:

- Native Next.js hosting path with fewer framework compatibility surprises.
- Straightforward route handlers, environment variables, previews, and serverless behavior.
- Easier adoption of common Next.js patterns.

Cons:

- Changes hosting platform and operational model.
- Existing Cloudflare Pages assumptions and `_headers` behavior need translation.
- Domain, caching, redirects, headers, and environment management change.

Project-specific risks:

- API URLs and webhook endpoints must be reconfigured in Stripe, PayPal, and frontend config.
- Supabase env var separation must be audited again.
- Local business SEO and asset paths can regress if routes/assets move too quickly.

## 6. Rischi principali

- Checkout breakage from route, state, redirect, or payment return changes.
- Public/private env var divergence between current config and Next conventions.
- CSP becoming too permissive, weakening security, or too restrictive, breaking Stripe, PayPal, Supabase, or Turnstile.
- Supabase service role accidentally imported into client-side code.
- Admin UI being mistaken for real authorization instead of RLS/backend enforcement.
- Broken `Img/` asset paths after moving files into a Next public/static model.
- SEO/local business regressions from changed markup, metadata, headings, routes, or legal pages.
- Stripe webhook signature verification breaking if raw request body handling changes.
- PayPal capture flow becoming non-idempotent or browser-trust-based.

## 7. Piano migrazione massimo 7 step

1. Create a migration branch and freeze current API contracts, env names, statuses, payment modes, and asset paths in documentation/tests.
2. Refactor the current vanilla data layer into smaller framework-independent modules.
3. Add focused tests for checkout validation, payment returns, webhook idempotency expectations, and Supabase client/server separation.
4. Scaffold Next.js in a separate branch only after the current app is modular enough to compare behavior.
5. Port static pages and global styles first, preserving visible content and `Img/` behavior.
6. Port cart, checkout, and admin in separate small steps, verifying each with smoke tests and manual checkout flows.
7. Decide whether to keep Cloudflare Functions or move to Next route handlers, then migrate one endpoint at a time with compatibility checks.

Each step should be small, testable, and reversible.

## 8. Criteri go/no-go

### Go: migrate when

- The current vanilla app is hard to maintain because `app.js`, `styles.css`, and `repository.js` are blocking changes.
- There is a clear need for typed components, reusable UI, server rendering, better routing, or a richer admin area.
- Checkout/API contracts are covered by tests or reliable manual verification.
- Hosting choice is decided before route/API migration begins.
- Supabase schema assumptions are stable and aligned with `DATABASE.md`.

### No-go: stay vanilla and refactor when

- The main need is only small content, styling, security, or checkout hardening changes.
- Payment, stock, RLS, or webhook behavior is not yet confidently verified.
- The team is not ready to own Next.js hosting/runtime differences.
- There is no test coverage for the flows most likely to regress.
- A migration would delay urgent go-live/security work.

## Raccomandazione finale

Prepare first. Do not migrate immediately.

The current project would benefit from modularizing the vanilla app before introducing Next.js. Start with data layer, checkout boundaries, and tests. After that, a Next.js migration can be safer, smaller, and less likely to disturb checkout, Supabase, Cloudflare behavior, or the existing UX.
