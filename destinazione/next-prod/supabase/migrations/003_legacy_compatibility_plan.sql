-- Legacy compatibility candidate for real Supabase project NOCAP.
--
-- Real DB inspection summary used for this candidate:
-- - products.id: text
-- - orders.id: text
-- - order_items.order_id: text FK -> orders.id
-- - leads.id: text
-- - admin_users.user_id: uuid
-- - shop_categories.id: uuid
-- - shop_sections.id: uuid
-- - shop_section_items.id: uuid
-- - existing data: products=7, orders=1, order_items=3, leads=1
--
-- IMPORTANT:
-- - Candidate migration only. Do not apply directly to production before staging.
-- - No PK text -> uuid conversion.
-- - No DROP TABLE, TRUNCATE, mass DELETE, or data reset.
-- - The goal is an additive compatibility layer for current Next prod-ready flows.

-- ============================================================
-- 0. READ-ONLY PRECHECKS TO RUN BEFORE APPLYING ANY SECTION
-- ============================================================

-- Confirm table column types and defaults.
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'products',
    'orders',
    'order_items',
    'leads',
    'admin_users',
    'shop_categories',
    'shop_sections',
    'shop_section_items',
    'admin_audit_log',
    'cuts'
  )
order by table_name, ordinal_position;

-- Confirm check constraints and FK/PK names.
select
  c.relname as table_name,
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'products',
    'orders',
    'order_items',
    'leads',
    'admin_users',
    'shop_categories',
    'shop_sections',
    'shop_section_items',
    'admin_audit_log',
    'cuts'
  )
order by c.relname, con.contype, con.conname;

-- Confirm live status values before changing constraints.
select 'orders.status' as field, status, count(*)
from public.orders
group by status
order by count(*) desc, status;

select 'leads.status' as field, status, count(*)
from public.leads
group by status
order by count(*) desc, status;

-- ============================================================
-- 1. ADDITIVE FOUNDATIONS
-- ============================================================

create extension if not exists pgcrypto;

create schema if not exists app_private;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Compatible with the real DB: admin_users.user_id is uuid and should match auth.uid().
create or replace function app_private.is_admin()
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
      and is_admin = true
  );
$$;

revoke all on function app_private.is_admin() from public;
grant execute on function app_private.is_admin() to authenticated;

-- Additive audit table. entity_id stays text because legacy products/orders/leads IDs are text.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid null,
  action text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_entity_idx
on public.admin_audit_log (entity_type, entity_id);

-- ============================================================
-- 2. TEXT-ID DEFAULTS FOR LEGACY PKS
-- ============================================================

-- Contact create no longer sends leads.id. The real DB uses text PK, so give it
-- a safe DB-side default instead of reintroducing legacy ID generation in code.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'id'
      and data_type = 'text'
  ) then
    alter table public.leads
      alter column id set default ('lead-' || replace(gen_random_uuid()::text, '-', ''));
  end if;
end;
$$;

-- Admin Products create does not send products.id. Keep text-id legacy, but add
-- a DB-side default for new rows.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'id'
      and data_type = 'text'
  ) then
    alter table public.products
      alter column id set default ('product-' || replace(gen_random_uuid()::text, '-', ''));
  end if;
end;
$$;

-- Orders are created by RPC below, but the default protects manual/API inserts.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'id'
      and data_type = 'text'
  ) then
    alter table public.orders
      alter column id set default ('order-' || replace(gen_random_uuid()::text, '-', ''));
  end if;
end;
$$;

-- If order_items.id exists and is text, add a safe default. The RPC omits id and
-- lets the table default decide.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'order_items'
      and column_name = 'id'
      and data_type = 'text'
  ) then
    alter table public.order_items
      alter column id set default ('item-' || replace(gen_random_uuid()::text, '-', ''));
  end if;
end;
$$;

-- ============================================================
-- 3. ADDITIVE COLUMNS USED BY NEXT FLOWS
-- ============================================================

alter table public.orders
add column if not exists idempotency_key text,
add column if not exists payload_hash text,
add column if not exists updated_at timestamptz default now(),
add column if not exists inventory_reserved boolean default false,
add column if not exists notes text,
add column if not exists source text default 'site',
add column if not exists metadata jsonb default '{}'::jsonb;

create unique index if not exists orders_idempotency_key_unique_idx
on public.orders (idempotency_key)
where idempotency_key is not null;

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- Admin Orders writes `notes`; `admin_notes` remains a manual future candidate
-- only if the real team wants separate internal notes.
-- alter table public.orders add column if not exists admin_notes text;

-- Real DB application confirmed order_items.id is bigint GENERATED ALWAYS AS IDENTITY.
-- Leave the identity column untouched: do not create a manual sequence and do
-- not override its generated default with nextval(...).

-- Retry idempotency returns order items ordered by created_at, so add it
-- additively to the real legacy table where it is missing.
alter table public.order_items
add column if not exists created_at timestamptz default now();

