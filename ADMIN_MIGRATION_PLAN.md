# Admin Migration Plan

This document captures the first safe step toward a real admin migration in
`next-app/` without enabling CRUD, auth, or writes prematurely.

## Current Findings

### Vanilla admin surface

- The vanilla admin UI is embedded in [index.html](C:/Users/Jadir/Desktop/NO%20CAP/index.html)
  and [app.js](C:/Users/Jadir/Desktop/NO%20CAP/app.js).
- The vanilla admin exposes login, tabs, KPI counters, product management, order
  lists, and lead lists in a single client-side surface.
- Current repository behavior in
  [js/repository.js](C:/Users/Jadir/Desktop/NO%20CAP/js/repository.js) includes:
  - `saveProducts()` via Supabase client upsert
  - `deleteProduct()` via Supabase client delete
  - `deleteLead()` via Supabase client delete
  - stock updates via Supabase client update

### Backend/API surface

- Cloudflare Functions currently cover:
  - checkout create/capture/verify
  - contact create
  - Stripe webhook
- There is no existing dedicated protected admin API contract in
  [functions/api](C:/Users/Jadir/Desktop/NO%20CAP/functions/api).
- The current backend helper in
  [functions/api/_lib/checkout.js](C:/Users/Jadir/Desktop/NO%20CAP/functions/api/_lib/checkout.js)
  uses `SUPABASE_SERVICE_ROLE_KEY`, but only server-side for checkout logic.

### DB / auth model

- [DATABASE.md](C:/Users/Jadir/Desktop/NO%20CAP/DATABASE.md) documents a hardcoded
  admin UID model for write policies.
- This is not a strong enough basis to introduce new admin write paths in
  `next-app/` without a dedicated server-side contract.
- Product deletion policy is already fixed:
  - future admin delete must be a real `DELETE` on `products`
  - it must not be reinterpreted as `is_active = false` soft-delete unless a
    future explicit task changes the rule

## Decision For The First Real Admin Step

Chosen path: document the backend contract and add static guard tests.

Why:

- there is no clearly reusable protected admin auth flow for Next yet
- adding write endpoints now would risk exposing fragile or implicit auth
- adding UI CRUD now would create fake affordances without safe server control
- the highest-signal safe step is to lock constraints and prevent accidental
  service-role/client leakage

## Safe Contract For The Next Admin Step

Before any real admin CRUD in `next-app`, the project should introduce a
server-side admin contract with all of the following:

1. Admin authentication must be explicit and server-verified.
2. `SUPABASE_SERVICE_ROLE_KEY` must remain server-only and must never appear in
   `NEXT_PUBLIC_*` env or in browser code.
3. Product writes must not happen directly from browser-side Supabase client
   code in `next-app`.
4. Product deletion must call a protected server path and perform a real
   `DELETE` on `products`.
5. Orders and leads must remain protected and must not be read from public
   read-only helpers.

## Recommended Next Micro-Step

When resuming admin migration for real, the safest next implementation step is:

- create a documented protected read-only admin backend contract first
- only if auth is explicit and server-side verified
- still no write actions in that step

Suggested future scope:

- one protected Cloudflare admin read endpoint for product overview
- no insert/update/delete
- no order mutation
- no client-side service-role usage

## Implemented Safe Backend Step

The first concrete backend admin step is now:

- `GET /api/admin/status`
- Cloudflare Function only
- protected by `Authorization: Bearer <ADMIN_API_TOKEN>`
- token read only from server-side env
- response limited to:
  - admin API availability
  - read-only mode
  - writes disabled
  - non-sensitive catalog counts only

This endpoint does not expose orders, leads, product details, or write
capabilities.

## Out Of Scope In This Step

- no admin CRUD
- no admin auth implementation
- no new Cloudflare Functions
- no write endpoints
- no changes to vanilla production runtime
## Admin API read-only contract

Current protected endpoint:

- `GET /api/admin/status`
- `GET /api/admin/products/summary`
- Auth required: `Authorization: Bearer <ADMIN_API_TOKEN>`
- Cloudflare/root server env required:
  - `ADMIN_API_TOKEN`
- Next server-only env required:
  - `ADMIN_API_BASE_URL`
  - `ADMIN_API_TOKEN`

Current safe response shape:

```json
{
  "adminApi": "available",
  "catalog": {
    "productsCount": 0,
    "categoriesCount": 0
  },
  "mode": "read-only",
  "writes": "disabled"
}
```

