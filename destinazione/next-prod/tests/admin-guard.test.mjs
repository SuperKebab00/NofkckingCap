import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const uiAndClientSource = [
  read("app/admin/page.tsx"),
  read("components/admin-leads-panel.tsx"),
  read("components/admin-login-panel.tsx"),
  read("components/admin-orders-panel.tsx"),
  read("components/admin-products-crud-panel.tsx"),
  read("components/admin-products-summary-panel.tsx"),
  read("components/admin-readonly-dashboard.tsx"),
  read("components/admin-shop-structure-panel.tsx"),
  read("lib/admin-login.ts"),
].join("\n");
const adminPageSource = read("app/admin/page.tsx");
const adminMiddlewareSource = read("middleware.ts");
const adminSessionSource = read("lib/server/admin-session.ts");
const apiCoreSource = read("lib/server/api-core.ts");
const legacyPublicAdminPattern = new RegExp(`NEXT_PUBLIC_${"ADMIN_"}[A-Z0-9_]+`);
const legacyAdminBaseUrl = `${"ADMIN_"}API_BASE_URL`;
const legacyPublicAdminBaseUrl = `NEXT_PUBLIC_${legacyAdminBaseUrl}`;
const legacyAdminStorageKey = `${"ADMIN_"}ACCESS_TOKEN_STORAGE_KEY`;

const serverHelperSource = [
  read("lib/admin-status.ts"),
  read("lib/admin-products-summary.ts"),
  read("lib/admin-auth-check.ts"),
  read("lib/server/admin-auth.ts"),
  read("lib/server/api-core.ts"),
].join("\n");

assert.ok(!legacyPublicAdminPattern.test(uiAndClientSource));
assert.ok(!legacyPublicAdminPattern.test(serverHelperSource));

for (const token of ["NEXT_PUBLIC_SUPABASE_JWT_SECRET", "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"]) {
  assert.ok(!uiAndClientSource.includes(token), `UI source must not expose ${token}`);
  assert.ok(!serverHelperSource.includes(token), `Server helper source must not expose ${token}`);
}

assert.ok(!uiAndClientSource.includes(legacyPublicAdminBaseUrl));
assert.ok(!serverHelperSource.includes(legacyAdminBaseUrl));
assert.ok(uiAndClientSource.includes("/api/admin/session"));
assert.ok(!uiAndClientSource.includes("sessionStorage"));
assert.ok(!uiAndClientSource.includes(legacyAdminStorageKey));
assert.ok(!uiAndClientSource.includes("is_admin=true"));
assert.ok(!uiAndClientSource.includes("Delete product"));
assert.ok(!uiAndClientSource.includes("Aggiorna prodotto"));
assert.ok(!uiAndClientSource.includes("Salva prodotto"));
assert.ok(adminPageSource.indexOf("verifyAdminAccessToken") < adminPageSource.indexOf("Promise.all"));
assert.ok(adminPageSource.includes("if (!verification.ok)"));
assert.ok(adminPageSource.includes("<AdminLoginPanel />"));
assert.ok(adminMiddlewareSource.includes("httpOnly: true"));
assert.ok(adminMiddlewareSource.includes("sameSite: \"lax\""));
assert.ok(adminMiddlewareSource.includes("no-cap-admin-refresh"));
assert.ok(apiCoreSource.includes("SUPABASE_ANON_KEY"));
assert.ok(adminSessionSource.includes("env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY"));

for (const requiredRoute of [
  "app/api/contact/create/route.ts",
  "app/api/admin/status/route.ts",
  "app/api/admin/products/summary/route.ts",
  "app/api/admin/auth/check/route.ts",
  "app/api/admin/session/route.ts",
]) {
  const source = read(requiredRoute);
  assert.ok(source.includes("getServerEnv"));
}

const nextEnvExample = read(".env.example");
assert.ok(nextEnvExample.includes("SUPABASE_JWKS_URL"));
assert.ok(nextEnvExample.includes("SUPABASE_SERVICE_ROLE_KEY"));
assert.ok(nextEnvExample.includes("SUPABASE_URL"));
assert.ok(nextEnvExample.includes("SUPABASE_ANON_KEY"));
assert.ok(!nextEnvExample.includes(legacyAdminBaseUrl));
assert.ok(!nextEnvExample.includes(legacyPublicAdminBaseUrl));
assert.ok(!legacyPublicAdminPattern.test(nextEnvExample));

const readme = read("README.md");
assert.ok(readme.includes("POST /api/contact/create"));
assert.ok(readme.includes("SUPABASE_JWKS_URL"));
assert.ok(!readme.includes(legacyAdminBaseUrl));
assert.ok(!readme.includes(legacyPublicAdminBaseUrl));

console.log("Admin guard tests passed.");
