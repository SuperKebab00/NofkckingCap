"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_ORDER_STATUSES,
  getAdminOrder,
  listAdminOrders,
  updateAdminOrderStatus,
  type AdminOrder,
  type AdminOrderItem,
  type AdminOrderStatus,
} from "../lib/admin-orders-client";

const currencyFormatter = new Intl.NumberFormat("it-IT", {
  currency: "EUR",
  style: "currency",
});

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatCurrency(value: unknown) {
  const numeric = Number(value || 0);
  return currencyFormatter.format(Number.isFinite(numeric) ? numeric : 0);
}

function formatDate(value: unknown) {
  const raw = String(value || "");
  if (!raw) return "n/d";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : dateFormatter.format(date);
}

function normalizeStatus(value: unknown): AdminOrderStatus {
  const status = String(value || "prenotato");
  return ADMIN_ORDER_STATUSES.includes(status as AdminOrderStatus)
    ? (status as AdminOrderStatus)
    : "prenotato";
}

function statusLabel(status: unknown) {
  const value = normalizeStatus(status);
  const labels: Record<AdminOrderStatus, string> = {
    annullato: "Annullato",
    "in-lavorazione": "In preparazione",
    prenotato: "Prenotato",
    "pronto-al-ritiro": "Pronto per il ritiro",
    ritirato: "Completato",
  };
  return labels[value];
}

function paymentLabel() {
  return "Pagamento in sede";
}

function fulfillmentLabel() {
  return "Ritiro in negozio";
}

function itemName(item: AdminOrderItem) {
  return item.product_name_snapshot || item.product_name || "Prodotto";
}

function itemUnitPrice(item: AdminOrderItem) {
  return item.unit_price_snapshot ?? item.unit_price ?? 0;
}

function itemTotal(item: AdminOrderItem) {
  return item.total_price_snapshot ?? item.line_total ?? 0;
}

