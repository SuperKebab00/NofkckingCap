import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const nextAppRoot = resolve(".");

function collectFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    if (entry.isFile() && /\.(ts|tsx|mjs)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function read(relativePath) {
  return readFileSync(resolve(relativePath), "utf8");
}

const scanRoots = ["app", "components", "lib"];
const sourceFiles = scanRoots.flatMap((dir) => collectFiles(resolve(dir)));
const sourceBundle = sourceFiles.map((file) => readFileSync(file, "utf8")).join("\n");

const forbiddenClientTokens = [
  "NEXT_PUBLIC_ADMIN_API_TOKEN",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const token of forbiddenClientTokens) {
  assert.ok(
    !sourceBundle.includes(token),
    `${token} must not appear in next-app runtime sources`,
  );
}

const adminFiles = sourceFiles.filter((file) => {
  const relativePath = file.replace(`${nextAppRoot}\\`, "").replace(/\\/g, "/");
  return (
    relativePath.startsWith("app/admin/") ||
    relativePath.startsWith("components/admin") ||
    relativePath.startsWith("lib/admin")
  );
});

const adminSource = adminFiles.map((file) => readFileSync(file, "utf8")).join("\n");

assert.ok(
  adminSource.includes('import "server-only";'),
  "Admin server helper must stay server-only",
);

assert.ok(
  adminSource.includes("ADMIN_API_TOKEN"),
  "Admin server helper must read ADMIN_API_TOKEN server-side",
);

assert.ok(
  !adminSource.includes("NEXT_PUBLIC_ADMIN_API_TOKEN"),
  "Admin sources must not reference NEXT_PUBLIC_ADMIN_API_TOKEN",
);

const forbiddenWriteMarkers = [
  "/api/admin/orders",
  "method: \"POST\"",
  "method: \"PATCH\"",
  "method: \"DELETE\"",
];

for (const marker of forbiddenWriteMarkers) {
  assert.ok(
    !adminSource.includes(marker),
    `Admin Next slice must not activate write contract yet: ${marker}`,
  );
}

assert.ok(
  adminSource.includes("/api/admin/products/summary"),
  "Admin Next slice may use the protected read-only products summary endpoint",
);

const adminPlan = read("../ADMIN_MIGRATION_PLAN.md");
assert.ok(
  adminPlan.includes("DELETE /api/admin/products/:id"),
  "Admin migration plan must define future DELETE /api/admin/products/:id",
);
assert.ok(
  adminPlan.includes("soft-delete") && adminPlan.includes("is_active=false"),
  "Admin migration plan must preserve the real DELETE rule",
);
assert.ok(
  adminPlan.includes("keep `ADMIN_API_TOKEN` only for server-to-server admin read-only calls"),
  "Admin migration plan must limit ADMIN_API_TOKEN to server-to-server read-only use",
);
assert.ok(
  adminPlan.includes("Supabase Auth") &&
    adminPlan.includes("Cloudflare admin write endpoints verify the user JWT/claims server-side"),
  "Admin migration plan must require verified Supabase Auth/JWT before writes",
);
assert.ok(
  adminPlan.includes("no write endpoint protected only by a shared deploy token"),
  "Admin migration plan must forbid shared-token-only admin writes",
);

const nextEnvExample = read(".env.example");
assert.ok(
  nextEnvExample.includes("ADMIN_API_BASE_URL"),
  "next-app/.env.example must document ADMIN_API_BASE_URL",
);
assert.ok(
  nextEnvExample.includes("ADMIN_API_TOKEN"),
  "next-app/.env.example must document ADMIN_API_TOKEN",
);
assert.ok(
  !nextEnvExample.includes("NEXT_PUBLIC_ADMIN_API_TOKEN"),
  "next-app/.env.example must not document NEXT_PUBLIC_ADMIN_API_TOKEN",
);

console.log("Admin guard tests passed.");
