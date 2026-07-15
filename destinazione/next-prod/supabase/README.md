# Supabase Operations

The production project uses the legacy-compatible schema in this directory. Apply only migrations that have not already been recorded in the target project; never reset or replay an applied migration against production.

## Migration order

1. `001_prod_ready_schema.sql` and `002_orders_idempotency_stock.sql` describe the original prod-ready baseline.
2. `003_legacy_compatibility_plan.sql` reflects the legacy compatibility work already applied on NOCAP in two reviewed parts. `order_items.id` remains `bigint GENERATED ALWAYS AS IDENTITY`.
3. `004_admin_authorization_and_pickup_only.sql` is applied on NOCAP. It enables and forces RLS on `admin_audit_log`, replaces hardcoded admin-ID policies with `app_private.is_admin()`, narrows orders to pickup/in-shop, and replaces the atomic order RPC.
4. `005_restrict_internal_rpc_execution.sql` revokes direct PostgREST execution of internal order RPCs from `anon` and `authenticated`; only the server service role may execute them.

## Admin authorization

- Supabase Auth authenticates the user.
- `public.admin_users(user_id, is_admin)` is the role allowlist.
- `app_private.is_admin()` checks `auth.uid()` against that table.
- The Next server validates JWT signatures through `SUPABASE_JWKS_URL`, then verifies the allowlist using the service role server-side.
- The browser never receives the service role or a static admin token. Admin session and refresh tokens are HttpOnly, `SameSite=Lax` cookies.

To grant an existing Supabase Auth user access, use its UUID only:

```sql
insert into public.admin_users (user_id, is_admin)
values ('00000000-0000-0000-0000-000000000000', true)
on conflict (user_id) do update set is_admin = excluded.is_admin;
```

## Public forms and orders

- `POST /api/contact/create` validates input, honeypot, optional Turnstile and rate limit, then inserts a lead server-side.
- `POST /api/orders/create` validates customer/items and calls `public.create_order_with_items` with an idempotency key and payload hash.
- The RPC locks products, recalculates totals from `products.price`, reserves stock and inserts order plus rows atomically.
- Only `fulfillment = pickup` and `payment_mode = in-shop` are allowed. No online provider, shipping price or address flow is supported.
- Order states are `prenotato`, `in-lavorazione`, `pronto-al-ritiro`, `ritirato`, `annullato`.

## Access model

- Public reads: active products, categories, sections and active section items only.
- Public writes: none directly; contact and order writes use validated Next route handlers with the service role.
- Admin reads/writes: protected Next API routes validate the authenticated admin session independently.
- Sensitive tables: `orders`, `order_items`, `leads`, `admin_users` and `admin_audit_log` are not public.

## Required variables

Browser-safe build-time: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CONTACT_FORM_MODE`.

Runtime Worker: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWKS_URL`, `TURNSTILE_SECRET_KEY`,
`APP_ENV`.

## Smoke test checklist

Use non-personal test data and remove it only after an explicit review:

1. Request `/admin` without cookies: only the login panel must render.
2. Call an Admin API without cookies: it must return `401`.
3. Log in with a Supabase Auth user that has `admin_users.is_admin = true`.
4. Create/update/archive a product, category/section, lead and order state, then verify each result directly in Supabase.
5. Submit a contact form and verify a new `leads` record.
6. Create a pickup order and verify its order header, lines, stock change and audit record.
7. Log out, then verify `/admin` again returns only the login panel.
