import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/admin-products-summary.ts");

{
  const config = mod.getAdminProductsSummaryConfig({
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    SUPABASE_URL: "https://example.supabase.co/",
  });

  assert.equal(config.supabaseUrl, "https://example.supabase.co/");
  assert.equal(config.supabaseServiceRoleKey, "service-role");
}

assert.equal(mod.getAdminProductsSummaryConfig({}), null);

{
  const missingConfig = await mod.getAdminProductsSummary({ env: {} });
  assert.equal(missingConfig.state, "not-configured");
  assert.equal(missingConfig.total, 0);
  assert.equal(missingConfig.source, "fallback");
}

{
  const originalFetch = global.fetch;
  const requests = [];

  global.fetch = async (input, init) => {
    requests.push({ input: String(input), init });
    return new Response(
      JSON.stringify([
        { category: "styling", id: "pomade", name: "Pomade", price: 18.5 },
        { category: null, id: "spray", name: "Sea Salt Spray", price: 14 },
      ]),
      { status: 200 },
    );
  };

  try {
    const summary = await mod.getAdminProductsSummary({
      env: {
        SUPABASE_SERVICE_ROLE_KEY: "server-secret",
        SUPABASE_URL: "https://example.supabase.co",
      },
    });

    assert.equal(summary.state, "configured");
    assert.equal(summary.total, 2);
    assert.equal(summary.products[0].id, "pomade");
    assert.equal(
      new Headers(requests[0].init.headers).get("Authorization"),
      "Bearer server-secret",
    );
    assert.equal(
      requests[0].input,
      "https://example.supabase.co/rest/v1/products?select=id,name,price,category&order=name.asc",
    );
  } finally {
    global.fetch = originalFetch;
  }
}

{
  const source = readFileSync("lib/admin-products-summary.ts", "utf8");
  assert.ok(!source.includes("ADMIN_API_BASE_URL"));
  assert.ok(!source.includes("NEXT_PUBLIC_ADMIN_API_TOKEN"));
}

console.log("Admin products summary helper tests passed.");
