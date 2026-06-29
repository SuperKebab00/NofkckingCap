import type { Metadata } from "next";
import { ContactForm } from "../../components/contact-form";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Contatti | No Cap Barbershop",
  description:
    "Contatta No Cap Barbershop dalla shell Next pubblica. Il backend Cloudflare esistente gestisce validazione e invio della richiesta.",
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="page-hero">
          <p className="eyebrow">Contatti</p>
          <div className="page-title-row">
            <h1>No Cap Barbershop</h1>
            <span className="status-badge">Cloudflare API live</span>
          </div>
          <p>
            Primo form reale migrato in Next: UI client minima, backend
            Cloudflare invariato, nessun accesso diretto a Supabase dal browser.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">No Cap Barbershop</p>
                <h2>Vignola, MO</h2>
              </div>
              <p>Passa in shop, chiamaci o scrivici per prodotti e informazioni.</p>
            </div>
            <div
              style={{
                display: "grid",
                gap: "0.85rem",
              }}
            >
              <a className="ghost-button" href="tel:+393208839692">
                +39 320 883 9692
              </a>
              <a
                className="ghost-button"
                href="https://www.google.com/maps/search/?api=1&query=Via%20Antonio%20Gramsci%2C%201%2C%2041058%20Vignola%20MO%2C%20Italy"
                rel="noreferrer"
                target="_blank"
              >
                Via Antonio Gramsci, 1
                <br />
                41058 Vignola MO, Italy
              </a>
            </div>
          </article>

          <ContactForm />
        </section>
      </main>
    </>
  );
}
