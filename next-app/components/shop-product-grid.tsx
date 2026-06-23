import { productTeasers, shopTeaserContent } from "../lib/static-content";

export function ShopProductGrid() {
  return (
    <div className="product-grid">
      {productTeasers.map((product) => (
        <article className="product-card" key={product.name}>
          <img src={product.image} alt={`${product.name} packshot`} />
          <span>{product.category}</span>
          <h3>{product.name}</h3>
          <p>{shopTeaserContent.productNote}</p>
        </article>
      ))}
    </div>
  );
}
