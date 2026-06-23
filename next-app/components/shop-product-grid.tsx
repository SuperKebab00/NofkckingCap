import { productTeasers, shopTeaserContent } from "../lib/static-content";

export type ShopProductCard = {
  category: string | null;
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
    <div className="product-grid">
      {products.map((product) => (
        <article className="product-card" key={product.name}>
          {product.image ? (
            <img src={product.image} alt={`${product.name} packshot`} />
          ) : null}
          <span>{product.category}</span>
          <h3>{product.name}</h3>
          <p>{product.description || shopTeaserContent.productNote}</p>
          {showStock && typeof product.stock === "number" ? (
            <small>Stock informativo: {product.stock}</small>
          ) : null}
        </article>
      ))}
    </div>
  );
}
