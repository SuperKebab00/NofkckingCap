import type { Metadata } from "next";
import { ContactForm } from "../../components/contact-form";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Contatti | No Cap Barbershop",
  description:
    "Contatta No Cap Barber Shop per prodotti, prenotazioni, disponibilita e richieste dirette.",
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
      <main className="page-shell route-shell route-shell--contact">
        <section className="page-banner page-banner--support">
          <p className="eyebrow">Contatti</p>
          <h1>No Cap Barbershop</h1>
          <p>Passa in shop, chiamaci o scrivici per prenotazioni, prodotti e informazioni.</p>
        </section>

        <section className="contact-section">
          <article className="contact-details">
            <p className="eyebrow">No Cap Barbershop</p>
            <h2>Vignola, MO</h2>
            <a className="contact-line" href="tel:+393208839692">
              +39 320 883 9692
            </a>
            <a
              className="contact-line"
              href="https://www.google.com/maps/search/?api=1&query=Via%20Antonio%20Gramsci%2C%201%2C%2041058%20Vignola%20MO%2C%20Italy"
              rel="noreferrer"
              target="_blank"
            >
              Via Antonio Gramsci, 1
              <br />
              41058 Vignola MO, Italy
            </a>
            {product ? (
              <p className="admin-inline-note">
                Contesto attuale: <strong>{product}</strong>
              </p>
            ) : null}
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
