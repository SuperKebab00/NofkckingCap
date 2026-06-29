import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const sourceFile = resolve("lib/supabase-public.ts");
const tmpDir = resolve("tests/.tmp");
const compiledFile = resolve(tmpDir, "supabase-public.mjs");
const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

function compileModule() {
  mkdirSync(dirname(compiledFile), { recursive: true });

  const source = readFileSync(sourceFile, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  writeFileSync(compiledFile, compiled);
}

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

try {
  compileModule();

  const mod = await import(`${pathToFileURL(compiledFile).href}?t=${Date.now()}`);

  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("fetch should not run without public env");
  };

  const missingProducts = await mod.getPublicProducts();
  assert.deepEqual(missingProducts, {
    products: [],
    showStock: false,
  });

  const missingCategories = await mod.getPublicShopCategories();
  assert.deepEqual(missingCategories, []);
  assert.equal(fetchCalls, 0);

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

  let capturedProductsUrl = null;
  let capturedProductsInit = null;
  globalThis.fetch = async (url, init) => {
    capturedProductsUrl = String(url);
    capturedProductsInit = init;

    return {
      ok: true,
      async json() {
        return [
          {
            badge: "Strong",
            category: "Styling",
            colors: [{ name: "Black", hex: "#000" }],
            description: "Hold and texture",
            id: "wax-1",
            label: "Best seller",
            lifestyle_url: "https://cdn.example/lifestyle.webp",
            name: "Black wax",
            packshot_url: "https://cdn.example/packshot.webp",
            price: 19.9,
            shape: "jar",
            stock: 7,
          },
        ];
      },
    };
  };

  const publicProducts = await mod.getPublicProducts();
  assert.deepEqual(publicProducts, {
    products: [
      {
        badge: "Strong",
        category: "Styling",
        colors: [{ name: "Black", hex: "#000" }],
        description: "Hold and texture",
        id: "wax-1",
        label: "Best seller",
        lifestyleUrl: "https://cdn.example/lifestyle.webp",
        name: "Black wax",
        packshotUrl: "https://cdn.example/packshot.webp",
        price: 19.9,
        shape: "jar",
        stock: 7,
      },
    ],
    showStock: false,
  });
  assert.ok(capturedProductsUrl.includes("/rest/v1/products?"));
  assert.ok(
    capturedProductsUrl.includes(
      "select=id%2Cname%2Ccategory%2Clabel%2Cdescription%2Cprice%2Cstock%2Cpackshot_url%2Clifestyle_url%2Ccolors%2Cshape%2Cbadge",
    ),
  );
  assert.ok(capturedProductsUrl.includes("is_active=eq.true"));
  assert.equal(capturedProductsInit?.headers?.apikey, "anon-key");
  assert.equal(
    capturedProductsInit?.headers?.Authorization,
    "Bearer anon-key",
  );

  let capturedCategoriesUrl = null;
  let capturedCategoriesInit = null;
  globalThis.fetch = async (url, init) => {
    capturedCategoriesUrl = String(url);
    capturedCategoriesInit = init;

    return {
      ok: true,
      async json() {
        return [
          {
            label: "Styling",
            sort_order: 1,
            value: "styling",
          },
          {
            label: "Shampoo",
            sort_order: 2,
            value: "shampoo",
          },
        ];
      },
    };
  };

  const publicCategories = await mod.getPublicShopCategories();
  assert.deepEqual(publicCategories, [
    {
      label: "Styling",
      sort_order: 1,
      value: "styling",
    },
    {
      label: "Shampoo",
      sort_order: 2,
      value: "shampoo",
    },
  ]);
  assert.ok(capturedCategoriesUrl.includes("/rest/v1/shop_categories?"));
  assert.ok(
    capturedCategoriesUrl.includes(
      "select=value%2Clabel%2Csort_order",
    ),
  );
  assert.ok(capturedCategoriesUrl.includes("is_active=eq.true"));
  assert.ok(capturedCategoriesUrl.includes("order=sort_order.asc"));
  assert.equal(capturedCategoriesInit?.headers?.apikey, "anon-key");
  assert.equal(
    capturedCategoriesInit?.headers?.Authorization,
    "Bearer anon-key",
  );

  globalThis.fetch = async () => ({
    ok: false,
    async json() {
      throw new Error("json should not run for failed category responses");
    },
  });

  const failedCategories = await mod.getPublicShopCategories();
  assert.deepEqual(failedCategories, []);

  globalThis.fetch = async () => {
    throw new Error("network failure");
  };

  const thrownCategories = await mod.getPublicShopCategories();
  assert.deepEqual(thrownCategories, []);

  console.log("Supabase public tests passed.");
} finally {
  restoreEnv();
  globalThis.fetch = originalFetch;
  rmSync(tmpDir, { force: true, recursive: true });
}
