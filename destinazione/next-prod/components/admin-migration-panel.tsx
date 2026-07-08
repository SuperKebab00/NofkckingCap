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
    <section className="admin-section-panel">
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

      <div className="admin-metric-grid">
        {adminSections.map((section) => (
          <article key={section.title} className="status-card">
            <h3>{section.title}</h3>
            <p>{section.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
