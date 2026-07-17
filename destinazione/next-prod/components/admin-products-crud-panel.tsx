"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createAdminProduct,
  deleteAdminProduct,
  listAdminProducts,
  permanentlyDeleteAdminProduct,
  updateAdminProduct,
  type AdminProduct,
  type AdminProductPayload,
} from "../lib/admin-products-client";

type ProductFormState = {
  badge: string;
  category: string;
  description: string;
  image_url: string;
  is_active: boolean;
  name: string;
  price: string;
  slug: string;
  sort_order: string;
  status: string;
  stock_quantity: string;
};

const emptyForm: ProductFormState = {
  badge: "",
  category: "",
  description: "",
  image_url: "",
  is_active: true,
  name: "",
  price: "0",
  slug: "",
  sort_order: "0",
  status: "active",
  stock_quantity: "0",
};

const currencyFormatter = new Intl.NumberFormat("it-IT", {
  currency: "EUR",
  style: "currency",
});

function formatPrice(value: AdminProduct["price"]) {
  const numeric = Number(value || 0);
  return currencyFormatter.format(Number.isFinite(numeric) ? numeric : 0);
}

function fieldValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function formatProductState(product: AdminProduct) {
  if (product.status === "archived") return "Archiviato";
  if (product.is_active === false) return "Disattivato";
  if (product.status === "sold_out") return "Esaurito";
  if (product.status === "draft") return "Bozza";
  return "Attivo";
}

function productToForm(product: AdminProduct): ProductFormState {
  return {
    badge: fieldValue(product.badge),
    category: fieldValue(product.category),
    description: fieldValue(product.description),
    image_url: fieldValue(product.image_url),
    is_active: product.is_active !== false,
    name: fieldValue(product.name),
    price: fieldValue(product.price || 0),
    slug: fieldValue(product.slug),
    sort_order: fieldValue(product.sort_order || 0),
    status: fieldValue(product.status || "active"),
    stock_quantity: fieldValue(product.stock_quantity ?? product.stock ?? 0),
  };
}

function buildPayload(form: ProductFormState): AdminProductPayload {
  return {
    badge: form.badge.trim() || null,
    category: form.category.trim() || null,
    description: form.description.trim(),
    image_url: form.image_url.trim() || null,
    is_active: form.is_active,
    name: form.name.trim(),
    price: Number(form.price || 0),
    slug: form.slug.trim() || undefined,
    sort_order: Number(form.sort_order || 0),
    status: form.status,
    stock_quantity: Number(form.stock_quantity || 0),
  };
}

