import type { Metadata } from "next";
import { ContactForm } from "../../components/contact-form";
import { SiteHeader } from "../../components/site-header";
import { CONTACT_FLOW_COPY } from "../../lib/public-flow";

export const metadata: Metadata = {
  title: "Contatti | No Cap Barbershop",
  description:
    "Contatta No Cap Barbershop per disponibilita prodotti, acquisto in shop e richieste pubbliche dalla shell Next.",
};

function readSearchParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return String(value[0] || "").trim();
  }

  return String(value || "").trim();
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams?: Promise<{
    message?: string | string[];
    product?: string | string[];
    subject?: string | string[];
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const product = readSearchParam(resolvedSearchParams?.product);
  const subject = readSearchParam(resolvedSearchParams?.subject);
  const message = readSearchParam(resolvedSearchParams?.message);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="page-hero">
          <p className="eyebrow">Contatti</p>
          <div className="hero__content">
            <span className="status-badge">Supporto pubblico attivo</span>
            <h1>Parla con No Cap Barbershop</h1>
            <p>
              Usa questo form per chiedere disponibilita, preparare un ritiro in
              shop oppure inviare una richiesta generale. La risposta finale resta
              gestita dal backend esistente.
            </p>
            <div className="hero__actions">
              <a href="/shop">Torna allo shop</a>
              <a className="ghost-button" href="/checkout">
                Vai al checkout in shop
              </a>
            </div>
          </div>
        </section>

        <section
          className="section"
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          <article className="spotlight-card">
            <p className="eyebrow">Passa in negozio</p>
            <h2>Disponibilita, ritiro e supporto</h2>
            <p>{CONTACT_FLOW_COPY.genericHelper}</p>
            {product ? (
              <p className="admin-inline-note">
                Contesto attuale: <strong>{product}</strong>
              </p>
            ) : null}
            <p className="admin-inline-note">
              {CONTACT_FLOW_COPY.noAutomaticOrderNote}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem" }}>
              <a href="tel:+393208839692">Chiama +39 320 883 9692</a>
              <a
                className="ghost-button"
                href="https://www.google.com/maps/search/?api=1&query=Via%20Antonio%20Gramsci%2C%201%2C%2041058%20Vignola%20MO%2C%20Italy"
                rel="noreferrer"
                target="_blank"
              >
                Apri mappa
              </a>
            </div>
          </article>

          <ContactForm
            initialContext={{
              message,
              product,
              subject,
            }}
          />
        </section>
      </main>
    </>
  );
}
