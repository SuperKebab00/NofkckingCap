"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createAdminShopCategory,
  createAdminShopSection,
  deleteAdminShopCategory,
  deleteAdminShopSection,
  listAdminShopCategories,
  listAdminShopSections,
  updateAdminShopCategory,
  updateAdminShopSection,
  type AdminShopCategory,
  type AdminShopSection,
} from "../lib/admin-shop-structure-client";

type CategoryForm = {
  description: string;
  is_active: boolean;
  label: string;
  slug: string;
  sort_order: string;
};

type SectionForm = {
  body: string;
  is_active: boolean;
  key: string;
  sort_order: string;
  subtitle: string;
  title: string;
};

const emptyCategory: CategoryForm = {
  description: "",
  is_active: true,
  label: "",
  slug: "",
  sort_order: "0",
};

const emptySection: SectionForm = {
  body: "",
  is_active: true,
  key: "",
  sort_order: "0",
  subtitle: "",
  title: "",
};

function categoryToForm(category: AdminShopCategory): CategoryForm {
  return {
    description: category.description || "",
    is_active: category.is_active !== false,
    label: category.label || "",
    slug: category.value || "",
    sort_order: String(category.sort_order || 0),
  };
}

function sectionToForm(section: AdminShopSection): SectionForm {
  return {
    body: section.body || "",
    is_active: section.is_active !== false,
    key: section.key || "",
    sort_order: String(section.sort_order || 0),
    subtitle: section.subtitle || "",
    title: section.title || "",
  };
}

