-- Production hardening for the legacy-compatible live schema.
-- Verified before application: existing orders are pickup / in-shop / prenotato.
-- This migration is additive in intent: it does not delete or rewrite business data.

create or replace function app_private.is_admin()
returns boolean
language sql
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
      and is_admin = true
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_admin_users_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.admin_audit_log enable row level security;
alter table public.admin_audit_log force row level security;

drop policy if exists products_write_admin_only on public.products;
create policy products_write_admin_only
on public.products for all to authenticated
using ((select app_private.is_admin()))
with check ((select app_private.is_admin()));

drop policy if exists shop_categories_admin_only on public.shop_categories;
create policy shop_categories_admin_only
on public.shop_categories for all to authenticated
using ((select app_private.is_admin()))
with check ((select app_private.is_admin()));

drop policy if exists shop_sections_admin_only on public.shop_sections;
create policy shop_sections_admin_only
on public.shop_sections for all to authenticated
using ((select app_private.is_admin()))
with check ((select app_private.is_admin()));

drop policy if exists shop_section_items_admin_only on public.shop_section_items;
create policy shop_section_items_admin_only
on public.shop_section_items for all to authenticated
using ((select app_private.is_admin()))
with check ((select app_private.is_admin()));

drop policy if exists orders_admin_read on public.orders;
drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_read on public.orders
for select to authenticated using ((select app_private.is_admin()));
create policy orders_admin_update on public.orders
for update to authenticated using ((select app_private.is_admin()))
with check ((select app_private.is_admin()));

drop policy if exists order_items_admin_read on public.order_items;
create policy order_items_admin_read on public.order_items
for select to authenticated using ((select app_private.is_admin()));

drop policy if exists leads_admin_read on public.leads;
drop policy if exists leads_admin_delete on public.leads;
create policy leads_admin_read on public.leads
for select to authenticated using ((select app_private.is_admin()));
create policy leads_admin_update on public.leads
for update to authenticated using ((select app_private.is_admin()))
with check ((select app_private.is_admin()));
create policy leads_admin_delete on public.leads
for delete to authenticated using ((select app_private.is_admin()));

drop policy if exists admin_users_self_read on public.admin_users;
create policy admin_users_self_read on public.admin_users
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists admin_audit_log_admin_read on public.admin_audit_log;
create policy admin_audit_log_admin_read on public.admin_audit_log
for select to authenticated using ((select app_private.is_admin()));

revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;

alter table public.orders drop constraint if exists orders_fulfillment_check;
alter table public.orders add constraint orders_fulfillment_check
check (fulfillment = 'pickup');

alter table public.orders drop constraint if exists orders_payment_mode_allowed_chk;
alter table public.orders add constraint orders_payment_mode_allowed_chk
check (payment_mode = 'in-shop');

alter table public.orders drop constraint if exists orders_status_allowed_chk;
alter table public.orders add constraint orders_status_allowed_chk
check (status = any (array['prenotato', 'in-lavorazione', 'pronto-al-ritiro', 'ritirato', 'annullato']));

create or replace function public.create_order_with_items(
  p_payload jsonb,
  p_idempotency_key text,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing_order record;
  v_order record;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_subtotal numeric(10, 2) := 0;
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

  select * into v_existing_order from public.orders where idempotency_key = p_idempotency_key limit 1;
  if found then
    if v_existing_order.payload_hash = p_payload_hash then
      return (select jsonb_build_object('order', to_jsonb(v_existing_order) || jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(oi) order by oi.created_at asc) from public.order_items oi where oi.order_id::text = v_existing_order.id::text), '[]'::jsonb))));
    end if;
    raise exception 'CLIENT: Idempotency conflict.';
  end if;

  if coalesce(p_payload->>'fulfillment', 'pickup') <> 'pickup' then
    raise exception 'CLIENT: E disponibile solo il ritiro in negozio.';
  end if;
  if coalesce(p_payload->>'payment_mode', 'in-shop') <> 'in-shop' then
    raise exception 'CLIENT: E disponibile solo il pagamento in sede.';
  end if;
  if jsonb_typeof(p_payload->'items') <> 'array' or jsonb_array_length(p_payload->'items') = 0 then
    raise exception 'CLIENT: Ordine senza prodotti.';
  end if;

  for v_item in select * from jsonb_array_elements(p_payload->'items') loop
    v_quantity := greatest(1, least(20, coalesce((v_item->>'quantity')::integer, 1)));
    v_product_identifier := coalesce(v_item->>'product_id', v_item->>'productId', v_item->>'slug');
    if v_product_identifier is null or length(trim(v_product_identifier)) = 0 then
      raise exception 'CLIENT: Prodotto ordine non valido.';
    end if;
    select * into v_product from public.products
    where coalesce(is_active, true) = true and coalesce(status, 'active') <> 'archived'
      and (id::text = v_product_identifier or slug = v_product_identifier or sku = v_product_identifier or code = v_product_identifier)
    for update;
    if not found then raise exception 'CLIENT: Prodotto ordine non trovato.'; end if;
    if coalesce(v_product.stock, 0) < v_quantity then raise exception 'CLIENT: Stock insufficiente per %.', v_product.name; end if;
    update public.products set stock = coalesce(stock, 0) - v_quantity, updated_at = now() where id::text = v_product.id::text;
    v_subtotal := v_subtotal + round((coalesce(v_product.price, 0) * v_quantity)::numeric, 2);
  end loop;

  insert into public.orders (address, city, customer_email, customer_name, customer_phone, fulfillment, idempotency_key, inventory_reserved, notes, order_number, payment_mode, payload_hash, shipping, source, status, subtotal, total, zip)
  values (null, null, p_payload->>'customer_email', p_payload->>'customer_name', p_payload->>'customer_phone', 'pickup', p_idempotency_key, true, nullif(p_payload->>'notes', ''), 'NC-' || extract(year from now())::text || '-' || lpad(floor(random() * 1000000)::text, 6, '0'), 'in-shop', p_payload_hash, 0, 'next-api', 'prenotato', v_subtotal, v_subtotal, null)
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_payload->'items') loop
    v_quantity := greatest(1, least(20, coalesce((v_item->>'quantity')::integer, 1)));
    v_product_identifier := coalesce(v_item->>'product_id', v_item->>'productId', v_item->>'slug');
    select * into v_product from public.products where (id::text = v_product_identifier or slug = v_product_identifier or sku = v_product_identifier or code = v_product_identifier) limit 1;
    insert into public.order_items (line_total, order_id, product_id, product_name, quantity, unit_price)
    values (round((coalesce(v_product.price, 0) * v_quantity)::numeric, 2), v_order.id, v_product.id, v_product.name, v_quantity, coalesce(v_product.price, 0))
    returning * into v_inserted_item;
    v_items := v_items || to_jsonb(v_inserted_item);
  end loop;

  return jsonb_build_object('order', to_jsonb(v_order) || jsonb_build_object('items', v_items));
end;
$$;

revoke all on function public.create_order_with_items(jsonb, text, text) from public;
grant execute on function public.create_order_with_items(jsonb, text, text) to service_role;
