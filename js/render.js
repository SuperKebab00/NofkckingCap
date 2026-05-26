import { productImage } from "./product-art.js";
import {
  escapeHtml,
  formatCurrency,
  formatDisplayDate,
  getCurrentMonthName,
  getMonthKey,
  getStockLabel,
  todayISO
} from "./utils.js";

export function getDom() {
  return {
    adminDrawer: document.querySelector("#inventoryDrawer"),
    cartCount: document.querySelector("[data-cart-count]"),
    cartDrawer: document.querySelector("#cartDrawer"),
    cartItems: document.querySelector("[data-cart-items]"),
    cartTotal: document.querySelector("[data-cart-total]"),
    currentMonthLabel: document.querySelector("[data-current-month]"),
    cutDateInput: document.querySelector("[data-cut-date]"),
    cutDescription: document.querySelector("[data-cut-description]"),
    cutFileInput: document.querySelector("[data-cut-file]"),
    cutImage: document.querySelector("[data-cut-image]"),
    cutNameInput: document.querySelector("[data-cut-name]"),
    cutTextInput: document.querySelector("[data-cut-text]"),
    grid: document.querySelector("[data-product-grid]"),
    inventoryBody: document.querySelector("[data-inventory-body]"),
    showcaseGrid: document.querySelector("[data-showcase-grid]"),
    toast: document.querySelector("[data-toast]")
  };
}

export function renderProducts(dom, products, inventory, activeCategory) {
  const filtered = products.filter((product) => activeCategory === "all" || product.category === activeCategory);

  dom.grid.innerHTML = filtered
    .map((product, index) => {
      const quantity = inventory[product.id] ?? 0;
      const stock = getStockLabel(quantity);
      const soldOut = quantity <= 0;

      return `
        <article class="product-card ${soldOut ? "is-sold-out" : ""}" style="--stagger:${index * 70}ms">
          <div class="product-media">
            <img src="${productImage(product, "front")}" alt="${escapeHtml(product.name)} vista frontale" loading="lazy" decoding="async">
            <img src="${productImage(product, "detail")}" alt="${escapeHtml(product.name)} seconda vista" loading="lazy" decoding="async">
          </div>
          <div class="product-card__body">
            <div class="product-card__category">${escapeHtml(product.label)}</div>
            <h3>${escapeHtml(product.name)}</h3>
            <div class="product-card__price">${formatCurrency(product.price)}</div>
            <div class="product-card__footer">
              <span class="stock-badge" data-level="${stock.level}">${stock.text}</span>
              <button class="primary-button" type="button" data-add-to-cart="${product.id}" ${soldOut ? "disabled" : ""}>
                ${soldOut ? "Esaurito" : "Aggiungi"}
              </button>
            </div>
          </div>
        </article>`;
    })
    .join("");
}

export function renderInventory(dom, products, inventory, monthlyCuts) {
  dom.inventoryBody.innerHTML = products
    .map((product) => {
      const quantity = inventory[product.id] ?? 0;
      const stock = getStockLabel(quantity);
      const rowState = stock.level === "low" || stock.level === "empty" ? `data-row-state="${stock.level}"` : "";

      return `
        <tr ${rowState}>
          <td><strong>${escapeHtml(product.name)}</strong></td>
          <td>${escapeHtml(product.label)}</td>
          <td>
            <div class="qty-control">
              <button class="mini-button" type="button" data-adjust="${product.id}" data-delta="-1" aria-label="Riduci ${escapeHtml(product.name)}">-</button>
              <strong>${quantity}</strong>
              <button class="mini-button" type="button" data-adjust="${product.id}" data-delta="1" aria-label="Aumenta ${escapeHtml(product.name)}">+</button>
            </div>
          </td>
          <td><span class="stock-badge" data-level="${stock.level}">${stock.text}</span></td>
          <td><button class="mini-button restock-button" type="button" data-restock="${product.id}">+${product.restock}</button></td>
        </tr>`;
    })
    .join("");

  const quantities = products.map((product) => inventory[product.id] ?? 0);
  const totalUnits = quantities.reduce((total, quantity) => total + quantity, 0);
  const lowStock = quantities.filter((quantity) => quantity > 0 && quantity <= 2).length;
  const soldOut = quantities.filter((quantity) => quantity <= 0).length;
  const inventoryValue = products.reduce((total, product) => total + product.price * (inventory[product.id] ?? 0), 0);
  const monthlyCount = monthlyCuts.filter((cut) => getMonthKey(cut.date || todayISO()) === getMonthKey()).length;

  document.querySelector("[data-summary-total]").textContent = totalUnits;
  document.querySelector("[data-summary-low]").textContent = lowStock;
  document.querySelector("[data-summary-soldout]").textContent = soldOut;
  document.querySelector("[data-summary-cuts]").textContent = monthlyCount;
  document.querySelector("[data-summary-value]").textContent = formatCurrency(inventoryValue);
  document.querySelector("[data-summary-orders]").textContent = "12";
}

export function renderCart(dom, cart) {
  const totalQty = cart.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = cart.reduce((total, item) => total + item.product.price * item.quantity, 0);

  dom.cartCount.textContent = totalQty;
  dom.cartTotal.textContent = formatCurrency(totalPrice);

  if (!cart.length) {
    dom.cartItems.innerHTML = `
      <div class="cart-empty">
        <strong>Carrello vuoto</strong>
        <span>Aggiungi prodotti professionali e prepara il tuo ordine.</span>
      </div>`;
    return;
  }

  dom.cartItems.innerHTML = cart
    .map(({ product, quantity }) => `
      <article class="cart-item">
        <img src="${productImage(product, "front")}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async">
        <div>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${quantity} x ${formatCurrency(product.price)}</p>
        </div>
        <button class="mini-button" type="button" data-remove-cart="${product.id}" aria-label="Rimuovi ${escapeHtml(product.name)}">-</button>
      </article>`)
    .join("");
}

export function renderFreshCut(dom, freshCut) {
  dom.cutImage.src = freshCut.image;
  dom.cutImage.alt = freshCut.name;
  document.querySelector("[data-cut-title]").textContent = freshCut.name;
  dom.cutDescription.textContent = freshCut.description;
  dom.cutNameInput.value = freshCut.name;
  dom.cutTextInput.value = freshCut.description;
  dom.cutDateInput.value = freshCut.date || todayISO();
}

export function renderShowcase(dom, monthlyCuts) {
  const currentCuts = monthlyCuts
    .filter((cut) => getMonthKey(cut.date || todayISO()) === getMonthKey())
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  dom.currentMonthLabel.textContent = getCurrentMonthName();

  if (!currentCuts.length) {
    dom.showcaseGrid.innerHTML = `
      <div class="showcase-empty">
        <strong>Nessun taglio questo mese</strong>
        <span>Il prossimo taglio pubblicato dal gestore comparirà qui.</span>
      </div>`;
    return;
  }

  dom.showcaseGrid.innerHTML = currentCuts
    .map((cut, index) => `
      <article class="showcase-card" style="--stagger:${index * 80}ms">
        <img src="${cut.image}" alt="${escapeHtml(cut.name)}" loading="lazy" decoding="async">
        <div class="showcase-card__body">
          <div class="showcase-card__date">${formatDisplayDate(cut.date || todayISO())}</div>
          <h3>${escapeHtml(cut.name)}</h3>
          <p>${escapeHtml(cut.description)}</p>
        </div>
      </article>`)
    .join("");
}
