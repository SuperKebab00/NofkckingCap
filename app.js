import {
  defaultFreshCut,
  FEATURED_CUT_STORAGE_KEY,
  INVENTORY_STORAGE_KEY,
  MONTHLY_CUTS_STORAGE_KEY,
  PRODUCTS_STORAGE_KEY,
  products
} from "./js/data.js";
import { getDom, renderCart, renderCheckoutSummary, renderFreshCut, renderInventory, renderProducts, renderShowcase } from "./js/render.js";
import { loadJson, removeJson, saveJson } from "./js/storage.js";
import { readImageFile, todayISO } from "./js/utils.js";

const fallbackInventory = Object.fromEntries(products.map((product) => [product.id, product.stock]));
const savedFeaturedCut = loadJson(FEATURED_CUT_STORAGE_KEY, defaultFreshCut);
const MAX_MONTHLY_CUTS = 24;
const ADMIN_PASSWORD = "nocap2026";
const ADMIN_SESSION_STORAGE_KEY = "no-cap-admin-session-v1";

const state = {
  activeCategory: "all",
  adminAuthenticated: loadJson(ADMIN_SESSION_STORAGE_KEY, false) === true,
  cart: [],
  featuredCut: normalizeFeaturedCut(savedFeaturedCut),
  inventory: { ...fallbackInventory, ...loadJson(INVENTORY_STORAGE_KEY, {}) },
  monthlyCuts: normalizeCuts(loadJson(MONTHLY_CUTS_STORAGE_KEY, [savedFeaturedCut || defaultFreshCut])),
  products: normalizeProducts(loadJson(PRODUCTS_STORAGE_KEY, products)),
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
  renderProducts(dom, state.products, state.inventory, state.activeCategory);
  renderInventory(dom, state.products, state.inventory, state.monthlyCuts);
  renderCart(dom, state.cart);
  renderCheckoutSummary(dom, state.cart);
  renderFreshCut(dom, state.featuredCut);
  renderShowcase(dom, state.monthlyCuts);
  renderProductEditor();
}

function normalizeProducts(savedProducts) {
  if (!Array.isArray(savedProducts) || !savedProducts.length) return products.map((product) => ({ ...product }));
  const byId = new Map(savedProducts.map((item) => [item.id, item]));
  return products.map((base) => ({ ...base, ...(byId.get(base.id) || {}) }));
}

function renderProductEditor() {
  if (!dom.productSelect) return;
  const currentValue = dom.productSelect.value || state.products[0]?.id || "";
  dom.productSelect.innerHTML = state.products
    .map((product) => `<option value="${product.id}">${product.name}</option>`)
    .join("");
  dom.productSelect.value = state.products.some((product) => product.id === currentValue) ? currentValue : state.products[0]?.id || "";
  fillProductForm(dom.productSelect.value);
}

function fillProductForm(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  dom.productNameInput.value = product.name;
  dom.productCategoryInput.value = product.category;
  dom.productPriceInput.value = product.price;
  dom.productRestockInput.value = product.restock;
  dom.productDeleteButton.disabled = state.products.length <= 1;
}

async function saveProductFromForm() {
  const productId = dom.productSelect.value;
  const index = state.products.findIndex((item) => item.id === productId);
  if (index < 0) return;

  const base = state.products[index];
  const updatedProduct = {
    ...base,
    name: dom.productNameInput.value.trim() || base.name,
    category: dom.productCategoryInput.value.trim() || base.category,
    price: Math.max(0, Number(dom.productPriceInput.value || base.price)),
    restock: Math.max(0, Number(dom.productRestockInput.value || base.restock)),
    images: {
      packshot: await readImageFile(dom.productPackshotInput.files[0], base.images?.packshot || ""),
      lifestyle: await readImageFile(dom.productLifestyleInput.files[0], base.images?.lifestyle || base.images?.packshot || "")
    }
  };

  state.products[index] = updatedProduct;
  saveJson(PRODUCTS_STORAGE_KEY, state.products);
  dom.productPackshotInput.value = "";
  dom.productLifestyleInput.value = "";
  syncUi();
  showToast("Prodotto aggiornato.");
}

