import type { Metadata } from "next";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Privacy Policy | No Cap Barbershop",
  description:
    "Informativa sul trattamento dati per utenti del sito No Cap Barber Shop.",
};

const privacySections = [
  {
    title: "Titolare del trattamento",
    body: "No Cap Barber Shop. I dati di contatto societari e fiscali vanno completati nella versione legale definitiva del progetto.",
  },
  {
    title: "Dati raccolti",
    body: "Possono essere raccolti email, telefono, contenuto dei messaggi contatto e riferimenti strettamente necessari alla gestione delle richieste inviate dal sito.",
  },
  {
    title: "Finalita",
    body: "I dati vengono trattati per risposta alle richieste, gestione operativa dei contatti e tutela tecnica del servizio.",
  },
  {
    title: "Diritti utente",
    body: "Restano esercitabili i diritti di accesso, rettifica, cancellazione, limitazione, opposizione e portabilita secondo la normativa applicabile.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell route-shell route-shell--legal">
        <section className="page-hero page-hero--legal">
          <div className="hero__content route-document__hero">
            <p className="eyebrow">Documenti legali</p>
            <h1>Privacy Policy</h1>
            <p>
              Informativa sul trattamento dati per utenti del sito No Cap Barber
              Shop.
            </p>
          </div>
        </section>

        <section className="section route-document">
          <div className="spotlight-card route-document__card">
            {privacySections.map((section) => (
              <div key={section.title}>
                <h2 className="route-document__title">{section.title}</h2>
                <p>{section.body}</p>
              </div>
            ))}
            <p className="admin-inline-note">
              Documento informativo da completare con consulente legale prima della
              pubblicazione definitiva.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
