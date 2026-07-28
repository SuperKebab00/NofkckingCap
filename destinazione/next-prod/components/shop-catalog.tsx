"use client";

import { useMemo, useState } from "react";
import type { PublicShopCategory } from "../lib/supabase-public";
import type { ShopProductCard } from "./shop-product-grid";
import { ShopProductGrid } from "./shop-product-grid";

type SortMode =
  | "available"
  | "featured"
  | "low-stock"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc";

type ShopCatalogProps = {
  categories: PublicShopCategory[];
  products: ShopProductCard[];
  showStock?: boolean;
};

function getSortablePrice(product: ShopProductCard): number | null {
  const price = Number(product.price);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function getStockValue(product: ShopProductCard): number | null {
  if (product.stock === null || product.stock === undefined) return null;
  const stock = Number(product.stock);
  return Number.isFinite(stock) ? stock : null;
}

export function ShopCatalog({
  categories,
  products,
  showStock = false,
}: ShopCatalogProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("featured");

  const availableCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          typeof category.value === "string" &&
          category.value.trim().length > 0 &&
          typeof category.label === "string" &&
          category.label.trim().length > 0,
      ),
    [categories],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedCategory = activeCategory.trim().toLowerCase();

    let results = products.filter((product) => {
      const matchesCategory =
        !normalizedCategory ||
        (product.category || "").trim().toLowerCase() === normalizedCategory;

      const haystack = [
        product.name,
        product.category || "",
        product.description || "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });

    if (sortMode === "available") {
      results = results.filter((product) => {
        const stock = getStockValue(product);
        return stock === null || stock > 0;
      });
    }

    if (sortMode === "low-stock") {
      results = results.filter((product) => {
        const stock = getStockValue(product);
        return stock !== null && stock > 0 && stock <= 2;
      });
    }

    if (sortMode === "name-asc") {
      return [...results].sort((left, right) => left.name.localeCompare(right.name));
    }

    if (sortMode === "name-desc") {
      return [...results].sort((left, right) => right.name.localeCompare(left.name));
    }

    if (sortMode === "price-asc") {
      return [...results].sort((left, right) => {
        const leftPrice = getSortablePrice(left) ?? Number.POSITIVE_INFINITY;
        const rightPrice = getSortablePrice(right) ?? Number.POSITIVE_INFINITY;
        return leftPrice - rightPrice;
      });
    }

    if (sortMode === "price-desc") {
      return [...results].sort((left, right) => {
        const leftPrice = getSortablePrice(left) ?? Number.NEGATIVE_INFINITY;
        const rightPrice = getSortablePrice(right) ?? Number.NEGATIVE_INFINITY;
        return rightPrice - leftPrice;
      });
    }

    return results;
  }, [activeCategory, products, query, sortMode]);

  const hasProducts = products.length > 0;
  const hasVisibleProducts = filteredProducts.length > 0;

  return (
    <>
      <div className="category-bar" aria-label="Categorie prodotti">
        <button
          className={`category-pill ${activeCategory ? "" : "is-active"}`}
          onClick={() => setActiveCategory("")}
          type="button"
        >
          All products
        </button>
        {availableCategories.map((category) => {
          const isActive = activeCategory === category.value;

          return (
            <button
              className={`category-pill ${isActive ? "is-active" : ""}`}
              key={category.value}
              onClick={() => setActiveCategory(isActive ? "" : category.value)}
              type="button"
            >
              {category.label}
            </button>
          );
        })}
      </div>

      <section className="shop-section" aria-labelledby="shop-catalog-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Prodotti</p>
            <h2 id="shop-catalog-title">Catalogo professionale</h2>
          </div>
          <p>Scopri prodotti disponibili e ultimi pezzi.</p>
        </div>

        <div className="shop-tools">
          <label>
            Cerca
            <input
              aria-label="Cerca un prodotto"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca prodotto..."
              type="search"
              value={query}
            />
          </label>

          <label>
            Ordina
            <select
              aria-label="Ordina catalogo"
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              value={sortMode}
            >
              <option value="featured">Consigliati</option>
              <option value="price-asc">Prezzo crescente</option>
              <option value="price-desc">Prezzo decrescente</option>
              <option value="available">Solo disponibili</option>
              <option value="low-stock">Ultimi pezzi</option>
              <option value="name-asc">Nome A-Z</option>
              <option value="name-desc">Nome Z-A</option>
            </select>
          </label>
        </div>

      {!hasProducts ? (
        <div className="showcase-empty">
          <p className="eyebrow">Catalogo</p>
          <strong>Prodotti non disponibili al momento</strong>
          <span>Al momento non ci sono prodotti disponibili.</span>
        </div>
      ) : hasVisibleProducts ? (
        <ShopProductGrid products={filteredProducts} showStock={showStock} />
      ) : (
        <div className="showcase-empty">
          <p className="eyebrow">Nessun risultato</p>
          <strong>Nessun prodotto corrisponde ai filtri selezionati.</strong>
          <div className="shop-reset-actions">
            <button className="ghost-button" onClick={() => setQuery("")} type="button">
              Azzera ricerca
            </button>
            <button
              className="ghost-button"
              onClick={() => {
                setActiveCategory("");
                setQuery("");
                setSortMode("featured");
              }}
              type="button"
            >
              Reset completo
            </button>
          </div>
        </div>
      )}
      </section>
    </>
  );
}
