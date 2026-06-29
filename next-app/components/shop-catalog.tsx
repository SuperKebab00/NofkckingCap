"use client";

import { useMemo, useState } from "react";
import type { PublicShopCategory } from "../lib/supabase-public";
import type { ShopProductCard } from "./shop-product-grid";
import { ShopProductGrid } from "./shop-product-grid";

type ShopCatalogProps = {
  categories: PublicShopCategory[];
  products: ShopProductCard[];
  showStock?: boolean;
};

type SortMode = "featured" | "name-asc" | "name-desc";

export function ShopCatalog({
  categories,
  products,
  showStock = false,
}: ShopCatalogProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("featured");

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const nextProducts = products.filter((product) => {
      const matchesCategory =
        activeCategory === "all" ||
        (product.category || "").trim().toLowerCase() === activeCategory;

      const haystack = [
        product.name,
        product.category || "",
        product.description || "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery =
        !normalizedQuery || haystack.includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });

    if (sortMode === "name-asc") {
      nextProducts.sort((a, b) => a.name.localeCompare(b.name, "it"));
    } else if (sortMode === "name-desc") {
      nextProducts.sort((a, b) => b.name.localeCompare(a.name, "it"));
    }

    return nextProducts;
  }, [activeCategory, products, query, sortMode]);

  return (
    <section className="panel" aria-labelledby="shop-products-title">
      <div className="panel-heading">
        <div>
          <h2 id="shop-products-title">Prodotti</h2>
          <p>Catalogo read-only durante la migrazione Next.</p>
        </div>
        <span className="status-badge">
          {filteredProducts.length} risultati
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <label>
            Cerca
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca prodotto..."
              type="search"
              value={query}
            />
          </label>

          <label>
            Ordina
            <select
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              value={sortMode}
            >
              <option value="featured">Consigliati</option>
              <option value="name-asc">Nome A-Z</option>
              <option value="name-desc">Nome Z-A</option>
            </select>
          </label>
        </div>

        <div
          aria-label="Categorie prodotti"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <button
            className={activeCategory === "all" ? "primary-button" : "ghost-button"}
            onClick={() => setActiveCategory("all")}
            type="button"
          >
            Tutti
          </button>
          {categories.map((category) => (
            <button
              className={
                activeCategory === category.value
                  ? "primary-button"
                  : "ghost-button"
              }
              key={category.value}
              onClick={() => setActiveCategory(category.value)}
              type="button"
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <ShopProductGrid products={filteredProducts} showStock={showStock} />
    </section>
  );
}
