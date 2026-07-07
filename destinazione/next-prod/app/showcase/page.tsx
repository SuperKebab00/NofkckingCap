import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Showcase | No Cap Barber Shop",
  description: "Showcase mensile No Cap Barber Shop in stile prod-ready.",
};

const showcaseItems = [
  {
    image: "/Img/wallpaper/3-opt.webp",
    title: "Clean fade",
    copy: "Linee pulite e volume controllato.",
  },
  {
    image: "/Img/wallpaper/4-opt.webp",
    title: "Blade detail",
    copy: "Dettagli tecnici e finish preciso.",
  },
  {
    image: "/Img/wallpaper/5-opt.webp",
    title: "Daily cut",
    copy: "Il taglio fresco da mettere in evidenza.",
  },
  {
    image: "/Img/wallpaper/6-opt.webp",
    title: "No Cap mood",
    copy: "Atmosfera barber shop, nero rosso bianco.",
  },
];

export default function ShowcasePage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="page-banner page-banner--showcase">
          <p className="eyebrow">Showcase</p>
          <h1>Questo mese</h1>
          <p>
            Solo i tagli e i visual caricati nel mese corrente, con impostazione
            editoriale fedele al sito statico.
          </p>
        </section>

        <section className="showcase-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">No Cap cuts</p>
              <h2>Showcase mensile</h2>
            </div>
            <p>
              Visual grandi, card scure e accenti rossi: la stessa direzione del
              prod-ready, adattata a route Next.js dedicata.
            </p>
          </div>

          <div className="showcase-grid">
            {showcaseItems.map((item, index) => (
              <article className="showcase-card" key={item.title}>
                <img src={item.image} alt={item.title} loading="lazy" />
                <div>
                  <span>{String(index + 1).padStart(2, "0")} / Showcase</span>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="showcase-cta">
            <Link className="primary-button" href="/contact">
              Contattaci
            </Link>
            <Link className="outline-button" href="/shop">
              Vedi prodotti
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
