-- No Cap Barber Shop - Section items for modular shop blocks

create table if not exists public.shop_section_items (
  id uuid primary key default gen_random_uuid(),
  section_key text not null references public.shop_sections(key) on delete cascade,
  item_key text not null,
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(section_key, item_key)
);

drop trigger if exists trg_shop_section_items_updated_at on public.shop_section_items;
create trigger trg_shop_section_items_updated_at
before update on public.shop_section_items
for each row execute procedure public.set_updated_at();

alter table public.shop_section_items enable row level security;

drop policy if exists "shop_section_items_public_read" on public.shop_section_items;
create policy "shop_section_items_public_read"
on public.shop_section_items
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "shop_section_items_admin_write" on public.shop_section_items;
create policy "shop_section_items_admin_write"
on public.shop_section_items
for all
to authenticated
using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  or coalesce((auth.jwt() ->> 'role'), '') = 'admin'
)
with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  or coalesce((auth.jwt() ->> 'role'), '') = 'admin'
);

-- Example seed rows for the shop homepage banner strip
insert into public.shop_section_items (section_key, item_key, content, sort_order, is_active)
values
  ('shop-banner', 'sub-copy', '{"text":"Prodotti professionali, strumenti da banco e disponibilita aggiornata."}'::jsonb, 10, true)
on conflict (section_key, item_key) do nothing;

