import type { Metadata } from "next";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Cookie Policy | No Cap Barbershop",
  description:
    "Bozza informativa della Cookie Policy per la shell pubblica Next di No Cap Barbershop.",
};

const cookieSections = [
  {
    id: "migration",
    title: "Shell Next in migrazione",
    body: "Questa route fa parte della shell Next.js in migrazione. Il sito vanilla resta la sorgente primaria e contiene gia il concetto operativo di cookie e preferenze di consenso.",
  },
  {
    id: "technical",
    title: "Cookie tecnici o necessari",
    body: "Possono essere usati elementi tecnici strettamente necessari al funzionamento del sito, della navigazione o di preferenze operative di base. I dettagli definitivi vanno verificati prima della produzione.",
  },
  {
    id: "consent",
    title: "Preferenze di consenso",
    body: "Il progetto vanilla include gia una logica di consenso e preferenze cookie. Questa route statica non introduce nuova logica di banner, storage consenso o tracking nella next-app.",
  },
  {
    id: "third-party",
    title: "Servizi terzi futuri",
    body: "Eventuali servizi terzi, analytics o integrazioni aggiuntive devono essere considerati attivi solo se realmente configurati e verificati. PayPal e Stripe restano off o futuri nella migrazione attuale.",
  },
];

export default function CookiePage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="page-hero">
          <p className="eyebrow">Documenti legali</p>
          <div className="page-title-row">
            <h1>Cookie Policy</h1>
            <span className="status-badge">Bozza informativa</span>
          </div>
          <p>
            Pagina statica minimale da verificare prima della produzione. Non
            implementa banner cookie reale, storage del consenso o logiche di
            tracking nella shell Next corrente.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          {cookieSections.map((section) => (
            <article className="panel" key={section.id}>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Cookie</p>
                  <h2>{section.title}</h2>
                </div>
              </div>
              <p>{section.body}</p>
            </article>
          ))}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Link utili</p>
              <h2>Approfondimenti correlati</h2>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <a className="ghost-button" href="/privacy">
              Vai alla Privacy Policy
            </a>
            <a className="ghost-button" href="/contact">
              Torna ai contatti
            </a>
            <a className="primary-button" href="/">
              Torna alla home
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
