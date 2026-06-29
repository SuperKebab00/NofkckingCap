import { SiteHeader } from "../../components/site-header";
import type { ShopProductCard } from "../../components/shop-product-grid";
import { ShopProductGrid } from "../../components/shop-product-grid";
import {
  getPublicProducts,
  getPublicShopCategories,
  type PublicProduct,
  type PublicShopCategory,
} from "../../lib/supabase-public";
import { productTeasers, shopPageContent } from "../../lib/static-content";

function mapPublicProductToCard(product: PublicProduct): ShopProductCard {
  return {
    category: product.category,
    description: product.description,
    image: product.packshotUrl || product.lifestyleUrl,
    name: product.name,
    stock: product.stock,
  };
}

function slugifyCategoryLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "-");
}

function buildFallbackCategories(
  products: ShopProductCard[],
): PublicShopCategory[] {
  const seen = new Set<string>();

  return products
    .map((product) => product.category?.trim())
    .filter((category): category is string => Boolean(category))
    .filter((category) => {
      const key = slugifyCategoryLabel(category);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .map((category, index) => ({
      label: category,
      sort_order: index,
      value: slugifyCategoryLabel(category),
    }));
}

export default async function ShopPage() {
  const [shopProducts, shopCategories] = await Promise.all([
    getPublicProducts(),
    getPublicShopCategories(),
  ]);

  const products =
    shopProducts.products.length > 0
      ? shopProducts.products.map(mapPublicProductToCard)
      : productTeasers;

  const categories =
    shopCategories.length > 0
      ? shopCategories
      : buildFallbackCategories(products);

  const usingSupabaseProducts = shopProducts.products.length > 0;
  const usingSupabaseCategories = shopCategories.length > 0;
  const dataBadge = usingSupabaseProducts
    ? "Prodotti Supabase read-only"
    : "Catalogo statico di fallback";
  const categoryBadge = usingSupabaseCategories
    ? "Categorie Supabase read-only"
    : "Categorie statiche derivate dal fallback";

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="page-hero">
          <p className="eyebrow">{shopPageContent.eyebrow}</p>
          <div className="page-title-row">
            <h1>{shopPageContent.title}</h1>
            <span className="status-badge">{shopPageContent.badge}</span>
          </div>
          <p>{shopPageContent.description}</p>
          <div
            aria-label="Catalog source"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginTop: "1rem",
            }}
          >
            <span className="status-badge">{dataBadge}</span>
            <span className="status-badge">{categoryBadge}</span>
          </div>
        </section>

        <section className="panel" aria-labelledby="shop-categories-title">
          <div className="panel-heading">
            <h2 id="shop-categories-title">Categorie</h2>
            <p>Read-only. Nessun filtro client-side, carrello o checkout.</p>
          </div>
          {categories.length > 0 ? (
            <ul
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              {categories.map((category) => (
                <li key={category.value}>
                  <span className="status-badge">{category.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nessuna categoria disponibile nel fallback statico.</p>
          )}
        </section>

        <section className="panel" aria-labelledby="shop-products-title">
          <div className="panel-heading">
            <h2 id="shop-products-title">Prodotti</h2>
            <p>Catalogo read-only durante la migrazione Next.</p>
          </div>
          <ShopProductGrid
            products={products}
            showStock={shopProducts.showStock}
          />
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>{shopPageContent.missingTitle}</h2>
          </div>
          <ul>
            {shopPageContent.missingItems.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div style={{ marginTop: "1rem" }}>
            <a href={shopPageContent.homeAction.href}>
              {shopPageContent.homeAction.label}
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
