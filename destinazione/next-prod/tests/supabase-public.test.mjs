import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const sourceFile = resolve("lib/supabase-public.ts");
const shopContentSourceFile = resolve("lib/shop-content.ts");
const tmpDir = resolve("tests/.tmp");
const compiledFile = resolve(tmpDir, "supabase-public.mjs");
const compiledShopContentFile = resolve(tmpDir, "shop-content.mjs");
const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

function compileModule(inputFile, outputFile) {
  mkdirSync(dirname(outputFile), { recursive: true });

  const source = readFileSync(inputFile, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  writeFileSync(outputFile, compiled);
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
  compileModule(sourceFile, compiledFile);
  compileModule(shopContentSourceFile, compiledShopContentFile);

  const mod = await import(`${pathToFileURL(compiledFile).href}?t=${Date.now()}`);
  const shopContentMod = await import(
    `${pathToFileURL(compiledShopContentFile).href}?t=${Date.now()}`
  );

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

  const missingSections = await mod.getPublicShopSections();
  assert.deepEqual(missingSections, []);

  const missingSectionItems = await mod.getPublicShopSectionItems();
  assert.deepEqual(missingSectionItems, []);

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
  assert.ok(capturedCategoriesUrl.includes("select=value%2Clabel%2Csort_order"));
  assert.ok(capturedCategoriesUrl.includes("is_active=eq.true"));
  assert.ok(capturedCategoriesUrl.includes("order=sort_order.asc"));
  assert.equal(capturedCategoriesInit?.headers?.apikey, "anon-key");
  assert.equal(
    capturedCategoriesInit?.headers?.Authorization,
    "Bearer anon-key",
  );

  let capturedSectionsUrl = null;
  let capturedSectionsInit = null;
  globalThis.fetch = async (url, init) => {
    capturedSectionsUrl = String(url);
    capturedSectionsInit = init;

    return {
      ok: true,
      async json() {
        return [
          {
            key: "featured",
            title: "Featured products",
            subtitle: "Shop spotlight",
            settings: { theme: "light" },
            sort_order: 1,
          },
        ];
      },
    };
  };

  const publicSections = await mod.getPublicShopSections();
  assert.deepEqual(publicSections, [
    {
      key: "featured",
      settings: { theme: "light" },
      sort_order: 1,
      subtitle: "Shop spotlight",
      title: "Featured products",
    },
  ]);
  assert.ok(capturedSectionsUrl.includes("/rest/v1/shop_sections?"));
  assert.ok(
    capturedSectionsUrl.includes(
      "select=key%2Ctitle%2Csubtitle%2Csettings%2Csort_order",
    ),
  );
  assert.ok(capturedSectionsUrl.includes("is_active=eq.true"));
  assert.ok(capturedSectionsUrl.includes("order=sort_order.asc"));
  assert.equal(capturedSectionsInit?.headers?.apikey, "anon-key");
  assert.equal(
    capturedSectionsInit?.headers?.Authorization,
    "Bearer anon-key",
  );

  let capturedSectionItemsUrl = null;
  let capturedSectionItemsInit = null;
  globalThis.fetch = async (url, init) => {
    capturedSectionItemsUrl = String(url);
    capturedSectionItemsInit = init;

    return {
      ok: true,
      async json() {
        return [
          {
            section_key: "featured",
            item_key: "wax-1",
            content: { badge: "Top pick" },
            sort_order: 1,
          },
        ];
      },
    };
  };

  const publicSectionItems = await mod.getPublicShopSectionItems();
  assert.deepEqual(publicSectionItems, [
    {
      content: { badge: "Top pick" },
      item_key: "wax-1",
      section_key: "featured",
      sort_order: 1,
    },
  ]);
  assert.ok(
    capturedSectionItemsUrl.includes("/rest/v1/shop_section_items?"),
  );
  assert.ok(
    capturedSectionItemsUrl.includes(
      "select=section_key%2Citem_key%2Ccontent%2Csort_order",
    ),
  );
  assert.ok(capturedSectionItemsUrl.includes("is_active=eq.true"));
  assert.ok(capturedSectionItemsUrl.includes("order=sort_order.asc"));
  assert.equal(capturedSectionItemsInit?.headers?.apikey, "anon-key");
  assert.equal(
    capturedSectionItemsInit?.headers?.Authorization,
    "Bearer anon-key",
  );

  globalThis.fetch = async () => ({
    ok: false,
    async json() {
      throw new Error("json should not run for failed responses");
    },
  });

  const failedCategories = await mod.getPublicShopCategories();
  assert.deepEqual(failedCategories, []);

  const failedSections = await mod.getPublicShopSections();
  assert.deepEqual(failedSections, []);

  const failedSectionItems = await mod.getPublicShopSectionItems();
  assert.deepEqual(failedSectionItems, []);

  globalThis.fetch = async () => {
    throw new Error("network failure");
  };

  const thrownCategories = await mod.getPublicShopCategories();
  assert.deepEqual(thrownCategories, []);

  const thrownSections = await mod.getPublicShopSections();
  assert.deepEqual(thrownSections, []);

  const thrownSectionItems = await mod.getPublicShopSectionItems();
  assert.deepEqual(thrownSectionItems, []);

  assert.deepEqual(
    shopContentMod.normalizeShopSectionContent({
      description: "  Strong hold for daily styling.  ",
      href: "/shop/black-wax",
      imageUrl: "https://cdn.example/black-wax.webp",
      label: "  Best seller ",
      subtitle: "  Matte finish ",
      title: "  Black wax  ",
    }),
    {
      description: "Strong hold for daily styling.",
      hasContent: true,
      href: "/shop/black-wax",
      imageUrl: "https://cdn.example/black-wax.webp",
      label: "Best seller",
      subtitle: "Matte finish",
      title: "Black wax",
    },
  );

  assert.deepEqual(
    shopContentMod.normalizeShopSectionContent({
      count: 3,
      description: { text: "ignored" },
      href: ["ignored"],
      imageUrl: { src: "/unsafe" },
      label: "  Visible label  ",
      subtitle: 42,
      title: ["ignored"],
    }),
    {
      hasContent: true,
      label: "Visible label",
    },
  );

  assert.deepEqual(
    shopContentMod.normalizeShopSectionContent({
      description: " <strong>Styled</strong> text ",
      title: " <em>Hero</em> ",
    }),
    {
      description: "<strong>Styled</strong> text",
      hasContent: true,
      title: "<em>Hero</em>",
    },
  );

  assert.deepEqual(
    shopContentMod.normalizeShopSectionContent({
      href: "javascript:alert(1)",
      imageUrl: "data:text/html;base64,abc",
      title: "Safe title",
    }),
    {
      hasContent: true,
      title: "Safe title",
    },
  );

  assert.deepEqual(
    shopContentMod.normalizeShopSectionContent({
      href: "https://example.com/shop",
      imageUrl: "/Img/products/black-wax-packshot-opt.webp",
    }),
    {
      hasContent: true,
      href: "https://example.com/shop",
      imageUrl: "/Img/products/black-wax-packshot-opt.webp",
    },
  );

  assert.deepEqual(shopContentMod.normalizeShopSectionContent({}), {
    hasContent: false,
  });

  assert.deepEqual(shopContentMod.normalizeShopSectionContent([]), {
    hasContent: false,
  });

  console.log("Supabase public tests passed.");
} finally {
  restoreEnv();
  globalThis.fetch = originalFetch;
  rmSync(tmpDir, { force: true, recursive: true });
}
