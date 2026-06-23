import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), "utf8");
const fail = (message) => {
  throw new Error(message);
};

const gitignore = read(".gitignore");
[".dev.vars", ".wrangler/", "*.zip", "*.log"].forEach((entry) => {
  if (!gitignore.includes(entry)) fail(`.gitignore missing ${entry}`);
});

const envExample = read(".env.example");
[
  /sk_live_/,
  /sk_test_[A-Za-z0-9]{12,}/,
  /whsec_[A-Za-z0-9]{12,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
].forEach((pattern) => {
  if (pattern.test(envExample))
    fail(".env.example appears to contain a real secret");
});

const functionsDir = join(root, "functions", "api");
const endpointFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith(".js") && !path.includes(`${join("api", "_lib")}`))
      endpointFiles.push(path);
  }
};
walk(functionsDir);

for (const file of endpointFiles) {
  const source = readFileSync(file, "utf8");
  if (file.endsWith(join("stripe", "webhook.js"))) {
    if (!source.includes("verifyStripeWebhookSignature"))
      fail("Stripe webhook must verify signatures");
    continue;
  }
  if (!source.includes("parseGuardedJson"))
    fail(`${file} must use guarded JSON parsing`);
  if (source.includes("error.message ||"))
    fail(`${file} should use safeError for client responses`);
}

console.log("Security smoke checks passed.");
