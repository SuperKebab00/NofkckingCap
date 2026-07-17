import type { AdminProductsSummaryResult } from "../lib/admin-products-summary";

type AdminProductsSummaryPanelProps = {
  summary: AdminProductsSummaryResult;
};

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
            Catalogo
          </h2>
          <p>Prodotti principali con prezzo e categoria.</p>
        </div>
        <span className="status-badge">{summary.total} prodotti</span>
      </div>

      <div className="admin-metric-grid admin-metric-grid--compact">
        <article className="status-card">
          <h3>Totale prodotti</h3>
          <p className="admin-metric-value">
            {summary.total}
          </p>
          <p>Catalogo gestibile dalla sezione Prodotti.</p>
        </article>

        <article className="status-card">
          <h3>Operativita</h3>
          <p className="admin-metric-value admin-metric-value--text">
            {summary.state === "configured" ? "Pronta" : "Da verificare"}
          </p>
          <p>{summary.state === "configured" ? "Modifiche abilitate." : "Non e stato possibile aggiornare il riepilogo."}</p>
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
