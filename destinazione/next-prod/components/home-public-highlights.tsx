const highlights = [
  {
    eyebrow: "Shop",
    title: "Prodotti, disponibilita e ultimo stock",
    body: "Consulta il catalogo, filtra per categoria e prepara il prossimo passaggio in negozio con piu chiarezza.",
  },
  {
    eyebrow: "Taglio fresco",
    title: "Un riferimento visivo sempre in evidenza",
    body: "La home riprende il ritmo del barber shop con una sezione dedicata al taglio del giorno e alle immagini di studio.",
  },
  {
    eyebrow: "Contatti",
    title: "Telefono, mappa e richiesta diretta",
    body: "Per prodotti, prenotazioni o domande puoi passare dal form, da WhatsApp o dal contatto telefonico del barber shop.",
  },
];

export function HomePublicHighlights() {
  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">No Cap Barbershop</p>
          <h2>Fresh gear, tagli e contatto diretto</h2>
        </div>
        <p>
          La versione Next resta autonoma e riallinea contenuti pubblici, asset,
          CTA e ritmo visuale all&apos;identita del barber shop.
        </p>
      </div>

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
            <p style={{ marginTop: "0.75rem" }}>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
