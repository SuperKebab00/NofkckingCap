-- Restrict internal SECURITY DEFINER RPCs to the Next server's service role.
-- Public order creation enters through POST /api/orders/create, which validates
-- input and calls create_order_with_items with the service role. The inventory
-- helpers are trigger internals and must never be callable through PostgREST.

revoke all on function public.create_order_with_items(jsonb, text, text) from public, anon, authenticated;
grant execute on function public.create_order_with_items(jsonb, text, text) to service_role;

revoke all on function public.apply_order_inventory_on_final_status() from public, anon, authenticated;
grant execute on function public.apply_order_inventory_on_final_status() to service_role;

revoke all on function public.apply_order_inventory_on_status_change() from public, anon, authenticated;
grant execute on function public.apply_order_inventory_on_status_change() to service_role;
