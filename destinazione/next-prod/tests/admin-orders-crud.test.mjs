import assert from "node:assert/strict";

import { exportJWK, generateKeyPair, SignJWT } from "jose";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/server/admin-orders-crud.ts");

const env = {
  APP_ENV: "development",
  SUPABASE_JWKS_URL: "https://admin-orders.supabase.co/auth/v1/.well-known/jwks.json",
  SUPABASE_SERVICE_ROLE_KEY: "server-secret",
  SUPABASE_URL: "https://admin-orders.supabase.co",
};

async function createAdminToken() {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.alg = "RS256";
  jwk.kid = `orders-key-${Math.random().toString(36).slice(2)}`;
  jwk.use = "sig";

  const token = await new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid, typ: "JWT" })
    .setIssuedAt()
    .setIssuer("https://admin-orders.supabase.co/auth/v1")
    .setExpirationTime("10m")
    .setSubject("admin-user-1")
    .sign(privateKey);

  return { jwk, token };
}

const adminTokenBundle = await createAdminToken();

function request(url, method, body, token = "admin-token") {
  return new Request(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method,
  });
}

{
  const response = await mod.handleAdminOrdersCollection(
    new Request("https://example.com/api/admin/orders", { method: "GET" }),
    env,
  );

  assert.equal(response.status, 401);
}

assert.equal(
  mod.__adminOrdersCrudTest.buildOrdersListPath(
    new Request("https://example.com/api/admin/orders?page=2&pageSize=10&status=prenotato&search=Mario"),
  ),
  "orders?limit=10&offset=10&order=created_at.desc&select=id%2Corder_number%2Ccustomer_name%2Ccustomer_email%2Ccustomer_phone%2Cfulfillment%2Cpayment_mode%2Cstatus%2Csubtotal%2Ctotal%2Cnotes%2Csource%2Ccreated_at%2Cupdated_at&status=eq.prenotato&or=%28order_number.ilike.*Mario*%2Ccustomer_email.ilike.*Mario*%2Ccustomer_name.ilike.*Mario*%29",
);

{
  const { jwk, token } = adminTokenBundle;
  const originalFetch = global.fetch;
  const requests = [];

  global.fetch = async (input) => {
    const url = String(input);
    requests.push({ url });

    if (url === env.SUPABASE_JWKS_URL) {
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    }

    if (url.includes("/rest/v1/admin_users?select=user_id,is_admin")) {
      return new Response(JSON.stringify([{ is_admin: true, user_id: "admin-user-1" }]), {
        status: 200,
      });
    }

    if (url.includes("/rest/v1/orders?")) {
      return new Response(
        JSON.stringify([{ id: "order-1", order_number: "NC-2026-0001" }]),
        { status: 200 },
      );
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const response = await mod.handleAdminOrdersCollection(
      request(
        "https://example.com/api/admin/orders?status=prenotato",
        "GET",
        undefined,
        token,
      ),
      env,
    );

    assert.equal(response.status, 200);
    assert.equal((await response.json()).orders[0].order_number, "NC-2026-0001");
    assert.ok(requests.some((request) => request.url.includes("status=eq.prenotato")));
  } finally {
    global.fetch = originalFetch;
  }
}

{
  const { jwk, token } = adminTokenBundle;
  const originalFetch = global.fetch;

  global.fetch = async (input) => {
    const url = String(input);

    if (url === env.SUPABASE_JWKS_URL) {
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    }

    if (url.includes("/rest/v1/admin_users?select=user_id,is_admin")) {
      return new Response(JSON.stringify([{ is_admin: true, user_id: "admin-user-1" }]), {
        status: 200,
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const response = await mod.handleAdminOrderItem(
      request(
        "https://example.com/api/admin/orders/order-1",
        "PATCH",
        { status: "invalid" },
        token,
      ),
      env,
      "order-1",
    );

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Payload stato ordine non valido/);
  } finally {
    global.fetch = originalFetch;
  }
}

{
  const { jwk, token } = adminTokenBundle;
  const originalFetch = global.fetch;

  global.fetch = async (input, init = {}) => {
    const url = String(input);

    if (url === env.SUPABASE_JWKS_URL) {
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    }

    if (url.includes("/rest/v1/admin_users?select=user_id,is_admin")) {
      return new Response(JSON.stringify([{ is_admin: true, user_id: "admin-user-1" }]), {
        status: 200,
      });
    }

    if (url.includes("/rest/v1/orders?select=") && init.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      assert.equal(body.status, "pronto-al-ritiro");
      assert.equal(body.notes, "Pronto per il ritiro");
      return new Response(
        JSON.stringify([{ id: "order-1", status: "pronto-al-ritiro", notes: "Pronto per il ritiro" }]),
        { status: 200 },
      );
    }

    if (url.endsWith("/rest/v1/admin_audit_log")) {
      const body = JSON.parse(String(init.body));
      assert.equal(body.action, "order.status_update");
      assert.equal(body.payload.admin_auth_user_id, "admin-user-1");
      return new Response("", { status: 201 });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const response = await mod.handleAdminOrderItem(
      request(
        "https://example.com/api/admin/orders/order-1",
        "PATCH",
        { notes: " Pronto per il ritiro ", status: "pronto-al-ritiro" },
        token,
      ),
      env,
      "order-1",
    );

    assert.equal(response.status, 200);
    assert.equal((await response.json()).order.status, "pronto-al-ritiro");
  } finally {
    global.fetch = originalFetch;
  }
}

console.log("Admin orders CRUD tests passed.");
