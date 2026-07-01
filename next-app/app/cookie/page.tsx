import type { Metadata } from "next";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Cookie | No Cap Barbershop",
  description:
    "Informazioni essenziali sui cookie tecnici e sulle preferenze usate dal sito No Cap Barbershop.",
};

const cookieCards = [
  {
    title: "Cookie tecnici",
    body: "Il sito puo usare cookie o storage tecnico strettamente necessari al funzionamento delle pagine, della navigazione e delle preferenze essenziali.",
  },
  {
    title: "Preferenze",
    body: "Le eventuali preferenze salvate servono a mantenere un'esperienza coerente durante la navigazione e non costituiscono una fonte di verita per permessi o ruoli.",
  },
  {
    title: "Servizi integrati",
    body: "Eventuali integrazioni di terze parti saranno documentate solo quando attivate e verificate nel flusso reale del progetto.",
  },
];

export default function CookiePage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="hero section">
          <div className="hero__content">
            <p className="eyebrow">Cookie</p>
            <h1>Uso essenziale dei cookie</h1>
            <p>
              Questa pagina riassume l'uso di cookie tecnici e preferenze
              essenziali all'interno del sito.
            </p>
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
            {cookieCards.map((card) => (
              <article key={card.title} className="spotlight-card">
                <h2>{card.title}</h2>
                <p style={{ marginTop: "0.75rem" }}>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <p className="eyebrow">Link utili</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <a className="ghost-button" href="/privacy">
              Privacy
            </a>
            <a className="ghost-button" href="/contact">
              Contatti
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
