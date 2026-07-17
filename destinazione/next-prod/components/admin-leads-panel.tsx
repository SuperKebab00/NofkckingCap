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

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "short",
  timeStyle: "short",
});

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

function statusLabel(status: unknown) {
  const value = normalizeStatus(status);
  const labels: Record<AdminLeadStatus, string> = {
    closed: "Completata",
    contacted: "In gestione",
    new: "Nuova",
    open: "In gestione",
    spam: "Archiviata",
  };
  return labels[value];
}

export function AdminLeadsPanel() {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<AdminLead | null>(null);
  const [statusDraft, setStatusDraft] = useState<AdminLeadStatus>("new");
  const [statusFilter, setStatusFilter] = useState<AdminLeadStatus | "">("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("Caricamento richieste.");
  const [error, setError] = useState<string | null>(null);

  const selectedFromList = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) || null,
    [leads, selectedLeadId],
  );

  const refreshLeads = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);
      try {
        const nextLeads = await listAdminLeads(undefined, {
          pageSize: 50,
          search,
          status: statusFilter,
        });
        setLeads(nextLeads);
        setMessage(`Richieste caricate: ${nextLeads.length}.`);
      } catch (caught) {
        setLeads([]);
        setError(caught instanceof Error ? caught.message : "Impossibile caricare i lead.");
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter],
  );

  const loadLeadDetail = useCallback(
    async (leadId: string) => {
      setSelectedLeadId(leadId);
      setIsDetailLoading(true);
      setError(null);
      try {
        const lead = await getAdminLead(undefined, leadId);
        setSelectedLead(lead);
        setStatusDraft(normalizeStatus(lead.status));
        setMessage(`Dettaglio richiesta ${lead.subject || lead.email || lead.id} caricato.`);
      } catch (caught) {
        setSelectedLead(null);
        setError(caught instanceof Error ? caught.message : "Dettaglio lead non disponibile.");
      } finally {
        setIsDetailLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void refreshLeads();
  }, [refreshLeads]);

  async function handleSaveStatus() {
    if (!selectedLeadId) {
      setError("Richiesta mancante.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateAdminLeadStatus(undefined, selectedLeadId, {
        status: statusDraft,
      });
      await refreshLeads();
      await loadLeadDetail(updated.id || selectedLeadId);
      setMessage("Stato richiesta aggiornato.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Aggiornamento richiesta non riuscito.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive() {
    if (!selectedLeadId) return;
    if (!window.confirm("Archiviare questa richiesta?")) return;
    setIsSaving(true);
    setError(null);
    try {
      const archived = await archiveAdminLead(undefined, selectedLeadId);
      await refreshLeads();
      await loadLeadDetail(archived.id || selectedLeadId);
      setMessage("Richiesta archiviata.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Archiviazione richiesta non riuscita.");
    } finally {
      setIsSaving(false);
    }
  }

  const detailLead = selectedLead || selectedFromList;

  return (
    <section className="missing-panel admin-leads-panel" aria-labelledby="admin-leads-title">
      <div className="admin-panel-heading">
        <div>
          <h2 id="admin-leads-title">Richieste</h2>
          <p>Messaggi arrivati dal form contatti.</p>
        </div>
        <span className="status-badge">Contatti</span>
      </div>

      <p className="admin-inline-note">{error || message}</p>

      <div className="admin-crud-grid admin-leads-grid">
          <div className="admin-products-list">
            <div className="admin-form-actions">
              <button className="ghost-button" disabled={isLoading} onClick={() => refreshLeads()} type="button">
                {isLoading ? "Caricamento..." : "Aggiorna richieste"}
              </button>
              <span className="status-badge">{leads.length} richieste</span>
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
                  {ADMIN_LEAD_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
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
                        <td><strong>{lead.subject || "Richiesta"}</strong></td>
                        <td>{lead.email || "n/d"}<small>{lead.phone || ""}</small></td>
                        <td>{statusLabel(lead.status)}</td>
                        <td>{formatDate(lead.created_at)}</td>
                        <td><button className="mini-button" onClick={() => loadLeadDetail(lead.id)} type="button">Dettaglio</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="status-card">
                <h3>{isLoading ? "Caricamento richieste" : "Lista vuota"}</h3>
                <p>{isLoading ? "Caricamento richieste..." : "Nessuna richiesta trovata."}</p>
              </div>
            )}
          </div>

          <div className="admin-product-form admin-lead-detail">
            <div className="admin-panel-heading">
              <div>
                <h3>Dettaglio richiesta</h3>
                <p>{detailLead ? detailLead.subject || detailLead.email || detailLead.id : "Seleziona una richiesta dalla lista"}</p>
              </div>
              <span className="status-badge">{isDetailLoading ? "Caricamento" : detailLead ? statusLabel(detailLead.status) : "n/d"}</span>
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
                    <h3>Stato</h3>
                    <p>{statusLabel(detailLead.status)}</p>
                    <p>Consenso privacy: {detailLead.privacy_accepted ? "si" : "no"}</p>
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
                  <span>Stato richiesta</span>
                  <select className="contact-form__input" onChange={(event) => setStatusDraft(event.target.value as AdminLeadStatus)} value={statusDraft}>
                    {ADMIN_LEAD_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
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
                <p>Apri una richiesta per visualizzare messaggio e stato modificabile.</p>
              </div>
            )}
          </div>
        </div>
    </section>
  );
}
