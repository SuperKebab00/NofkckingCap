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
          <h2 id="admin-auth-status" style={{ marginBottom: "0.5rem" }}>
            Verifica admin reale
          </h2>
          <p style={{ margin: 0 }}>{authCheck.message}</p>
        </div>
        <span className="status-badge">{getLabel(authCheck.state)}</span>
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
          <h3 style={{ margin: 0 }}>Authenticated</h3>
          <p style={{ fontSize: "1.5rem", margin: "0.25rem 0" }}>
            {authCheck.authenticated ? "true" : "false"}
          </p>
          <p style={{ margin: 0 }}>Sorgente: {authCheck.source}</p>
        </article>

        <article className="status-card">
          <h3 style={{ margin: 0 }}>Admin</h3>
          <p style={{ fontSize: "1.5rem", margin: "0.25rem 0" }}>
            {authCheck.admin ? "true" : "false"}
          </p>
          <p style={{ margin: 0 }}>Nessuna operativita abilitata da questa UI.</p>
        </article>
      </div>
    </section>
  );
}
