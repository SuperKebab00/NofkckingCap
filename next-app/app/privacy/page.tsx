import type { Metadata } from "next";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Privacy Policy | No Cap Barbershop",
  description:
    "Bozza informativa prudente sulla raccolta dati della shell pubblica Next.",
};

const privacySections = [
  {
    id: "raccolta",
    title: "Dati raccolti dal form contatti",
    body: "Il form contatti Next puo inviare email, telefono, oggetto del messaggio, testo del messaggio e il flag privacy_accepted. E presente anche un campo tecnico honeypot che deve restare vuoto.",
  },
  {
    id: "finalita",
    title: "Finalita principale",
    body: "Questi dati vengono trattati con finalita strettamente legata alla risposta alla richiesta inviata dall'utente. Questa pagina resta una bozza informativa e va verificata prima di qualsiasi uso produttivo finale.",
  },
  {
    id: "backend",
    title: "Backend attuale",
    body: "L'invio del form Next usa l'endpoint same-origin `POST /api/contact/create` esposto direttamente da nocap-next. La validazione finale e la gestione operativa restano server-side, senza dipendere dal worker vanilla.",
  },
  {
    id: "limits",
    title: "Limiti di questa bozza",
    body: "Pagamenti online, checkout reale e admin reale non fanno parte di questa informativa di migrazione pubblica. PayPal e Stripe restano disattivati o futuri nella shell Next corrente.",
  },
  {
    id: "cookie-link",
    title: "Cookie e consenso",
    body: "Il progetto conserva il concetto di cookie e preferenze di consenso gia presente nel sito vanilla. Per questa shell pubblica consulta anche la pagina Cookie dedicata.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="page-hero">
          <p className="eyebrow">Privacy</p>
          <div className="hero__content">
            <span className="status-badge">Bozza informativa</span>
            <h1>Privacy Policy</h1>
            <p>
              Pagina statica prudente per evitare link rotti durante la
              migrazione. Non sostituisce ancora una privacy policy finale
              verificata per la produzione.
            </p>
            <div className="hero__actions">
              <a href="/contact">Vai ai contatti</a>
              <a className="ghost-button" href="/cookie">
                Leggi la Cookie Policy
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
            {privacySections.map((section) => (
              <article className="spotlight-card" id={section.id} key={section.id}>
                <p className="eyebrow">Informativa</p>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="spotlight-card">
            <p className="eyebrow">Link utili</p>
            <h2>Serve un contatto diretto?</h2>
            <p>
              Se hai dubbi sui dati inviati o vuoi evitare l'attesa di una
              policy finale completa, usa il form contatti oppure torna allo
              shop pubblico in sola lettura.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              <a href="/contact">Apri il form contatti</a>
              <a className="ghost-button" href="/shop">
                Torna allo shop
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
