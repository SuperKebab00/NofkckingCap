import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("supabase/migrations/001_prod_ready_schema.sql", "utf8");
const ordersMigration = readFileSync("supabase/migrations/002_orders_idempotency_stock.sql", "utf8");
const legacyCompatibilityMigration = readFileSync("supabase/migrations/003_legacy_compatibility_plan.sql", "utf8");
const legacyCompatibilitySql = legacyCompatibilityMigration
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .toLowerCase();
const legacyCompatibilityText = legacyCompatibilityMigration.toLowerCase();
const contactCreate = readFileSync("lib/server/contact-create.ts", "utf8");
const adminLeads = readFileSync("lib/server/admin-leads-crud.ts", "utf8");
const adminProducts = readFileSync("lib/server/admin-products-crud.ts", "utf8");
const adminShop = readFileSync("lib/server/admin-shop-structure-crud.ts", "utf8");
const ordersCreate = readFileSync("lib/server/orders-create.ts", "utf8");

assert.match(schema, /create table if not exists public\.leads \(\s*id uuid primary key default gen_random_uuid\(\)/);
assert.ok(!contactCreate.includes("id: `lead-"));
assert.ok(!contactCreate.includes("created_at: new Date"));
assert.ok(contactCreate.includes('supabaseRequest(env, "leads"'));
assert.ok(legacyCompatibilityMigration.includes("products.id: text"));
assert.ok(legacyCompatibilityMigration.includes("orders.id: text"));
assert.ok(legacyCompatibilityMigration.includes("leads.id: text"));
assert.ok(legacyCompatibilityMigration.includes("alter column id set default ('lead-'"));
assert.ok(legacyCompatibilityMigration.includes("alter column id set default ('product-'"));
assert.ok(legacyCompatibilityMigration.includes("alter column id set default ('order-'"));
assert.ok(legacyCompatibilityText.includes("order_items.id is bigint generated always as identity"));
assert.ok(!legacyCompatibilityText.includes("order_items_id_seq"));
assert.ok(!legacyCompatibilityText.includes("alter column id set default nextval('public.order_items_id_seq'::regclass)"));
assert.ok(legacyCompatibilityMigration.includes("add column if not exists created_at timestamptz default now()"));
assert.ok(legacyCompatibilityMigration.includes("add column if not exists notes text"));
assert.ok(legacyCompatibilityMigration.includes("'prenotato'"));
assert.ok(!legacyCompatibilityMigration.includes("alter column id type uuid"));
assert.ok(!legacyCompatibilitySql.includes("delete from"));
assert.ok(!legacyCompatibilitySql.includes("truncate"));
assert.ok(!legacyCompatibilitySql.includes("drop table"));

assert.ok(adminLeads.includes('const LEAD_STATUSES = ["new", "open", "contacted", "closed", "spam"] as const'));
assert.ok(adminLeads.includes("id=eq.${encodeURIComponent(id)}"));
assert.ok(!adminLeads.includes("lead-"));

assert.ok(adminProducts.includes("stock:"));
assert.ok(!adminProducts.includes("stock_quantity: parsed.stock_quantity"));
assert.ok(adminProducts.includes("row.stock = parsed.stock ?? parsed.stock_quantity ?? 0"));

assert.ok(adminShop.includes("shop_categories"));
assert.ok(adminShop.includes("shop_sections"));
assert.ok(adminShop.includes("shop_section_items"));

assert.ok(ordersMigration.includes("idempotency_key text"));
assert.ok(ordersMigration.includes("payload_hash text"));
assert.ok(ordersMigration.includes("create_order_with_items"));
assert.ok(ordersMigration.includes("for update"));
assert.ok(ordersMigration.includes("set stock = stock - v_quantity"));
assert.ok(ordersCreate.includes("rpc/create_order_with_items"));
assert.ok(!ordersCreate.includes("stock_quantity:"));
assert.ok(ordersCreate.includes("product_id: item.productId"));

console.log("Schema/API consistency tests passed.");
