-- No Cap Next prod-ready schema baseline.
-- Scope: schema, indexes, RLS and helper functions only. No UI/API wiring.

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

create or replace function app_private.is_admin()
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_users
    where auth_user_id = (select auth.uid())
      and is_admin = true
  );
$$;

revoke all on function app_private.is_admin() from public;
grant execute on function app_private.is_admin() to authenticated;

create table if not exists public.shop_categories (
  id uuid primary key default gen_random_uuid(),
  value text not null unique,
  label text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_categories_value_format check (value ~ '^[a-z0-9][a-z0-9-]*$')
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  code text unique,
  name text not null,
  slug text not null unique,
  description text not null default '',
  category text,
  category_id uuid references public.shop_categories(id) on delete set null,
  label text,
  price numeric(10, 2) not null default 0,
  image_url text,
  packshot_url text,
  lifestyle_url text,
  badge text,
  status text not null default 'active',
  stock integer not null default 0,
  stock_quantity integer generated always as (stock) stored,
  restock integer not null default 0,
  colors jsonb not null default '[]'::jsonb,
  shape text,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_price_non_negative check (price >= 0),
  constraint products_stock_non_negative check (stock >= 0),
  constraint products_restock_non_negative check (restock >= 0),
  constraint products_status_valid check (status in ('active', 'draft', 'archived', 'sold_out'))
);

create table if not exists public.shop_sections (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text,
  subtitle text,
  body text,
  settings jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_sections_key_format check (key ~ '^[a-z0-9][a-z0-9-]*$')
);

create table if not exists public.shop_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references public.shop_sections(id) on delete cascade,
  section_key text not null references public.shop_sections(key) on update cascade on delete cascade,
  item_key text not null,
  title text,
  label text,
  href text,
  image_url text,
  content jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_key, item_key)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  fulfillment text not null default 'pickup',
  fulfillment_mode text generated always as (fulfillment) stored,
  address text,
  city text,
  zip text,
  payment_mode text not null default 'in-shop',
  status text not null default 'in-attesa',
  subtotal numeric(10, 2) not null default 0,
  shipping numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  notes text,
  source text not null default 'site',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_fulfillment_valid check (fulfillment in ('pickup', 'shipping')),
  constraint orders_payment_mode_valid check (payment_mode in ('in-shop', 'paypal')),
  constraint orders_status_valid check (status in ('in-attesa', 'in-lavorazione', 'pronto', 'spedito', 'completato', 'annullato')),
  constraint orders_amounts_non_negative check (subtotal >= 0 and shipping >= 0 and total >= 0)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_name_snapshot text generated always as (product_name) stored,
  product_sku_snapshot text,
  quantity integer not null,
  unit_price numeric(10, 2) not null,
  unit_price_snapshot numeric(10, 2) generated always as (unit_price) stored,
  line_total numeric(10, 2) not null,
  total_price_snapshot numeric(10, 2) generated always as (line_total) stored,
  created_at timestamptz not null default now(),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_amounts_non_negative check (unit_price >= 0 and line_total >= 0)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  phone text,
  subject text,
  message text not null,
  privacy_accepted boolean not null default false,
  status text not null default 'new',
  source text not null default 'site',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_status_valid check (status in ('new', 'open', 'contacted', 'closed', 'spam')),
  constraint leads_privacy_required check (privacy_accepted = true)
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  user_id uuid generated always as (auth_user_id) stored unique,
  email text not null unique,
  is_admin boolean not null default false,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_role_valid check (role in ('owner', 'admin', 'editor', 'viewer'))
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.admin_users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists products_is_active_idx on public.products (is_active);
create index if not exists products_category_idx on public.products (category);
create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_sort_order_idx on public.products (sort_order, created_at);
create index if not exists shop_categories_is_active_idx on public.shop_categories (is_active);
create index if not exists shop_categories_sort_order_idx on public.shop_categories (sort_order);
create index if not exists shop_sections_is_active_idx on public.shop_sections (is_active);
create index if not exists shop_sections_sort_order_idx on public.shop_sections (sort_order);
create index if not exists shop_section_items_section_key_idx on public.shop_section_items (section_key);
create index if not exists shop_section_items_sort_order_idx on public.shop_section_items (section_key, sort_order);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists admin_users_email_idx on public.admin_users (email);
create index if not exists admin_users_auth_user_id_idx on public.admin_users (auth_user_id);
create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_entity_idx on public.admin_audit_log (entity_type, entity_id);