export function AdminOrdersPanel() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [statusDraft, setStatusDraft] = useState<AdminOrderStatus>("prenotato");
  const [notesDraft, setNotesDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminOrderStatus | "">("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(
    "Caricamento ordini.",
  );
  const [error, setError] = useState<string | null>(null);

  const selectedFromList = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  );

  const refreshOrders = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);

      try {
        const nextOrders = await listAdminOrders(undefined, {
          pageSize: 50,
          search,
          status: statusFilter,
        });
        setOrders(nextOrders);
        setMessage(`Ordini caricati: ${nextOrders.length}.`);
      } catch (caught) {
        setOrders([]);
        setError(caught instanceof Error ? caught.message : "Impossibile caricare gli ordini.");
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter],
  );

  const loadOrderDetail = useCallback(
    async (orderId: string) => {
      setSelectedOrderId(orderId);
      setIsDetailLoading(true);
      setError(null);

      try {
        const order = await getAdminOrder(undefined, orderId);
        setSelectedOrder(order);
        setStatusDraft(normalizeStatus(order.status));
        setNotesDraft(order.notes || "");
        setMessage(`Dettaglio ordine ${order.order_number || order.id} caricato.`);
      } catch (caught) {
        setSelectedOrder(null);
        setError(caught instanceof Error ? caught.message : "Dettaglio ordine non disponibile.");
      } finally {
        setIsDetailLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void refreshOrders();
  }, [refreshOrders]);

  async function handleSaveStatus() {
    if (!selectedOrderId) {
      setError("Ordine mancante.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updated = await updateAdminOrderStatus(undefined, selectedOrderId, {
        notes: notesDraft.trim() || null,
        status: statusDraft,
      });
      await refreshOrders();
      await loadOrderDetail(updated.id || selectedOrderId);
      setMessage("Stato ordine aggiornato.");
    } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Aggiornamento stato ordine non riuscito.");
    } finally {
      setIsSaving(false);
    }
  }

  const detailOrder = selectedOrder || selectedFromList;
  const items = selectedOrder?.items || [];

  return (
    <section className="missing-panel admin-orders-panel" aria-labelledby="admin-orders-title">
      <div className="admin-panel-heading">
        <div>
          <h2 id="admin-orders-title">Ordini</h2>
          <p>
            Ordini creati dal checkout con ritiro in sede e pagamento al banco.
          </p>
        </div>
        <span className="status-badge">Ritiro in negozio</span>
      </div>

      <p className="admin-inline-note">{error || message}</p>

      <div className="admin-crud-grid admin-orders-grid">
          <div className="admin-products-list">
            <div className="admin-form-actions">
              <button
                className="ghost-button"
                disabled={isLoading}
                onClick={() => refreshOrders()}
                type="button"
              >
                {isLoading ? "Caricamento..." : "Aggiorna ordini"}
              </button>
              <span className="status-badge">{orders.length} ordini</span>
            </div>

            <div className="admin-form-row">
              <label>
                <span>Cerca</span>
                <input
                  className="contact-form__input"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Numero, cliente, email"
                  value={search}
                />
              </label>
              <label>
                <span>Stato</span>
                <select
                  className="contact-form__input"
                  onChange={(event) =>
                    setStatusFilter(event.target.value as AdminOrderStatus | "")
                  }
                  value={statusFilter}
                >
                  <option value="">Tutti</option>
                      {ADMIN_ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {orders.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table admin-orders-table">
                  <thead>
                    <tr>
                      <th>Ordine</th>
                      <th>Cliente</th>
                      <th>Stato</th>
                      <th>Totale</th>
                      <th>Data</th>
                      <th>Azione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>{order.order_number || order.id}</strong>
                          <small>{fulfillmentLabel()}</small>
                        </td>
                        <td>
                          {order.customer_name || "n/d"}
                          <small>{order.customer_email || order.customer_phone || ""}</small>
                        </td>
                        <td>{statusLabel(order.status)}</td>
                        <td>{formatCurrency(order.total)}</td>
                        <td>{formatDate(order.created_at)}</td>
                        <td>
                          <button
                            className="mini-button"
                            onClick={() => loadOrderDetail(order.id)}
                            type="button"
                          >
                            Dettaglio
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="status-card">
                <h3>{isLoading ? "Caricamento ordini" : "Lista vuota"}</h3>
                <p>
                  {isLoading
                    ? "Caricamento ordini..."
                    : "Nessun ordine trovato."}
                </p>
              </div>
            )}
          </div>

          <div className="admin-product-form admin-order-detail">
            <div className="admin-panel-heading">
              <div>
                <h3>Dettaglio ordine</h3>
                <p>
                  {detailOrder
                    ? detailOrder.order_number || detailOrder.id
                    : "Seleziona un ordine dalla lista"}
                </p>
              </div>
              <span className="status-badge">
                {isDetailLoading ? "Caricamento" : detailOrder ? statusLabel(detailOrder.status) : "n/d"}
              </span>
            </div>

            {detailOrder ? (
              <>
                <div className="admin-order-meta-grid">
                  <article className="status-card">
                    <h3>Cliente</h3>
                    <p>{detailOrder.customer_name || "n/d"}</p>
                    <p>{detailOrder.customer_email || "n/d"}</p>
                    <p>{detailOrder.customer_phone || "n/d"}</p>
                  </article>
                  <article className="status-card">
                    <h3>Ordine</h3>
                    <p>{fulfillmentLabel()}</p>
                    <p>{paymentLabel()}</p>
                    <p>{formatDate(detailOrder.created_at)}</p>
                  </article>
                </div>

                <div className="admin-form-row">
                  <label>
                    <span>Stato ordine</span>
                    <select
                      className="contact-form__input"
                      onChange={(event) => setStatusDraft(event.target.value as AdminOrderStatus)}
                      value={statusDraft}
                    >
                      {ADMIN_ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Totale</span>
                    <input
                      className="contact-form__input"
                      readOnly
                      value={formatCurrency(detailOrder.total)}
                    />
                  </label>
                </div>

                <label>
                  <span>Note interne</span>
                  <textarea
                    className="contact-form__input"
                    onChange={(event) => setNotesDraft(event.target.value)}
                    rows={3}
                    value={notesDraft}
                  />
                </label>

                <div className="admin-form-actions">
                  <button
                    className="primary-button"
                    disabled={isSaving}
                    onClick={handleSaveStatus}
                    type="button"
                  >
                    {isSaving ? "Salvataggio..." : "Salva stato"}
                  </button>
                  <button
                    className="ghost-button"
                    disabled={isDetailLoading}
                    onClick={() => detailOrder.id && loadOrderDetail(detailOrder.id)}
                    type="button"
                  >
                    Ricarica dettaglio
                  </button>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table admin-orders-items-table">
                    <thead>
                      <tr>
                        <th>Prodotto</th>
                        <th>Codice</th>
                        <th>Quantita</th>
                        <th>Unitario</th>
                        <th>Totale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id || `${itemName(item)}-${index}`}>
                          <td>{itemName(item)}</td>
                          <td>{item.product_sku_snapshot || "n/d"}</td>
                          <td>{item.quantity || 0}</td>
                          <td>{formatCurrency(itemUnitPrice(item))}</td>
                          <td>{formatCurrency(itemTotal(item))}</td>
                        </tr>
                      ))}
                      {!items.length ? (
                        <tr>
                          <td colSpan={5}>Nessuna riga ordine caricata.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="status-card">
                <h3>Nessun dettaglio</h3>
                <p>Apri un ordine per visualizzare cliente, righe e stato modificabile.</p>
              </div>
            )}
          </div>
      </div>
    </section>
  );
}
