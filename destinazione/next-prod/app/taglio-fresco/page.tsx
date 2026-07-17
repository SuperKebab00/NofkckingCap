import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "../../components/site-header";
import { getFeaturedCut, getPublishedCuts } from "../../lib/cuts-public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Taglio fresco | No Cap Barber Shop",
  description:
    "Il taglio fresco No Cap del giorno, in stile barber shop prod-ready.",
};

export default async function FreshCutPage() {
  const [featuredCut, publishedCuts] = await Promise.all([
    getFeaturedCut(),
    getPublishedCuts(),
  ]);
  const hasShowcase = publishedCuts.length > 0;

  return (
    <>
      <SiteHeader />
      <main className="page-shell route-shell route-shell--fresh">
        <section className="page-banner page-banner--fresh">
          <p className="eyebrow">Daily highlight</p>
          <h1>Taglio fresco del giorno</h1>
          <p>
            Il look da mettere in vetrina oggi: immagine grande, taglio nitido e
            mood No Cap senza reinterpretazioni.
          </p>
        </section>

        <section className="fresh-cut-section fresh-cut-section--route">
          {featuredCut?.imageUrl ? (
            <div className="fresh-cut__media">
              <img
                src={featuredCut.imageUrl}
                alt={featuredCut.title}
                loading="eager"
              />
              <div className="fresh-cut__stamp">{featuredCut.dateLabel || "Fresh cut"}</div>
            </div>
          ) : null}
          <div className="fresh-cut__content">
            <p className="eyebrow">No Cap Barber Shop</p>
            <h2>{featuredCut?.title || "Taglio fresco in arrivo"}</h2>
            <p>
              {featuredCut?.description ||
                "Stiamo preparando il prossimo taglio da mettere in evidenza. Torna a breve per il nuovo contenuto pubblicato dal team."}
            </p>
            <div className="hero__actions">
              {hasShowcase ? (
                <Link className="primary-button" href="/showcase">
                  Vai allo Showcase
                </Link>
              ) : null}
              <Link className="outline-button" href="/contact">
                Prenota informazioni
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
