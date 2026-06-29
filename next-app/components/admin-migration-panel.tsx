const migrationSections = [
  {
    description:
      "Vista attuale della shell Next: metriche pubbliche, perimetro visibile e nessuna operativita interna.",
    status: "Disponibile ora",
    title: "Stato migrazione",
  },
  {
    description:
      "Conteggi e stato catalogo basati su dati pubblici read-only. Nessuna modifica prodotto e nessuna visione sensibile.",
    status: "Read-only pubblico",
    title: "Catalogo prodotti",
  },
  {
    description:
      "Categorie pubbliche attive gia leggibili dal layer Next, ma senza gestione amministrativa o riordino operativo.",
    status: "Read-only pubblico",
    title: "Categorie",
  },
  {
    description:
      "Ordini e lead restano fuori dalla shell Next. Nessun accesso, nessuna lista e nessuna analisi operativa qui.",
    status: "Non disponibile",
    title: "Ordini / lead",
  },
];

export function AdminMigrationPanel() {
  return (
    <section className="section">
      <div className="section-heading">
        <p className="eyebrow">Struttura futura</p>
        <h2>Sezioni admin preparate ma non operative</h2>
        <p>
          L&apos;interfaccia separa in modo esplicito il read-only pubblico gia
          migrato dalle aree gestionali future, che restano disattivate.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {migrationSections.map((section) => (
          <article className="spotlight-card" key={section.title}>
            <p className="eyebrow">Admin section</p>
            <h3 style={{ marginTop: 0 }}>{section.title}</h3>
            <p>
              <span className="status-badge">{section.status}</span>
            </p>
            <p style={{ marginBottom: 0 }}>{section.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
