import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/admin-auth-check.ts");

assert.equal(mod.getAdminAuthCheckConfig({}), null);

{
  const config = mod.getAdminAuthCheckConfig({
    SUPABASE_JWKS_URL: "https://example.supabase.co/auth/v1/.well-known/jwks.json",
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    SUPABASE_URL: "https://example.supabase.co",
  });

  assert.equal(
    config.supabaseJwksUrl,
    "https://example.supabase.co/auth/v1/.well-known/jwks.json",
  );
}

{
  const notConfigured = await mod.getAdminAuthCheck({ env: {} });
  assert.equal(notConfigured.state, "not-configured");
  assert.equal(notConfigured.source, "fallback");
}

{
  const missingSession = await mod.getAdminAuthCheck({
    env: {
      SUPABASE_JWKS_URL:
        "https://example.supabase.co/auth/v1/.well-known/jwks.json",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      SUPABASE_URL: "https://example.supabase.co",
    },
  });

  assert.equal(missingSession.state, "missing-session");
  assert.equal(missingSession.message, "Sessione admin mancante.");
}

{
  const source = readFileSync("lib/admin-auth-check.ts", "utf8");
  const legacyAdminBaseUrl = `${"ADMIN_"}API_BASE_URL`;
  const legacyPublicAdminPattern = new RegExp(`NEXT_PUBLIC_${"ADMIN_"}[A-Z0-9_]+`);
  assert.ok(source.includes("SUPABASE_JWKS_URL"));
  assert.ok(!source.includes(legacyAdminBaseUrl));
  assert.ok(!legacyPublicAdminPattern.test(source));
}

console.log("Admin auth check helper tests passed.");
