"use client";

import Link from "next/link";
import { useState } from "react";

import { addCartItem } from "../lib/cart-storage";
import { productTeasers } from "../lib/static-content";

export type ShopProductCard = {
  category?: string | null;
  checkoutHref?: string;
  description?: string | null;
  id?: string;
  image: string | null;
  lifestyleUrl?: string | null;
  name: string;
  packshotUrl?: string | null;
  price?: number | string | null;
  stock?: number | null;
};

export type ShopProductGridProps = {
  products?: ShopProductCard[];
  showStock?: boolean;
};

const currencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

function formatPrice(price: ShopProductCard["price"]) {
  const numeric = Number(price || 0);
  return numeric > 0 ? currencyFormatter.format(numeric) : "Prezzo in shop";
}

function stockLabel(stock: ShopProductCard["stock"]) {
  if (stock === null || stock === undefined) return "Disponibile";
  if (stock <= 2) return "Ultimi 2!";
  return `${stock} disponibili`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function productId(product: ShopProductCard, index: number) {
  if (product.id?.trim()) return product.id.trim();
  if (product.checkoutHref) {
    try {
      const url = new URL(product.checkoutHref, "https://nocap.local");
      const requestedProduct = url.searchParams.get("product");
      if (requestedProduct) return requestedProduct;
    } catch {
      // Fall back to the visible name below.
    }
  }

  return slugify(product.name) || `product-${index}`;
}

export function ShopProductGrid({
  products = productTeasers,
  showStock = false,
}: ShopProductGridProps) {
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    name: string;
    quantity: number;
    state: "error" | "success";
  } | null>(null);

  const normalizedProducts = products.map((product, index) => ({
    ...product,
    category: product.category || "shop",
    description:
      product.description || "Prodotto No Cap selezionato dal catalogo barber.",
    id: productId(product, index),
    price: product.price ?? null,
  }));

  if (!normalizedProducts.length) {
    return (
      <div className="spotlight-card product-empty">
        <p className="eyebrow">Catalogo</p>
        <h3>Nessun prodotto trovato</h3>
        <p>Modifica ricerca o categoria per vedere altri prodotti.</p>
      </div>
    );
  }

  return (
    <div className="shop-cart-flow">
      {notice ? (
        <div
          aria-live="polite"
          className={`shop-cart-notice shop-cart-notice--${notice.state}`}
        >
          <div>
            <strong>
              {notice.state === "success"
                ? "Aggiunto al carrello"
                : "Non è stato possibile aggiungere il prodotto"}
            </strong>
            <span>
              {notice.name}
              {notice.state === "success" ? ` · Quantita ${notice.quantity}` : ""}
            </span>
          </div>
          {notice.state === "success" ? (
            <div className="shop-cart-notice__actions">
              <button className="ghost-button" onClick={() => setNotice(null)} type="button">
                Continua nello shop
              </button>
              <Link className="primary-button" href="/checkout">
                Vai al carrello
              </Link>
            </div>
          ) : (
            <button className="ghost-button" onClick={() => setNotice(null)} type="button">
              Chiudi
            </button>
          )}
        </div>
      ) : null}

    <div className="product-grid">
      {normalizedProducts.map((product) => {
        const fallbackImage = "/Img/products/black-wax-packshot-opt.webp";
        const packshotImage = product.packshotUrl || product.image || fallbackImage;
        const lifestyleImage = product.lifestyleUrl || packshotImage;
        const hasLifestyle = lifestyleImage !== packshotImage;
        const isPending = pendingProductId === product.id;

        function handleAddToCart() {
          if (!product.id || isPending) return;
          setPendingProductId(product.id);

          try {
            const cart = addCartItem(product.id);
            const quantity =
              cart.find((item) => item.productId === product.id)?.quantity ?? 1;
            setNotice({
              name: product.name,
              quantity,
              state: "success",
            });
          } catch {
            setNotice({
              name: product.name,
              quantity: 0,
              state: "error",
            });
          } finally {
            window.setTimeout(() => setPendingProductId(null), 250);
          }
        }

        return (
          <article className="product-card" key={product.name}>
            <div className="product-media" data-has-lifestyle={hasLifestyle}>
              <img
                src={packshotImage}
                alt={`${product.name} packshot prodotto`}
                loading="lazy"
              />
              <img
                src={lifestyleImage}
                alt={`${product.name} risultato sui capelli`}
                loading="lazy"
                aria-hidden={!hasLifestyle}
              />
            </div>
            <div className="product-card__meta">
              <span>{product.category}</span>
              <small>{showStock ? stockLabel(product.stock) : "Disponibile"}</small>
            </div>
            <h3>{product.name}</h3>
            <p className="product-card__copy">{product.description}</p>
            <div className="product-card__price">{formatPrice(product.price)}</div>
            <div className="product-card__actions">
              <span className="stock-badge">
                {showStock ? stockLabel(product.stock) : "Disponibile"}
              </span>
              <button
                className="primary-button"
                disabled={isPending}
                onClick={handleAddToCart}
                type="button"
              >
                {isPending ? "Aggiunta..." : "Aggiungi al carrello"}
              </button>
            </div>
            <button className="product-media-toggle" disabled={!hasLifestyle} type="button">
              {hasLifestyle ? "Vedi risultato" : "Solo prodotto"}
            </button>
          </article>
        );
      })}
    </div>
    </div>
  );
}
