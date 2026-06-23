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
