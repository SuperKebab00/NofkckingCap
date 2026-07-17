type AdminReadonlyDashboardProps = {
  categoriesCount: number;
  productsCount: number;
  showStock: boolean;
  usesLiveReadOnlyData: boolean;
};

const flowStatus = [
  {
    description: "Catalogo e categorie pubblicate nello shop.",
    label: "Shop",
    status: "Online",
  },
  {
    description: "Ordini solo con ritiro in negozio e pagamento al banco.",
    label: "Checkout",
    status: "Ritiro",
  },
  {
    description: "Richieste clienti visibili nella sezione dedicata.",
    label: "Contatti",
    status: "Attivi",
  },
  {
    description: "Prodotti e contenuti principali pronti per l'aggiornamento.",
    label: "Catalogo",
    status: "Gestibile",
  },
];

export function AdminReadonlyDashboard({
  categoriesCount,
  productsCount,
  showStock,
  usesLiveReadOnlyData,
}: AdminReadonlyDashboardProps) {
  return (
    <section className="admin-dashboard-stack">
      <section className="missing-panel" aria-labelledby="admin-readonly-summary">
        <h2 id="admin-readonly-summary">Riepilogo negozio</h2>
        <div className="admin-metric-grid">
          <article className="status-card">
            <h3>Prodotti pubblici</h3>
            <p className="admin-metric-value">
              {productsCount}
            </p>
            <p>
              {usesLiveReadOnlyData ? "Aggiornati" : "Da aggiornare"}
            </p>
          </article>

          <article className="status-card">
            <h3>Categorie pubbliche</h3>
            <p className="admin-metric-value">
              {categoriesCount}
            </p>
            <p>Categorie visibili nello shop.</p>
          </article>

          <article className="status-card">
            <h3>Stock pubblico</h3>
            <p className="admin-metric-value admin-metric-value--text">
              {showStock ? "Abilitato" : "Non esposto"}
            </p>
            <p>Disponibilita mostrata ai clienti.</p>
          </article>
        </div>
      </section>

      <section className="missing-panel" aria-labelledby="admin-flow-status">
        <h2 id="admin-flow-status">Oggi in negozio</h2>
        <ul className="admin-note-list">
          {flowStatus.map((item) => (
            <li key={item.label}>
              <strong>{item.label}:</strong> {item.status}. {item.description}
            </li>
          ))}
        </ul>
      </section>

    </section>
  );
}
