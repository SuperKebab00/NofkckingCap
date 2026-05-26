-- No Cap Barber Shop - Shop modeling schema
-- Run in Supabase SQL Editor (production or staging).

create extension if not exists pgcrypto;

create table if not exists public.shop_sections (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text,
  subtitle text,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_categories (
  id uuid primary key default gen_random_uuid(),
  value text not null unique,
  label text not null,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_shop_sections_updated_at on public.shop_sections;
create trigger trg_shop_sections_updated_at
before update on public.shop_sections
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_shop_categories_updated_at on public.shop_categories;
create trigger trg_shop_categories_updated_at
before update on public.shop_categories
for each row execute procedure public.set_updated_at();

insert into public.shop_sections (key, title, subtitle, sort_order, is_active)
values
  ('shop-banner', 'Prodotti No Cap', 'Catalogo professionale, disponibilita aggiornata e acquisto rapido.', 10, true)
on conflict (key) do nothing;

insert into public.shop_categories (value, label, sort_order, is_active)
values
  ('all', 'All products', 1, true),
  ('hair', 'Hair care', 2, true),
  ('styling', 'Styling', 3, true),
  ('tools', 'Tools', 4, true),
  ('accessories', 'Accessories', 5, true)
on conflict (value) do nothing;

alter table public.shop_sections enable row level security;
alter table public.shop_categories enable row level security;

drop policy if exists "shop_sections_public_read" on public.shop_sections;
create policy "shop_sections_public_read"
on public.shop_sections
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "shop_categories_public_read" on public.shop_categories;
create policy "shop_categories_public_read"
on public.shop_categories
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "shop_sections_admin_write" on public.shop_sections;
create policy "shop_sections_admin_write"
on public.shop_sections
for all
to authenticated
using (coalesce((auth.jwt() ->> 'role'), '') = 'admin')
with check (coalesce((auth.jwt() ->> 'role'), '') = 'admin');

drop policy if exists "shop_categories_admin_write" on public.shop_categories;
create policy "shop_categories_admin_write"
on public.shop_categories
for all
to authenticated
using (coalesce((auth.jwt() ->> 'role'), '') = 'admin')
with check (coalesce((auth.jwt() ->> 'role'), '') = 'admin');

