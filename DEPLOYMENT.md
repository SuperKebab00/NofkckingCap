# Cloudflare Deployment Checklist

## Current Deployment Scope

This project is currently ready for a Cloudflare Pages test deploy.

The active checkout flow is `in-shop`. PayPal and Stripe support exists in the codebase, but online payments are disabled on the frontend and should be treated as optional/future until provider configuration, sandbox testing, idempotency, and stock behavior are verified.

## Cloudflare Pages Setup

Use these settings for the current static app:

- Framework preset: None
- Build command: leave empty
- Output directory: `/`
- Functions directory: `functions/`

The app is vanilla HTML/CSS/JS and does not need a bundler or generated `dist` directory for the current deployment model.

## Required Environment Variables

Configure these in Cloudflare Pages for the test deployment:

- `SUPABASE_URL`: Supabase project URL used by server-side Functions.
- `SUPABASE_SERVICE_ROLE_KEY`: server-side Supabase service role key. Never expose this in frontend files.
- `PUBLIC_SITE_URL`: public Pages URL or custom domain for the deployed site.
- `APP_ENV`: use `production` for deployed environments.

## Optional Future Environment Variables

These are not required for the current `in-shop` deployment.

PayPal:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV`

Stripe:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Only enable PayPal or Stripe after provider accounts, environment variables, sandbox tests, webhook or capture idempotency, and stock behavior have been verified.

## Files Not To Commit Or Deploy

Do not commit or deploy local secrets, generated dependencies, local runtime state, or archive/cache files:

- `.dev.vars`
- `.dev.vars.*`
- `.env`
- `.env.*`
- `node_modules/`
- `.wrangler/`
- `dist/`
- `delivery/`
- `*.zip`
- `*.log`
- `*.tmp`
- `*.bak`
- local cache files

Example files such as `.env.example` and `.dev.vars.example` may stay in the repository if they contain placeholders only.

## Post-Deploy Manual Checklist

After deploying to Cloudflare Pages:

1. Open the deployed site and verify the homepage loads without console errors.
2. Verify static assets under `Img/` load correctly.
3. Verify Supabase-backed public content loads as expected.
4. Open checkout and confirm only `in-shop` is visible as a payment method.
5. Submit a test `in-shop` checkout with valid customer data.
6. Confirm the order is created in Supabase with the expected customer fields, totals, status, payment mode, and items.
7. Confirm invalid checkout input is rejected gracefully.
8. Confirm `_headers` are applied, especially CSP and security headers.
9. Confirm no server-side secrets appear in browser source, network responses, or console output.
10. Review Cloudflare Functions logs for unexpected errors.

## Go/No-Go Notes

Go for test deploy when:

- required Cloudflare environment variables are configured;
- `npm run check:format` passes locally;
- `npm test` passes locally;
- PayPal and Stripe remain disabled on the frontend unless fully configured.

Do not treat the deployment as production-ready for online payments until PayPal/Stripe provider setup, idempotency, webhooks, and stock reservation behavior are verified in a sandbox or equivalent test environment.
## Next App Preview

The parallel `next-app/` can now be prepared for preview without changing the
vanilla production backend.

Recommended public env vars for detached preview:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_CONTACT_FORM_MODE=preview
```

Mode guidance:

- `live`: use only when `next-app` is same-origin with the existing Cloudflare
  backend and `POST /api/contact/create` is reachable as-is.
- `preview`: use for detached preview domains. The contact form remains visible
  and contextual, but submit is intentionally disabled.
- `disabled`: manual fallback if the form must stay visible but fully blocked.

Preview-safe expectations:

- read-only Supabase public routes can work with public env vars only;
- checkout remains `in-shop` UI/client only;
- admin remains read-only/non-operational;
- no Next API routes, proxy, or rewrite are required for this preview mode.
## Admin API env split

Protected admin status currently uses a split env model:

- Cloudflare/root server env:
  - `ADMIN_API_TOKEN`
- `next-app` server-only env:
  - `ADMIN_API_BASE_URL`
  - `ADMIN_API_TOKEN`
- `next-app` public env:
  - no admin token is allowed

Do not expose:

- `NEXT_PUBLIC_ADMIN_API_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY`
- any server bearer token in browser-facing config

Current contract:

- `GET /api/admin/status`
- `GET /api/admin/products/summary`
- header: `Authorization: Bearer <ADMIN_API_TOKEN>`
- read-only only
- no CRUD endpoints enabled in deploy yet

Auth strategy note:

- `ADMIN_API_TOKEN` is acceptable for server-to-server read-only admin endpoints
- it is not sufficient as the final auth model for admin writes
- future admin writes must move to verified admin user auth, with Supabase Auth/JWT checked server-side before enabling `POST` / `PATCH` / `DELETE`

Current admin JWT verification status:

- no production-ready Cloudflare admin JWT verification is enabled yet
- before enabling it, deploy docs must define:
  - server-only JWT verification input, for example `SUPABASE_JWT_SECRET` or equivalent
  - the server-side admin claim contract
  - the rule that maps a verified user to admin privileges

Recommended server-side admin privilege source:

- `public.admin_users`
- checked only after JWT verification
- expected rule: `admin_users.user_id = sub and is_admin = true`
- never trust browser-provided `is_admin` flags
- do not use a hardcoded admin UID as the final authorization model

Recommended migration posture for `public.admin_users`:

- keep the SQL migration manual only
- prefer FK `public.admin_users.user_id -> auth.users.id` with `on delete cascade`
- use a dedicated `updated_at` trigger
- enable RLS
- do not add permissive browser-facing policies until the admin auth flow is fully reviewed
