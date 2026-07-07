import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ADMIN_USERS_TABLE,
  getAdminJwtVerificationState,
  getBearerToken,
  verifyAdminJwt,
} from "../functions/api/_lib/admin-auth.js";

assert.equal(ADMIN_USERS_TABLE, "admin_users");

const migrationSql = readFileSync("./sql/admin_users_proposed.sql", "utf8");
assert.match(migrationSql, /references auth\.users \(id\) on delete cascade/i);
assert.match(migrationSql, /create or replace function public\.set_admin_users_updated_at/i);
assert.match(migrationSql, /create trigger trg_admin_users_updated_at/i);
assert.match(migrationSql, /alter table public\.admin_users enable row level security/i);
assert.match(migrationSql, /<supabase-user-uuid>/i);

{
  const request = new Request("https://example.com/api/admin/auth/check");
  assert.equal(getBearerToken(request), "");
}

{
  const request = new Request("https://example.com/api/admin/auth/check", {
    headers: {
      Authorization: "Bearer test-admin-jwt",
    },
  });
  assert.equal(getBearerToken(request), "test-admin-jwt");
}

{
  const state = getAdminJwtVerificationState({});
  assert.equal(state.configured, false);
  assert.match(state.reason, /SUPABASE_JWT_SECRET/i);
}

{
  const state = getAdminJwtVerificationState({
    SUPABASE_JWT_SECRET: "server-only-secret",
  });
  assert.equal(state.configured, false);
  assert.match(state.reason, /admin/i);
}

{
  const result = verifyAdminJwt(
    new Request("https://example.com/api/admin/auth/check"),
    {},
  );
  assert.equal(result.status, 401);
  assert.equal(result.ok, false);
  assert.equal(result.authenticated, false);
  assert.equal(result.admin, false);
}

{
  const result = verifyAdminJwt(
    new Request("https://example.com/api/admin/auth/check", {
      headers: {
        Authorization: "Bearer test-admin-jwt",
      },
    }),
    {},
  );
  assert.equal(result.status, 503);
  assert.equal(result.ok, false);
  assert.equal(result.authenticated, false);
  assert.equal(result.admin, false);
}

{
  const result = verifyAdminJwt(
    new Request("https://example.com/api/admin/auth/check", {
      headers: {
        Authorization: "Bearer test-admin-jwt",
      },
    }),
    {
      SUPABASE_JWT_SECRET: "server-only-secret",
    },
    {
      adminRoleClaim: "role",
      adminRoleValue: "admin",
    },
  );
  assert.equal(result.status, 501);
  assert.equal(result.ok, false);
  assert.equal(result.authenticated, false);
  assert.equal(result.admin, false);
  assert.match(result.error, /not implemented/i);
  assert.match(result.error, /admin_users\.is_admin = true/i);
}

console.log("Admin auth helper tests passed.");
