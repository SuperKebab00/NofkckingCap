"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  buildCheckoutContactHref,
  CHECKOUT_FLOW_COPY,
  findCheckoutProduct,
  formatCheckoutPrice,
} from "../lib/public-flow";

export type CheckoutInShopProduct = {
  category: string | null;
  checkoutHref: string;
  contactHref: string;
  description?: string | null;
  image: string | null;
  name: string;
  price?: number | string | null;
};

type CheckoutInShopProps = {
  products: CheckoutInShopProduct[];
};

export function CheckoutInShop({ products }: CheckoutInShopProps) {
  const searchParams = useSearchParams();
  const [quantity, setQuantity] = useState(1);

  const requestedProduct = searchParams.get("product") || "";

  const selectedProduct = useMemo(() => {
    return findCheckoutProduct(products, requestedProduct);
  }, [products, requestedProduct]);

  const suggestedProducts = useMemo(() => products.slice(0, 3), [products]);

  const selectedPrice = useMemo(
    () => formatCheckoutPrice(selectedProduct?.price ?? null),
    [selectedProduct],
  );

  useEffect(() => {
    setQuantity(1);
  }, [requestedProduct]);

  return (
    <section className="section checkout-page">
      <div className="checkout-page__intro">
        <p className="eyebrow">Checkout in shop</p>
        <h2>Primo slice reale del flusso in-shop</h2>
        <p>
          Qui puoi preparare un riepilogo leggero dell&apos;intenzione di acquisto.
          Pagamento, conferma ordine e gestione operativa restano fuori dalla
          shell Next e avvengono in negozio o tramite contatto diretto.
        </p>
      </div>

      <div className="checkout-panels">
        <section className="missing-panel" aria-labelledby="checkout-selection">
          <p className="eyebrow">Selezione</p>
          <h2 id="checkout-selection">
            {selectedProduct ? "Prodotto selezionato" : "Nessun prodotto selezionato"}
          </h2>

          {selectedProduct ? (
            <div style={{ display: "grid", gap: "1rem" }}>
              {selectedProduct.image ? (
                <img
                  alt={`${selectedProduct.name} packshot`}
                  src={selectedProduct.image}
                  style={{
                    aspectRatio: "4 / 3",
                    borderRadius: "20px",
                    objectFit: "cover",
                    width: "100%",
                  }}
                />
              ) : null}

              <div>
                <p className="eyebrow" style={{ marginBottom: "0.5rem" }}>
                  {selectedProduct.category || "Prodotto"}
                </p>
                <h3 style={{ marginTop: 0 }}>{selectedProduct.name}</h3>
                {selectedPrice ? (
                  <p style={{ marginBottom: "0.5rem" }}>
                    Prezzo indicativo pubblico: <strong>{selectedPrice}</strong>
                  </p>
                ) : null}
                <p>
                  {selectedProduct.description ||
                    "Riferimento pubblico pronto per il ritiro o acquisto in negozio."}
                </p>
              </div>

              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <span>Quantita indicativa</span>
                <button
                  className="ghost-button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  -
                </button>
                <strong>{quantity}</strong>
                <button
                  className="ghost-button"
                  onClick={() => setQuantity((current) => current + 1)}
                  type="button"
                >
                  +
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                <a href={selectedProduct.contactHref}>Chiedi disponibilita o prenota in negozio</a>
                <a className="ghost-button" href="/shop">
                  Cambia prodotto
                </a>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              <p>
                {CHECKOUT_FLOW_COPY.emptyStateBody}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                <a href="/shop">Torna allo shop</a>
                <a className="ghost-button" href={buildCheckoutContactHref()}>
                  Contattaci direttamente
                </a>
              </div>
            </div>
          )}
        </section>

        <section className="missing-panel" aria-labelledby="checkout-summary">
          <p className="eyebrow">Riepilogo</p>
          <h2 id="checkout-summary">Cosa succede in questa fase</h2>
          <ul>
            <li>Il pagamento online non parte da questa pagina.</li>
            <li>Nessun ordine reale viene inviato o scritto su database.</li>
            <li>
              Il riepilogo serve a preparare il contatto per ritiro o acquisto in
              negozio.
            </li>
            {selectedProduct ? (
              <li>
                Intenzione attuale: {quantity} x {selectedProduct.name}.
              </li>
            ) : (
              <li>Seleziona un prodotto dallo shop per vedere un riepilogo piu mirato.</li>
            )}
          </ul>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <a
              href={
                selectedProduct?.contactHref || buildCheckoutContactHref()
              }
            >
              Chiedi disponibilita o prenota in negozio
            </a>
            <a className="ghost-button" href="/shop">
              Modifica selezione
            </a>
          </div>
          <p className="admin-inline-note" style={{ marginTop: "0.75rem" }}>
            {CHECKOUT_FLOW_COPY.noAutomaticOrderNote}
          </p>
        </section>
      </div>

      <section className="section" style={{ paddingBottom: 0, paddingInline: 0 }}>
        <div className="section-heading">
          <p className="eyebrow">Suggerimenti</p>
          <h2>Prodotti rapidi da portare nel checkout in shop</h2>
          <p>
            Questi link aggiornano solo il riferimento pubblico nella shell Next. Non
            creano carrello persistente e non inviano dati.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {suggestedProducts.map((product) => (
            <article className="spotlight-card" key={product.name}>
              <p className="eyebrow">{product.category || "Prodotto"}</p>
              <h3>{product.name}</h3>
              <p>
                {product.description ||
                  "Porta questo prodotto nel riepilogo in-shop per discuterne in negozio."}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                <a href={product.checkoutHref}>Usa nel checkout in shop</a>
                <a className="ghost-button" href={product.contactHref}>
                  Chiedi disponibilita
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
