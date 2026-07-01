import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/admin-login.ts");

{
  const config = mod.getAdminClientConfig({
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example/",
  });

  assert.equal(config.supabaseUrl, "https://supabase.example");
  assert.equal(config.supabaseAnonKey, "anon-key");
}

assert.equal(mod.getAdminClientConfig({}), null);

{
  const notConfigured = await mod.signInAdminWithPassword("admin@example.com", "secret");
  assert.equal(notConfigured.state, "not-configured");
}

{
  const loginResult = await mod.signInAdminWithPassword(
    "admin@example.com",
    "secret",
    {
      env: {
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example",
      },
      fetchImpl: async (input, init) => {
        assert.equal(
          String(input),
          "https://supabase.example/auth/v1/token?grant_type=password",
        );
        assert.equal(init.method, "POST");

        return new Response(
          JSON.stringify({ access_token: "jwt-token" }),
          { status: 200 },
        );
      },
    },
  );

  assert.equal(loginResult.state, "submitting");
  assert.equal(loginResult.accessToken, "jwt-token");
  assert.equal(loginResult.authenticated, true);
}

{
  const verifyResult = await mod.verifyAdminAccessToken("jwt-token", {
    fetchImpl: async (input, init) => {
      assert.equal(String(input), "/api/admin/auth/check");
      assert.equal(init.method, "GET");
      assert.equal(init.headers.Authorization, "Bearer jwt-token");

      return new Response(
        JSON.stringify({ admin: true, authenticated: true }),
        { status: 200 },
      );
    },
  });

  assert.equal(verifyResult.state, "admin");
  assert.equal(verifyResult.admin, true);
}

{
  const source = readFileSync("lib/admin-login.ts", "utf8");
  assert.ok(!source.includes("NEXT_PUBLIC_ADMIN_API_BASE_URL"));
  assert.ok(!source.includes("NEXT_PUBLIC_ADMIN_API_TOKEN"));
  assert.ok(!source.includes("NEXT_PUBLIC_SUPABASE_JWT_SECRET"));
}

console.log("Admin login helper tests passed.");
