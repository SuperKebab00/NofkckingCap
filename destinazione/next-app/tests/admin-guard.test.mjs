import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const uiAndClientSource = [
  read("app/admin/page.tsx"),
  read("components/admin-auth-status-panel.tsx"),
  read("components/admin-login-panel.tsx"),
  read("components/admin-products-summary-panel.tsx"),
  read("lib/admin-login.ts"),
].join("\n");

const serverHelperSource = [
  read("lib/admin-status.ts"),
  read("lib/admin-products-summary.ts"),
  read("lib/admin-auth-check.ts"),
  read("lib/server/admin-auth.ts"),
  read("lib/server/api-core.ts"),
].join("\n");

for (const token of [
  "NEXT_PUBLIC_ADMIN_API_TOKEN",
  "NEXT_PUBLIC_ADMIN_AUTH_JWT",
  "NEXT_PUBLIC_SUPABASE_JWT_SECRET",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
]) {
  assert.ok(!uiAndClientSource.includes(token), `UI source must not expose ${token}`);
  assert.ok(!serverHelperSource.includes(token), `Server helper source must not expose ${token}`);
}

assert.ok(!uiAndClientSource.includes("NEXT_PUBLIC_ADMIN_API_BASE_URL"));
assert.ok(!serverHelperSource.includes("ADMIN_API_BASE_URL"));
assert.ok(uiAndClientSource.includes("/api/admin/auth/check"));
assert.ok(!uiAndClientSource.includes("is_admin=true"));
assert.ok(!uiAndClientSource.includes("Delete product"));
assert.ok(!uiAndClientSource.includes("Aggiorna prodotto"));
assert.ok(!uiAndClientSource.includes("Salva prodotto"));

for (const requiredRoute of [
  "app/api/contact/create/route.ts",
  "app/api/admin/status/route.ts",
  "app/api/admin/products/summary/route.ts",
  "app/api/admin/auth/check/route.ts",
]) {
  const source = read(requiredRoute);
  assert.ok(source.includes("getServerEnv"));
}

const nextEnvExample = read(".env.example");
assert.ok(nextEnvExample.includes("SUPABASE_JWKS_URL"));
assert.ok(nextEnvExample.includes("SUPABASE_SERVICE_ROLE_KEY"));
assert.ok(nextEnvExample.includes("SUPABASE_URL"));
assert.ok(nextEnvExample.includes("ADMIN_API_TOKEN"));
assert.ok(!nextEnvExample.includes("ADMIN_API_BASE_URL"));
assert.ok(!nextEnvExample.includes("NEXT_PUBLIC_ADMIN_API_BASE_URL"));
assert.ok(!nextEnvExample.includes("NEXT_PUBLIC_ADMIN_API_TOKEN"));

const readme = read("README.md");
assert.ok(readme.includes("POST /api/contact/create"));
assert.ok(readme.includes("SUPABASE_JWKS_URL"));
assert.ok(!readme.includes("ADMIN_API_BASE_URL"));
assert.ok(!readme.includes("NEXT_PUBLIC_ADMIN_API_BASE_URL"));

console.log("Admin guard tests passed.");
