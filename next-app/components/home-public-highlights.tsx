const quickLinks = [
  { href: "#daily-cut", label: "Taglio del giorno" },
  { href: "#monthly-showcase", label: "Questo mese" },
  { href: "/shop", label: "Shop" },
  { href: "/contact", label: "Contatti" },
];

const highlights = [
  {
    eyebrow: "In studio",
    title: "Tagli, rifiniture e cura del dettaglio",
    body: "Una proposta costruita per chi vuole arrivare in negozio con idee chiare e tempi rapidi.",
  },
  {
    eyebrow: "In shop",
    title: "Prodotti da verificare prima del ritiro",
    body: "Controlla le referenze, confronta le categorie e prepara il prossimo acquisto in negozio.",
  },
  {
    eyebrow: "Contatto diretto",
    title: "Richieste rapide e disponibilita reali",
    body: "Per conferme, consigli o informazioni su un prodotto puoi passare dal form contatti o chiamare direttamente.",
  },
];

export function HomePublicHighlights() {
  return (
    <section className="section">
      <div className="section-heading">
        <p className="eyebrow">Percorsi rapidi</p>
        <h2>Muoviti tra studio, shop e contatti</h2>
      </div>

      <nav
        aria-label="Scorciatoie home"
        style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}
      >
        {quickLinks.map((link) => (
          <a key={link.href} className="ghost-button" href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>

      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {highlights.map((item) => (
          <article key={item.title} className="spotlight-card">
            <p className="eyebrow">{item.eyebrow}</p>
            <h3>{item.title}</h3>
            <p style={{ marginTop: "1rem" }}>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
