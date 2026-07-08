import assert from "node:assert/strict";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/admin-shop-structure-client.ts");

{
  const requests = [];
  const categories = await mod.listAdminShopCategories("admin-token", {
    fetchImpl: async (input, init) => {
      requests.push({ input: String(input), init });
      return new Response(JSON.stringify({ categories: [{ id: "cat-1", label: "Styling", value: "styling" }] }), { status: 200 });
    },
  });

  assert.equal(categories.length, 1);
  assert.equal(requests[0].input, "/api/admin/shop-categories");
  assert.equal(new Headers(requests[0].init.headers).get("Authorization"), "Bearer admin-token");
}

{
  const requests = [];
  await mod.createAdminShopCategory("admin-token", { label: "Tools", sort_order: 20 }, {
    fetchImpl: async (input, init) => {
      requests.push({ input: String(input), init });
      return new Response(JSON.stringify({ category: { id: "cat-2", label: "Tools", value: "tools" } }), { status: 201 });
    },
  });
  assert.equal(requests[0].input, "/api/admin/shop-categories");
  assert.equal(requests[0].init.method, "POST");
  assert.equal(JSON.parse(String(requests[0].init.body)).label, "Tools");
}

{
  const requests = [];
  await mod.updateAdminShopSection("admin-token", "section 1", { title: "Shop Banner" }, {
    fetchImpl: async (input, init) => {
      requests.push({ input: String(input), init });
      return new Response(JSON.stringify({ section: { id: "section 1", key: "shop-banner", title: "Shop Banner" } }), { status: 200 });
    },
  });
  assert.equal(requests[0].input, "/api/admin/shop-sections/section%201");
  assert.equal(requests[0].init.method, "PATCH");
}

{
  const requests = [];
  await mod.deleteAdminShopSection("admin-token", "section-2", {
    fetchImpl: async (input, init) => {
      requests.push({ input: String(input), init });
      return new Response(JSON.stringify({ section: { id: "section-2", is_active: false } }), { status: 200 });
    },
  });
  assert.equal(requests[0].input, "/api/admin/shop-sections/section-2");
  assert.equal(requests[0].init.method, "DELETE");
}

for (const status of [400, 401, 403, 409, 500]) {
  await assert.rejects(
    () =>
      mod.listAdminShopSections("admin-token", {
        fetchImpl: async () => new Response(JSON.stringify({ error: `Errore ${status}` }), { status }),
      }),
    (error) => {
      assert.equal(error.status, status);
      assert.equal(error.message, `Errore ${status}`);
      return true;
    },
  );
}

await assert.rejects(
  () => mod.listAdminShopCategories(""),
  (error) => {
    assert.equal(error.status, 401);
    assert.match(error.message, /Sessione admin mancante/);
    return true;
  },
);

console.log("Admin shop structure client tests passed.");
