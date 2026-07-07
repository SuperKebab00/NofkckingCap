import type { Metadata } from "next";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Cookie Policy | No Cap Barbershop",
  description: "Informativa cookie e preferenze di consenso del sito No Cap Barber Shop.",
};

const cookieSections = [
  {
    title: "Cookie tecnici",
    body: "Sempre attivi, servono al funzionamento di base del sito, alla navigazione e alle preferenze essenziali.",
  },
  {
    title: "Cookie analytics",
    body: "Attivabili solo con consenso quando presenti strumenti di analisi aggregata compatibili con la policy del progetto.",
  },
  {
    title: "Cookie marketing",
    body: "Eventuali servizi marketing di terze parti vengono considerati solo quando attivati e documentati esplicitamente.",
  },
  {
    title: "Gestione preferenze",
    body: "Le preferenze cookie possono essere aggiornate quando il relativo centro preferenze e disponibile nel deploy finale.",
  },
];

export default function CookiePage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="hero section">
          <div className="hero__content">
            <p className="eyebrow">Documenti legali</p>
            <h1>Cookie Policy</h1>
            <p>Informativa cookie e preferenze di consenso.</p>
          </div>
        </section>

        <section className="section">
          <div className="spotlight-card" style={{ display: "grid", gap: "1rem" }}>
            {cookieSections.map((section) => (
              <div key={section.title}>
                <h2 style={{ marginBottom: "0.5rem" }}>{section.title}</h2>
                <p>{section.body}</p>
              </div>
            ))}
            <p className="admin-inline-note">
              Gli script marketing di terze parti vengono caricati solo dopo consenso
              esplicito, quando effettivamente presenti nel progetto.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
