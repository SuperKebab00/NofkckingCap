import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const tempDir = resolve("tests/.tmp-admin-products-summary");
const sourceFile = resolve("lib/admin-products-summary.ts");
const compiledFile = join(tempDir, "admin-products-summary.mjs");

mkdirSync(tempDir, { recursive: true });

const source = readFileSync(sourceFile, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourceFile,
});

writeFileSync(
  compiledFile,
  compiled.outputText.replace('import "server-only";', ""),
  "utf8",
);

try {
  const mod = await import(`${pathToFileURL(compiledFile).href}?t=${Date.now()}`);

  const config = mod.getAdminProductsSummaryConfig({
    ADMIN_API_BASE_URL: "https://example.com/",
    ADMIN_API_TOKEN: "server-secret",
  });

  assert.equal(config.baseUrl, "https://example.com");
  assert.equal(config.token, "server-secret");
  assert.equal(mod.getAdminProductsSummaryConfig({}), null);

  const missingConfig = await mod.getAdminProductsSummary({
    env: {},
    fetchImpl: async () => {
      throw new Error("fetch should not run without config");
    },
  });

  assert.equal(missingConfig.state, "not-configured");
  assert.equal(missingConfig.source, "fallback");
  assert.equal(missingConfig.total, 0);
  assert.deepEqual(missingConfig.products, []);

  const liveSummary = await mod.getAdminProductsSummary({
    env: {
      ADMIN_API_BASE_URL: "https://example.com",
      ADMIN_API_TOKEN: "server-secret",
    },
    fetchImpl: async (input, init) => {
      assert.equal(
        String(input),
        "https://example.com/api/admin/products/summary",
      );
      assert.equal(init?.method, "GET");
      assert.equal(
        init?.headers?.Authorization || init?.headers?.get?.("Authorization"),
        "Bearer server-secret",
      );

      return new Response(
        JSON.stringify({
          adminApi: "available",
          mode: "read-only",
          products: [
            {
              id: "pomade",
              name: "Matte Pomade",
              price: 18.5,
              category: "styling",
            },
            {
              id: "bad",
              name: "",
              price: "oops",
              category: "skip",
            },
          ],
          total: 1,
          writes: "disabled",
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      );
    },
  });

  assert.equal(liveSummary.state, "configured");
  assert.equal(liveSummary.source, "endpoint");
  assert.equal(liveSummary.total, 1);
  assert.deepEqual(liveSummary.products, [
    {
      id: "pomade",
      name: "Matte Pomade",
      price: 18.5,
      category: "styling",
    },
  ]);

  const failedSummary = await mod.getAdminProductsSummary({
    env: {
      ADMIN_API_BASE_URL: "https://example.com",
      ADMIN_API_TOKEN: "server-secret",
    },
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: "down" }), { status: 503 }),
  });

  assert.equal(failedSummary.state, "error");
  assert.equal(failedSummary.source, "fallback");
  assert.equal(failedSummary.total, 0);

  assert.ok(source.includes('import "server-only";'));
  assert.ok(source.includes("ADMIN_API_BASE_URL"));
  assert.ok(source.includes("ADMIN_API_TOKEN"));
  assert.ok(!source.includes("NEXT_PUBLIC_ADMIN_API_TOKEN"));

  console.log("Admin products summary helper tests passed.");
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
