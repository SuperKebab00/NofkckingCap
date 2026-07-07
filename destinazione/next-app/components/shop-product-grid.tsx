import {
  buildShopCheckoutHref,
  buildShopContactHref,
  SHOP_FLOW_COPY,
} from "../lib/public-flow";
import { productTeasers, shopTeaserContent } from "../lib/static-content";

export type ShopProductCard = {
  category: string | null;
  checkoutHref?: string;
  contactHref?: string;
  description?: string | null;
  image: string | null;
  name: string;
  stock?: number | null;
};

type ShopProductGridProps = {
  products?: ShopProductCard[];
  showStock?: boolean;
};

export function ShopProductGrid({
  products = productTeasers,
  showStock = false,
}: ShopProductGridProps) {
  return (
    <section className="section" aria-labelledby="shop-grid-title">
      <div className="section-heading">
        <p className="eyebrow">{shopTeaserContent.eyebrow}</p>
        <h2 id="shop-grid-title">{shopTeaserContent.title}</h2>
        <p>{shopTeaserContent.description}</p>
      </div>

      <div className="product-grid">
        {products.map((product) => (
          <article className="product-card" key={product.name}>
            {product.image ? (
              <img src={product.image} alt={`${product.name} packshot`} />
            ) : null}
            <span>{product.category || "Prodotto"}</span>
            <h3>{product.name}</h3>
            {product.description ? <p>{product.description}</p> : null}
            {showStock ? <small>Stock informativo: {product.stock}</small> : null}
            <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.5rem" }}>
              <p style={{ margin: 0 }}>{SHOP_FLOW_COPY.helperText}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                <a
                  href={
                    product.checkoutHref || buildShopCheckoutHref(product.name)
                  }
                >
                  {SHOP_FLOW_COPY.checkoutCta}
                </a>
                <a
                  className="ghost-button"
                  href={product.contactHref || buildShopContactHref(product.name)}
                >
                  {SHOP_FLOW_COPY.contactCta}
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
