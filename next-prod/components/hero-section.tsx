import { heroContent } from "../lib/static-content";

export function HeroSection() {
  return (
    <section className="hero" id="home">
      <div className="hero__content">
        <p className="eyebrow">{heroContent.eyebrow}</p>
        <h1>
          {heroContent.titleFirstLine}
          <br />
          <span>{heroContent.titleSecondLine}</span>
        </h1>
        <p>{heroContent.description}</p>
        <div className="hero__actions">
          <a className="primary-button" href={heroContent.primaryAction.href}>
            {heroContent.primaryAction.label}
          </a>
          <a className="outline-button" href={heroContent.secondaryAction.href}>
            {heroContent.secondaryAction.label}
          </a>
        </div>
      </div>
      <div className="hero__media" aria-label="No Cap visual">
        <img src={heroContent.image.src} alt={heroContent.image.alt} />
        <div className="hero__badge" aria-hidden="true">
          <span>{heroContent.badge.label}</span>
          <strong>{heroContent.badge.description}</strong>
        </div>
      </div>
    </section>
  );
}
