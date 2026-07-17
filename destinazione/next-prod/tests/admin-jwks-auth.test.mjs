import assert from "node:assert/strict";

import { exportJWK, generateKeyPair, SignJWT } from "jose";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/server/admin-auth.ts");

{
  const missingToken = await mod.verifyAdminJwt(
    new Request("https://example.com/api/admin/auth/check"),
    {},
  );

  assert.equal(missingToken.ok, false);
  assert.equal(missingToken.status, 401);
}

{
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.alg = "RS256";
  jwk.kid = "admin-key";
  jwk.use = "sig";

  const token = await new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "RS256", kid: "admin-key", typ: "JWT" })
    .setIssuedAt()
    .setIssuer("https://example.supabase.co/auth/v1")
    .setExpirationTime("10m")
    .setSubject("user-123")
    .sign(privateKey);

  const originalFetch = global.fetch;

  global.fetch = async (input) => {
    const url = String(input);

    if (url === "https://example.supabase.co/auth/v1/.well-known/jwks.json") {
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    }

    if (
      url.includes(
        "https://example.supabase.co/rest/v1/admin_users?select=user_id,is_admin,role",
      )
    ) {
      return new Response(
        JSON.stringify([{ user_id: "user-123", is_admin: true, role: "admin" }]),
        { status: 200 },
      );
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await mod.verifyAdminJwt(
      new Request("https://example.com/api/admin/auth/check", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      {
        SUPABASE_JWKS_URL:
          "https://example.supabase.co/auth/v1/.well-known/jwks.json",
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
        SUPABASE_URL: "https://example.supabase.co",
      },
    );

    assert.equal(result.ok, true);
    assert.equal(result.admin, true);
    assert.equal(result.role, "admin");
    assert.equal(result.superAdmin, false);
    assert.equal(result.userId, "user-123");
  } finally {
    global.fetch = originalFetch;
  }
}

{
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.alg = "RS256";
  jwk.kid = "super-admin-key";
  jwk.use = "sig";

  const token = await new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "RS256", kid: "super-admin-key", typ: "JWT" })
    .setIssuedAt()
    .setIssuer("https://example.supabase.co/auth/v1")
    .setExpirationTime("10m")
    .setSubject("super-user-123")
    .sign(privateKey);

  const originalFetch = global.fetch;

  global.fetch = async (input) => {
    const url = String(input);

    if (url === "https://example.supabase.co/auth/v1/.well-known/jwks-super-admin.json") {
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    }

    if (
      url.includes(
        "https://example.supabase.co/rest/v1/admin_users?select=user_id,is_admin,role",
      )
    ) {
      return new Response(
        JSON.stringify([{ user_id: "super-user-123", is_admin: true, role: "super_admin" }]),
        { status: 200 },
      );
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await mod.verifyAdminJwt(
      new Request("https://example.com/api/admin/auth/check", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      {
        SUPABASE_JWKS_URL:
          "https://example.supabase.co/auth/v1/.well-known/jwks-super-admin.json",
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
        SUPABASE_URL: "https://example.supabase.co",
      },
    );

    assert.equal(result.ok, true);
    assert.equal(result.role, "super_admin");
    assert.equal(result.superAdmin, true);
  } finally {
    global.fetch = originalFetch;
  }
}

{
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.alg = "RS256";
  jwk.kid = "non-admin-key";
  jwk.use = "sig";

  const token = await new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "RS256", kid: "non-admin-key", typ: "JWT" })
    .setIssuedAt()
    .setIssuer("https://example.supabase.co/auth/v1")
    .setExpirationTime("10m")
    .setSubject("user-456")
    .sign(privateKey);

  const originalFetch = global.fetch;

  global.fetch = async (input) => {
    const url = String(input);

    if (url === "https://example.supabase.co/auth/v1/.well-known/jwks-non-admin.json") {
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    }

    if (
      url.includes(
        "https://example.supabase.co/rest/v1/admin_users?select=user_id,is_admin,role",
      )
    ) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const result = await mod.verifyAdminJwt(
      new Request("https://example.com/api/admin/auth/check", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      {
        SUPABASE_JWKS_URL:
          "https://example.supabase.co/auth/v1/.well-known/jwks-non-admin.json",
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
        SUPABASE_URL: "https://example.supabase.co",
      },
    );

    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
    assert.equal(result.authenticated, true);
  } finally {
    global.fetch = originalFetch;
  }
}

console.log("Admin JWKS auth tests passed.");
