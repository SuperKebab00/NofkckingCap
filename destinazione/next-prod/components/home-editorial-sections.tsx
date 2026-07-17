import Link from "next/link";
import { homeEditorialSections } from "../lib/static-content";

export function HomeEditorialSections() {
  const { freshCut } = homeEditorialSections;

  return (
    <>
      <section className="section route-preview route-preview--fresh" aria-labelledby="fresh-cut-title">
        <div className="route-preview__grid">
          <div className="hero__media route-preview__media">
            <img src={freshCut.image} alt={freshCut.title} />
          </div>
          <div className="spotlight-card route-preview__copy">
            <p className="eyebrow">{freshCut.eyebrow}</p>
            <h2 id="fresh-cut-title">{freshCut.title}</h2>
            <p>{freshCut.description}</p>
            <div className="route-preview__actions">
              <Link className="primary-button" href="/taglio-fresco">
                Apri Fresh Cut
              </Link>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
