"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_LEAD_STATUSES,
  archiveAdminLead,
  getAdminLead,
  listAdminLeads,
  updateAdminLeadStatus,
  type AdminLead,
  type AdminLeadStatus,
} from "../lib/admin-leads-client";
import {
  ADMIN_ACCESS_TOKEN_STORAGE_KEY,
  ADMIN_AUTH_CHANGED_EVENT,
} from "../lib/admin-login";

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "short",
  timeStyle: "short",
});

function readStoredToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY);
}

function formatDate(value: unknown) {
  const raw = String(value || "");
  if (!raw) return "n/d";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : dateFormatter.format(date);
}

function normalizeStatus(value: unknown): AdminLeadStatus {
  const status = String(value || "new");
  return ADMIN_LEAD_STATUSES.includes(status as AdminLeadStatus)
    ? (status as AdminLeadStatus)
    : "new";
}

export function AdminLeadsPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<AdminLead | null>(null);
  const [statusDraft, setStatusDraft] = useState<AdminLeadStatus>("new");
  const [statusFilter, setStatusFilter] = useState<AdminLeadStatus | "">("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("Login admin richiesto per visualizzare i lead.");
  const [error, setError] = useState<string | null>(null);

  const selectedFromList = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) || null,
    [leads, selectedLeadId],
  );

  const refreshLeads = useCallback(
    async (nextToken = token) => {
      if (!nextToken) {
        setLeads([]);
        setSelectedLead(null);
        setSelectedLeadId(null);
        setMessage("Login admin richiesto per visualizzare i lead.");
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const nextLeads = await listAdminLeads(nextToken, {
          pageSize: 50,
          search,
          status: statusFilter,
        });
        setLeads(nextLeads);
        setMessage(`Lead caricati: ${nextLeads.length}.`);
      } catch (caught) {
        setLeads([]);
        setError(caught instanceof Error ? caught.message : "Impossibile caricare i lead.");
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter, token],
  );

  const loadLeadDetail = useCallback(
    async (leadId: string, nextToken = token) => {
      if (!nextToken) return;
      setSelectedLeadId(leadId);
      setIsDetailLoading(true);
      setError(null);
      try {
        const lead = await getAdminLead(nextToken, leadId);
        setSelectedLead(lead);
        setStatusDraft(normalizeStatus(lead.status));
        setMessage(`Dettaglio lead ${lead.subject || lead.email || lead.id} caricato.`);
      } catch (caught) {
        setSelectedLead(null);
        setError(caught instanceof Error ? caught.message : "Dettaglio lead non disponibile.");
      } finally {
        setIsDetailLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const storedToken = readStoredToken();
    setToken(storedToken);
    void refreshLeads(storedToken);

    function handleAuthChanged(event: Event) {
      const detail = (event as CustomEvent<{ accessToken?: string | null }>).detail;
      const nextToken = detail?.accessToken || readStoredToken();
      setToken(nextToken || null);
      setSelectedLead(null);
      setSelectedLeadId(null);
      void refreshLeads(nextToken || null);
    }

    window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, handleAuthChanged);
    return () => window.removeEventListener(ADMIN_AUTH_CHANGED_EVENT, handleAuthChanged);
  }, [refreshLeads]);

  async function handleSaveStatus() {
    if (!token || !selectedLeadId) {
      setError("Sessione admin o lead mancante.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateAdminLeadStatus(token, selectedLeadId, {
        status: statusDraft,
      });
      await refreshLeads(token);
      await loadLeadDetail(updated.id || selectedLeadId, token);
      setMessage("Stato lead aggiornato.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update lead non riuscito.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive() {
    if (!token || !selectedLeadId) return;
    if (!window.confirm("Archiviare questo lead impostandolo a closed?")) return;
    setIsSaving(true);
    setError(null);
    try {
      const archived = await archiveAdminLead(token, selectedLeadId);
      await refreshLeads(token);
      await loadLeadDetail(archived.id || selectedLeadId, token);
      setMessage("Lead archiviato.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Archiviazione lead non riuscita.");
    } finally {
      setIsSaving(false);
    }
  }

  const detailLead = selectedLead || selectedFromList;

  return (
    <section className="missing-panel admin-leads-panel" aria-labelledby="admin-leads-title">
      <div className="admin-panel-heading">
        <div>
          <h2 id="admin-leads-title">Leads</h2>
          <p>Messaggi arrivati dal form contatti, letti tramite API admin protette.</p>
        </div>
        <span className="status-badge">{token ? "Leads live" : "Login richiesto"}</span>
      </div>

      <p className="admin-inline-note">{error || message}</p>

      {!token ? (
        <div className="status-card">
          <h3>Sessione mancante</h3>
          <p>Nessuna API leads viene chiamata senza Bearer JWT admin.</p>
        </div>
      ) : (
        <div className="admin-crud-grid admin-leads-grid">
          <div className="admin-products-list">
            <div className="admin-form-actions">
              <button className="ghost-button" disabled={isLoading} onClick={() => refreshLeads()} type="button">
                {isLoading ? "Caricamento..." : "Refresh lead"}
              </button>
              <span className="status-badge">{leads.length} lead</span>
            </div>

            <div className="admin-form-row">
              <label>
                <span>Cerca</span>
                <input className="contact-form__input" onChange={(event) => setSearch(event.target.value)} placeholder="Email, telefono, oggetto" value={search} />
              </label>
              <label>
                <span>Stato</span>
                <select className="contact-form__input" onChange={(event) => setStatusFilter(event.target.value as AdminLeadStatus | "")} value={statusFilter}>
                  <option value="">Tutti</option>
                  {ADMIN_LEAD_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
            </div>

            {leads.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table admin-leads-table">
                  <thead>
                    <tr><th>Oggetto</th><th>Contatto</th><th>Stato</th><th>Data</th><th>Azione</th></tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        <td><strong>{lead.subject || "Richiesta"}</strong><small>{lead.source || "contact-form"}</small></td>
                        <td>{lead.email || "n/d"}<small>{lead.phone || ""}</small></td>
                        <td>{lead.status || "new"}</td>
                        <td>{formatDate(lead.created_at)}</td>
                        <td><button className="mini-button" onClick={() => loadLeadDetail(lead.id)} type="button">Dettaglio</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="status-card">
                <h3>{isLoading ? "Caricamento lead" : "Lista vuota"}</h3>
                <p>{isLoading ? "Lettura lead admin in corso..." : "Nessun lead restituito dalle API admin."}</p>
              </div>
            )}
          </div>

          <div className="admin-product-form admin-lead-detail">
            <div className="admin-panel-heading">
              <div>
                <h3>Dettaglio lead</h3>
                <p>{detailLead ? detailLead.subject || detailLead.email || detailLead.id : "Seleziona un lead dalla lista"}</p>
              </div>
              <span className="status-badge">{isDetailLoading ? "Caricamento" : detailLead?.status || "n/d"}</span>
            </div>

            {detailLead ? (
              <>
                <div className="admin-order-meta-grid">
                  <article className="status-card">
                    <h3>Contatto</h3>
                    <p>{detailLead.email || "n/d"}</p>
                    <p>{detailLead.phone || "n/d"}</p>
                    <p>{formatDate(detailLead.created_at)}</p>
                  </article>
                  <article className="status-card">
                    <h3>Meta</h3>
                    <p>Privacy: {detailLead.privacy_accepted ? "si" : "no"}</p>
                    <p>Source: {detailLead.source || "n/d"}</p>
                    <p>ID: {detailLead.id}</p>
                  </article>
                </div>

                <label>
                  <span>Oggetto</span>
                  <input className="contact-form__input" readOnly value={detailLead.subject || ""} />
                </label>
                <label>
                  <span>Messaggio</span>
                  <textarea className="contact-form__input" readOnly rows={6} value={detailLead.message || ""} />
                </label>
                <label>
                  <span>Stato lead</span>
                  <select className="contact-form__input" onChange={(event) => setStatusDraft(event.target.value as AdminLeadStatus)} value={statusDraft}>
                    {ADMIN_LEAD_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>

                <div className="admin-form-actions">
                  <button className="primary-button" disabled={isSaving} onClick={handleSaveStatus} type="button">
                    {isSaving ? "Salvataggio..." : "Salva stato"}
                  </button>
                  <button className="ghost-button" disabled={isDetailLoading} onClick={() => detailLead.id && loadLeadDetail(detailLead.id)} type="button">
                    Ricarica dettaglio
                  </button>
                  <button className="outline-button" disabled={isSaving} onClick={handleArchive} type="button">
                    Archivia
                  </button>
                </div>
              </>
            ) : (
              <div className="status-card">
                <h3>Nessun dettaglio</h3>
                <p>Apri un lead per visualizzare messaggio e stato modificabile.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
