import type { AdminAuthCheckResult } from "../lib/admin-auth-check";

type AdminAuthStatusPanelProps = {
  authCheck: AdminAuthCheckResult;
};

function getLabel(state: AdminAuthCheckResult["state"]) {
  if (state === "admin") return "Admin verificato";
  if (state === "non-admin") return "Non admin";
  if (state === "missing-session") return "Sessione admin mancante";
  if (state === "error") return "Errore";
  return "Non configurata";
}

export function AdminAuthStatusPanel({
  authCheck,
}: AdminAuthStatusPanelProps) {
  return (
    <section className="missing-panel" aria-labelledby="admin-auth-status">
      <div className="admin-panel-heading">
        <div>
          <h2 id="admin-auth-status">
            Verifica admin reale
          </h2>
          <p>{authCheck.message}</p>
        </div>
        <span className="status-badge">{getLabel(authCheck.state)}</span>
      </div>

      <div className="admin-metric-grid admin-metric-grid--compact">
        <article className="status-card">
          <h3>Authenticated</h3>
          <p className="admin-metric-value admin-metric-value--text">
            {authCheck.authenticated ? "true" : "false"}
          </p>
          <p>Sorgente: {authCheck.source}</p>
        </article>

        <article className="status-card">
          <h3>Admin</h3>
          <p className="admin-metric-value admin-metric-value--text">
            {authCheck.admin ? "true" : "false"}
          </p>
          <p>Nessuna operativita abilitata da questa UI.</p>
        </article>
      </div>
    </section>
  );
}
