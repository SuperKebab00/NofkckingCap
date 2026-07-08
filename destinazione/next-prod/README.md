# No Cap Next Production App

Next.js App Router migration of the No Cap Barber Shop static ecommerce site.

## Stack

- Next.js App Router
- TypeScript
- React
- CSS modules through the global `app/globals.css`
- Static fallback content for local development without Supabase or payment backends
- Supabase-backed server routes for prod-ready CRUD flows when env is configured

## Local Development

```bash
npm install
npm run dev
```

The app runs without private backend credentials. Public Supabase values can be
added in `.env.local` when available:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_CONTACT_FORM_MODE=preview
```

Server-side admin/API features require deployment-only secrets:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWKS_URL=...
ADMIN_API_TOKEN=...
TURNSTILE_SECRET_KEY=...
APP_ENV=development
```

## Verification

```bash
npm run lint
npm run build
npm test
```

## Routes

- `/`: home, fresh cut, showcase, brand sections
- `/shop`: catalog, categories, search/sort, product cards
- `/checkout`: vanilla-like checkout flow connected to `POST /api/orders/create` when server env is configured
- `/contact`: contact form connected to server-side lead creation when enabled
- `/privacy`: privacy policy
- `/cookie`: cookie policy
- `/admin`: admin dashboard for Products, Shop Structure, Orders and Leads APIs

## Server Routes

- `POST /api/contact/create`
- `POST /api/orders/create`
- `GET /api/admin/status`
- `GET /api/admin/products/summary`
- `GET|POST /api/admin/products`
- `GET|PATCH|DELETE /api/admin/products/[id]`
- `GET|POST /api/admin/shop-categories`
- `GET|PATCH|DELETE /api/admin/shop-categories/[id]`
- `GET|POST /api/admin/shop-sections`
- `GET|PATCH|DELETE /api/admin/shop-sections/[id]`
- `GET|POST /api/admin/shop-sections/[id]/items`
- `PATCH|DELETE /api/admin/shop-section-items/[id]`
- `GET /api/admin/orders`
- `GET|PATCH /api/admin/orders/[id]`
- `GET /api/admin/leads`
- `GET|PATCH|DELETE /api/admin/leads/[id]`

Server-side secrets must stay in deployment environment variables only.

## Final Prod-Ready Stabilization

Local validation status:

- `npm run lint`: passes with known `@next/next/no-img-element` warnings.
- `npm run typecheck`: passes.
- `npm test`: passes.
- `npm run build`: passes.

Supabase migration files are present under `supabase/migrations/`, but this
environment does not have the Supabase CLI installed and no real `.env.local`
is configured. Apply and smoke-test the migrations on dev/staging before
production deploy.

Payments remain OFF. `payment_mode` is stored as order metadata only; no
Stripe/PayPal provider, redirect or modal is implemented.
