import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/admin-login.ts");

{
  const result = await mod.signInAdminWithPassword("admin@example.com", "secret", {
    fetchImpl: async (input, init) => {
      assert.equal(String(input), "/api/admin/session");
      assert.equal(init.method, "POST");
      assert.equal(new Headers(init.headers).get("Content-Type"), "application/json");
      assert.deepEqual(JSON.parse(String(init.body)), {
        email: "admin@example.com",
        password: "secret",
      });
      return new Response(JSON.stringify({ admin: true, authenticated: true }), { status: 200 });
    },
  });
  assert.equal(result.state, "idle");
}

{
  const result = await mod.signInAdminWithPassword("admin@example.com", "secret", {
    fetchImpl: async () => new Response(JSON.stringify({ error: "Utente non admin." }), { status: 403 }),
  });
  assert.equal(result.state, "error");
  assert.equal(result.message, "Utente non admin.");
}

{
  let method = "";
  await mod.signOutAdmin({
    fetchImpl: async (_input, init) => {
      method = init.method;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  });
  assert.equal(method, "DELETE");
}

const source = readFileSync("lib/admin-login.ts", "utf8");
assert.ok(source.includes('"/api/admin/session"'));
assert.ok(!source.includes("sessionStorage"));
assert.ok(!source.includes("access_token"));
assert.ok(!source.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"));

console.log("Admin login helper tests passed.");