Current product summary shape:

```json
{
  "adminApi": "available",
  "mode": "read-only",
  "products": [
    {
      "id": "pomade",
      "name": "Matte Pomade",
      "price": 18.5,
      "category": "styling"
    }
  ],
  "total": 1,
  "writes": "disabled"
}
```

Current limits:

- no auth session/user admin login yet
- no orders or leads
- no write endpoints
- no product detail CRUD payloads
- no token or privileged secret may be exposed to the browser
- no `NEXT_PUBLIC_ADMIN_API_TOKEN`
- no `SUPABASE_SERVICE_ROLE_KEY` in `next-app`

## Future admin endpoint naming

Reserved contract naming for future protected admin work:

- `GET /api/admin/status`
- `GET /api/admin/products/summary`
- `GET /api/admin/products/summary`
- `POST /api/admin/products`
- `PATCH /api/admin/products/:id`
- `DELETE /api/admin/products/:id`

Rules for future implementation:

- no write endpoint before protected auth is defined
- write endpoints must stay server-side only
- product delete must be a real `DELETE` of the `products` record
- not soft-delete `is_active=false`, unless a future task explicitly changes that rule

## Admin Auth Strategy

Decision:

- keep `ADMIN_API_TOKEN` only for server-to-server admin read-only calls
- require real user admin auth before any future write endpoint is opened

Current rationale:

- the existing vanilla admin already uses Supabase Auth login semantics
- `ADMIN_API_TOKEN` protects deploy-to-deploy traffic, but it does not identify a specific admin user
- the current documented schema/contracts do not yet define a complete, production-safe admin role model for write operations
- opening write endpoints now behind only a shared bearer token would be weaker than the existing direction of travel

Chosen phased strategy:

1. Present phase:
   - `GET /api/admin/status`
   - optional future admin read-only detail endpoints
   - protected with `Authorization: Bearer <ADMIN_API_TOKEN>`
   - callable only from trusted server-side contexts such as Next Server Components/helpers

2. Required phase before writes:
   - admin user signs in with Supabase Auth
   - Cloudflare admin write endpoints verify the user JWT/claims server-side
   - write permission is granted only after explicit admin role validation is defined
   - RLS / role contract must be documented before `POST`, `PATCH`, or `DELETE` admin endpoints go live

Explicit non-goals for the current phase:

- no browser-exposed admin bearer token
- no `NEXT_PUBLIC_ADMIN_API_TOKEN`
- no write endpoint protected only by a shared deploy token
- no fake admin auth in Next
- no CRUD before role verification rules are documented

## Admin JWT verification gap

Current blockers before a real admin JWT check can go live in Cloudflare:

- no documented `SUPABASE_JWT_SECRET` or equivalent server-side JWT verification binding in deploy docs
- no documented server-side admin claim contract such as `app_metadata.role=admin`
- current database notes still reference a brittle admin UID value, which is not enough for a durable write auth model
- no documented backend rule yet for how Cloudflare should map a verified Supabase user to admin privileges

Prepared base in this batch:

- `functions/api/_lib/admin-auth.js`
- reads `Authorization: Bearer <token>`
- exposes a non-operative `verifyAdminJwt()` placeholder
- returns `401` for missing token
- returns `503` while JWT verification config is missing
- returns `501` when config exists but cryptographic verification is still not implemented

Decision for now:

- do not create `GET /api/admin/auth/check` yet
- do not create any admin write endpoint
- do not treat shared deploy token auth as user admin auth

## Recommended admin DB contract

Recommended schema for real admin recognition:

```sql
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Why this shape:

- narrow and explicit
- no browser-facing role source of truth
- avoids hardcoded admin UID as the final model
- easy to check server-side after JWT verification

Migration notes:

- proposed file: `sql/admin_users_proposed.sql`
- apply manually only
- includes `updated_at` trigger/function
- enables RLS with no permissive client policies by default
- includes only a commented manual seed example

Required future verification flow:

1. Frontend gets a Supabase Auth JWT after login.
2. Frontend sends `Authorization: Bearer <jwt>` to Cloudflare admin endpoints.
3. Cloudflare verifies the JWT server-side.
4. Cloudflare extracts `sub`.
5. Cloudflare checks `public.admin_users.user_id = sub and is_admin = true`.
6. If not admin, return `403`.
7. Only verified admins may reach future write endpoints.
