import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "../../components/site-header";
import { getPublishedCuts } from "../../lib/cuts-public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Showcase | No Cap Barber Shop",
  description: "Showcase mensile No Cap Barber Shop in stile prod-ready.",
};

export default async function ShowcasePage() {
  const showcaseItems = await getPublishedCuts();

  return (
    <>
      <SiteHeader />
      <main className="page-shell route-shell route-shell--showcase">
        <section className="page-banner page-banner--showcase">
          <p className="eyebrow">Showcase</p>
          <h1>Questo mese</h1>
          <p>
            Solo tagli pubblicati dal team e ancora validi, senza contenuti
            scaduti o immagini rimosse.
          </p>
        </section>

        <section className="showcase-section">
          <div className="section-heading section-heading--single">
            <div>
              <p className="eyebrow">No Cap cuts</p>
              <h2>Showcase mensile</h2>
            </div>
          </div>

          {showcaseItems.length ? (
            <div className="showcase-grid">
              {showcaseItems.map((item, index) => (
              <article className="showcase-card" key={item.id}>
                {item.imageUrl ? <img src={item.imageUrl} alt={item.title} loading="lazy" /> : null}
                <div>
                  <span>{String(index + 1).padStart(2, "0")} / Showcase</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
            </div>
          ) : (
            <div className="showcase-empty">
              <h2>Showcase in aggiornamento</h2>
              <p>I tagli pubblicati compariranno qui appena saranno disponibili.</p>
            </div>
          )}

          <div className="showcase-cta">
            <Link className="primary-button" href="/taglio-fresco">
              Torna a Taglio fresco
            </Link>
            <Link className="outline-button" href="/contact">
              Contattaci
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
