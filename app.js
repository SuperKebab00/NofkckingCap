import {
  defaultFreshCut,
  FEATURED_CUT_STORAGE_KEY,
  INVENTORY_STORAGE_KEY,
  MONTHLY_CUTS_STORAGE_KEY,
  products
} from "./js/data.js";
import { getDom, renderCart, renderFreshCut, renderInventory, renderProducts, renderShowcase } from "./js/render.js";
import { loadJson, removeJson, saveJson } from "./js/storage.js";
import { readImageFile, todayISO } from "./js/utils.js";

const fallbackInventory = Object.fromEntries(products.map((product) => [product.id, product.stock]));
const savedFeaturedCut = loadJson(FEATURED_CUT_STORAGE_KEY, defaultFreshCut);
const MAX_MONTHLY_CUTS = 24;

const state = {
  activeCategory: "all",
  cart: [],
  featuredCut: normalizeFeaturedCut(savedFeaturedCut),
  inventory: { ...fallbackInventory, ...loadJson(INVENTORY_STORAGE_KEY, {}) },
  monthlyCuts: normalizeCuts(loadJson(MONTHLY_CUTS_STORAGE_KEY, [savedFeaturedCut || defaultFreshCut])),
  toastTimer: null
};

const dom = getDom();
let lastFocusedElement = null;

function normalizeCuts(cuts) {
  const list = Array.isArray(cuts) && cuts.length ? cuts : [defaultFreshCut];
  const normalized = list.map((cut, index) => ({
    ...defaultFreshCut,
    ...cut,
    id: cut.id || `cut-${index}`,
    date: cut.date || todayISO()
  })).map(normalizeFeaturedCut);

  const uniqueCuts = [];
  const seen = new Set();
  for (const cut of normalized) {
    const key = `${cut.date}|${cut.name.toLowerCase().trim()}|${cut.image.slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueCuts.push(cut);
    if (uniqueCuts.length >= MAX_MONTHLY_CUTS) break;
  }
  return uniqueCuts;
}

function normalizeFeaturedCut(cut) {
  const mergedCut = { ...defaultFreshCut, ...cut };
  const isLegacyPlaceholder = String(mergedCut.image).startsWith("data:image/svg+xml");
  return isLegacyPlaceholder ? { ...mergedCut, image: defaultFreshCut.image } : mergedCut;
}

function syncUi() {
  renderProducts(dom, products, state.inventory, state.activeCategory);
  renderInventory(dom, products, state.inventory, state.monthlyCuts);
  renderCart(dom, state.cart);
  renderFreshCut(dom, state.featuredCut);
  renderShowcase(dom, state.monthlyCuts);
}

function setCategory(category) {
  state.activeCategory = category;
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.category === state.activeCategory);
  });
  renderProducts(dom, products, state.inventory, state.activeCategory);
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);

  if (!product || state.inventory[productId] <= 0) {
    showToast("Prodotto esaurito.");
    return;
  }

  state.inventory[productId] -= 1;
  const cartItem = state.cart.find((item) => item.product.id === productId);

  if (cartItem) {
    cartItem.quantity += 1;
  } else {
    state.cart.push({ product, quantity: 1 });
  }

  saveJson(INVENTORY_STORAGE_KEY, state.inventory);
  syncUi();
  openDrawer(dom.cartDrawer, ".cart-trigger");
  pulseCart();
  showToast(`${product.name} aggiunto al carrello.`);
}

function removeFromCart(productId) {
  const index = state.cart.findIndex((item) => item.product.id === productId);
  if (index < 0) return;

  state.cart[index].quantity -= 1;
  state.inventory[productId] += 1;

  if (state.cart[index].quantity <= 0) {
    state.cart.splice(index, 1);
  }

  saveJson(INVENTORY_STORAGE_KEY, state.inventory);
  syncUi();
}

function adjustInventory(productId, amount) {
  state.inventory[productId] = Math.max(0, (state.inventory[productId] ?? 0) + amount);
  saveJson(INVENTORY_STORAGE_KEY, state.inventory);
  syncUi();
}

function restockAll() {
  products.forEach((product) => {
    state.inventory[product.id] = product.restock;
  });
  saveJson(INVENTORY_STORAGE_KEY, state.inventory);
  syncUi();
  showToast("Magazzino rifornito.");
}

async function publishFreshCut() {
  try {
    const newCut = {
      id: `cut-${Date.now()}`,
      name: dom.cutNameInput.value.trim() || defaultFreshCut.name,
      description: dom.cutTextInput.value.trim() || defaultFreshCut.description,
      image: await readImageFile(dom.cutFileInput.files[0], state.featuredCut.image),
      date: dom.cutDateInput.value || todayISO()
    };

    state.featuredCut = newCut;
    state.monthlyCuts = normalizeCuts([newCut, ...state.monthlyCuts]);
    saveJson(FEATURED_CUT_STORAGE_KEY, state.featuredCut);
    saveJson(MONTHLY_CUTS_STORAGE_KEY, state.monthlyCuts);
    syncUi();
    dom.cutFileInput.value = "";
    showToast("Taglio pubblicato nello showcase.");
  } catch {
    showToast("Non riesco a leggere questa immagine.");
  }
}

function resetFreshCut() {
  removeJson(FEATURED_CUT_STORAGE_KEY);
  removeJson(MONTHLY_CUTS_STORAGE_KEY);
  state.featuredCut = { ...defaultFreshCut };
  state.monthlyCuts = [defaultFreshCut];
  syncUi();
  showToast("Taglio del giorno ripristinato.");
}

function resetExperience() {
  removeJson(INVENTORY_STORAGE_KEY);
  removeJson(FEATURED_CUT_STORAGE_KEY);
  removeJson(MONTHLY_CUTS_STORAGE_KEY);
  state.inventory = { ...fallbackInventory };
  state.featuredCut = { ...defaultFreshCut };
  state.monthlyCuts = [defaultFreshCut];
  state.cart = [];
  syncUi();
  showToast("Pannello ripristinato.");
}

function routeToPage() {
  const aliases = { products: "shop", "section-menu": "home", top: "home" };
  const requestedRoute = window.location.hash.replace("#", "") || "home";
  const route = aliases[requestedRoute] || requestedRoute;
  const validRoute = document.querySelector(`[data-page="${route}"]`) ? route : "home";

  document.querySelectorAll("[data-page]").forEach((page) => {
    page.classList.toggle("is-active", page.dataset.page === validRoute);
  });

  document.querySelectorAll(".main-nav a").forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${validRoute}`);
  });

  window.scrollTo({ top: 0, behavior: "auto" });
}

