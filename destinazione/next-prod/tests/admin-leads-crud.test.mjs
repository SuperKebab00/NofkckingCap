import assert from "node:assert/strict";

import { exportJWK, generateKeyPair, SignJWT } from "jose";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/server/admin-leads-crud.ts");

const env = {
  APP_ENV: "development",
  SUPABASE_JWKS_URL: "https://admin-leads.supabase.co/auth/v1/.well-known/jwks.json",
  SUPABASE_SERVICE_ROLE_KEY: "server-secret",
  SUPABASE_URL: "https://admin-leads.supabase.co",
};

async function createAdminToken() {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.alg = "RS256";
  jwk.kid = `leads-key-${Math.random().toString(36).slice(2)}`;
  jwk.use = "sig";
  const token = await new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid, typ: "JWT" })
    .setIssuedAt()
    .setIssuer("https://admin-leads.supabase.co/auth/v1")
    .setExpirationTime("10m")
    .setSubject("admin-user-1")
    .sign(privateKey);
  return { jwk, token };
}

const adminTokenBundle = await createAdminToken();
const leadId = "lead-real-1";

function request(url, method, body, token = "admin-token") {
  return new Request(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    method,
  });
}

{
  const response = await mod.handleAdminLeadsCollection(
    new Request("https://example.com/api/admin/leads", { method: "GET" }),
    env,
  );
  assert.equal(response.status, 401);
}

assert.equal(
  mod.__adminLeadsCrudTest.buildLeadsListPath(
    new Request("https://example.com/api/admin/leads?page=2&pageSize=10&status=new&search=Mario"),
  ),
  "leads?limit=10&offset=10&order=created_at.desc&select=id%2Cemail%2Cphone%2Csubject%2Cmessage%2Cprivacy_accepted%2Cstatus%2Csource%2Cmetadata%2Ccreated_at%2Cupdated_at&status=eq.new&or=%28email.ilike.*Mario*%2Cphone.ilike.*Mario*%2Csubject.ilike.*Mario*%2Cmessage.ilike.*Mario*%29",
);

{
  const { jwk, token } = adminTokenBundle;
  const originalFetch = global.fetch;
  global.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url === env.SUPABASE_JWKS_URL) return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    if (url.includes("/rest/v1/admin_users?select=user_id,is_admin")) return new Response(JSON.stringify([{ is_admin: true, user_id: "admin-user-1" }]), { status: 200 });
    if (url.includes("/rest/v1/leads?") && init.method === "GET") {
      return new Response(JSON.stringify([{ email: "mario@example.com", id: leadId, status: "new" }]), { status: 200 });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  try {
    const response = await mod.handleAdminLeadsCollection(
      request("https://example.com/api/admin/leads?status=new", "GET", undefined, token),
      env,
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).leads[0].id, leadId);
  } finally {
    global.fetch = originalFetch;
  }
}

{
  const { jwk, token } = adminTokenBundle;
  const originalFetch = global.fetch;
  global.fetch = async (input) => {
    const url = String(input);
    if (url === env.SUPABASE_JWKS_URL) return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    if (url.includes("/rest/v1/admin_users?select=user_id,is_admin")) return new Response(JSON.stringify([{ is_admin: true, user_id: "admin-user-1" }]), { status: 200 });
    throw new Error(`Unexpected fetch: ${url}`);
  };
  try {
    const response = await mod.handleAdminLeadItem(
      request(`https://example.com/api/admin/leads/${leadId}`, "PATCH", { status: "archived" }, token),
      env,
      leadId,
    );
    assert.equal(response.status, 400);
  } finally {
    global.fetch = originalFetch;
  }
}

{
  const { jwk, token } = adminTokenBundle;
  const originalFetch = global.fetch;
  global.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url === env.SUPABASE_JWKS_URL) return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    if (url.includes("/rest/v1/admin_users?select=user_id,is_admin")) return new Response(JSON.stringify([{ is_admin: true, user_id: "admin-user-1" }]), { status: 200 });
    if (url.includes("/rest/v1/leads?select=") && init.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      assert.equal(body.status, "contacted");
      return new Response(JSON.stringify([{ id: leadId, status: "contacted" }]), { status: 200 });
    }
    if (url.endsWith("/rest/v1/admin_audit_log")) {
      const body = JSON.parse(String(init.body));
      assert.equal(body.action, "lead.status_update");
      return new Response("", { status: 201 });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  try {
    const response = await mod.handleAdminLeadItem(
      request(`https://example.com/api/admin/leads/${leadId}`, "PATCH", { status: "contacted" }, token),
      env,
      leadId,
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).lead.status, "contacted");
  } finally {
    global.fetch = originalFetch;
  }
}

console.log("Admin leads CRUD tests passed.");
