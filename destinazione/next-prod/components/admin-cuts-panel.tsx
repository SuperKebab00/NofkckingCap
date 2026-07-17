"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  archiveAdminCut,
  createAdminCut,
  listAdminCuts,
  updateAdminCut,
  uploadAdminCutImage,
  type AdminCut,
} from "../lib/admin-cuts-client";

type CutFormState = {
  description: string;
  image_path: string;
  is_featured: boolean;
  is_published: boolean;
  title: string;
};

const emptyForm: CutFormState = {
  description: "",
  image_path: "",
  is_featured: false,
  is_published: false,
  title: "",
};

function cutToForm(cut: AdminCut): CutFormState {
  return {
    description: cut.description || "",
    image_path: cut.image_path || "",
    is_featured: cut.is_featured === true,
    is_published: cut.is_published === true,
    title: cut.title || "",
  };
}

function daysLeft(value?: string | null) {
  if (!value) return "Non pubblicato";
  const diff = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(diff)) return "n/d";
  return `${Math.max(0, Math.ceil(diff / 86400000))} giorni`;
}

export function AdminCutsPanel() {
  const [cuts, setCuts] = useState<AdminCut[]>([]);
  const [selectedCutId, setSelectedCutId] = useState<string | null>(null);
  const [form, setForm] = useState<CutFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("Caricamento tagli.");
  const [error, setError] = useState<string | null>(null);

  const selectedCut = useMemo(
    () => cuts.find((cut) => cut.id === selectedCutId) || null,
    [cuts, selectedCutId],
  );

  const refreshCuts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextCuts = await listAdminCuts();
      setCuts(nextCuts);
      setMessage(`Tagli caricati: ${nextCuts.length}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tagli non disponibili.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCuts();
  }, [refreshCuts]);

  function startCreate() {
    setSelectedCutId(null);
    setForm(emptyForm);
    setMessage("Nuovo taglio: carica immagine, titolo e stato.");
    setError(null);
  }

  function startEdit(cut: AdminCut) {
    setSelectedCutId(cut.id);
    setForm(cutToForm(cut));
    setMessage(`Modifica taglio: ${cut.title}.`);
    setError(null);
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setIsSaving(true);
    setError(null);
    try {
      const imagePath = await uploadAdminCutImage(file);
      setForm((current) => ({ ...current, image_path: imagePath }));
      setMessage("Immagine caricata.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload immagine non riuscito.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        description: form.description.trim(),
        image_path: form.image_path.trim() || null,
        is_featured: form.is_featured,
        is_published: form.is_published,
        title: form.title.trim(),
      };
      const saved = selectedCut
        ? await updateAdminCut(selectedCut.id, payload)
        : await createAdminCut(payload);
      await refreshCuts();
      setSelectedCutId(saved.id);
      setForm(cutToForm(saved));
      setMessage(selectedCut ? "Taglio aggiornato." : "Taglio creato.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Salvataggio taglio non riuscito.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive() {
    if (!selectedCut) return;
    if (!window.confirm(`Archiviare ${selectedCut.title}?`)) return;
    setIsSaving(true);
    setError(null);
    try {
      const archived = await archiveAdminCut(selectedCut.id);
      await refreshCuts();
      setSelectedCutId(archived.id);
      setForm(cutToForm(archived));
      setMessage("Taglio archiviato.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Archiviazione taglio non riuscita.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="missing-panel admin-cuts-panel" aria-labelledby="admin-cuts-title">
      <div className="admin-panel-heading">
        <div>
          <h2 id="admin-cuts-title">Tagli</h2>
          <p>Gestisci Taglio fresco e Showcase pubblicato.</p>
        </div>
        <span className="status-badge">Retention 90 giorni</span>
      </div>
      <p className="admin-inline-note">{error || message}</p>
      <div className="admin-crud-grid">
        <div className="admin-products-list">
          <div className="admin-form-actions">
            <button className="ghost-button" disabled={isLoading} onClick={() => refreshCuts()} type="button">
              {isLoading ? "Caricamento..." : "Aggiorna tagli"}
            </button>
            <button className="primary-button" onClick={startCreate} type="button">
              Nuovo taglio
            </button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Titolo</th>
                  <th>Pubblicato</th>
                  <th>Featured</th>
                  <th>Scade tra</th>
                  <th>Azione</th>
                </tr>
              </thead>
              <tbody>
                {cuts.map((cut) => (
                  <tr key={cut.id}>
                    <td>{cut.title}</td>
                    <td>{cut.is_published ? "Si" : "No"}</td>
                    <td>{cut.is_featured ? "Si" : "No"}</td>
                    <td>{daysLeft(cut.expires_at)}</td>
                    <td><button className="mini-button" onClick={() => startEdit(cut)} type="button">Modifica</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!cuts.length ? <p>Nessun taglio presente.</p> : null}
        </div>

        <form className="admin-product-form" onSubmit={handleSubmit}>
          <h3>{selectedCut ? "Modifica taglio" : "Crea taglio"}</h3>
          <label>
            <span>Titolo</span>
            <input className="contact-form__input" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required value={form.title} />
          </label>
          <label>
            <span>Descrizione</span>
            <textarea className="contact-form__input" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} value={form.description} />
          </label>
          <label>
            <span>Immagine</span>
            <input accept="image/jpeg,image/png,image/webp" className="contact-form__input" onChange={(event) => void handleUpload(event.target.files?.[0])} type="file" />
          </label>
          <label>
            <span>Path immagine</span>
            <input className="contact-form__input" onChange={(event) => setForm((current) => ({ ...current, image_path: event.target.value }))} placeholder="cuts/..." value={form.image_path} />
          </label>
          <div className="admin-form-row">
            <label className="admin-checkbox">
              <input checked={form.is_published} onChange={(event) => setForm((current) => ({ ...current, is_published: event.target.checked }))} type="checkbox" />
              <span>Pubblicato</span>
            </label>
            <label className="admin-checkbox">
              <input checked={form.is_featured} onChange={(event) => setForm((current) => ({ ...current, is_featured: event.target.checked }))} type="checkbox" />
              <span>Taglio fresco</span>
            </label>
          </div>
          <div className="admin-form-actions">
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Salvataggio..." : "Salva taglio"}
            </button>
            <button className="ghost-button" onClick={startCreate} type="button">Annulla</button>
            <button className="outline-button" disabled={!selectedCut || isSaving} onClick={handleArchive} type="button">Archivia</button>
          </div>
        </form>
      </div>
    </section>
  );
}
