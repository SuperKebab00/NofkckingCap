import assert from "node:assert/strict";

import { exportJWK, generateKeyPair, SignJWT } from "jose";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/server/admin-shop-structure-crud.ts");

const env = {
  APP_ENV: "development",
  SUPABASE_JWKS_URL: "https://structure.supabase.co/auth/v1/.well-known/jwks.json",
  SUPABASE_SERVICE_ROLE_KEY: "server-secret",
  SUPABASE_URL: "https://structure.supabase.co",
};

async function createAdminToken() {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.alg = "RS256";
  jwk.kid = `structure-key-${Math.random().toString(36).slice(2)}`;
  jwk.use = "sig";
  const token = await new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid, typ: "JWT" })
    .setIssuedAt()
    .setIssuer("https://structure.supabase.co/auth/v1")
    .setExpirationTime("10m")
    .setSubject("admin-user-1")
    .sign(privateKey);
  return { jwk, token };
}

function request(method, body, token = "admin-token") {
  return new Request("https://example.com/api/admin/shop-categories", {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    method,
  });
}

{
  const response = await mod.handleAdminShopCategoriesCollection(
    new Request("https://example.com/api/admin/shop-categories", { method: "GET" }),
    env,
  );
  assert.equal(response.status, 401);
}

assert.deepEqual(
  mod.__adminShopStructureCrudTest.normalizeCategory({ label: " Hair Care ", sort_order: "10" }, "create"),
  { is_active: true, label: "Hair Care", sort_order: 10, value: "hair-care" },
);

assert.throws(
  () => mod.__adminShopStructureCrudTest.normalizeCategory({ label: "" }, "create"),
  /Payload categoria non valido/,
);

assert.deepEqual(
  mod.__adminShopStructureCrudTest.normalizeSection({ title: " Home Preview ", subtitle: "  Live  " }, "create"),
  { is_active: true, key: "home-preview", settings: {}, sort_order: 0, subtitle: "Live", title: "Home Preview" },
);

assert.throws(
  () => mod.__adminShopStructureCrudTest.normalizeSection({ title: "" }, "create"),
  /Payload sezione non valido/,
);

{
  const { jwk, token } = await createAdminToken();
  const originalFetch = global.fetch;
  const requests = [];

  global.fetch = async (input, init = {}) => {
    const url = String(input);
    requests.push({ body: init.body, method: init.method || "GET", url });
    if (url === env.SUPABASE_JWKS_URL) return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    if (url.includes("/rest/v1/admin_users?select=user_id,is_admin")) return new Response(JSON.stringify([{ is_admin: true, user_id: "admin-user-1" }]), { status: 200 });
    if (url.includes("/rest/v1/shop_categories?select=") && init.method === "POST") {
      const body = JSON.parse(String(init.body));
      assert.equal(body.value, "new-category");
      assert.equal(new Headers(init.headers).get("Authorization"), "Bearer server-secret");
      return new Response(JSON.stringify([{ ...body, id: "cat-uuid-1" }]), { status: 201 });
    }
    if (url.endsWith("/rest/v1/admin_audit_log")) {
      const body = JSON.parse(String(init.body));
      assert.equal(body.action, "shop_category.create");
      return new Response("", { status: 201 });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const response = await mod.handleAdminShopCategoriesCollection(
      request("POST", { label: "New Category" }, token),
      env,
    );
    assert.equal(response.status, 201);
    assert.equal((await response.json()).category.id, "cat-uuid-1");
    assert.ok(requests.some((item) => item.url.endsWith("/rest/v1/admin_audit_log")));
  } finally {
    global.fetch = originalFetch;
  }
}

console.log("Admin shop structure CRUD tests passed.");
