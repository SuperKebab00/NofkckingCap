import assert from "node:assert/strict";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/admin-products-client.ts");

{
  const requests = [];
  const products = await mod.listAdminProducts("admin-token", {
    fetchImpl: async (input, init) => {
      requests.push({ input: String(input), init });
      return new Response(
        JSON.stringify({
          products: [{ id: "product-1", name: "Black Wax", price: 17 }],
        }),
        { status: 200 },
      );
    },
  });

  assert.equal(products.length, 1);
  assert.equal(requests[0].input, "/api/admin/products");
  assert.equal(requests[0].init.method, "GET");
  assert.equal(
    new Headers(requests[0].init.headers).get("Authorization"),
    "Bearer admin-token",
  );
}

{
  const requests = [];
  const payload = {
    name: "Clay Pomade",
    price: 16,
    stock_quantity: 3,
  };

  const product = await mod.createAdminProduct("admin-token", payload, {
    fetchImpl: async (input, init) => {
      requests.push({ input: String(input), init });
      return new Response(
        JSON.stringify({
          product: { id: "product-2", ...JSON.parse(String(init.body)) },
        }),
        { status: 201 },
      );
    },
  });

  assert.equal(product.id, "product-2");
  assert.equal(requests[0].input, "/api/admin/products");
  assert.equal(requests[0].init.method, "POST");
  assert.equal(JSON.parse(String(requests[0].init.body)).stock_quantity, 3);
  assert.equal(
    new Headers(requests[0].init.headers).get("Content-Type"),
    "application/json",
  );
}

{
  const requests = [];

  await mod.updateAdminProduct(
    "admin-token",
    "product 3",
    { price: 18.5 },
    {
      fetchImpl: async (input, init) => {
        requests.push({ input: String(input), init });
        return new Response(
          JSON.stringify({ product: { id: "product 3", price: 18.5 } }),
          { status: 200 },
        );
      },
    },
  );

  assert.equal(requests[0].input, "/api/admin/products/product%203");
  assert.equal(requests[0].init.method, "PATCH");
}

{
  const requests = [];

  await mod.deleteAdminProduct("admin-token", "product-4", {
    fetchImpl: async (input, init) => {
      requests.push({ input: String(input), init });
      return new Response(
        JSON.stringify({ product: { id: "product-4", is_active: false } }),
        { status: 200 },
      );
    },
  });

  assert.equal(requests[0].input, "/api/admin/products/product-4");
  assert.equal(requests[0].init.method, "DELETE");
}

for (const status of [400, 401, 403, 409, 500]) {
  await assert.rejects(
    () =>
      mod.listAdminProducts("admin-token", {
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
  () => mod.listAdminProducts(""),
  (error) => {
    assert.equal(error.status, 401);
    assert.match(error.message, /Sessione admin mancante/);
    return true;
  },
);

console.log("Admin products client tests passed.");