alter table public.leads
add column if not exists status text default 'new',
add column if not exists updated_at timestamptz default now(),
add column if not exists metadata jsonb default '{}'::jsonb;

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- Admin Leads currently writes metadata/status, not admin_notes.
-- alter table public.leads add column if not exists admin_notes text;

-- Product columns used by Admin Products and public Shop. All additions are
-- nullable/defaulted and preserve legacy text IDs.
alter table public.products
add column if not exists sku text,
add column if not exists code text,
add column if not exists slug text,
add column if not exists description text default '',
add column if not exists category text,
add column if not exists label text,
add column if not exists image_url text,
add column if not exists packshot_url text,
add column if not exists lifestyle_url text,
add column if not exists badge text,
add column if not exists status text default 'active',
add column if not exists stock integer default 0,
add column if not exists restock integer default 0,
add column if not exists colors jsonb default '[]'::jsonb,
add column if not exists shape text,
add column if not exists is_active boolean default true,
add column if not exists sort_order integer default 100,
add column if not exists metadata jsonb default '{}'::jsonb,
add column if not exists updated_at timestamptz default now();

create index if not exists products_is_active_idx on public.products (is_active);
create index if not exists products_category_idx on public.products (category);
create index if not exists products_sort_order_idx on public.products (sort_order, created_at);
create unique index if not exists products_slug_unique_idx
on public.products (slug)
where slug is not null;

-- Shop structure already uses UUID IDs in the real DB. Keep those UUID columns.
alter table public.shop_categories
add column if not exists description text,
add column if not exists is_active boolean default true,
add column if not exists sort_order integer default 100,
add column if not exists updated_at timestamptz default now();

alter table public.shop_sections
add column if not exists subtitle text,
add column if not exists body text,
add column if not exists settings jsonb default '{}'::jsonb,
add column if not exists is_active boolean default true,
add column if not exists sort_order integer default 100,
add column if not exists updated_at timestamptz default now();

alter table public.shop_section_items
add column if not exists title text,
add column if not exists label text,
add column if not exists href text,
add column if not exists image_url text,
add column if not exists content jsonb default '{}'::jsonb,
add column if not exists is_active boolean default true,
add column if not exists sort_order integer default 100,
add column if not exists updated_at timestamptz default now();

-- ============================================================
-- 4. UPDATED_AT TRIGGERS
-- ============================================================

drop trigger if exists set_updated_at_products on public.products;
create trigger set_updated_at_products
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_orders on public.orders;
create trigger set_updated_at_orders
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_leads on public.leads;
create trigger set_updated_at_leads
before update on public.leads
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_shop_categories on public.shop_categories;
create trigger set_updated_at_shop_categories
before update on public.shop_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_shop_sections on public.shop_sections;
create trigger set_updated_at_shop_sections
before update on public.shop_sections
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_shop_section_items on public.shop_section_items;
create trigger set_updated_at_shop_section_items
before update on public.shop_section_items
for each row execute function public.set_updated_at();

-- ============================================================
-- 5. REAL LEGACY TEXT-ID COMPATIBLE ORDER RPC
-- ============================================================

