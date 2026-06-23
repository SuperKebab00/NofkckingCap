import { SiteHeader } from "../../components/site-header";
import type { ShopProductCard } from "../../components/shop-product-grid";
import { ShopProductGrid } from "../../components/shop-product-grid";
import { getPublicProducts } from "../../lib/supabase-public";
import { shopPageContent } from "../../lib/static-content";

async function getShopProducts(): Promise<{
  badge: string;
  products: ShopProductCard[] | undefined;
  showStock: boolean;
}> {
  try {
    const result = await getPublicProducts();

    if (!result.configured) {
      return {
        badge: "Fallback statico",
        products: undefined,
        showStock: false,
      };
    }

    if (result.products.length === 0) {
      return {
        badge: "Catalogo live vuoto",
        products: undefined,
        showStock: false,
      };
    }

    return {
      badge: "Catalogo live read-only",
      products: result.products.map((product) => ({
        category: product.category || product.label,
        description: product.description,
        image: product.packshotUrl || product.lifestyleUrl,
        name: product.name,
        stock: product.stock,
      })),
      showStock: true,
    };
  } catch {
    return {
      badge: "Catalogo live non disponibile",
      products: undefined,
      showStock: false,
    };
  }
}

export default async function ShopPage() {
  const shopProducts = await getShopProducts();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="section shop-page">
          <div className="shop-page__intro">
            <p className="eyebrow">{shopPageContent.eyebrow}</p>
            <h1>{shopPageContent.title}</h1>
            <p>{shopPageContent.description}</p>
            <span className="status-badge">{shopProducts.badge}</span>
          </div>

          <ShopProductGrid
            products={shopProducts.products}
            showStock={shopProducts.showStock}
          />

          <div className="shop-page__footer">
            <section className="missing-panel" aria-labelledby="missing-title">
              <p className="eyebrow">Migration gap</p>
              <h2 id="missing-title">{shopPageContent.missingTitle}</h2>
              <ul>
                {shopPageContent.missingItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <div className="hero__actions">
              <a
                className="primary-button"
                href={shopPageContent.homeAction.href}
              >
                {shopPageContent.homeAction.label}
              </a>
              <a
                className="outline-button"
                href={shopPageContent.checkoutAction.href}
              >
                {shopPageContent.checkoutAction.label}
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
