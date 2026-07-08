-- Step 8 prod-ready hardening: idempotency + atomic order creation.
-- Apply after 001_prod_ready_schema.sql.

alter table public.orders
add column if not exists idempotency_key text,
add column if not exists payload_hash text;

create unique index if not exists orders_idempotency_key_unique_idx
on public.orders (idempotency_key)
where idempotency_key is not null;

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
  v_existing_order public.orders%rowtype;
  v_order public.orders%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_subtotal numeric(10, 2) := 0;
  v_shipping numeric(10, 2) := 0;
  v_total numeric(10, 2) := 0;
  v_fulfillment text;
  v_payment_mode text;
  v_items jsonb := '[]'::jsonb;
  v_inserted_item public.order_items%rowtype;
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
                where oi.order_id = v_existing_order.id
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
    where is_active = true
      and status <> 'archived'
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

    if v_product.stock < v_quantity then
      raise exception 'CLIENT: Stock insufficiente per %.', v_product.name;
    end if;

    update public.products
    set stock = stock - v_quantity,
        updated_at = now()
    where id = v_product.id;

    v_subtotal := v_subtotal + round((v_product.price * v_quantity)::numeric, 2);
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
    nullif(p_payload->>'notes', ''),
    'NC-' || extract(year from now())::text || '-' || lpad(floor(random() * 1000000)::text, 6, '0'),
    v_payment_mode,
    p_payload_hash,
    v_shipping,
    'next-api',
    'in-attesa',
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
      product_sku_snapshot,
      quantity,
      unit_price
    )
    values (
      round((v_product.price * v_quantity)::numeric, 2),
      v_order.id,
      v_product.id,
      v_product.name,
      coalesce(v_product.sku, v_product.code),
      v_quantity,
      v_product.price
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
