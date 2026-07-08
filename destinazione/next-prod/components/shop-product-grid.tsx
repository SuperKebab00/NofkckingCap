import Link from "next/link";

import { buildShopCheckoutHref } from "../lib/public-flow";
import { productTeasers } from "../lib/static-content";

export type ShopProductCard = {
  category?: string | null;
  checkoutHref?: string;
  description?: string | null;
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

export function ShopProductGrid({
  products = productTeasers,
  showStock = false,
}: ShopProductGridProps) {
  const normalizedProducts = products.map((product) => ({
    ...product,
    category: product.category || "shop",
    description:
      product.description || "Prodotto No Cap selezionato dal catalogo barber.",
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
    <div className="product-grid">
      {normalizedProducts.map((product) => {
        const fallbackImage = "/Img/products/black-wax-packshot-opt.webp";
        const packshotImage = product.packshotUrl || product.image || fallbackImage;
        const lifestyleImage = product.lifestyleUrl || packshotImage;
        const hasLifestyle = lifestyleImage !== packshotImage;

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
              <Link
                className="primary-button"
                href={product.checkoutHref || buildShopCheckoutHref(product.name)}
              >
                Aggiungi
              </Link>
            </div>
            <button className="product-media-toggle" disabled={!hasLifestyle} type="button">
              {hasLifestyle ? "Vedi risultato" : "Solo prodotto"}
            </button>
          </article>
        );
      })}
    </div>
  );
}