export function AdminShopStructurePanel() {
  const [categories, setCategories] = useState<AdminShopCategory[]>([]);
  const [sections, setSections] = useState<AdminShopSection[]>([]);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategory);
  const [sectionForm, setSectionForm] = useState<SectionForm>(emptySection);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("Caricamento struttura shop.");
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) || null,
    [categories, selectedCategoryId],
  );
  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) || null,
    [sections, selectedSectionId],
  );

  const refreshStructure = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [nextCategories, nextSections] = await Promise.all([
        listAdminShopCategories(),
        listAdminShopSections(),
      ]);
      setCategories(nextCategories);
      setSections(nextSections);
      setMessage(`Struttura shop caricata: ${nextCategories.length} categorie, ${nextSections.length} sezioni.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossibile caricare la struttura shop.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStructure();
  }, [refreshStructure]);

  function startCategoryCreate() {
    setSelectedCategoryId(null);
    setCategoryForm(emptyCategory);
  }

  function startSectionCreate() {
    setSelectedSectionId(null);
    setSectionForm(emptySection);
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        description: categoryForm.description.trim() || null,
        is_active: categoryForm.is_active,
        label: categoryForm.label.trim(),
        slug: categoryForm.slug.trim() || undefined,
        sort_order: Number(categoryForm.sort_order || 0),
      };
      const category = selectedCategory
        ? await updateAdminShopCategory(undefined, selectedCategory.id, payload)
        : await createAdminShopCategory(undefined, payload);
      await refreshStructure();
      setSelectedCategoryId(category.id);
      setCategoryForm(categoryToForm(category));
      setMessage(selectedCategory ? "Categoria aggiornata." : "Categoria creata.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Salvataggio categoria non riuscito.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        body: sectionForm.body.trim() || null,
        is_active: sectionForm.is_active,
        key: sectionForm.key.trim() || undefined,
        sort_order: Number(sectionForm.sort_order || 0),
        subtitle: sectionForm.subtitle.trim() || null,
        title: sectionForm.title.trim(),
      };
      const section = selectedSection
        ? await updateAdminShopSection(undefined, selectedSection.id, payload)
        : await createAdminShopSection(undefined, payload);
      await refreshStructure();
      setSelectedSectionId(section.id);
      setSectionForm(sectionToForm(section));
      setMessage(selectedSection ? "Sezione aggiornata." : "Sezione creata.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Salvataggio sezione non riuscito.");
    } finally {
      setIsSaving(false);
    }
  }

  async function softDeleteCategory() {
    if (!selectedCategory) return;
    if (!window.confirm(`Disattivare categoria ${selectedCategory.label}?`)) return;
    setIsSaving(true);
    try {
      const category = await deleteAdminShopCategory(undefined, selectedCategory.id);
      await refreshStructure();
      setSelectedCategoryId(category.id);
      setCategoryForm(categoryToForm(category));
      setMessage("Categoria disattivata.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Disattivazione categoria non riuscita.");
    } finally {
      setIsSaving(false);
    }
  }

  async function softDeleteSection() {
    if (!selectedSection) return;
    if (!window.confirm(`Disattivare sezione ${selectedSection.title}?`)) return;
    setIsSaving(true);
    try {
      const section = await deleteAdminShopSection(undefined, selectedSection.id);
      await refreshStructure();
      setSelectedSectionId(section.id);
      setSectionForm(sectionToForm(section));
      setMessage("Sezione disattivata.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Disattivazione sezione non riuscita.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="missing-panel admin-shop-structure" aria-labelledby="admin-shop-structure-title">
      <div className="admin-panel-heading">
        <div>
          <h2 id="admin-shop-structure-title">Struttura shop</h2>
          <p>Gestisci categorie e sezioni pubblicate nello shop.</p>
        </div>
        <span className="status-badge">Gestione attiva</span>
      </div>

      <p className="admin-inline-note">{error || message}</p>

      <>
          <div className="admin-form-actions">
            <button className="ghost-button" disabled={isLoading} onClick={() => refreshStructure()} type="button">
              {isLoading ? "Caricamento..." : "Aggiorna struttura"}
            </button>
          </div>

          <div className="admin-crud-grid admin-crud-grid--structure">
            <div className="admin-products-list">
              <div className="admin-form-actions">
                <h3>Categorie</h3>
                <button className="primary-button" onClick={startCategoryCreate} type="button">Nuova categoria</button>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Nome</th><th>Slug</th><th>Ordine</th><th>Stato</th><th>Azione</th></tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td>{category.label}</td>
                        <td>{category.value}</td>
                        <td>{category.sort_order ?? 0}</td>
                        <td>{category.is_active === false ? "Disattiva" : "Attiva"}</td>
                        <td><button className="mini-button" onClick={() => { setSelectedCategoryId(category.id); setCategoryForm(categoryToForm(category)); }} type="button">Modifica</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!categories.length ? <p>Nessuna categoria restituita.</p> : null}

              <form className="admin-product-form" onSubmit={saveCategory}>
                <h3>{selectedCategory ? "Modifica categoria" : "Crea categoria"}</h3>
                <label><span>Nome visibile</span><input className="contact-form__input" required value={categoryForm.label} onChange={(event) => setCategoryForm((current) => ({ ...current, label: event.target.value }))} /></label>
                <label><span>Slug</span><input className="contact-form__input" value={categoryForm.slug} onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))} /></label>
                <label><span>Descrizione</span><textarea className="contact-form__input" rows={3} value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} /></label>
                <div className="admin-form-row">
                  <label><span>Ordine</span><input className="contact-form__input" type="number" value={categoryForm.sort_order} onChange={(event) => setCategoryForm((current) => ({ ...current, sort_order: event.target.value }))} /></label>
                  <label className="admin-checkbox"><input checked={categoryForm.is_active} onChange={(event) => setCategoryForm((current) => ({ ...current, is_active: event.target.checked }))} type="checkbox" /><span>Attiva</span></label>
                </div>
                <div className="admin-form-actions">
                  <button className="primary-button" disabled={isSaving} type="submit">{isSaving ? "Salvataggio..." : "Salva categoria"}</button>
                  <button className="ghost-button" onClick={startCategoryCreate} type="button">Annulla</button>
                  <button className="outline-button" disabled={!selectedCategory || isSaving} onClick={softDeleteCategory} type="button">Disattiva</button>
                </div>
              </form>
            </div>

            <div className="admin-products-list">
              <div className="admin-form-actions">
                <h3>Sezioni</h3>
                <button className="primary-button" onClick={startSectionCreate} type="button">Nuova sezione</button>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Titolo</th><th>Key</th><th>Ordine</th><th>Stato</th><th>Azione</th></tr>
                  </thead>
                  <tbody>
                    {sections.map((section) => (
                      <tr key={section.id}>
                        <td>{section.title}</td>
                        <td>{section.key}</td>
                        <td>{section.sort_order ?? 0}</td>
                        <td>{section.is_active === false ? "Disattiva" : "Attiva"}</td>
                        <td><button className="mini-button" onClick={() => { setSelectedSectionId(section.id); setSectionForm(sectionToForm(section)); }} type="button">Modifica</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!sections.length ? <p>Nessuna sezione restituita.</p> : null}

              <form className="admin-product-form" onSubmit={saveSection}>
                <h3>{selectedSection ? "Modifica sezione" : "Crea sezione"}</h3>
                <label><span>Titolo</span><input className="contact-form__input" required value={sectionForm.title} onChange={(event) => setSectionForm((current) => ({ ...current, title: event.target.value }))} /></label>
                <label><span>Key</span><input className="contact-form__input" value={sectionForm.key} onChange={(event) => setSectionForm((current) => ({ ...current, key: event.target.value }))} /></label>
                <label><span>Sottotitolo</span><input className="contact-form__input" value={sectionForm.subtitle} onChange={(event) => setSectionForm((current) => ({ ...current, subtitle: event.target.value }))} /></label>
                <label><span>Testo</span><textarea className="contact-form__input" rows={3} value={sectionForm.body} onChange={(event) => setSectionForm((current) => ({ ...current, body: event.target.value }))} /></label>
                <div className="admin-form-row">
                  <label><span>Ordine</span><input className="contact-form__input" type="number" value={sectionForm.sort_order} onChange={(event) => setSectionForm((current) => ({ ...current, sort_order: event.target.value }))} /></label>
                  <label className="admin-checkbox"><input checked={sectionForm.is_active} onChange={(event) => setSectionForm((current) => ({ ...current, is_active: event.target.checked }))} type="checkbox" /><span>Attiva</span></label>
                </div>
                <div className="admin-form-actions">
                  <button className="primary-button" disabled={isSaving} type="submit">{isSaving ? "Salvataggio..." : "Salva sezione"}</button>
                  <button className="ghost-button" onClick={startSectionCreate} type="button">Annulla</button>
                  <button className="outline-button" disabled={!selectedSection || isSaving} onClick={softDeleteSection} type="button">Disattiva</button>
                </div>
              </form>
            </div>
          </div>
      </>
    </section>
  );
}