export function AdminProductsCrudPanel({ canPermanentDelete = false }: { canPermanentDelete?: boolean }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("Caricamento prodotti.");
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  const refreshProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextProducts = await listAdminProducts();
      setProducts(nextProducts);
      setMessage(`Prodotti caricati: ${nextProducts.length}.`);
    } catch (caught) {
      setProducts([]);
      setError(caught instanceof Error ? caught.message : "Impossibile caricare i prodotti.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProducts();
  }, [refreshProducts]);

  function updateField<K extends keyof ProductFormState>(
    field: K,
    value: ProductFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startCreate() {
    setSelectedProductId(null);
    setForm(emptyForm);
    setError(null);
    setMessage("Nuovo prodotto: compila i campi principali e salva.");
  }

  function startEdit(product: AdminProduct) {
    setSelectedProductId(product.id);
    setForm(productToForm(product));
    setError(null);
    setMessage(`Modifica prodotto: ${product.name}.`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const payload = buildPayload(form);
      const savedProduct = selectedProduct
        ? await updateAdminProduct(undefined, selectedProduct.id, payload)
        : await createAdminProduct(undefined, payload);

      await refreshProducts();
      setSelectedProductId(savedProduct.id);
      setForm(productToForm(savedProduct));
      setMessage(selectedProduct ? "Prodotto aggiornato." : "Prodotto creato.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Salvataggio prodotto non riuscito.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSoftDelete() {
    if (!selectedProduct) return;

    const confirmed = window.confirm(
      `Disattivare ${selectedProduct.name}? Il prodotto restera nello storico ma sparira dal pubblico.`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setError(null);

    try {
      const deletedProduct = await deleteAdminProduct(undefined, selectedProduct.id);
      await refreshProducts();
      setSelectedProductId(deletedProduct.id);
      setForm(productToForm(deletedProduct));
      setMessage("Prodotto disattivato.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Soft delete non riuscito.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePermanentDelete() {
    if (!selectedProduct) return;
    const confirmed = window.confirm(
      `Eliminare definitivamente ${selectedProduct.name}? Questa azione rimuove il prodotto e le immagini non usate da altri prodotti.`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setError(null);

    try {
      const result = await permanentlyDeleteAdminProduct(undefined, selectedProduct.id);
      await refreshProducts();
      startCreate();
      setMessage(`Prodotto eliminato definitivamente. Foto rimosse: ${result.deleted_files || 0}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Eliminazione definitiva non riuscita.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="missing-panel admin-products-crud" aria-labelledby="admin-products-crud-title">
      <div className="admin-panel-heading">
        <div>
          <h2 id="admin-products-crud-title">Prodotti</h2>
          <p>
            Crea, aggiorna e organizza i prodotti pubblicati nello shop.
          </p>
        </div>
        <span className="status-badge">
          Catalogo attivo
        </span>
      </div>

      <p className="admin-inline-note">{error || message}</p>

      <div className="admin-crud-grid">
          <div className="admin-products-list">
            <div className="admin-form-actions">
              <button className="ghost-button" disabled={isLoading} onClick={() => refreshProducts()} type="button">
                {isLoading ? "Caricamento..." : "Aggiorna prodotti"}
              </button>
              <button className="primary-button" onClick={startCreate} type="button">
                Nuovo prodotto
              </button>
            </div>

            {products.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Categoria</th>
                      <th>Prezzo</th>
                      <th>Stock</th>
                      <th>Stato</th>
                      <th>Azione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.category || "n/d"}</td>
                        <td>{formatPrice(product.price)}</td>
                        <td>{product.stock_quantity ?? product.stock ?? 0}</td>
                        <td>{formatProductState(product)}</td>
                        <td>
                          <button className="mini-button" onClick={() => startEdit(product)} type="button">
                            Modifica
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="status-card">
                <h3>Lista vuota</h3>
                <p>
                  {isLoading
                    ? "Caricamento prodotti..."
                    : "Nessun prodotto trovato."}
                </p>
              </div>
            )}
          </div>

          <form className="admin-product-form" onSubmit={handleSubmit}>
            <div className="admin-panel-heading">
              <div>
                <h3>{selectedProduct ? "Modifica prodotto" : "Crea prodotto"}</h3>
                <p>{selectedProduct ? "Modifica il prodotto selezionato." : "Aggiungi un prodotto allo shop."}</p>
              </div>
              <span className="status-badge">
                {form.is_active ? "Attivo" : "Disattivo"}
              </span>
            </div>

            <label>
              <span>Nome</span>
              <input
                className="contact-form__input"
                onChange={(event) => updateField("name", event.target.value)}
                required
                value={form.name}
              />
            </label>

            <div className="admin-form-row">
              <label>
                <span>Slug</span>
                <input
                  className="contact-form__input"
                  onChange={(event) => updateField("slug", event.target.value)}
                  placeholder="generato se vuoto"
                  value={form.slug}
                />
              </label>

              <label>
                <span>Categoria</span>
                <input
                  className="contact-form__input"
                  onChange={(event) => updateField("category", event.target.value)}
                  value={form.category}
                />
              </label>
            </div>

            <label>
              <span>Descrizione</span>
              <textarea
                className="contact-form__input"
                onChange={(event) => updateField("description", event.target.value)}
                rows={4}
                value={form.description}
              />
            </label>

            <div className="admin-form-row">
              <label>
                <span>Prezzo</span>
                <input
                  className="contact-form__input"
                  min="0"
                  onChange={(event) => updateField("price", event.target.value)}
                  step="0.01"
                  type="number"
                  value={form.price}
                />
              </label>

              <label>
                <span>Stock</span>
                <input
                  className="contact-form__input"
                  min="0"
                  onChange={(event) => updateField("stock_quantity", event.target.value)}
                  step="1"
                  type="number"
                  value={form.stock_quantity}
                />
              </label>
            </div>

            <label>
              <span>Immagine</span>
              <input
                className="contact-form__input"
                onChange={(event) => updateField("image_url", event.target.value)}
                placeholder="/Img/products/..."
                value={form.image_url}
              />
            </label>

            <div className="admin-form-row">
              <label>
                <span>Badge</span>
                <input
                  className="contact-form__input"
                  onChange={(event) => updateField("badge", event.target.value)}
                  value={form.badge}
                />
              </label>

              <label>
                <span>Stato catalogo</span>
                <select
                  className="contact-form__input"
                  onChange={(event) => updateField("status", event.target.value)}
                  value={form.status}
                >
                  <option value="active">Attivo</option>
                  <option value="draft">Bozza</option>
                  <option value="archived">Archiviato</option>
                  <option value="sold_out">Esaurito</option>
                </select>
              </label>
            </div>

            <div className="admin-form-row">
              <label>
                <span>Ordine visualizzazione</span>
                <input
                  className="contact-form__input"
                  onChange={(event) => updateField("sort_order", event.target.value)}
                  step="1"
                  type="number"
                  value={form.sort_order}
                />
              </label>

              <label className="admin-checkbox">
                <input
                  checked={form.is_active}
                  onChange={(event) => updateField("is_active", event.target.checked)}
                  type="checkbox"
                />
                <span>Prodotto attivo</span>
              </label>
            </div>

            <div className="admin-form-actions">
              <button className="primary-button" disabled={isSaving} type="submit">
                {isSaving ? "Salvataggio..." : selectedProduct ? "Salva modifiche" : "Crea prodotto"}
              </button>
              <button className="ghost-button" onClick={startCreate} type="button">
                Annulla
              </button>
              <button
                className="outline-button"
                disabled={!selectedProduct || isSaving}
                onClick={handleSoftDelete}
                type="button"
              >
                Disattiva
              </button>
              {canPermanentDelete ? (
                <button
                  className="outline-button"
                  disabled={!selectedProduct || isSaving}
                  onClick={handlePermanentDelete}
                  type="button"
                >
                  Elimina definitivamente
                </button>
              ) : null}
            </div>
          </form>
      </div>
    </section>
  );
}
