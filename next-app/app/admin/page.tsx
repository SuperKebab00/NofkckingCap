import { SiteHeader } from "../../components/site-header";
import { adminPageContent } from "../../lib/static-content";

export default function AdminPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="section admin-page">
          <div className="admin-page__intro">
            <p className="eyebrow">{adminPageContent.eyebrow}</p>
            <h1>{adminPageContent.title}</h1>
            <p>{adminPageContent.description}</p>
            <strong className="status-badge">{adminPageContent.notice}</strong>
          </div>

          <div className="checkout-panels">
            <section className="missing-panel" aria-labelledby="admin-status">
              <p className="eyebrow">Current state</p>
              <h2 id="admin-status">{adminPageContent.currentStatusTitle}</h2>
              <ul>
                {adminPageContent.currentStatusItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="missing-panel" aria-labelledby="admin-go-no-go">
              <p className="eyebrow">Migration gate</p>
              <h2 id="admin-go-no-go">{adminPageContent.goNoGoTitle}</h2>
              <ul>
                {adminPageContent.goNoGoItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="hero__actions">
            <a
              className="primary-button"
              href={adminPageContent.homeAction.href}
            >
              {adminPageContent.homeAction.label}
            </a>
            <a
              className="outline-button"
              href={adminPageContent.shopAction.href}
            >
              {adminPageContent.shopAction.label}
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
