import Link from "next/link";

import { buildShopCheckoutHref } from "../lib/public-flow";
import { productTeasers } from "../lib/static-content";

export type ShopProductCard = {
  category?: string | null;
  checkoutHref?: string;
  description?: string | null;
  image: string | null;
  name: string;
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
      {normalizedProducts.map((product) => (
        <article className="product-card" key={product.name}>
          <img
            src={product.image || "/Img/products/black-wax-packshot-opt.webp"}
            alt={product.name}
            loading="lazy"
          />
          <div className="product-card__meta">
            <span>{product.category}</span>
            {showStock ? <small>{stockLabel(product.stock)}</small> : null}
          </div>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
          <strong className="product-card__price">{formatPrice(product.price)}</strong>
          <div className="product-card__actions">
            <Link
              className="primary-button"
              href={product.checkoutHref || buildShopCheckoutHref(product.name)}
            >
              Aggiungi
            </Link>
            <Link
              className="outline-button"
              href={product.checkoutHref || buildShopCheckoutHref(product.name)}
            >
              Vedi risultato
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
