# No Cap Next Production App

Next.js App Router migration of the No Cap Barber Shop static ecommerce site.

## Stack

- Next.js App Router
- TypeScript
- React
- CSS modules through the global `app/globals.css`
- Static fallback content for local development without Supabase or payment backends

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
- `/checkout`: in-shop checkout flow backed by local state/static products
- `/contact`: contact form with preview/local-safe behavior
- `/privacy`: privacy policy
- `/cookie`: cookie policy
- `/admin`: readonly/simulated admin dashboard with backend status panels

## Server Routes

- `POST /api/contact/create`
- `GET /api/admin/status`
- `GET /api/admin/products/summary`

Server-side secrets must stay in deployment environment variables only.
