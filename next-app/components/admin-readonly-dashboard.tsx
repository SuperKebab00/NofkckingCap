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
    description: "Checkout in-shop pubblico disponibile senza ordini reali o pagamenti.",
    label: "Checkout in-shop",
    status: "consultazione",
  },
  {
    description: "Contact pubblico attivo con backend Cloudflare invariato.",
    label: "Contact",
    status: "same-origin",
  },
  {
    description: "Azioni admin, scritture e modifiche restano disabilitate in questa dashboard.",
    label: "CRUD admin",
    status: "non disponibile",
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
    <section
      style={{
        display: "grid",
        gap: "1.5rem",
        marginTop: "2rem",
      }}
    >
      <section className="missing-panel" aria-labelledby="admin-readonly-summary">
        <h2 id="admin-readonly-summary">Riepilogo dashboard</h2>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <article className="status-card">
            <h3 style={{ margin: 0 }}>Prodotti pubblici</h3>
            <p style={{ fontSize: "2rem", margin: "0.25rem 0" }}>
              {productsCount}
            </p>
            <p style={{ margin: 0 }}>
              {usesLiveReadOnlyData ? "Dati live" : "Backup locale"}
            </p>
          </article>

          <article className="status-card">
            <h3 style={{ margin: 0 }}>Categorie pubbliche</h3>
            <p style={{ fontSize: "2rem", margin: "0.25rem 0" }}>
              {categoriesCount}
            </p>
            <p style={{ margin: 0 }}>Conteggio esposto solo in lettura.</p>
          </article>

          <article className="status-card">
            <h3 style={{ margin: 0 }}>Stock pubblico</h3>
            <p style={{ fontSize: "1.5rem", margin: "0.25rem 0" }}>
              {showStock ? "Abilitato" : "Non esposto"}
            </p>
            <p style={{ margin: 0 }}>Nessuna modifica inventario da questa UI.</p>
          </article>
        </div>
      </section>

      <section className="missing-panel" aria-labelledby="admin-api-status">
        <h2 id="admin-api-status">Admin API</h2>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <article className="status-card">
            <span className="status-badge">
              {formatAdminApiState(adminApiState)}
            </span>
            <p style={{ margin: "0.75rem 0 0" }}>{adminApiMessage}</p>
          </article>

          <article className="status-card">
            <h3 style={{ margin: 0 }}>Mode</h3>
            <p style={{ fontSize: "1.5rem", margin: "0.25rem 0" }}>
              {adminMode}
            </p>
            <p style={{ margin: 0 }}>Writes: {adminWrites}</p>
          </article>

          <article className="status-card">
            <h3 style={{ margin: 0 }}>Conteggi endpoint</h3>
            <p style={{ margin: "0.25rem 0" }}>
              Prodotti: {adminProductsCount ?? "n/d"}
            </p>
            <p style={{ margin: "0.25rem 0" }}>
              Categorie: {adminCategoriesCount ?? "n/d"}
            </p>
            <p style={{ margin: 0 }}>
              Sorgente: {adminSource === "endpoint" ? "Endpoint protetto" : "Fallback locale"}
            </p>
          </article>
        </div>
      </section>

      <section className="missing-panel" aria-labelledby="admin-flow-status">
        <h2 id="admin-flow-status">Stato superficie Next</h2>
        <ul style={{ margin: "1rem 0 0", paddingLeft: "1.25rem" }}>
          {flowStatus.map((item) => (
            <li key={item.label} style={{ marginBottom: "0.75rem" }}>
              <strong>{item.label}:</strong> {item.status}. {item.description}
            </li>
          ))}
        </ul>
      </section>

      <section className="missing-panel" aria-labelledby="admin-scope-limits">
        <h2 id="admin-scope-limits">Perimetro attuale</h2>
        <ul style={{ margin: "1rem 0 0", paddingLeft: "1.25rem" }}>
          <li>Nessun inserimento, aggiornamento o rimozione prodotti da questa dashboard.</li>
          <li>Nessun accesso a ordini, lead o dati sensibili.</li>
          <li>Nessun token admin o service role esposto al client.</li>
          <li>Nessuna auth admin finale implementata in questo step.</li>
        </ul>
      </section>
    </section>
  );
}
