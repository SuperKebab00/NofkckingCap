import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/orders-client.ts");

const payload = {
  customer: {
    email: "client@example.com",
    fullName: "Mario Rossi",
    phone: "+393331234567",
  },
  fulfillment: "pickup",
  idempotency_key: "idem-client-test-1",
  items: [{ product_id: "black-wax", quantity: 1 }],
  paymentMode: "in-shop",
};

{
  const requests = [];
  const order = await mod.createPublicOrder(payload, {
    fetchImpl: async (input, init) => {
      requests.push({ input: String(input), init });
      return new Response(
        JSON.stringify({
          order: {
            id: "order-uuid-1",
            order_number: "NC-2026-123456",
            total: 20,
          },
        }),
        { status: 201 },
      );
    },
  });

  assert.equal(order.order_number, "NC-2026-123456");
  assert.equal(requests[0].input, "/api/orders/create");
  assert.equal(requests[0].init.method, "POST");
  assert.equal(
    new Headers(requests[0].init.headers).get("Content-Type"),
    "application/json",
  );
  assert.equal(JSON.parse(String(requests[0].init.body)).items[0].product_id, "black-wax");
}

for (const status of [400, 404, 409, 429, 500]) {
  await assert.rejects(
    () =>
      mod.createPublicOrder(payload, {
        fetchImpl: async () =>
          new Response(JSON.stringify({ error: `Errore ${status}` }), {
            status,
          }),
      }),
    (error) => {
      assert.equal(error.status, status);
      assert.equal(error.message, `Errore ${status}`);
      return true;
    },
  );
}

await assert.rejects(
  () =>
    mod.createPublicOrder(payload, {
      fetchImpl: async () => new Response(JSON.stringify({ order: {} }), { status: 201 }),
    }),
  (error) => {
    assert.equal(error.status, 500);
    assert.match(error.message, /Risposta ordine non valida/);
    return true;
  },
);

{
  const checkoutSource = readFileSync("components/checkout-in-shop.tsx", "utf8");
  const legacyPublicAdminPattern = new RegExp(`NEXT_PUBLIC_${"ADMIN_"}[A-Z0-9_]+`);

  assert.ok(checkoutSource.includes("createPublicOrder"));
  assert.ok(!checkoutSource.includes("@supabase/"));
  assert.ok(!checkoutSource.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!legacyPublicAdminPattern.test(checkoutSource));
  assert.ok(!checkoutSource.includes("lib/server/"));
  assert.ok(!checkoutSource.includes("stripe"));
  assert.ok(!checkoutSource.includes("paypal.com"));
  assert.ok(!checkoutSource.includes("window.paypal"));
}

console.log("Orders client tests passed.");
