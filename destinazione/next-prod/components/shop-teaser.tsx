import { shopTeaserContent } from "../lib/static-content";
import { ShopProductGrid } from "./shop-product-grid";

export function ShopTeaser() {
  return (
    <section className="section band" id="shop">
      <div className="section-heading">
        <p className="eyebrow">{shopTeaserContent.eyebrow}</p>
        <h2>{shopTeaserContent.title}</h2>
        <p>{shopTeaserContent.description}</p>
      </div>
      <ShopProductGrid />
    </section>
  );
}
