"use client";

import { useMemo, useState } from "react";
import type { PublicShopCategory } from "../lib/supabase-public";
import type { ShopProductCard } from "./shop-product-grid";
import { ShopProductGrid } from "./shop-product-grid";

type SortMode = "featured" | "name-asc" | "name-desc";

type ShopCatalogProps = {
  categories: PublicShopCategory[];
  products: ShopProductCard[];
  showStock?: boolean;
};

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

    const results = products.filter((product) => {
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

    if (sortMode === "name-asc") {
      return [...results].sort((left, right) => left.name.localeCompare(right.name));
    }

    if (sortMode === "name-desc") {
      return [...results].sort((left, right) => right.name.localeCompare(left.name));
    }

    return results;
  }, [activeCategory, products, query, sortMode]);

  const hasProducts = products.length > 0;
  const hasVisibleProducts = filteredProducts.length > 0;
  const hasActiveFilters = query.trim().length > 0 || activeCategory.trim().length > 0;

  return (
    <section className="section" aria-labelledby="shop-catalog-title">
      <div className="section-heading">
        <p className="eyebrow">Catalogo pubblico</p>
        <h2 id="shop-catalog-title">Prodotti consultabili in sola lettura</h2>
        <p>
          Cerca per nome, filtra per categoria e scorri il catalogo senza
          attivare carrello o checkout.
        </p>
      </div>

      <div
        className="spotlight-card"
        style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}
      >
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span className="eyebrow" style={{ margin: 0 }}>
              Cerca
            </span>
            <input
              aria-label="Cerca un prodotto"
              className="contact-form__input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Es. matte, pomade, shampoo"
              type="search"
              value={query}
            />
          </label>

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span className="eyebrow" style={{ margin: 0 }}>
              Ordina
            </span>
            <select
              aria-label="Ordina catalogo"
              className="contact-form__input"
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              value={sortMode}
            >
              <option value="featured">In evidenza</option>
              <option value="name-asc">Nome A-Z</option>
              <option value="name-desc">Nome Z-A</option>
            </select>
          </label>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <button
            className={activeCategory ? "ghost-button" : "status-badge"}
            onClick={() => setActiveCategory("")}
            type="button"
          >
            Tutte le categorie
          </button>
          {availableCategories.map((category) => {
            const isActive = activeCategory === category.value;

            return (
              <button
                className={isActive ? "status-badge" : "ghost-button"}
                key={category.value}
                onClick={() => setActiveCategory(isActive ? "" : category.value)}
                type="button"
              >
                {category.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: "space-between",
          }}
        >
          <p style={{ margin: 0 }}>
            {hasProducts
              ? `${filteredProducts.length} prodotti visibili su ${products.length}.`
              : "Catalogo pubblico in aggiornamento."}
          </p>
          {!availableCategories.length ? (
            <span className="admin-inline-note">
              Categorie live non disponibili: fallback pubblico attivo.
            </span>
          ) : null}
        </div>
      </div>

      {!hasProducts ? (
        <div className="spotlight-card">
          <p className="eyebrow">Catalogo</p>
          <h3 style={{ marginTop: 0 }}>Prodotti non disponibili al momento</h3>
          <p>
            Il catalogo pubblico non ha ancora restituito elementi. Puoi
            continuare a esplorare lo shop piu tardi oppure scriverci per una
            richiesta diretta.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <a href="/contact">Contattaci</a>
            <a className="ghost-button" href="/">
              Torna alla home
            </a>
          </div>
        </div>
      ) : hasVisibleProducts ? (
        <ShopProductGrid products={filteredProducts} showStock={showStock} />
      ) : (
        <div className="spotlight-card">
          <p className="eyebrow">Nessun risultato</p>
          <h3 style={{ marginTop: 0 }}>Nessun prodotto corrisponde ai filtri attivi</h3>
          <p>
            Prova a cambiare categoria oppure semplifica la ricerca per tornare
            ai prodotti disponibili nello shop pubblico.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
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
          {hasActiveFilters ? (
            <p className="admin-inline-note" style={{ marginTop: "0.75rem" }}>
              Nessun errore tecnico: il catalogo e attivo, ma i filtri correnti non
              restituiscono match.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
