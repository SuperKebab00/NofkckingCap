import assert from "node:assert/strict";

import { exportJWK, generateKeyPair, SignJWT } from "jose";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/server/admin-products-crud.ts");

function jsonRequest(url, method, body, token = "admin-token") {
  return new Request(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method,
  });
}

async function createAdminToken({
  issuer = "https://crud.supabase.co/auth/v1",
  subject = "admin-user-1",
} = {}) {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.alg = "RS256";
  jwk.kid = `crud-key-${Math.random().toString(36).slice(2)}`;
  jwk.use = "sig";

  const token = await new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid, typ: "JWT" })
    .setIssuedAt()
    .setIssuer(issuer)
    .setExpirationTime("10m")
    .setSubject(subject)
    .sign(privateKey);

  return { jwk, token };
}

const env = {
  APP_ENV: "development",
  SUPABASE_JWKS_URL: "https://crud.supabase.co/auth/v1/.well-known/jwks.json",
  SUPABASE_SERVICE_ROLE_KEY: "server-secret",
  SUPABASE_URL: "https://crud.supabase.co",
};

{
  const response = await mod.handleAdminProductsCollection(
    new Request("https://example.com/api/admin/products", { method: "GET" }),
    env,
  );

  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /Token admin mancante/);
}

{
  const normalized = mod.__adminProductsCrudTest.normalizeProductWritePayload(
    {
      image_url: "/Img/products/black-wax-packshot-opt.webp",
      name: "  Black Wax Pro  ",
      price: "17.50",
      stock_quantity: "6",
    },
    "create",
  );

  assert.equal(normalized.name, "Black Wax Pro");
  assert.equal(normalized.slug, "black-wax-pro");
  assert.equal(normalized.price, 17.5);
  assert.equal(normalized.stock, 6);
  assert.equal(normalized.is_active, true);
}

assert.throws(
  () =>
    mod.__adminProductsCrudTest.normalizeProductWritePayload(
      { name: "", price: -1 },
      "create",
    ),
  /Payload prodotto non valido/,
);

assert.throws(
  () =>
    mod.__adminProductsCrudTest.normalizeProductWritePayload(
      { image_url: "javascript:alert(1)", name: "Bad URL" },
      "create",
    ),
  /Payload prodotto non valido/,
);

{
  const { jwk, token } = await createAdminToken();
  const originalFetch = global.fetch;
  const requests = [];

  global.fetch = async (input, init = {}) => {
    const url = String(input);
    requests.push({ body: init.body, method: init.method || "GET", url });

    if (url === env.SUPABASE_JWKS_URL) {
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    }

    if (url.includes("/rest/v1/admin_users?select=user_id,is_admin")) {
      return new Response(JSON.stringify([{ is_admin: true, user_id: "admin-user-1" }]), {
        status: 200,
      });
    }

    if (url.includes("/rest/v1/products?select=") && init.method === "POST") {
      const body = JSON.parse(String(init.body));
      assert.equal(body.slug, "new-product");
      assert.equal(body.stock, 4);
      assert.equal(new Headers(init.headers).get("Authorization"), "Bearer server-secret");

      return new Response(
        JSON.stringify([{ ...body, id: "product-uuid-1", created_at: "now" }]),
        { status: 201 },
      );
    }

    if (url.endsWith("/rest/v1/admin_audit_log")) {
      const body = JSON.parse(String(init.body));
      assert.equal(body.action, "product.create");
      assert.equal(body.entity_type, "product");
      assert.equal(body.payload.admin_auth_user_id, "admin-user-1");
      return new Response("", { status: 201 });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const response = await mod.handleAdminProductsCollection(
      jsonRequest(
        "https://example.com/api/admin/products",
        "POST",
        {
          name: "New Product",
          price: 12,
          stock_quantity: 4,
        },
        token,
      ),
      env,
    );

    assert.equal(response.status, 201);
    assert.equal((await response.json()).product.id, "product-uuid-1");
    assert.ok(requests.some((request) => request.url.endsWith("/rest/v1/admin_audit_log")));
  } finally {
    global.fetch = originalFetch;
  }
}

{
  const { jwk, token } = await createAdminToken({
    issuer: "https://crud-delete.supabase.co/auth/v1",
  });
  const deleteEnv = {
    ...env,
    SUPABASE_JWKS_URL:
      "https://crud-delete.supabase.co/auth/v1/.well-known/jwks.json",
    SUPABASE_URL: "https://crud-delete.supabase.co",
  };
  const originalFetch = global.fetch;

  global.fetch = async (input, init = {}) => {
    const url = String(input);

    if (url === deleteEnv.SUPABASE_JWKS_URL) {
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    }

    if (url.includes("/rest/v1/admin_users?select=user_id,is_admin")) {
      return new Response(JSON.stringify([{ is_admin: true, user_id: "admin-user-1" }]), {
        status: 200,
      });
    }

    if (url.includes("/rest/v1/products?select=") && init.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      assert.equal(body.is_active, false);
      assert.equal(body.status, "archived");
      return new Response(
        JSON.stringify([{ id: "product-uuid-1", is_active: false, status: "archived" }]),
        { status: 200 },
      );
    }

    if (url.endsWith("/rest/v1/admin_audit_log")) {
      const body = JSON.parse(String(init.body));
      assert.equal(body.action, "product.soft_delete");
      return new Response("", { status: 201 });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const response = await mod.handleAdminProductItem(
      new Request("https://example.com/api/admin/products/product-uuid-1", {
        headers: { Authorization: `Bearer ${token}` },
        method: "DELETE",
      }),
      deleteEnv,
      "product-uuid-1",
    );

    assert.equal(response.status, 200);
    assert.equal((await response.json()).product.is_active, false);
  } finally {
    global.fetch = originalFetch;
  }
}

{
  const response = await mod.handleAdminProductItem(
    jsonRequest(
      "https://example.com/api/admin/products/product-uuid-1",
      "PATCH",
      { price: -10 },
    ),
    env,
  );

  assert.equal(response.status, 401);
}

{
  const { jwk, token } = await createAdminToken({
    issuer: "https://crud-patch.supabase.co/auth/v1",
  });
  const patchEnv = {
    ...env,
    SUPABASE_JWKS_URL:
      "https://crud-patch.supabase.co/auth/v1/.well-known/jwks.json",
    SUPABASE_URL: "https://crud-patch.supabase.co",
  };
  const originalFetch = global.fetch;

  global.fetch = async (input) => {
    const url = String(input);

    if (url === patchEnv.SUPABASE_JWKS_URL) {
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
    const response = await mod.handleAdminProductItem(
      jsonRequest(
        "https://example.com/api/admin/products/product-uuid-1",
        "PATCH",
        { price: -10 },
        token,
      ),
      patchEnv,
      "product-uuid-1",
    );

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Payload prodotto non valido/);
  } finally {
    global.fetch = originalFetch;
  }
}

{
  const source = await import("node:fs").then(({ readFileSync }) =>
    readFileSync("lib/server/admin-products-crud.ts", "utf8"),
  );

  assert.ok(source.includes('import "server-only"'));
  assert.ok(!source.includes("NEXT_PUBLIC_SUPABASE"));
}

console.log("Admin products CRUD tests passed.");
