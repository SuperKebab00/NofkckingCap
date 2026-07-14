# No Cap Next Production App

Production Next.js App Router application. Run all commands from this directory.

## Commands

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run build:cloudflare
npx wrangler deploy
```

Cloudflare configuration: root directory `/destinazione/next-prod`, build command
`npm run build:cloudflare`, deploy command `npx wrangler deploy`, production
branch `definitivo`.

## Environment

Browser-safe variables: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CONTACT_FORM_MODE`.

Server-only variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_JWKS_URL`, `ADMIN_API_TOKEN`, `TURNSTILE_SECRET_KEY`, `APP_ENV`.

Use `.env.example` as the placeholder reference. Real `.env*` files are ignored.
`SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_API_TOKEN` must never be exposed with a
`NEXT_PUBLIC_` prefix.

The public shop, contact, checkout and protected admin APIs are included. Payments
remain off: no Stripe or PayPal provider, redirect or capture flow is implemented.
Supabase migrations and operating notes are in `supabase/`.

## API routes

- `POST /api/contact/create`
- `POST /api/orders/create`
- `GET|POST /api/admin/products`
- `GET|PATCH|DELETE /api/admin/products/[id]`
- `GET|POST /api/admin/shop-categories`
- `GET|POST /api/admin/shop-sections`
- `GET|PATCH /api/admin/orders/[id]`
- `GET|PATCH|DELETE /api/admin/leads/[id]`
