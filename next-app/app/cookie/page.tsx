import type { Metadata } from "next";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Cookie Policy | No Cap Barbershop",
  description:
    "Bozza informativa prudente sulla gestione cookie della shell pubblica Next.",
};

const cookieSections = [
  {
    id: "draft",
    title: "Bozza in migrazione",
    body: "Questa route fa parte della shell pubblica Next in migrazione. Il sito vanilla resta la sorgente primaria e contiene gia il concetto operativo di consenso e preferenze cookie.",
  },
  {
    id: "necessary",
    title: "Cookie tecnici o necessari",
    body: "Possono essere presenti elementi strettamente necessari al funzionamento della pagina, alla navigazione o alla memorizzazione di preferenze tecniche di base.",
  },
  {
    id: "consent",
    title: "Preferenze di consenso",
    body: "Il progetto vanilla include gia una logica di consenso e preferenze cookie. Questa route statica non introduce nuova logica di banner, storage del consenso o tracking nella next-app.",
  },
  {
    id: "future-services",
    title: "Servizi futuri o opzionali",
    body: "Eventuali integrazioni terze future dovranno essere documentate solo quando effettivamente configurate. PayPal e Stripe restano off o futuri nella migrazione attuale.",
  },
];

export default function CookiePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="page-hero">
          <p className="eyebrow">Cookie</p>
          <div className="hero__content">
            <span className="status-badge">Bozza informativa</span>
            <h1>Cookie Policy</h1>
            <p>
              Pagina statica minimale: non introduce banner reale, logica di
              consenso o tracking aggiuntivo nella shell Next.
            </p>
            <div className="hero__actions">
              <a href="/privacy">Apri la Privacy Policy</a>
              <a className="ghost-button" href="/contact">
                Contattaci
              </a>
            </div>
          </div>
        </section>

        <section className="section">
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            {cookieSections.map((section) => (
              <article className="spotlight-card" id={section.id} key={section.id}>
                <p className="eyebrow">Cookie</p>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="spotlight-card">
            <p className="eyebrow">Link utili</p>
            <h2>Navigazione pubblica essenziale</h2>
            <p>
              Per questa fase di migrazione puoi tornare allo shop pubblico,
              consultare la privacy oppure scriverci senza dipendere da feature
              non ancora migrate.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              <a href="/shop">Vai allo shop</a>
              <a className="ghost-button" href="/">
                Torna alla home
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