function deleteSelectedProduct() {
  if (state.products.length <= 1) {
    showToast("Serve almeno un prodotto nel catalogo.");
    return;
  }

  const productId = dom.productSelect.value;
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;

  state.products = state.products.filter((item) => item.id !== productId);
  state.cart = state.cart.filter((item) => item.product.id !== productId);
  delete state.inventory[productId];
  saveJson(PRODUCTS_STORAGE_KEY, state.products);
  saveJson(INVENTORY_STORAGE_KEY, state.inventory);
  syncUi();
  showToast(`${product.name} rimosso dal catalogo.`);
}

function setCategory(category) {
  state.activeCategory = category;
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.category === state.activeCategory);
  });
  renderProducts(dom, state.products, state.inventory, state.activeCategory);
}

function addToCart(productId) {
  const product = state.products.find((item) => item.id === productId);

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
  state.products.forEach((product) => {
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
  state.products = products.map((product) => ({ ...product }));
  state.cart = [];
  removeJson(PRODUCTS_STORAGE_KEY);
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

  if (validRoute !== "checkout") {
    dom.checkoutSuccess.hidden = true;
    dom.checkoutSummary.hidden = false;
    dom.checkoutForm.hidden = false;
  }

  window.scrollTo({ top: 0, behavior: "auto" });
}

function openDrawer(drawer, triggerSelector) {
  lastFocusedElement = document.activeElement;
  drawer.setAttribute("aria-hidden", "false");
  document.querySelectorAll(triggerSelector).forEach((button) => button.setAttribute("aria-expanded", "true"));
  document.body.classList.add("drawer-open");
  if (drawer === dom.adminDrawer) {
    dom.adminLoginError.textContent = "";
    dom.adminLoginForm.hidden = state.adminAuthenticated;
    dom.adminContent.hidden = !state.adminAuthenticated;
    if (state.adminAuthenticated) renderProductEditor();
  }
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

function toggleProductImage(button) {
  const card = button.closest(".product-card");
  if (!card || button.disabled) return;
  const productName = button.dataset.productName || "prodotto";
  const isShowingResult = card.classList.toggle("is-showing-result");
  button.textContent = isShowingResult ? "Vedi prodotto" : "Vedi risultato";
  button.setAttribute("aria-pressed", isShowingResult ? "true" : "false");
  button.setAttribute(
    "aria-label",
    `${isShowingResult ? "Mostra prodotto" : "Mostra risultato"} ${productName}`
  );
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  state.toastTimer = setTimeout(() => dom.toast.classList.remove("is-visible"), 2400);
}

function getErrorNode(name) {
  return dom.checkoutForm.querySelector(`[data-error-for="${name}"]`);
}

function setFieldError(name, message) {
  const node = getErrorNode(name);
  if (node) node.textContent = message;
}

function clearCheckoutErrors() {
  dom.checkoutForm.querySelectorAll(".field-error").forEach((item) => {
    item.textContent = "";
  });
}

function validateCheckoutForm(formData) {
  clearCheckoutErrors();
  let valid = true;

  const rules = [
    ["fullName", formData.get("fullName").trim().length >= 2, "Inserisci nome e cognome."],
    ["email", /\S+@\S+\.\S+/.test(formData.get("email")), "Inserisci un'email valida."],
    ["phone", formData.get("phone").trim().length >= 6, "Inserisci un telefono valido."],
    ["cardName", formData.get("cardName").trim().length >= 2, "Inserisci il nome sulla carta."]
  ];

  const cardDigits = String(formData.get("cardNumber")).replace(/\D/g, "");
  const cvcDigits = String(formData.get("cardCvc")).replace(/\D/g, "");
  const expiry = String(formData.get("cardExpiry")).trim();

  rules.push(["cardNumber", cardDigits.length >= 12, "Inserisci un numero carta valido."]);
  rules.push(["cardExpiry", /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry), "Formato scadenza: MM/AA."]);
  rules.push(["cardCvc", cvcDigits.length >= 3, "Inserisci un CVC valido."]);

  for (const [name, ok, message] of rules) {
    if (!ok) {
      setFieldError(name, message);
      valid = false;
    }
  }

  const fulfillment = formData.get("fulfillment");
  if (fulfillment === "shipping") {
    for (const [name, msg] of [["address", "Inserisci l'indirizzo."], ["city", "Inserisci la città."], ["zip", "Inserisci il CAP."]]) {
      if (!String(formData.get(name)).trim()) {
        setFieldError(name, msg);
        valid = false;
      }
    }
  }

  return valid;
}

function buildOrderCode() {
  const year = new Date().getFullYear();
  const serial = Math.floor(1000 + Math.random() * 9000);
  return `NC-${year}-${serial}`;
}

function setFulfillmentUi() {
  const method = dom.checkoutForm.querySelector('input[name="fulfillment"]:checked')?.value;
  const isShipping = method === "shipping";
  dom.shippingFields.hidden = !isShipping;
  ["address", "city", "zip"].forEach((name) => {
    const input = dom.checkoutForm.elements[name];
    if (input) input.required = isShipping;
  });
}

function unlockAdmin(password) {
  if (password !== ADMIN_PASSWORD) {
    dom.adminLoginError.textContent = "Password non valida.";
    return false;
  }
  state.adminAuthenticated = true;
  saveJson(ADMIN_SESSION_STORAGE_KEY, true);
  dom.adminLoginForm.hidden = true;
  dom.adminContent.hidden = false;
  renderProductEditor();
  showToast("Accesso gestore abilitato.");
  return true;
}

document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-to-cart]");
  const categoryButton = event.target.closest("[data-category]");
  const categoryLink = event.target.closest("[data-category-link]");
  const adjustButton = event.target.closest("[data-adjust]");
  const removeButton = event.target.closest("[data-remove-cart]");
  const restockButton = event.target.closest("[data-restock]");
  const toggleProductImageButton = event.target.closest("[data-toggle-product-image]");

  if (addButton) addToCart(addButton.dataset.addToCart);
  if (categoryButton) setCategory(categoryButton.dataset.category);
  if (categoryLink) setCategory(categoryLink.dataset.categoryLink);
  if (adjustButton) adjustInventory(adjustButton.dataset.adjust, Number(adjustButton.dataset.delta));
  if (removeButton) removeFromCart(removeButton.dataset.removeCart);
  if (toggleProductImageButton) toggleProductImage(toggleProductImageButton);
  if (restockButton) {
    const product = state.products.find((item) => item.id === restockButton.dataset.restock);
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
    closeDrawer(dom.cartDrawer, ".cart-trigger");
    if (!state.cart.length) {
      showToast("Il carrello è vuoto.");
      return;
    }
    window.location.hash = "#checkout";
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

dom.checkoutForm.addEventListener("change", (event) => {
  if (event.target.name === "fulfillment") setFulfillmentUi();
});

dom.checkoutForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.cart.length) {
    showToast("Il carrello è vuoto.");
    window.location.hash = "#shop";
    return;
  }

  const formData = new FormData(dom.checkoutForm);
  if (!validateCheckoutForm(formData)) return;

  const payButton = dom.checkoutForm.querySelector("[data-pay-now]");
  const originalText = payButton.textContent;
  payButton.disabled = true;
  payButton.textContent = "Pagamento in corso...";

  await new Promise((resolve) => setTimeout(resolve, 1300));

  state.cart = [];
  syncUi();
  dom.orderNumber.textContent = buildOrderCode();
  dom.checkoutForm.reset();
  setFulfillmentUi();
  dom.checkoutForm.hidden = true;
  dom.checkoutSummary.hidden = true;
  dom.checkoutSuccess.hidden = false;
  payButton.disabled = false;
  payButton.textContent = originalText;
  showToast("Pagamento demo completato.");
});

dom.adminLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  unlockAdmin(dom.adminPasswordInput.value.trim());
});

document.querySelector("[data-product-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveProductFromForm();
});

dom.productSelect?.addEventListener("change", (event) => {
  fillProductForm(event.target.value);
});

dom.productDeleteButton?.addEventListener("click", () => {
  deleteSelectedProduct();
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
  if (event.altKey && event.key.toLowerCase() === "g") {
    openDrawer(dom.adminDrawer, ".manager-toggle");
  }
});

syncUi();
setFulfillmentUi();
routeToPage();
