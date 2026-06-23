import { SiteHeader } from "../../components/site-header";
import { ShopProductGrid } from "../../components/shop-product-grid";
import { shopPageContent } from "../../lib/static-content";

export default function ShopPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="section shop-page">
          <div className="shop-page__intro">
            <p className="eyebrow">{shopPageContent.eyebrow}</p>
            <h1>{shopPageContent.title}</h1>
            <p>{shopPageContent.description}</p>
            <span className="status-badge">{shopPageContent.badge}</span>
          </div>

          <ShopProductGrid />

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
