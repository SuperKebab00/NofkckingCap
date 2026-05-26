-- No Cap Barber Shop - Hardening schema (safe / idempotent)
-- Esegui dopo la creazione tabelle principali.
-- File pensato per essere rilanciabile senza errori.

begin;

-- ------------------------------------------------------------
-- Normalizzazione dati esistenti prima dei vincoli
-- ------------------------------------------------------------

update public.orders
set status = 'demo-created'
where status is null or btrim(status) = '';

update public.orders
set status = 'in-attesa'
where lower(status) in ('created', 'pending', 'in attesa', 'in_attesa');

update public.orders
set status = 'completato'
where lower(status) in ('completed', 'done');

update public.orders
set status = 'annullato'
where lower(status) in ('cancelled', 'canceled');

update public.orders
set payment_mode = null
where payment_mode is not null
  and payment_mode not in ('in-shop', 'paypal', 'payment-link');

-- ------------------------------------------------------------
-- Default coerenti con il frontend attuale
-- ------------------------------------------------------------

alter table public.orders
  alter column status set default 'demo-created';

-- ------------------------------------------------------------
-- Vincoli qualita dati (aggiunti solo se mancanti)
-- ------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_price_non_negative_chk'
  ) then
    alter table public.products
      add constraint products_price_non_negative_chk
      check (price >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_stock_non_negative_chk'
  ) then
    alter table public.products
      add constraint products_stock_non_negative_chk
      check (stock >= 0 and restock >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_amounts_non_negative_chk'
  ) then
    alter table public.orders
      add constraint orders_amounts_non_negative_chk
      check (subtotal >= 0 and shipping >= 0 and total >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_status_allowed_chk'
  ) then
    alter table public.orders
      add constraint orders_status_allowed_chk
      check (
        status in (
          'demo-created',
          'in-attesa',
          'in-lavorazione',
          'completato',
          'annullato'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_mode_allowed_chk'
  ) then
    alter table public.orders
      add constraint orders_payment_mode_allowed_chk
      check (
        payment_mode is null
        or payment_mode in ('in-shop', 'paypal', 'payment-link')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_quantity_positive_chk'
  ) then
    alter table public.order_items
      add constraint order_items_quantity_positive_chk
      check (quantity > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_amounts_non_negative_chk'
  ) then
    alter table public.order_items
      add constraint order_items_amounts_non_negative_chk
      check (unit_price >= 0 and line_total >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'shop_categories_sort_non_negative_chk'
  ) then
    alter table public.shop_categories
      add constraint shop_categories_sort_non_negative_chk
      check (sort_order >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'shop_sections_sort_non_negative_chk'
  ) then
    alter table public.shop_sections
      add constraint shop_sections_sort_non_negative_chk
      check (sort_order >= 0);
  end if;
end
$$;

-- ------------------------------------------------------------
-- Indici performance
-- ------------------------------------------------------------

create index if not exists idx_orders_created_at_desc
  on public.orders (created_at desc);

create index if not exists idx_orders_status
  on public.orders (status);

create index if not exists idx_orders_customer_email
  on public.orders (customer_email);

create index if not exists idx_products_active_category
  on public.products (is_active, category);

create index if not exists idx_products_updated_at_desc
  on public.products (updated_at desc);

create index if not exists idx_shop_categories_active_sort
  on public.shop_categories (is_active, sort_order);

commit;
