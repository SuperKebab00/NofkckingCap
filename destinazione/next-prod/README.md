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
npm run deploy
```

Cloudflare configuration: root directory `/destinazione/next-prod`, build command
`npm run build:cloudflare`, deploy command `npm run deploy`, production
branch `definitivo`. The project targets **Cloudflare Workers through OpenNext**,
not Cloudflare Pages: `npm run deploy` always generates `.open-next/worker.js`
before it invokes Wrangler, while preserving dashboard-managed variables with
`--keep-vars`.

## Environment

Browser-safe variables, required during `npm run build:cloudflare`:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_CONTACT_FORM_MODE`.

Runtime Worker variables/secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWKS_URL`, `TURNSTILE_SECRET_KEY`,
`APP_ENV`.

Use `.env.example` as the placeholder reference. Real `.env*` files are ignored.
`SUPABASE_SERVICE_ROLE_KEY` must never be exposed with a `NEXT_PUBLIC_` prefix.
`npm run deploy` uses `wrangler deploy --keep-vars` so dashboard-managed
production variables are not deleted by a deploy.

The public shop, contact, checkout and protected admin APIs are included. Payments
remain off: no Stripe or PayPal provider, redirect or capture flow is implemented.
Supabase migrations and operating notes are in `supabase/`.

## Admin session and orders

`/admin` is rendered dynamically. Without a verified Supabase Auth user in
`public.admin_users` with `is_admin = true`, it renders only the login panel and
does not fetch dashboard data. Successful login is handled by
`POST /api/admin/session`; access and refresh tokens stay in HttpOnly,
`SameSite=Lax` cookies. Every `/api/admin/*` route verifies the JWT and role again.

Checkout is pickup-only. `POST /api/orders/create` sends an idempotency key to the
server-side atomic RPC, which recalculates product prices and stock. The supported
order states are `prenotato`, `in-lavorazione`, `pronto-al-ritiro`, `ritirato` and
`annullato`.

## API routes

- `POST /api/contact/create`
- `POST /api/orders/create`
- `POST|DELETE /api/admin/session`
- `POST /api/admin/session/refresh`
- `GET|POST /api/admin/products`
- `GET|PATCH|DELETE /api/admin/products/[id]`
- `GET|POST /api/admin/shop-categories`
- `GET|POST /api/admin/shop-sections`
- `GET|PATCH /api/admin/orders/[id]`
- `GET|PATCH|DELETE /api/admin/leads/[id]`
