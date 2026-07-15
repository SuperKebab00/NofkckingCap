import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/admin-status.ts");

{
  const config = mod.getAdminStatusConfig({
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    SUPABASE_URL: "https://example.supabase.co/",
  });

  assert.equal(config.supabaseUrl, "https://example.supabase.co/");
  assert.equal(config.supabaseServiceRoleKey, "service-role");
}

assert.equal(mod.getAdminStatusConfig({}), null);

{
  const missingConfigStatus = await mod.getAdminStatus({ env: {} });
  assert.equal(missingConfigStatus.apiState, "not-configured");
  assert.equal(missingConfigStatus.mode, "read-only");
  assert.equal(missingConfigStatus.source, "fallback");
}

{
  const requests = [];
  const originalFetch = global.fetch;

  global.fetch = async (input, init) => {
    requests.push({ input: String(input), init });

    if (String(input).includes("products?select=id&is_active=eq.true")) {
      return new Response(JSON.stringify([{ id: "one" }, { id: "two" }]), {
        status: 200,
      });
    }

    if (String(input).includes("shop_categories?select=id&is_active=eq.true")) {
      return new Response(JSON.stringify([{ id: "cat" }]), { status: 200 });
    }

    throw new Error(`Unexpected fetch: ${String(input)}`);
  };

  try {
    const status = await mod.getAdminStatus({
      env: {
        SUPABASE_SERVICE_ROLE_KEY: "server-secret",
        SUPABASE_URL: "https://example.supabase.co",
      },
    });

    assert.equal(status.apiState, "configured");
    assert.equal(status.productsCount, 2);
    assert.equal(status.categoriesCount, 1);
    assert.equal(status.source, "endpoint");
    assert.equal(requests.length, 2);
    assert.equal(
      new Headers(requests[0].init.headers).get("Authorization"),
      "Bearer server-secret",
    );
  } finally {
    global.fetch = originalFetch;
  }
}

{
  const source = readFileSync("lib/admin-status.ts", "utf8");
  const legacyAdminBaseUrl = `${"ADMIN_"}API_BASE_URL`;
  const legacyPublicAdminPattern = new RegExp(`NEXT_PUBLIC_${"ADMIN_"}[A-Z0-9_]+`);
  assert.ok(!source.includes(legacyAdminBaseUrl));
  assert.ok(!legacyPublicAdminPattern.test(source));
}

console.log("Admin status helper tests passed.");
