type AdminReadonlyDashboardProps = {
  adminApiState: "configured" | "not-configured" | "error";
  adminApiMessage: string;
  adminCategoriesCount: number | null;
  adminMode: string;
  adminProductsCount: number | null;
  adminSource: "endpoint" | "fallback";
  adminWrites: string;
  categoriesCount: number;
  productsCount: number;
  showStock: boolean;
  usesLiveReadOnlyData: boolean;
};

const flowStatus = [
  {
    description: "Catalogo prodotti e categorie pubbliche gia leggibili in sola lettura.",
    label: "Shop",
    status: "online",
  },
  {
    description: "Checkout pubblico collegato agli ordini server-side; nessun pagamento online attivo.",
    label: "Checkout in-shop",
    status: "consultazione",
  },
  {
    description: "Contact pubblico attivo con backend Cloudflare invariato.",
    label: "Contact",
    status: "same-origin",
  },
  {
    description: "Prodotti, struttura shop, ordini e lead sono disponibili dopo verifica della sessione admin.",
    label: "CRUD admin",
    status: "protetto",
  },
];

function formatAdminApiState(
  value: AdminReadonlyDashboardProps["adminApiState"],
) {
  if (value === "configured") {
    return "Configurata";
  }

  if (value === "error") {
    return "Errore";
  }

  return "Non configurata";
}

export function AdminReadonlyDashboard({
  adminApiMessage,
  adminApiState,
  adminCategoriesCount,
  adminMode,
  adminProductsCount,
  adminSource,
  adminWrites,
  categoriesCount,
  productsCount,
  showStock,
  usesLiveReadOnlyData,
}: AdminReadonlyDashboardProps) {
  return (
    <section className="admin-dashboard-stack">
      <section className="missing-panel" aria-labelledby="admin-readonly-summary">
        <h2 id="admin-readonly-summary">Riepilogo dashboard</h2>
        <div className="admin-metric-grid">
          <article className="status-card">
            <h3>Prodotti pubblici</h3>
            <p className="admin-metric-value">
              {productsCount}
            </p>
            <p>
              {usesLiveReadOnlyData ? "Dati live" : "Backup locale"}
            </p>
          </article>

          <article className="status-card">
            <h3>Categorie pubbliche</h3>
            <p className="admin-metric-value">
              {categoriesCount}
            </p>
            <p>Conteggio esposto solo in lettura.</p>
          </article>

          <article className="status-card">
            <h3>Stock pubblico</h3>
            <p className="admin-metric-value admin-metric-value--text">
              {showStock ? "Abilitato" : "Non esposto"}
            </p>
            <p>Nessuna modifica inventario da questa UI.</p>
          </article>
        </div>
      </section>

      <section className="missing-panel" aria-labelledby="admin-api-status">
        <h2 id="admin-api-status">Admin API</h2>
        <div className="admin-metric-grid">
          <article className="status-card">
            <span className="status-badge">
              {formatAdminApiState(adminApiState)}
            </span>
            <p>{adminApiMessage}</p>
          </article>

          <article className="status-card">
            <h3>Mode</h3>
            <p className="admin-metric-value admin-metric-value--text">
              {adminMode}
            </p>
            <p>Writes: {adminWrites}</p>
          </article>

          <article className="status-card">
            <h3>Conteggi endpoint</h3>
            <p>
              Prodotti: {adminProductsCount ?? "n/d"}
            </p>
            <p>
              Categorie: {adminCategoriesCount ?? "n/d"}
            </p>
            <p>
              Sorgente: {adminSource === "endpoint" ? "Endpoint protetto" : "Fallback locale"}
            </p>
          </article>
        </div>
      </section>

      <section className="missing-panel" aria-labelledby="admin-flow-status">
        <h2 id="admin-flow-status">Stato superficie Next</h2>
        <ul className="admin-note-list">
          {flowStatus.map((item) => (
            <li key={item.label}>
              <strong>{item.label}:</strong> {item.status}. {item.description}
            </li>
          ))}
        </ul>
      </section>

      <section className="missing-panel" aria-labelledby="admin-scope-limits">
        <h2 id="admin-scope-limits">Perimetro attuale</h2>
        <ul className="admin-note-list">
          <li>Le operazioni CRUD sono disponibili solo dopo verifica lato server del Bearer JWT admin.</li>
          <li>Ordini e lead restano accessibili esclusivamente dalle API admin protette.</li>
          <li>Nessun token admin o service role esposto al client.</li>
          <li>Il service role resta confinato al server e non viene mai inviato al browser.</li>
        </ul>
      </section>
    </section>
  );
}
