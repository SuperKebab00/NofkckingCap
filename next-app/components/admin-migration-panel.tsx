const adminSections = [
  {
    title: "Verifica admin",
    status: "Disponibile",
    body: "Controllo sessione e permessi tramite endpoint protetto same-origin.",
  },
  {
    title: "Stato servizi",
    status: "Disponibile",
    body: "Panoramica tecnica di configurazione backend e disponibilita Admin API.",
  },
  {
    title: "Prodotti",
    status: "Consultazione",
    body: "Elenco sintetico dei prodotti esposti alla dashboard senza azioni operative.",
  },
];

export function AdminMigrationPanel() {
  return (
    <section className="section">
      <div className="section-heading">
        <p className="eyebrow">Area admin</p>
        <h2>Sezioni disponibili</h2>
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
            <span className="status-badge">{section.status}</span>
            <h3 style={{ marginTop: "1rem" }}>{section.title}</h3>
            <p style={{ margin: "0.75rem 0 0" }}>{section.body}</p>
          </article>
        ))}
      </div>

      <p style={{ marginTop: "1rem" }} className="admin-inline-note">
        Azioni operative, inserimenti, aggiornamenti e rimozioni non sono abilitate in questa dashboard.
      </p>
    </section>
  );
}
