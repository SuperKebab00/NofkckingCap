"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type AdminUser = {
  created_at?: string;
  is_admin?: boolean;
  role?: "admin" | "super_admin";
  user_id: string;
};

type AuditEntry = {
  action?: string;
  created_at?: string;
  entity_id?: string | null;
  entity_type?: string | null;
  id?: string;
};

type RetentionCandidate = {
  expires_at?: string;
  id?: string;
  image_path?: string;
  reason?: string;
};

type AdminSuperPanelProps = {
  view: "users" | "audit" | "maintenance";
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;
  if (!response.ok) {
    throw new Error(
      (payload as { error?: string } | null)?.error ||
        "Operazione non riuscita.",
    );
  }
  return payload as T;
}

function formatDate(value?: string | null) {
  if (!value) return "n/d";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "n/d" : date.toLocaleString("it-IT");
}

function retentionName(candidate: RetentionCandidate) {
  if (candidate.reason) return candidate.reason;
  if (candidate.image_path) return "Immagine taglio";
  return "Taglio scaduto";
}

export function AdminSuperPanel({ view }: AdminSuperPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super_admin">("admin");
  const [retentionCandidates, setRetentionCandidates] = useState<RetentionCandidate[]>([]);
  const [orphanFiles, setOrphanFiles] = useState<Array<{ name?: string; reason?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("Caricamento.");
  const [error, setError] = useState<string | null>(null);

  const refreshUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await fetch("/api/admin/users").then((response) =>
        readJson<{ users: AdminUser[] }>(response),
      );
      setUsers(payload.users || []);
      setMessage("Utenti aggiornati.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Utenti non disponibili.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAudit = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await fetch("/api/admin/audit-log").then((response) =>
        readJson<{ entries: AuditEntry[] }>(response),
      );
      setAuditEntries(payload.entries || []);
      setMessage("Audit aggiornato.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Audit non disponibile.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMaintenanceReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await fetch("/api/admin/cuts/retention").then((response) =>
        readJson<{
          candidates?: RetentionCandidate[];
          orphans?: Array<{ name?: string; reason?: string }>;
        }>(response),
      );
      setRetentionCandidates(payload.candidates || []);
      setOrphanFiles(payload.orphans || []);
      setMessage("Controllo completato.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Controllo non disponibile.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "users") void refreshUsers();
    if (view === "audit") void refreshAudit();
    if (view === "maintenance") void loadMaintenanceReport();
  }, [loadMaintenanceReport, refreshAudit, refreshUsers, view]);

  async function runMaintenance() {
    if (!window.confirm("Rimuovere i tagli scaduti e le immagini non collegate?")) return;
    setIsSaving(true);
    setError(null);
    try {
      await fetch("/api/admin/cuts/retention", { method: "POST" }).then((response) =>
        readJson(response),
      );
      setMessage("Pulizia completata.");
      await loadMaintenanceReport();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pulizia non riuscita.");
    } finally {
      setIsSaving(false);
    }
  }

  async function upsertUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await fetch("/api/admin/users", {
        body: JSON.stringify({
          is_admin: true,
          role: newRole,
          user_id: newUserId.trim(),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }).then((response) => readJson(response));
      setNewUserId("");
      setNewRole("admin");
      setMessage("Utente salvato.");
      await refreshUsers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Salvataggio utente non riuscito.");
    } finally {
      setIsSaving(false);
    }
  }

  async function changeRole(userId: string, role: "admin" | "super_admin") {
    setIsSaving(true);
    setError(null);
    try {
      await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        body: JSON.stringify({ role }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      }).then((response) => readJson(response));
      setMessage("Ruolo aggiornato.");
      await refreshUsers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Aggiornamento ruolo non riuscito.");
    } finally {
      setIsSaving(false);
    }
  }

  function refreshCurrentView() {
    if (view === "users") void refreshUsers();
    if (view === "audit") void refreshAudit();
    if (view === "maintenance") void loadMaintenanceReport();
  }

  return (
    <section className="missing-panel admin-super-panel" aria-labelledby="admin-super-title">
      <div className="admin-panel-heading">
        <div>
          <h2 id="admin-super-title">
            {view === "users" ? "Utenti" : view === "audit" ? "Audit" : "Manutenzione"}
          </h2>
          <p>
            {view === "users"
              ? "Gestisci ruoli e accessi dell'area gestione."
              : view === "audit"
                ? "Controlla le ultime attivita amministrative."
                : "Verifica tagli scaduti e immagini non collegate."}
          </p>
        </div>
        <span className="status-badge">Super admin</span>
      </div>

      <p className="admin-inline-note">{error || message}</p>

      <div className="admin-form-actions">
        <button className="ghost-button" disabled={isLoading} onClick={refreshCurrentView} type="button">
          {isLoading ? "Caricamento..." : "Aggiorna"}
        </button>
      </div>

      {view === "users" ? (
        <section className="admin-products-list" aria-labelledby="admin-users-title">
          <h3 id="admin-users-title">Utenti admin</h3>
          <form className="admin-form-row" onSubmit={upsertUser}>
            <label>
              <span>ID utente</span>
              <input
                className="contact-form__input"
                onChange={(event) => setNewUserId(event.target.value)}
                required
                value={newUserId}
              />
            </label>
            <label>
              <span>Ruolo</span>
              <select
                className="contact-form__input"
                onChange={(event) => setNewRole(event.target.value as "admin" | "super_admin")}
                value={newRole}
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super admin</option>
              </select>
            </label>
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Salvataggio..." : "Salva utente"}
            </button>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Utente</th>
                  <th>Ruolo</th>
                  <th>Stato</th>
                  <th>Creato</th>
                  <th>Azione</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id}>
                    <td><code className="admin-compact-code">{user.user_id.slice(0, 8)}...</code></td>
                    <td>{user.role === "super_admin" ? "Super admin" : "Admin"}</td>
                    <td>{user.is_admin ? "Abilitato" : "Disabilitato"}</td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <button
                        className="mini-button"
                        disabled={isSaving}
                        onClick={() =>
                          changeRole(
                            user.user_id,
                            user.role === "super_admin" ? "admin" : "super_admin",
                          )
                        }
                        type="button"
                      >
                        {user.role === "super_admin" ? "Rendi admin" : "Rendi super"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!users.length ? <p>Nessun utente admin trovato.</p> : null}
        </section>
      ) : null}

      {view === "audit" ? (
        <section className="admin-products-list" aria-labelledby="admin-audit-title">
          <h3 id="admin-audit-title">Audit</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Azione</th>
                  <th>Elemento</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.map((entry) => (
                  <tr key={entry.id || `${entry.action}-${entry.created_at}`}>
                    <td>{entry.action || "n/d"}</td>
                    <td>{entry.entity_type || "n/d"}</td>
                    <td>{formatDate(entry.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!auditEntries.length ? <p>Nessuna attivita registrata.</p> : null}
        </section>
      ) : null}

      {view === "maintenance" ? (
        <section className="admin-products-list" aria-labelledby="admin-maintenance-title">
          <h3 id="admin-maintenance-title">Pulizia tagli</h3>
          <p>Controlla tagli scaduti e immagini non collegate prima di rimuoverli.</p>
          <div className="admin-form-actions">
            <button className="ghost-button" disabled={isLoading} onClick={() => loadMaintenanceReport()} type="button">
              Controlla
            </button>
            <button
              className="outline-button"
              disabled={isSaving || retentionCandidates.length === 0}
              onClick={() => runMaintenance()}
              type="button"
            >
              {isSaving ? "Pulizia..." : "Esegui pulizia"}
            </button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Elemento</th>
                  <th>Scadenza</th>
                </tr>
              </thead>
              <tbody>
                {retentionCandidates.map((candidate) => (
                  <tr key={candidate.id || candidate.image_path}>
                    <td>{retentionName(candidate)}</td>
                    <td>{formatDate(candidate.expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!retentionCandidates.length ? <p>Nessun taglio scaduto trovato.</p> : null}
          {orphanFiles.length ? (
            <p>Immagini non collegate rilevate: {orphanFiles.length}.</p>
          ) : (
            <p>Nessuna immagine non collegata rilevata.</p>
          )}
        </section>
      ) : null}
    </section>
  );
}
