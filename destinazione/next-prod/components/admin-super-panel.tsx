"use client";

import { useCallback, useEffect, useState } from "react";

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

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;
  if (!response.ok) {
    throw new Error(
      (payload as { error?: string } | null)?.error ||
        "Operazione super admin non riuscita.",
    );
  }
  return payload as T;
}

export function AdminSuperPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super_admin">("admin");
  const [retentionCandidates, setRetentionCandidates] = useState<RetentionCandidate[]>([]);
  const [orphanFiles, setOrphanFiles] = useState<Array<{ name?: string; reason?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("Caricamento strumenti super admin.");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersPayload, auditPayload] = await Promise.all([
        fetch("/api/admin/users").then((response) =>
          readJson<{ users: AdminUser[] }>(response),
        ),
        fetch("/api/admin/audit-log").then((response) =>
          readJson<{ entries: AuditEntry[] }>(response),
        ),
      ]);
      setUsers(usersPayload.users || []);
      setAuditEntries(auditPayload.entries || []);
      setMessage("Strumenti super admin aggiornati.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Strumenti super admin non disponibili.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function loadRetentionReport() {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await fetch("/api/admin/cuts/retention").then((response) =>
        readJson<{ candidates?: RetentionCandidate[]; orphans?: Array<{ name?: string; reason?: string }> }>(response),
      );
      setRetentionCandidates(payload.candidates || []);
      setOrphanFiles(payload.orphans || []);
      setMessage("Report retention aggiornato.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Report retention non disponibile.");
    } finally {
      setIsLoading(false);
    }
  }

  async function runRetention() {
    if (!window.confirm("Eseguire la retention dei soli tagli scaduti?")) return;
    setIsSaving(true);
    setError(null);
    try {
      await fetch("/api/admin/cuts/retention", { method: "POST" }).then((response) =>
        readJson(response),
      );
      setMessage("Retention tagli eseguita.");
      await loadRetentionReport();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Retention non riuscita.");
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function upsertUser(event: React.FormEvent<HTMLFormElement>) {
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
      setMessage("Utente admin salvato.");
      await refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Salvataggio utente non riuscito.",
      );
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
      await refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Aggiornamento ruolo non riuscito.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="missing-panel admin-super-panel" aria-labelledby="admin-super-title">
      <div className="admin-panel-heading">
        <div>
          <h2 id="admin-super-title">Super admin</h2>
          <p>Gestisci ruoli amministrativi e controlla le ultime attivita.</p>
        </div>
        <span className="status-badge">Livello avanzato</span>
      </div>

      <p className="admin-inline-note">{error || message}</p>

      <div className="admin-form-actions">
        <button className="ghost-button" disabled={isLoading} onClick={() => refresh()} type="button">
          {isLoading ? "Caricamento..." : "Aggiorna"}
        </button>
      </div>

      <div className="admin-crud-grid">
        <section className="admin-products-list" aria-labelledby="admin-users-title">
          <h3 id="admin-users-title">Utenti admin</h3>
          <form className="admin-form-row" onSubmit={upsertUser}>
            <label>
              <span>User ID Auth</span>
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
                  <th>User ID</th>
                  <th>Ruolo</th>
                  <th>Stato</th>
                  <th>Azione</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id}>
                    <td>{user.user_id}</td>
                    <td>{user.role === "super_admin" ? "Super admin" : "Admin"}</td>
                    <td>{user.is_admin ? "Abilitato" : "Disabilitato"}</td>
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

        <section className="admin-products-list" aria-labelledby="admin-audit-title">
          <h3 id="admin-audit-title">Audit log</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Azione</th>
                  <th>Entita</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.map((entry) => (
                  <tr key={entry.id || `${entry.action}-${entry.created_at}`}>
                    <td>{entry.action || "n/d"}</td>
                    <td>{entry.entity_type || "n/d"} {entry.entity_id || ""}</td>
                    <td>{entry.created_at ? new Date(entry.created_at).toLocaleString("it-IT") : "n/d"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!auditEntries.length ? <p>Nessuna attivita registrata.</p> : null}
        </section>

        <section className="admin-products-list" aria-labelledby="admin-retention-title">
          <h3 id="admin-retention-title">Retention tagli</h3>
          <p>Dry-run dei tagli scaduti e report file orfani nel bucket cuts.</p>
          <div className="admin-form-actions">
            <button className="ghost-button" disabled={isLoading} onClick={() => loadRetentionReport()} type="button">
              Dry-run
            </button>
            <button className="outline-button" disabled={isSaving || retentionCandidates.length === 0} onClick={() => runRetention()} type="button">
              Esegui retention
            </button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Record</th>
                  <th>Path</th>
                  <th>Scadenza</th>
                </tr>
              </thead>
              <tbody>
                {retentionCandidates.map((candidate) => (
                  <tr key={candidate.id || candidate.image_path}>
                    <td>{candidate.id}</td>
                    <td>{candidate.image_path}</td>
                    <td>{candidate.expires_at ? new Date(candidate.expires_at).toLocaleString("it-IT") : "n/d"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!retentionCandidates.length ? <p>Nessun taglio scaduto candidato.</p> : null}
          {orphanFiles.length ? <p>File orfani rilevati: {orphanFiles.length}.</p> : <p>Nessun file orfano rilevato.</p>}
        </section>
      </div>
    </section>
  );
}
