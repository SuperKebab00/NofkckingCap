import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const tmpDir = mkdtempSync(join(tmpdir(), "next-supabase-public-"));
const sourceFile = resolve("lib/supabase-public.ts");
const compiledFile = join(tmpDir, "supabase-public.mjs");

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

try {
  const compiled = ts.transpileModule(readFileSync(sourceFile, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  });
  writeFileSync(compiledFile, compiled.outputText);

  const mod = await import(
    `${pathToFileURL(compiledFile).href}?t=${Date.now()}`
  );

  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  globalThis.fetch = async () => {
    throw new Error("fetch should not run without env");
  };

  const missing = await mod.getPublicProducts();
  assert.equal(missing.configured, false);
  assert.deepEqual(missing.products, []);

  const calls = [];
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co/";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  globalThis.fetch = async (url, init) => {
    calls.push({ init, url: String(url) });

    return {
      ok: true,
      json: async () => [
        {
          badge: "New",
          category: "styling",
          colors: [{ value: "#000" }],
          description: "Strong hold",
          id: "black-wax",
          label: "Wax",
          lifestyle_url: "https://cdn.example/lifestyle.webp",
          name: "Black wax",
          packshot_url: "https://cdn.example/packshot.webp",
          price: "12.50",
          shape: "jar",
          stock: 7,
        },
      ],
    };
  };

  const success = await mod.getPublicProducts();
  assert.equal(success.configured, true);
  assert.equal(success.products.length, 1);
  assert.equal(success.products[0].id, "black-wax");
  assert.equal(success.products[0].name, "Black wax");
  assert.equal(success.products[0].price, 12.5);
  assert.equal(
    success.products[0].packshotUrl,
    "https://cdn.example/packshot.webp",
  );
  assert.equal(
    success.products[0].lifestyleUrl,
    "https://cdn.example/lifestyle.webp",
  );
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/products\?/);
  assert.match(calls[0].url, /is_active=eq\.true/);
  assert.equal(calls[0].init.headers.apikey, "test-anon-key");
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-anon-key");

  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({}),
  });

  await assert.rejects(
    () => mod.getPublicProducts(),
    /Supabase public products read failed: 500/,
  );

  console.log("Supabase public helper tests passed.");
} finally {
  process.env = originalEnv;
  globalThis.fetch = originalFetch;
  rmSync(tmpDir, { force: true, recursive: true });
}
