const spotlightLinks = [
  { href: "#daily-cut", label: "Taglio del giorno" },
  { href: "#monthly-showcase", label: "Questo mese" },
  { href: "/shop", label: "Shop" },
  { href: "/contact", label: "Contatti" },
];

const highlights = [
  {
    id: "daily-cut",
    eyebrow: "Daily cut",
    title: "Taglio del giorno",
    description:
      "Una selezione rapida pensata per chi vuole tenere il look pulito e semplice, senza inseguire funzioni non ancora migrate.",
    primaryAction: { href: "/shop", label: "Vai allo shop" },
    secondaryAction: { href: "/contact", label: "Chiedi informazioni" },
  },
  {
    id: "monthly-showcase",
    eyebrow: "Questo mese",
    title: "Showcase pubblico",
    description:
      "Uno spazio editoriale leggero per mettere in evidenza prodotti, mood e novita del mese con contenuti read-only.",
    primaryAction: { href: "/shop", label: "Guarda i prodotti" },
    secondaryAction: { href: "#contact-cta", label: "Parla con noi" },
  },
  {
    id: "contact-cta",
    eyebrow: "Public safe",
    title: "Passa dallo shop o scrivici",
    description:
      "La shell Next resta focalizzata sul catalogo pubblico e sui contatti. Checkout e admin reali rimangono fuori dal perimetro di questo step.",
    primaryAction: { href: "/contact", label: "Apri contatti" },
    secondaryAction: { href: "/", label: "Torna alla home" },
  },
];

export function HomePublicHighlights() {
  return (
    <section className="section">
      <div className="section-heading">
        <p className="eyebrow">Daily in progress</p>
        <h2>Blocchi pubblici rapidi per orientarsi nel catalogo</h2>
        <p>
          CTA semplici, contenuti leggibili e nessuna promessa su funzioni non
          ancora migrate.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        {spotlightLinks.map((link) => (
          <a className="ghost-button" href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        {highlights.map((highlight) => (
          <article className="spotlight-card" id={highlight.id} key={highlight.id}>
            <p className="eyebrow">{highlight.eyebrow}</p>
            <h2>{highlight.title}</h2>
            <p>{highlight.description}</p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginTop: "1rem",
              }}
            >
              <a href={highlight.primaryAction.href}>{highlight.primaryAction.label}</a>
              <a className="ghost-button" href={highlight.secondaryAction.href}>
                {highlight.secondaryAction.label}
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