-- Compatible with:
-- - products.id text
-- - orders.id text
-- - order_items.order_id text
-- - order_items.product_id text
-- - order_items product_name/unit_price/quantity/line_total columns
-- - orders fulfillment/shipping/total/inventory_reserved/payment_mode/notes columns
-- - flat payload emitted by lib/server/orders-create.ts buildRpcPayload()
create or replace function public.create_order_with_items(
  p_payload jsonb,
  p_idempotency_key text,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_order record;
  v_order record;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_subtotal numeric(10, 2) := 0;
  v_shipping numeric(10, 2) := 0;
  v_total numeric(10, 2) := 0;
  v_fulfillment text;
  v_payment_mode text;
  v_items jsonb := '[]'::jsonb;
  v_inserted_item record;
  v_product_identifier text;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 12 then
    raise exception 'CLIENT: Idempotency key non valida.';
  end if;

  if p_payload_hash is null or length(trim(p_payload_hash)) < 12 then
    raise exception 'CLIENT: Payload hash non valido.';
  end if;

  select *
  into v_existing_order
  from public.orders
  where idempotency_key = p_idempotency_key
  limit 1;

  if found then
    if v_existing_order.payload_hash = p_payload_hash then
      return (
        select jsonb_build_object(
          'order',
          to_jsonb(v_existing_order) || jsonb_build_object(
            'items',
            coalesce(
              (
                select jsonb_agg(to_jsonb(oi) order by oi.created_at asc)
                from public.order_items oi
                where oi.order_id::text = v_existing_order.id::text
              ),
              '[]'::jsonb
            )
          )
        )
      );
    end if;

    raise exception 'CLIENT: Idempotency conflict.';
  end if;

  v_fulfillment := coalesce(p_payload->>'fulfillment', 'pickup');
  if v_fulfillment not in ('pickup', 'shipping') then
    raise exception 'CLIENT: Fulfillment non valido.';
  end if;

  v_payment_mode := coalesce(p_payload->>'payment_mode', 'in-shop');
  if v_payment_mode not in ('in-shop', 'paypal') then
    raise exception 'CLIENT: Payment mode non valido.';
  end if;

  if jsonb_typeof(p_payload->'items') <> 'array' or jsonb_array_length(p_payload->'items') = 0 then
    raise exception 'CLIENT: Ordine senza prodotti.';
  end if;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    v_quantity := greatest(1, least(20, coalesce((v_item->>'quantity')::integer, 1)));
    v_product_identifier := coalesce(v_item->>'product_id', v_item->>'productId', v_item->>'slug');

    if v_product_identifier is null or length(trim(v_product_identifier)) = 0 then
      raise exception 'CLIENT: Prodotto ordine non valido.';
    end if;

    select *
    into v_product
    from public.products
    where coalesce(is_active, true) = true
      and coalesce(status, 'active') <> 'archived'
      and (
        id::text = v_product_identifier
        or slug = v_product_identifier
        or sku = v_product_identifier
        or code = v_product_identifier
      )
    for update;

    if not found then
      raise exception 'CLIENT: Prodotto ordine non trovato.';
    end if;

    if coalesce(v_product.stock, 0) < v_quantity then
      raise exception 'CLIENT: Stock insufficiente per %.', v_product.name;
    end if;

    update public.products
    set stock = coalesce(stock, 0) - v_quantity,
        updated_at = now()
    where id::text = v_product.id::text;

    v_subtotal := v_subtotal + round((coalesce(v_product.price, 0) * v_quantity)::numeric, 2);
  end loop;

  v_shipping := case when v_fulfillment = 'shipping' then 6 else 0 end;
  v_total := v_subtotal + v_shipping;

  insert into public.orders (
    address,
    city,
    customer_email,
    customer_name,
    customer_phone,
    fulfillment,
    idempotency_key,
    inventory_reserved,
    notes,
    order_number,
    payment_mode,
    payload_hash,
    shipping,
    source,
    status,
    subtotal,
    total,
    zip
  )
  values (
    nullif(p_payload->>'address', ''),
    nullif(p_payload->>'city', ''),
    p_payload->>'customer_email',
    p_payload->>'customer_name',
    p_payload->>'customer_phone',
    v_fulfillment,
    p_idempotency_key,
    true,
    nullif(p_payload->>'notes', ''),
    'NC-' || extract(year from now())::text || '-' || lpad(floor(random() * 1000000)::text, 6, '0'),
    v_payment_mode,
    p_payload_hash,
    v_shipping,
    'next-api',
    'prenotato',
    v_subtotal,
    v_total,
    nullif(p_payload->>'zip', '')
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    v_quantity := greatest(1, least(20, coalesce((v_item->>'quantity')::integer, 1)));
    v_product_identifier := coalesce(v_item->>'product_id', v_item->>'productId', v_item->>'slug');

    select *
    into v_product
    from public.products
    where (
      id::text = v_product_identifier
      or slug = v_product_identifier
      or sku = v_product_identifier
      or code = v_product_identifier
    )
    limit 1;

    insert into public.order_items (
      line_total,
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price
    )
    values (
      round((coalesce(v_product.price, 0) * v_quantity)::numeric, 2),
      v_order.id,
      v_product.id,
      v_product.name,
      v_quantity,
      coalesce(v_product.price, 0)
    )
    returning * into v_inserted_item;

    v_items := v_items || to_jsonb(v_inserted_item);
  end loop;

  return jsonb_build_object(
    'order',
    to_jsonb(v_order) || jsonb_build_object('items', v_items)
  );
end;
$$;

revoke all on function public.create_order_with_items(jsonb, text, text) from public;
grant execute on function public.create_order_with_items(jsonb, text, text) to service_role;

-- ============================================================
-- 6. RLS/POLICY CANDIDATES - REVIEW BEFORE APPLYING
-- ============================================================

-- Existing legacy RLS is active. Do not replace blindly.
-- After staging smoke tests, review policies and only then consider:
--
-- alter table public.products enable row level security;
-- alter table public.orders enable row level security;
-- alter table public.order_items enable row level security;
-- alter table public.leads enable row level security;
-- alter table public.admin_users enable row level security;
-- alter table public.admin_audit_log enable row level security;
--
-- create policy "Public can read active products"
-- on public.products
-- for select
-- to anon, authenticated
-- using (coalesce(is_active, true) = true);
--
-- create policy "Admins can manage products"
-- on public.products
-- for all
-- to authenticated
-- using (app_private.is_admin())
-- with check (app_private.is_admin());

-- ============================================================
-- 7. INTENTIONALLY NOT INCLUDED
-- ============================================================

-- No text -> uuid primary key conversion.
-- No drops.
-- No truncates.
-- No deletes.
-- No automatic rewrite of existing order status constraints.
--
-- If the current orders status CHECK does not allow both legacy `prenotato`
-- and prod-ready values (`in-attesa`, `in-lavorazione`, `pronto`, `spedito`,
-- `completato`, `annullato`), handle that in a separate reviewed migration
-- after reading the exact constraint name/definition.
