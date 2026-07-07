import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Taglio fresco | No Cap Barber Shop",
  description:
    "Il taglio fresco No Cap del giorno, in stile barber shop prod-ready.",
};

export default function FreshCutPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="page-banner page-banner--fresh">
          <p className="eyebrow">Daily highlight</p>
          <h1>Taglio fresco del giorno</h1>
          <p>
            Il look da mettere in vetrina oggi: immagine grande, taglio nitido e
            mood No Cap senza reinterpretazioni.
          </p>
        </section>

        <section className="fresh-cut-section fresh-cut-section--route">
          <div className="fresh-cut__media">
            <img
              src="/Img/wallpaper/5-opt.webp"
              alt="Taglio fresco del giorno"
              loading="eager"
            />
            <div className="fresh-cut__stamp">Fresh cut</div>
          </div>
          <div className="fresh-cut__content">
            <p className="eyebrow">No Cap Barber Shop</p>
            <h2>Fade pulito, texture naturale.</h2>
            <p>
              Una sezione editoriale fedele al prod-ready: immagine protagonista,
              testo forte, palette nero bianco rosso e CTA verso lo showcase.
            </p>
            <div className="hero__actions">
              <Link className="primary-button" href="/showcase">
                Vedi showcase
              </Link>
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
