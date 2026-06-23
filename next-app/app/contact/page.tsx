import { SiteHeader } from "../../components/site-header";
import { contactPageContent } from "../../lib/static-content";

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="section contact-page">
          <div className="contact-page__intro">
            <p className="eyebrow">{contactPageContent.eyebrow}</p>
            <h1>{contactPageContent.title}</h1>
            <p>{contactPageContent.description}</p>
            <strong className="status-badge">
              {contactPageContent.notice}
            </strong>
          </div>

          <section className="missing-panel" aria-labelledby="contact-status">
            <p className="eyebrow">Current state</p>
            <h2 id="contact-status">{contactPageContent.currentStatusTitle}</h2>
            <ul>
              {contactPageContent.currentStatusItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <div className="hero__actions">
            <a
              className="primary-button"
              href={contactPageContent.homeAction.href}
            >
              {contactPageContent.homeAction.label}
            </a>
            <a
              className="outline-button"
              href={contactPageContent.shopAction.href}
            >
              {contactPageContent.shopAction.label}
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
