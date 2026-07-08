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
      <div className="admin-panel-heading">
        <div>
          <h2 id="admin-products-summary">
            Prodotti admin summary
          </h2>
          <p>{summary.message}</p>
        </div>
        <span className="status-badge">{formatStateBadge(summary.state)}</span>
      </div>

      <div className="admin-metric-grid admin-metric-grid--compact">
        <article className="status-card">
          <h3>Totale prodotti</h3>
          <p className="admin-metric-value">
            {summary.total}
          </p>
          <p>Sorgente: {summary.source}</p>
        </article>

        <article className="status-card">
          <h3>Mode</h3>
          <p className="admin-metric-value admin-metric-value--text">
            {summary.mode}
          </p>
          <p>Writes: {summary.writes}</p>
        </article>
      </div>

      {summary.products.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>
                  Categoria
                </th>
                <th>Prezzo</th>
              </tr>
            </thead>
            <tbody>
              {summary.products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>
                    {product.category || "n/d"}
                  </td>
                  <td>
                    {formatPrice(product.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>
          Nessun prodotto disponibile nel riepilogo prodotti.
        </p>
      )}
    </section>
  );
}
