import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/admin-orders-client.ts");

assert.ok(mod.ADMIN_ORDER_STATUSES.includes("prenotato"));

{
  const requests = [];
  const orders = await mod.listAdminOrders(
    "admin-token",
    { page: 2, pageSize: 10, search: "Mario", status: "prenotato" },
    {
      fetchImpl: async (input, init) => {
        requests.push({ input: String(input), init });
        return new Response(
          JSON.stringify({
            orders: [
              {
                customer_name: "Mario Rossi",
                id: "order-1",
                order_number: "NC-2026-0001",
                status: "prenotato",
                total: 42,
              },
            ],
          }),
          { status: 200 },
        );
      },
    },
  );

  assert.equal(orders.length, 1);
  assert.equal(
    requests[0].input,
    "/api/admin/orders?page=2&pageSize=10&status=prenotato&search=Mario",
  );
  assert.equal(requests[0].init.method, "GET");
  assert.equal(
    new Headers(requests[0].init.headers).get("Authorization"),
    "Bearer admin-token",
  );
}

{
  const requests = [];
  const order = await mod.getAdminOrder("admin-token", "order 1", {
    fetchImpl: async (input, init) => {
      requests.push({ input: String(input), init });
      return new Response(
        JSON.stringify({
          order: {
            id: "order 1",
            items: [{ product_name: "Black Wax", quantity: 2 }],
            order_number: "NC-2026-0001",
          },
        }),
        { status: 200 },
      );
    },
  });

  assert.equal(order.items.length, 1);
  assert.equal(requests[0].input, "/api/admin/orders/order%201");
  assert.equal(requests[0].init.method, "GET");
}

{
  const requests = [];
  await mod.updateAdminOrderStatus(
    "admin-token",
    "order-2",
    { notes: "Prenotazione confermata", status: "prenotato" },
    {
      fetchImpl: async (input, init) => {
        requests.push({ input: String(input), init });
        return new Response(
          JSON.stringify({
            order: { id: "order-2", notes: "Pronto al ritiro", status: "pronto" },
          }),
          { status: 200 },
        );
      },
    },
  );

  assert.equal(JSON.parse(String(requests[0].init.body)).status, "prenotato");
  assert.equal(requests[0].input, "/api/admin/orders/order-2");
  assert.equal(requests[0].init.method, "PATCH");
  assert.equal(
    new Headers(requests[0].init.headers).get("Content-Type"),
    "application/json",
  );
}

for (const status of [400, 401, 403, 404, 409, 500]) {
  await assert.rejects(
    () =>
      mod.listAdminOrders("admin-token", {}, {
        fetchImpl: async () =>
          new Response(JSON.stringify({ error: `Errore ${status}` }), { status }),
      }),
    (error) => {
      assert.equal(error.status, status);
      assert.equal(error.message, `Errore ${status}`);
      return true;
    },
  );
}

await assert.rejects(
  () => mod.listAdminOrders(""),
  (error) => {
    assert.equal(error.status, 401);
    assert.match(error.message, /Sessione admin mancante/);
    return true;
  },
);

{
  const helperSource = readFileSync("lib/admin-orders-client.ts", "utf8");
  const panelSource = readFileSync("components/admin-orders-panel.tsx", "utf8");
  const combined = `${helperSource}\n${panelSource}`;
  const legacyPublicAdminPattern = new RegExp(`NEXT_PUBLIC_${"ADMIN_"}[A-Z0-9_]+`);

  assert.ok(!combined.includes("@supabase/"));
  assert.ok(!combined.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!legacyPublicAdminPattern.test(combined));
  assert.ok(!combined.includes("lib/server/"));
  assert.ok(!combined.includes("stripe"));
  assert.ok(!combined.includes("paypal.com"));
  assert.ok(!combined.includes("window.paypal"));
}

console.log("Admin orders client tests passed.");
