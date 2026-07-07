const adminSections = [
  {
    title: "Verifica admin",
    body: "Controllo sessione e permessi con endpoint protetto same-origin.",
  },
  {
    title: "Stato servizi",
    body: "Panoramica sintetica di configurazione backend, Admin API e disponibilita delle integrazioni protette.",
  },
  {
    title: "Prodotti",
    body: "Riepilogo dei prodotti pubblicati visibili alla dashboard senza operazioni di scrittura.",
  },
];

export function AdminMigrationPanel() {
  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Area admin</p>
          <h2>Sezioni disponibili</h2>
        </div>
        <p>
          La dashboard resta riservata a verifiche, stato servizi e consultazione.
          Azioni operative e CRUD non sono abilitate.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {adminSections.map((section) => (
          <article key={section.title} className="spotlight-card">
            <h3>{section.title}</h3>
            <p style={{ marginTop: "0.75rem" }}>{section.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
