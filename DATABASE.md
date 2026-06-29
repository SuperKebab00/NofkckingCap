# DATABASE.md

Documentation of the current real Supabase database shape for this project.

This file describes the known live schema and RLS model from the provided project context. It is not a migration plan and does not define an ideal future schema.

## 1. Overview

The project uses Supabase for ecommerce/catalog data, admin-managed content, leads, orders, and order items.

Current database tables:

- `cuts`
- `leads`
- `order_items`
- `orders`
- `products`
- `shop_categories`
- `shop_section_items`
- `shop_sections`

RLS is enabled on all tables.

## 2. Tabelle presenti

### `products`

Main product catalog table.

Columns:

- `id text`
- `name text`
- `category text`
- `label text`
- `description text`
- `price numeric`
- `stock integer`
- `restock integer`
- `packshot_url text`
- `lifestyle_url text`
- `colors jsonb`
- `shape text`
- `badge text`
- `is_active boolean`
- `created_at timestamptz`
- `updated_at timestamptz`

Admin product removal policy:

- In admin, "remove product" means a real delete of the row from `products`.
- Do not reinterpret admin remove/delete actions as soft-delete via `is_active = false` unless a future task explicitly changes the product behavior.
- `is_active = false` can still be used for publication/filtering state, but it does not replace an admin delete/remove action.

### `orders`

Order header table.

Columns:

- `id text`
- `order_number text`
- `customer_name text`
- `customer_email text`
- `customer_phone text`
- `fulfillment text`
- `address text`
- `city text`
- `zip text`
- `subtotal numeric`
- `shipping numeric`
- `total numeric`
- `status text`
- `payment_mode text`
- `created_at timestamptz`
- `inventory_reserved boolean`

### `order_items`

Order line items table.

Columns:

- `id bigint`
- `order_id text`
- `product_id text`
- `product_name text`
- `unit_price numeric`
- `quantity integer`
- `line_total numeric`

### `leads`

Contact form / lead capture table.

Columns:

- `id text`
- `email text`
- `phone text`
- `subject text`
- `message text`
- `privacy_accepted boolean`
- `source text`
- `created_at timestamptz`

### `cuts`

Barber cut/showcase content table.

Columns:

- `id text`
- `title text`
- `description text`
- `image_url text`
- `date date`
- `is_featured boolean`
- `created_at timestamptz`

### `shop_categories`

Shop category configuration table.

Columns:

- `id uuid`
- `value text`
- `label text`
- `is_active boolean`
- `sort_order integer`
- `created_at timestamptz`
- `updated_at timestamptz`

### `shop_sections`

Shop section configuration table.

Columns:

