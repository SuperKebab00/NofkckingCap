import type { Metadata } from "next";
import { SiteHeader } from "../../components/site-header";
import { ShopCatalog } from "../../components/shop-catalog";
import type { ShopProductCard } from "../../components/shop-product-grid";
import {
  getPublicProducts,
  getPublicShopCategories,
  type PublicProduct,
  type PublicShopCategory,
} from "../../lib/supabase-public";
import { productTeasers, shopPageContent } from "../../lib/static-content";

export const metadata: Metadata = {
  title: "Shop | No Cap Barbershop",
  description:
    "Catalogo professionale No Cap Barber Shop con prodotti, categorie e disponibilita aggiornate.",
};

function mapPublicProductToCard(product: PublicProduct): ShopProductCard {
  return {
    category: product.category,
    checkoutHref: `/checkout?product=${encodeURIComponent(product.id)}`,
    description: product.description,
    id: product.id,
    image: product.packshotUrl || product.lifestyleUrl,
    lifestyleUrl: product.lifestyleUrl,
    name: product.name,
    packshotUrl: product.packshotUrl,
    price: product.price,
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

  const allowDevelopmentFallback = process.env.APP_ENV !== "production";
  const products = shopProducts.products.length > 0
    ? shopProducts.products.map(mapPublicProductToCard)
    : allowDevelopmentFallback
      ? productTeasers
      : [];

  const categories =
    shopCategories.length > 0
      ? shopCategories
      : allowDevelopmentFallback
        ? buildFallbackCategories(products)
        : [];

  return (
    <>
      <SiteHeader />
      <main className="page-shell route-shell route-shell--shop">
        <section className="page-banner page-banner--shop">
          <p className="eyebrow">{shopPageContent.eyebrow}</p>
          <h1>Prodotti No Cap</h1>
          <p>{shopPageContent.description}</p>
        </section>

        <ShopCatalog
          categories={categories}
          products={products}
          showStock={shopProducts.showStock}
        />
      </main>
    </>
  );
}
