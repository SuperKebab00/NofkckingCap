import Link from "next/link";
import { homeEditorialSections } from "../lib/static-content";

export function HomeEditorialSections() {
  const { freshCut, showcase } = homeEditorialSections;

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
              <Link className="ghost-button" href={freshCut.ctaHref}>
                {freshCut.ctaLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section route-preview route-preview--showcase" aria-labelledby="showcase-title">
        <div className="section-heading section-heading--preview">
          <div>
            <p className="eyebrow">{showcase.eyebrow}</p>
            <h2 id="showcase-title">{showcase.title}</h2>
          </div>
          <p>{showcase.description}</p>
        </div>

        <div className="route-teaser-grid">
          {showcase.items.slice(0, 2).map((item) => (
            <article key={item.title} className="route-teaser-card">
              <div className="route-teaser-card__media">
                <img src={item.image} alt={item.title} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>

        <div className="route-preview__actions route-preview__actions--wide">
          <Link className="primary-button" href="/showcase">
            Apri Showcase
          </Link>
          <Link className="ghost-button" href="/contact">
            Contattaci
          </Link>
          <a className="ghost-button" href={freshCut.ctaHref}>
              {freshCut.ctaLabel}
          </a>
        </div>
      </section>
    </>
  );
}
