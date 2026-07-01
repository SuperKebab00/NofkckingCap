import type { Metadata } from "next";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Privacy | No Cap Barbershop",
  description:
    "Informativa sintetica sulla gestione dei dati raccolti tramite contatti, area shop e servizi del sito No Cap Barbershop.",
};

const privacyCards = [
  {
    title: "Dati raccolti",
    body: "Il sito puo raccogliere dati di contatto, riferimenti a prodotti richiesti e informazioni tecniche essenziali per gestire richieste e protezione del servizio.",
  },
  {
    title: "Modulo contatti",
    body: "L'invio del form usa l'endpoint same-origin `POST /api/contact/create` e la validazione finale resta sempre server-side.",
  },
  {
    title: "Area admin",
    body: "La verifica admin usa autenticazione lato server. Le azioni operative non sono abilitate da questa interfaccia pubblica.",
  },
  {
    title: "Cookie e preferenze",
    body: "Per informazioni sui cookie tecnici e sulle preferenze di utilizzo consulta anche la pagina Cookie del progetto.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="hero section">
          <div className="hero__content">
            <p className="eyebrow">Privacy</p>
            <h1>Informativa essenziale</h1>
            <p>
              Questa pagina riassume in modo sintetico come vengono gestiti i
              dati raccolti tramite sito, richieste contatto e strumenti
              amministrativi protetti.
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
            {privacyCards.map((card) => (
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
            <a className="ghost-button" href="/cookie">
              Cookie
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