function openDrawer(drawer, triggerSelector) {
  lastFocusedElement = document.activeElement;
  drawer.setAttribute("aria-hidden", "false");
  document.querySelectorAll(triggerSelector).forEach((button) => button.setAttribute("aria-expanded", "true"));
  document.body.classList.add("drawer-open");
  drawer.querySelector("button, [href], input, textarea")?.focus({ preventScroll: true });
}

function closeDrawer(drawer, triggerSelector) {
  drawer.setAttribute("aria-hidden", "true");
  document.querySelectorAll(triggerSelector).forEach((button) => button.setAttribute("aria-expanded", "false"));
  const anyDrawerOpen = [dom.cartDrawer, dom.adminDrawer].some((item) => item.getAttribute("aria-hidden") === "false");
  if (!anyDrawerOpen) document.body.classList.remove("drawer-open");
  lastFocusedElement?.focus?.({ preventScroll: true });
}

function pulseCart() {
  document.querySelector(".cart-trigger").classList.remove("is-pulsing");
  requestAnimationFrame(() => document.querySelector(".cart-trigger").classList.add("is-pulsing"));
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  state.toastTimer = setTimeout(() => dom.toast.classList.remove("is-visible"), 2400);
}

document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-to-cart]");
  const categoryButton = event.target.closest("[data-category]");
  const categoryLink = event.target.closest("[data-category-link]");
  const adjustButton = event.target.closest("[data-adjust]");
  const removeButton = event.target.closest("[data-remove-cart]");
  const restockButton = event.target.closest("[data-restock]");

  if (addButton) addToCart(addButton.dataset.addToCart);
  if (categoryButton) setCategory(categoryButton.dataset.category);
  if (categoryLink) setCategory(categoryLink.dataset.categoryLink);
  if (adjustButton) adjustInventory(adjustButton.dataset.adjust, Number(adjustButton.dataset.delta));
  if (removeButton) removeFromCart(removeButton.dataset.removeCart);
  if (restockButton) {
    const product = products.find((item) => item.id === restockButton.dataset.restock);
    adjustInventory(product.id, product.restock);
  }
  if (event.target.closest(".cart-trigger")) openDrawer(dom.cartDrawer, ".cart-trigger");
  if (event.target.closest("[data-close-cart]")) closeDrawer(dom.cartDrawer, ".cart-trigger");
  if (event.target.closest(".manager-toggle")) openDrawer(dom.adminDrawer, ".manager-toggle");
  if (event.target.closest("[data-close-admin]")) closeDrawer(dom.adminDrawer, ".manager-toggle");
  if (event.target.closest("[data-restock-all]")) restockAll();
  if (event.target.closest("[data-reset-demo]")) resetExperience();
  if (event.target.closest("[data-cut-reset]")) resetFreshCut();
  if (event.target.closest("[data-checkout]")) {
    state.cart = [];
    syncUi();
    closeDrawer(dom.cartDrawer, ".cart-trigger");
    showToast("Ordine confermato. Ti aspettiamo in shop.");
  }
});

document.querySelector("[data-cut-form]").addEventListener("submit", (event) => {
  event.preventDefault();
  publishFreshCut();
});

document.querySelector("[data-contact-form]").addEventListener("submit", (event) => {
  event.preventDefault();
  event.currentTarget.reset();
  showToast("Richiesta inviata. Ti ricontatteremo presto.");
});

window.addEventListener("hashchange", routeToPage);
window.addEventListener("scroll", () => {
  document.querySelector(".site-header").dataset.elevated = window.scrollY > 12 ? "true" : "false";
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDrawer(dom.cartDrawer, ".cart-trigger");
    closeDrawer(dom.adminDrawer, ".manager-toggle");
  }
});

syncUi();
routeToPage();
