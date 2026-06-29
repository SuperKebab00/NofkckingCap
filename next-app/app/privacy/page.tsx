import type { Metadata } from "next";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Privacy Policy | No Cap Barbershop",
  description:
    "Bozza informativa della Privacy Policy per la shell pubblica Next di No Cap Barbershop.",
};

const privacySections = [
  {
    id: "data-collected",
    title: "Dati raccolti dal form contatti",
    body: "Il form contatti Next puo inviare email, telefono, oggetto, messaggio e il flag privacy_accepted. E presente anche un campo honeypot tecnico non visibile all'utente.",
  },
  {
    id: "purpose",
    title: "Finalita",
    body: "Questi dati sono usati per ricevere e gestire la richiesta di contatto e per rispondere al messaggio inviato dall'utente.",
  },
  {
    id: "backend",
    title: "Backend e invio",
    body: "L'invio avviene tramite l'endpoint Cloudflare /api/contact/create. In questa fase di migrazione il backend esistente resta il punto di verita per validazione, rate limit e scrittura operativa dei lead.",
  },
  {
    id: "payments",
    title: "Pagamenti online",
    body: "I pagamenti online restano off o futuri nel perimetro corrente della next-app. Questa pagina non introduce trattamenti aggiuntivi relativi a pagamenti live.",
  },
  {
    id: "cookies",
    title: "Cookie e consenso",
    body: "Il progetto mantiene il concetto di cookie e preferenze di consenso gia presente nel sito vanilla. Le informazioni definitive vanno verificate prima della pubblicazione finale.",
  },
  {
    id: "contact",
    title: "Contatto del brand",
    body: "No Cap Barbershop, Vignola MO. Contatto pubblico attualmente visibile nel progetto: +39 320 883 9692.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="page-hero">
          <p className="eyebrow">Documenti legali</p>
          <div className="page-title-row">
            <h1>Privacy Policy</h1>
            <span className="status-badge">Bozza informativa</span>
          </div>
          <p>
            Pagina statica minimale della next-app. Testo prudente da verificare
            e completare prima di un uso in produzione.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          {privacySections.map((section) => (
            <article className="panel" key={section.id}>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Privacy</p>
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
              <p className="eyebrow">Nota</p>
              <h2>Verifica prima della produzione</h2>
            </div>
          </div>
          <p>
            Questa pagina e una bozza informativa coerente con il perimetro
            tecnico oggi migrato. Non sostituisce una revisione legale o privacy
            prima della pubblicazione definitiva.
          </p>
          <div style={{ marginTop: "1rem" }}>
            <a className="ghost-button" href="/cookie">
              Vai alla Cookie Policy
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