drop trigger if exists set_updated_at_shop_categories on public.shop_categories;
create trigger set_updated_at_shop_categories
before update on public.shop_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_products on public.products;
create trigger set_updated_at_products
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_shop_sections on public.shop_sections;
create trigger set_updated_at_shop_sections
before update on public.shop_sections
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_shop_section_items on public.shop_section_items;
create trigger set_updated_at_shop_section_items
before update on public.shop_section_items
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_orders on public.orders;
create trigger set_updated_at_orders
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_leads on public.leads;
create trigger set_updated_at_leads
before update on public.leads
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_admin_users on public.admin_users;
create trigger set_updated_at_admin_users
before update on public.admin_users
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.shop_categories enable row level security;
alter table public.shop_sections enable row level security;
alter table public.shop_section_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.leads enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_audit_log enable row level security;

alter table public.products force row level security;
alter table public.shop_categories force row level security;
alter table public.shop_sections force row level security;
alter table public.shop_section_items force row level security;
alter table public.orders force row level security;
alter table public.order_items force row level security;
alter table public.leads force row level security;
alter table public.admin_users force row level security;
alter table public.admin_audit_log force row level security;

grant select on public.products to anon, authenticated;
grant select on public.shop_categories to anon, authenticated;
grant select on public.shop_sections to anon, authenticated;
grant select on public.shop_section_items to anon, authenticated;

grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.shop_categories to authenticated;
grant select, insert, update, delete on public.shop_sections to authenticated;
grant select, insert, update, delete on public.shop_section_items to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.admin_users to authenticated;
grant select, insert on public.admin_audit_log to authenticated;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Public can read active shop categories" on public.shop_categories;
create policy "Public can read active shop categories"
on public.shop_categories
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage shop categories" on public.shop_categories;
create policy "Admins can manage shop categories"
on public.shop_categories
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Public can read active shop sections" on public.shop_sections;
create policy "Public can read active shop sections"
on public.shop_sections
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage shop sections" on public.shop_sections;
create policy "Admins can manage shop sections"
on public.shop_sections
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Public can read active shop section items" on public.shop_section_items;
create policy "Public can read active shop section items"
on public.shop_section_items
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.shop_sections
    where shop_sections.key = shop_section_items.section_key
      and shop_sections.is_active = true
  )
);

drop policy if exists "Admins can manage shop section items" on public.shop_section_items;
create policy "Admins can manage shop section items"
on public.shop_section_items
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Admins can manage orders" on public.orders;
create policy "Admins can manage orders"
on public.orders
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Admins can manage order items" on public.order_items;
create policy "Admins can manage order items"
on public.order_items
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Admins can manage leads" on public.leads;
create policy "Admins can manage leads"
on public.leads
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users"
on public.admin_users
for select
to authenticated
using (app_private.is_admin());

drop policy if exists "Admins can manage admin users" on public.admin_users;
create policy "Admins can manage admin users"
on public.admin_users
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Admins can read audit log" on public.admin_audit_log;
create policy "Admins can read audit log"
on public.admin_audit_log
for select
to authenticated
using (app_private.is_admin());

drop policy if exists "Admins can insert audit log" on public.admin_audit_log;
create policy "Admins can insert audit log"
on public.admin_audit_log
for insert
to authenticated
with check (app_private.is_admin());
