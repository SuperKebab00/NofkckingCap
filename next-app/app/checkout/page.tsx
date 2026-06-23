import { SiteHeader } from "../../components/site-header";
import { checkoutPageContent } from "../../lib/static-content";

export default function CheckoutPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="section checkout-page">
          <div className="checkout-page__intro">
            <p className="eyebrow">{checkoutPageContent.eyebrow}</p>
            <h1>{checkoutPageContent.title}</h1>
            <p>{checkoutPageContent.description}</p>
            <strong className="status-badge">
              {checkoutPageContent.notice}
            </strong>
          </div>

          <div className="checkout-panels">
            <section
              className="missing-panel"
              aria-labelledby="checkout-status"
            >
              <p className="eyebrow">Current state</p>
              <h2 id="checkout-status">
                {checkoutPageContent.currentStatusTitle}
              </h2>
              <ul>
                {checkoutPageContent.currentStatusItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section
              className="missing-panel"
              aria-labelledby="checkout-invariants"
            >
              <p className="eyebrow">Compatibility contract</p>
              <h2 id="checkout-invariants">
                {checkoutPageContent.invariantsTitle}
              </h2>
              <ul>
                {checkoutPageContent.invariants.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="hero__actions">
            <a
              className="primary-button"
              href={checkoutPageContent.homeAction.href}
            >
              {checkoutPageContent.homeAction.label}
            </a>
            <a
              className="outline-button"
              href={checkoutPageContent.shopAction.href}
            >
              {checkoutPageContent.shopAction.label}
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