- `id uuid`
- `key text`
- `title text`
- `subtitle text`
- `is_active boolean`
- `sort_order integer`
- `settings jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

### `shop_section_items`

Shop section item/content configuration table.

Columns:

- `id uuid`
- `section_key text`
- `item_key text`
- `content jsonb`
- `sort_order integer`
- `is_active boolean`
- `created_at timestamptz`
- `updated_at timestamptz`

Editorial content convention for `shop_section_items.content`:

- `content` is currently stored as `jsonb`.
- Recommended minimal editorial shape:

```json
{
  "title": "string",
  "subtitle": "string",
  "description": "string",
  "label": "string",
  "imageUrl": "/Img/example.webp",
  "href": "/shop"
}
```

- All fields are optional.
- Values should be plain strings.
- HTML should not be stored as a rendering contract.
- `href` should be a safe relative path or an `http/https` URL.
- `imageUrl` should be a safe relative path or an `http/https` URL.
- Nested objects, arrays, numbers, and other non-string values may be ignored by the current Next.js read-only UI.
- This is an editorial compatibility convention for predictable rendering, not a rigid DB migration or enforced schema at the database level.

## 3. Tabelle non presenti ma citate/possibili future

The following tables are not part of the current real schema described here, but may be useful in future iterations:

- `admin_users`: possible replacement for hardcoded admin UID policies.
- `payment_events` or `webhook_events`: possible idempotency tracking for Stripe/PayPal webhooks.
- `stock_reservations`: possible stock reservation model for online checkout flows.

Do not assume these tables exist unless they are explicitly added later.

## 4. RLS summary

RLS is active on all current tables.

Public read policies exist for public/catalog content:

- `cuts`: `cuts_select_public`, `SELECT true`
- `products`: `products_select_public`, `SELECT is_active = true`
- `shop_categories`: `SELECT is_active = true`
- `shop_section_items`: `SELECT is_active = true`
- `shop_sections`: `SELECT is_active = true`

Backend-only insert behavior is enforced for sensitive write targets:

- `leads`: insert policy has `with_check = false`
- `orders`: insert policy has `with_check = false`
- `order_items`: insert policy has `with_check = false`

## 5. Admin access model

Admin write access currently uses Supabase RLS policies based on a hardcoded Supabase Auth user id.

Current admin UID:

```text
b68b9c01-842a-43f3-bf80-944ee9dd12bd
```

Tables using admin write policies based on this UID:

- `cuts`
- `products`
- `shop_categories`
- `shop_section_items`
- `shop_sections`

This model works for a single known admin user, but it is brittle if admins change or multiple admin roles are needed.

Admin product deletion must continue to respect Supabase RLS/admin policies. Any admin UI or future migration must preserve privileged enforcement on the server/RLS side and must not rely on client-only authorization.

## 6. Public read model

The public/frontend client can read only public-facing data.

Publicly readable tables:

- `cuts`
- `products`
- `shop_categories`
- `shop_section_items`
- `shop_sections`

Public product/category/section reads are filtered by `is_active = true` where applicable.

For `shop_section_items.content`, the current Next.js read-only rendering path is intentionally conservative and expects only a small safe string-based subset for predictable display.

The public client should not rely on hidden/inactive rows being available.

## 7. Backend-only insert model

The following tables are not directly insertable by the browser client:

- `leads`
- `orders`
- `order_items`

Their insert policies use `with_check = false`, so writes should go through Cloudflare Pages Functions using server-side Supabase credentials.

This is important for:

- contact form spam control;
- checkout validation;
- server-side price and total calculation;
- order status control;
- preventing arbitrary client-side order or lead inserts.

## 8. Rischi noti

- Admin access depends on one hardcoded Supabase UID.
- There is no documented `admin_users` role table in the current real schema.
- There is no documented `payment_events` or `webhook_events` table for payment/webhook idempotency.
- There is no documented `stock_reservations` table for reservation-based checkout.
- Current order stock safety depends on the existing `orders.inventory_reserved` model and related application/database behavior.
- The backend checks product stock while building the canonical order, but stock mutation/reservation depends on the real Supabase database behavior and any triggers configured outside this document.
- PayPal and Stripe support exists in code, but the real project should treat online payments as optional/future until provider env, webhook/capture idempotency, and stock behavior are verified.
- Without versioned migrations, reproducing the exact DB from scratch may be error-prone.
- Any future code that assumes future tables exist may break against the current real schema.

## 9. Miglioramenti futuri consigliati

Recommended future improvements, not implemented here:

- Replace hardcoded admin UID checks with an `admin_users` table.
- Add `payment_events` or `webhook_events` for Stripe/PayPal idempotency.
- Evaluate a `stock_reservations` table for safer online checkout stock handling.
- Before enabling immediate online payment, verify stock triggers or document an equivalent reservation strategy in the real Supabase project.
- Add versioned migrations only after the real DB shape is stabilized and verified.
- Document constraints, indexes, triggers, and storage policies once they are confirmed from the live database.
- If the product should ever move to a soft-delete model, treat that as a separate explicit product/task decision rather than an implicit reinterpretation of current admin delete semantics.
