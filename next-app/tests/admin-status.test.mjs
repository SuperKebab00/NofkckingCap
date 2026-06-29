import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const tempDir = resolve("tests/.tmp-admin-status");
const sourceFile = resolve("lib/admin-status.ts");
const compiledFile = join(tempDir, "admin-status.mjs");

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

  const config = mod.getAdminStatusConfig({
    ADMIN_API_BASE_URL: "https://example.com/",
    ADMIN_API_TOKEN: "secret",
  });

  assert.equal(config.baseUrl, "https://example.com");
  assert.equal(config.token, "secret");
  assert.equal(
    mod.getAdminStatusConfig({
      ADMIN_API_BASE_URL: "https://example.com",
    }),
    null,
  );

  const missingConfigStatus = await mod.getAdminStatus({
    env: {},
    fetchImpl: async () => {
      throw new Error("fetch should not run without server env");
    },
  });

  assert.equal(missingConfigStatus.apiState, "not-configured");
  assert.equal(missingConfigStatus.mode, "read-only");
  assert.equal(missingConfigStatus.writes, "disabled");
  assert.equal(missingConfigStatus.source, "fallback");
  assert.equal(missingConfigStatus.productsCount, null);
  assert.equal(missingConfigStatus.categoriesCount, null);

  const liveStatus = await mod.getAdminStatus({
    env: {
      ADMIN_API_BASE_URL: "https://example.com",
      ADMIN_API_TOKEN: "server-secret",
    },
    fetchImpl: async (input, init) => {
      assert.equal(String(input), "https://example.com/api/admin/status");
      assert.equal(init?.method, "GET");
      assert.equal(
        init?.headers?.Authorization || init?.headers?.get?.("Authorization"),
        "Bearer server-secret",
      );

      return new Response(
        JSON.stringify({
          adminApi: "available",
          catalog: {
            categoriesCount: 3,
            productsCount: 7,
          },
          mode: "read-only",
          writes: "disabled",
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        },
      );
    },
  });

  assert.equal(liveStatus.apiState, "configured");
  assert.equal(liveStatus.productsCount, 7);
  assert.equal(liveStatus.categoriesCount, 3);
  assert.equal(liveStatus.source, "endpoint");

  assert.ok(source.includes('import "server-only";'));
  assert.ok(source.includes("ADMIN_API_TOKEN"));
  assert.ok(source.includes("ADMIN_API_BASE_URL"));
  assert.ok(!source.includes("NEXT_PUBLIC_ADMIN_API_TOKEN"));

  console.log("Admin status helper tests passed.");
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
