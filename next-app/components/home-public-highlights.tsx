const highlights = [
  {
    ctaHref: "/shop",
    ctaLabel: "Vedi prodotti",
    description:
      "Uno spazio pubblico per mettere in evidenza stile, ritmo e tono del barber shop, senza introdurre funzioni operative o aree non ancora pronte.",
    eyebrow: "Daily highlight",
    title: "Taglio del giorno",
  },
  {
    ctaHref: "/contact",
    ctaLabel: "Parla con noi",
    description:
      "Una vetrina pubblica minimale per raccontare il mese in corso, il tono del barber shop e i contenuti che verranno estesi nei passaggi successivi.",
    eyebrow: "Showcase",
    title: "Questo mese",
  },
];

export function HomePublicHighlights() {
  return (
    <section
      className="section"
      aria-label="Public highlights"
      style={{
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      }}
    >
      {highlights.map((highlight) => (
        <article className="panel" key={highlight.title}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{highlight.eyebrow}</p>
              <h2>{highlight.title}</h2>
            </div>
          </div>
          <p>{highlight.description}</p>
          <div style={{ marginTop: "1rem" }}>
            <a className="ghost-button" href={highlight.ctaHref}>
              {highlight.ctaLabel}
            </a>
          </div>
        </article>
      ))}
    </section>
  );
}
