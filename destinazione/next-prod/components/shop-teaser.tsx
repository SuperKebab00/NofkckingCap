import Link from "next/link";
import { productTeasers, shopTeaserContent } from "../lib/static-content";
import { ShopProductGrid } from "./shop-product-grid";

export function ShopTeaser() {
  return (
    <section className="section band route-preview route-preview--shop">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{shopTeaserContent.eyebrow}</p>
          <h2>{shopTeaserContent.title}</h2>
        </div>
        <p>{shopTeaserContent.description}</p>
      </div>
      <ShopProductGrid products={productTeasers.slice(0, 3)} />
      <div className="route-preview__actions route-preview__actions--wide">
        <Link className="primary-button" href="/shop">
          Vai allo shop
        </Link>
        <Link className="ghost-button" href="/checkout">
          Vai al checkout
        </Link>
      </div>
    </section>
  );
}
