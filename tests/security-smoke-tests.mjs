import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function fail(message) {
  throw new Error(message);
}

function listJsFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

function isPlaceholderValue(value) {
  const normalized = value.trim().toLowerCase();

  return (
    !normalized ||
    normalized.includes("replace-") ||
    normalized.includes("replace_") ||
    normalized.includes("your-") ||
    normalized.includes("placeholder") ||
    normalized.includes("example") ||
    normalized.includes("changeme") ||
    normalized.includes("<")
  );
}

function assertSafeEnvExample() {
  const envExample = read(".env.example");
  const obviousSecretPatterns = [
    /sk_(live|test)_[a-z0-9]+/i,
    /pk_(live|test)_[a-z0-9]+/i,
    /AIza[0-9A-Za-z\-_]{20,}/,
    /xox[baprs]-[0-9A-Za-z-]{20,}/,
  ];

  for (const line of envExample.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [, rawValue = ""] = trimmed.split("=", 2);
    const value = rawValue.trim();

    if (isPlaceholderValue(value)) {
      continue;
    }

    obviousSecretPatterns.forEach((pattern) => {
      if (pattern.test(value)) {
        fail(".env.example appears to contain a real secret");
      }
    });

    if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
      fail(".env.example should not contain JWT-like values");
    }
  }
}

const gitignore = read(".gitignore");
[".dev.vars", ".wrangler/", "*.zip", "*.log"].forEach((entry) => {
  if (!gitignore.includes(entry)) {
    fail(`.gitignore missing ${entry}`);
  }
});

assertSafeEnvExample();

const functionsDir = join(root, "functions", "api");
for (const file of listJsFiles(functionsDir)) {
  const source = readFileSync(file, "utf8");

  if (file.endsWith(join("stripe", "webhook.js"))) {
    if (!source.includes("verifyStripeWebhookSignature")) {
      fail("Stripe webhook must verify signatures");
    }
    continue;
  }

  if (!source.includes("parseGuardedJson")) {
    fail(`${file} must use guarded JSON parsing`);
  }

  if (source.includes("error.message ||")) {
    fail(`${file} should use safeError for client responses`);
  }
}

const adminStatusSource = read("functions/api/admin/status.js");
if (!adminStatusSource.includes("ADMIN_API_TOKEN")) {
  fail("Admin status endpoint must require ADMIN_API_TOKEN");
}

if (!adminStatusSource.includes("Authorization")) {
  fail("Admin status endpoint must read the Authorization header");
}

if (!adminStatusSource.includes('context.request.method !== "GET"')) {
  fail("Admin status endpoint must reject non-GET methods");
}

const adminProductsSummarySource = read("functions/api/admin/products/summary.js");
if (!adminProductsSummarySource.includes("ADMIN_API_TOKEN")) {
  fail("Admin products summary endpoint must require ADMIN_API_TOKEN");
}

if (!adminProductsSummarySource.includes('context.request.method !== "GET"')) {
  fail("Admin products summary endpoint must reject non-GET methods");
}

if (adminProductsSummarySource.includes("customer_email")) {
  fail("Admin products summary endpoint must not expose customer fields");
}

const adminAuthHelperSource = read("functions/api/_lib/admin-auth.js");
if (!adminAuthHelperSource.includes("SUPABASE_JWT_SECRET")) {
  fail("Admin auth helper must document SUPABASE_JWT_SECRET as a server-side requirement");
}

if (!adminAuthHelperSource.includes("not implemented")) {
  fail("Admin auth helper must remain explicitly non-operative until real JWT verification exists");
}

if (!adminAuthHelperSource.includes("admin_users")) {
  fail("Admin auth helper must document admin_users as the future DB-backed admin source");
}

const databaseDoc = read("DATABASE.md");
if (!databaseDoc.includes("create table if not exists public.admin_users")) {
  fail("DATABASE.md must document the proposed public.admin_users table");
}

if (!databaseDoc.includes("is_admin boolean not null default false")) {
  fail("DATABASE.md must document is_admin on public.admin_users");
}

if (!databaseDoc.includes("hardcoded admin UID is not an acceptable final authorization model")) {
  fail("DATABASE.md must reject hardcoded admin UID as the final auth model");
}

const adminUsersSql = read("sql/admin_users_proposed.sql");
if (!adminUsersSql.includes("references auth.users (id) on delete cascade")) {
  fail("admin_users proposed SQL must document the FK to auth.users(id)");
}

if (!adminUsersSql.includes("set_admin_users_updated_at")) {
  fail("admin_users proposed SQL must document updated_at trigger handling");
}

if (!adminUsersSql.includes("enable row level security")) {
  fail("admin_users proposed SQL must enable RLS");
}

if (!adminUsersSql.includes("<supabase-user-uuid>")) {
  fail("admin_users proposed SQL must keep only a placeholder seed UUID");
}

const adminPlan = read("ADMIN_MIGRATION_PLAN.md");
if (!adminPlan.includes("public.admin_users.user_id = sub and is_admin = true")) {
  fail("ADMIN_MIGRATION_PLAN.md must require DB-backed admin_users verification");
}

const nextEnvExample = read("next-app/.env.example");
if (nextEnvExample.includes("NEXT_PUBLIC_ADMIN_API_TOKEN")) {
  fail("next-app/.env.example must not expose NEXT_PUBLIC_ADMIN_API_TOKEN");
}

const nextReadme = read("next-app/README.md");
if (!nextReadme.includes("ADMIN_API_BASE_URL")) {
  fail("next-app/README.md must document ADMIN_API_BASE_URL");
}

if (!nextReadme.includes("ADMIN_API_TOKEN")) {
  fail("next-app/README.md must document ADMIN_API_TOKEN");
}

console.log("Security smoke checks passed.");
