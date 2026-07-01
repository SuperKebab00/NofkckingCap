import type { AdminProductsSummaryResult } from "../lib/admin-products-summary";

type AdminProductsSummaryPanelProps = {
  summary: AdminProductsSummaryResult;
};

function formatStateBadge(state: AdminProductsSummaryResult["state"]) {
  if (state === "configured") {
    return "Configurato";
  }

  if (state === "error") {
    return "Errore";
  }

  return "Non configurato";
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("it-IT", {
    currency: "EUR",
    style: "currency",
  }).format(price);
}

export function AdminProductsSummaryPanel({
  summary,
}: AdminProductsSummaryPanelProps) {
  return (
    <section className="missing-panel" aria-labelledby="admin-products-summary">
      <div
        style={{
          alignItems: "start",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2 id="admin-products-summary" style={{ marginBottom: "0.5rem" }}>
            Prodotti admin summary
          </h2>
          <p style={{ margin: 0 }}>{summary.message}</p>
        </div>
        <span className="status-badge">{formatStateBadge(summary.state)}</span>
      </div>

      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          marginTop: "1rem",
        }}
      >
        <article className="status-card">
          <h3 style={{ margin: 0 }}>Totale prodotti</h3>
          <p style={{ fontSize: "1.75rem", margin: "0.25rem 0" }}>
            {summary.total}
          </p>
          <p style={{ margin: 0 }}>Sorgente: {summary.source}</p>
        </article>

        <article className="status-card">
          <h3 style={{ margin: 0 }}>Mode</h3>
          <p style={{ fontSize: "1.5rem", margin: "0.25rem 0" }}>
            {summary.mode}
          </p>
          <p style={{ margin: 0 }}>Writes: {summary.writes}</p>
        </article>
      </div>

      {summary.products.length ? (
        <div style={{ marginTop: "1rem", overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              minWidth: "100%",
              width: "100%",
            }}
          >
            <thead>
              <tr>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Nome</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>
                  Categoria
                </th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Prezzo</th>
              </tr>
            </thead>
            <tbody>
              {summary.products.map((product) => (
                <tr key={product.id}>
                  <td style={{ padding: "0.75rem" }}>{product.name}</td>
                  <td style={{ padding: "0.75rem" }}>
                    {product.category || "n/d"}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    {formatPrice(product.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ marginTop: "1rem" }}>
          Nessun prodotto disponibile nel riepilogo prodotti.
        </p>
      )}
    </section>
  );
}
