import { CONFIG } from "./js/config.js";
import { defaultFreshCut } from "./js/data.js";
import { getSupabaseClient } from "./js/supabase-client.js";
import {
  clearCart,
  createLead,
  createOrder,
  getCart,
  getFeaturedCut,
  getInventory,
  getLeads,
  getMonthlyCuts,
  getOrders,
  getProducts,
  getSiteSections,
  saveCart,
  saveFeaturedCut,
  saveInventory,
  saveMonthlyCuts,
  saveSiteSections,
  saveProducts,
  uploadImage
} from "./js/repository.js";
import {
  getDom,
  renderCart,
  renderCheckoutSuccessSummary,
  renderCheckoutSummary,
  renderFreshCut,
  renderInventory,
  renderProducts,
  renderShowcase
} from "./js/render.js";
import { formatCurrency, todayISO } from "./js/utils.js";

const ADMIN_SESSION_KEY = "no-cap-admin-session-v2";
const MAX_MONTHLY_CUTS = 24;

const state = {
  activeCategory: "all",
  adminAuthenticated: sessionStorage.getItem(ADMIN_SESSION_KEY) === "1",
  cart: [],
  featuredCut: defaultFreshCut,
  inventory: {},
  leads: [],
  monthlyCuts: [defaultFreshCut],
  orders: [],
  products: [],
  siteSections: {
    shopTitle: "Prodotti No Cap",
    shopCopy: "Catalogo professionale, disponibilità aggiornata e acquisto rapido."
  },
  toastTimer: null
};

const dom = getDom();
const drawerFocus = { previous: null };

function syncAdminVisibility() {
  if (!dom.adminLoginForm || !dom.adminContent) return;
  dom.adminLoginError.textContent = "";
  dom.adminLoginForm.hidden = state.adminAuthenticated;
  dom.adminContent.hidden = !state.adminAuthenticated;
}

function isAdminRoute() {
  return (window.location.hash || "#home").replace("#", "") === "admin";
}

function requireAdmin() {
  if (state.adminAuthenticated) return true;
  if (isAdminRoute()) {
    dom.adminLoginError.textContent = "Accedi per gestire prodotti e ordini.";
    dom.adminLoginForm?.querySelector('input[name="adminEmail"]')?.focus();
  } else {
    showToast("Accesso gestore richiesto.");
  }
  return false;
}

function normalizeCuts(cuts) {
  const list = Array.isArray(cuts) && cuts.length ? cuts : [defaultFreshCut];
  const unique = [];
  const seen = new Set();
  for (const cut of list) {
    const normalized = { ...defaultFreshCut, ...cut, date: cut?.date || todayISO() };
    const key = `${normalized.date}|${normalized.name}|${String(normalized.image).slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(normalized);
    if (unique.length >= MAX_MONTHLY_CUTS) break;
  }
  return unique;
}

function normalizeCart(rawCart, products, inventory) {
  const normalized = [];
  for (const row of rawCart || []) {
    const productId = row.productId || row.id;
    const quantity = Number(row.quantity || 0);
    const product = products.find((item) => item.id === productId);
    if (!product || quantity <= 0) continue;
    const maxQty = Math.max(0, Number(inventory[productId] ?? 0));
    if (maxQty <= 0) continue;
    normalized.push({ productId, quantity: Math.min(quantity, maxQty) });
  }
  return normalized;
}

function cartExpanded() {
  return state.cart
    .map((row) => {
      const product = state.products.find((item) => item.id === row.productId);
      return product ? { product, quantity: row.quantity } : null;
    })
    .filter(Boolean);
}

async function persistCart() {
  await saveCart(state.cart);
}

async function loadState() {
  const [products, inventory, featuredCut, monthlyCuts, cart, orders, leads, siteSections] = await Promise.all([
    getProducts(),
    getInventory(),
    getFeaturedCut(),
    getMonthlyCuts(),
    getCart(),
    getOrders(),
    getLeads(),
    getSiteSections()
  ]);
  state.products = products;
  state.inventory = inventory;
  state.featuredCut = { ...defaultFreshCut, ...featuredCut };
  state.monthlyCuts = normalizeCuts(monthlyCuts);
  state.cart = normalizeCart(cart, state.products, state.inventory);
  state.orders = orders;
  state.leads = leads;
  state.siteSections = { ...state.siteSections, ...(siteSections || {}) };
  await persistCart();
}

function syncUi() {
  const expanded = cartExpanded();
  renderProducts(dom, state.products, state.inventory, state.activeCategory);
  renderInventory(dom, state.products, state.inventory, state.monthlyCuts);
  renderCart(dom, expanded);
  renderCheckoutSummary(dom, expanded);
  renderFreshCut(dom, state.featuredCut);
  renderShowcase(dom, state.monthlyCuts);
  renderAdminStats();
  renderOrdersDashboard();
  renderProductEditor();
  renderSiteSectionsEditor();
  applySiteSections();
  syncAdminVisibility();
}

function renderOrdersDashboard() {
  if (!dom.adminOrdersList) return;
  const todayKey = todayISO();
  const orders = [...state.orders];
  const totalOrders = orders.length;
  const todayOrders = orders.filter((order) => String(order.createdAt || "").slice(0, 10) === todayKey).length;
  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const avg = totalOrders ? revenue / totalOrders : 0;

  if (dom.adminOrdersTotal) dom.adminOrdersTotal.textContent = String(totalOrders);
  if (dom.adminOrdersToday) dom.adminOrdersToday.textContent = String(todayOrders);
  if (dom.adminOrdersRevenue) dom.adminOrdersRevenue.textContent = formatCurrency(revenue);
  if (dom.adminOrdersAvg) dom.adminOrdersAvg.textContent = formatCurrency(avg);

  if (!orders.length) {
    dom.adminOrdersList.innerHTML = `<tr><td colspan="6">Nessun ordine registrato.</td></tr>`;
    return;
  }

  dom.adminOrdersList.innerHTML = orders
    .slice(0, 12)
    .map((order) => `
      <tr>
        <td><strong>${order.orderNumber || order.id}</strong></td>
        <td>${order.customer?.fullName || "-"}</td>
        <td>${order.fulfillment === "shipping" ? "Spedizione" : "Ritiro"}</td>
        <td>${order.paymentMode === "paypal" ? "PayPal" : "In sede"}</td>
        <td>${formatCurrency(Number(order.total || 0))}</td>
        <td>${String(order.createdAt || "").slice(0, 10) || "-"}</td>
      </tr>`)
    .join("");
}

function renderSiteSectionsEditor() {
  if (!dom.sectionShopTitleInput) return;
  dom.sectionShopTitleInput.value = state.siteSections.shopTitle || "";
  dom.sectionShopCopyInput.value = state.siteSections.shopCopy || "";
}

function applySiteSections() {
  if (dom.siteShopTitle && state.siteSections.shopTitle) dom.siteShopTitle.textContent = state.siteSections.shopTitle;
  if (dom.siteShopCopy && state.siteSections.shopCopy) dom.siteShopCopy.textContent = state.siteSections.shopCopy;
}

function renderAdminStats() {
  const quantities = state.products.map((product) => state.inventory[product.id] ?? 0);
  const totalUnits = quantities.reduce((sum, value) => sum + value, 0);
  const lowStock = quantities.filter((value) => value > 0 && value <= 2).length;
  const soldOut = quantities.filter((value) => value <= 0).length;
  const inventoryValue = state.products.reduce((sum, product) => sum + (state.inventory[product.id] ?? 0) * Number(product.price || 0), 0);
  const monthlyCount = state.monthlyCuts.filter((cut) => String(cut.date).startsWith(todayISO().slice(0, 7))).length;
  const todayOrders = state.orders.filter((order) => String(order.createdAt || "").slice(0, 10) === todayISO()).length;
  document.querySelector("[data-summary-total]").textContent = totalUnits;
  document.querySelector("[data-summary-low]").textContent = lowStock;
  document.querySelector("[data-summary-soldout]").textContent = soldOut;
  document.querySelector("[data-summary-cuts]").textContent = monthlyCount;
  document.querySelector("[data-summary-value]").textContent = formatCurrency(inventoryValue);
  document.querySelector("[data-summary-orders]").textContent = todayOrders;
  if (dom.demoOrders) dom.demoOrders.textContent = state.orders.length;
  if (dom.demoLeads) dom.demoLeads.textContent = state.leads.length;
  if (dom.demoActiveProducts) dom.demoActiveProducts.textContent = state.products.length;
}

function renderProductEditor() {
  if (!dom.productSelect) return;
  const current = dom.productSelect.value || state.products[0]?.id || "";
  dom.productSelect.innerHTML = [
    `<option value="__new__">+ Nuovo prodotto</option>`,
    ...state.products.map((p) => `<option value="${p.id}">${p.name}</option>`)
  ].join("");
  dom.productSelect.value = state.products.some((p) => p.id === current) ? current : (current === "__new__" ? "__new__" : state.products[0]?.id || "__new__");
  fillProductForm(dom.productSelect.value);
}

function fillProductForm(productId) {
  if (productId === "__new__") {
    dom.productNameInput.value = "";
    dom.productCategoryInput.value = "";
    dom.productPriceInput.value = "0";
    dom.productRestockInput.value = "0";
    dom.productDeleteButton.disabled = true;
    return;
  }
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  dom.productNameInput.value = product.name || "";
  dom.productCategoryInput.value = product.category || "";
  dom.productPriceInput.value = product.price || 0;
  dom.productRestockInput.value = product.restock || 0;
  dom.productDeleteButton.disabled = state.products.length <= 1;
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  state.toastTimer = setTimeout(() => dom.toast.classList.remove("is-visible"), 2600);
}

function routeToPage() {
  const aliases = { products: "shop", top: "home" };
  const requestedRoute = window.location.hash.replace("#", "") || "home";
  const route = aliases[requestedRoute] || requestedRoute;
  const valid = document.querySelector(`[data-page="${route}"]`) ? route : "home";
  document.querySelectorAll("[data-page]").forEach((page) => page.classList.toggle("is-active", page.dataset.page === valid));
  document.querySelectorAll(".main-nav a").forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === `#${valid}`));
  if (valid !== "checkout") {
    dom.checkoutForm.hidden = false;
    dom.checkoutSummary.hidden = false;
    dom.checkoutSuccess.hidden = true;
  }
  if (valid === "admin" && !state.adminAuthenticated) {
    dom.adminLoginError.textContent = "Accedi con account gestore per entrare nel pannello.";
    setTimeout(() => dom.adminLoginForm?.querySelector('input[name="adminEmail"]')?.focus(), 0);
  }
  window.scrollTo({ top: 0, behavior: "auto" });
}

function trapFocus(drawer) {
  const focusables = [...drawer.querySelectorAll("button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")].filter((el) => !el.disabled && !el.hidden);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables.at(-1);
  const handler = (event) => {
    if (event.key !== "Tab") return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  drawer._focusTrap = handler;
  drawer.addEventListener("keydown", handler);
  first.focus({ preventScroll: true });
}

function openDrawer(drawer, triggerSelector) {
  drawerFocus.previous = document.activeElement;
  drawer.setAttribute("aria-hidden", "false");
  document.querySelectorAll(triggerSelector).forEach((item) => item.setAttribute("aria-expanded", "true"));
  document.body.classList.add("drawer-open");
  trapFocus(drawer);
}

function closeDrawer(drawer, triggerSelector) {
  drawer.setAttribute("aria-hidden", "true");
  document.querySelectorAll(triggerSelector).forEach((item) => item.setAttribute("aria-expanded", "false"));
  if (drawer._focusTrap) drawer.removeEventListener("keydown", drawer._focusTrap);
  const anyOpen = [dom.cartDrawer].some((item) => item.getAttribute("aria-hidden") === "false");
  if (!anyOpen) document.body.classList.remove("drawer-open");
  drawerFocus.previous?.focus?.({ preventScroll: true });
}

function setCategory(category) {
  state.activeCategory = category;
  document.querySelectorAll("[data-category]").forEach((button) => button.classList.toggle("is-active", button.dataset.category === category));
  renderProducts(dom, state.products, state.inventory, category);
}

async function addToCart(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product || (state.inventory[productId] ?? 0) <= 0) return showToast("Prodotto esaurito.");
  state.inventory[productId] = Math.max(0, (state.inventory[productId] ?? 0) - 1);
  const row = state.cart.find((item) => item.productId === productId);
  if (row) row.quantity += 1;
  else state.cart.push({ productId, quantity: 1 });
  await saveInventory(state.inventory);
  await persistCart();
  syncUi();
  openDrawer(dom.cartDrawer, ".cart-trigger");
}

async function removeFromCart(productId) {
  const row = state.cart.find((item) => item.productId === productId);
  if (!row) return;
  row.quantity -= 1;
  state.inventory[productId] = (state.inventory[productId] ?? 0) + 1;
  if (row.quantity <= 0) state.cart = state.cart.filter((item) => item.productId !== productId);
  await saveInventory(state.inventory);
  await persistCart();
  syncUi();
}

async function adjustInventory(productId, amount) {
  state.inventory[productId] = Math.max(0, (state.inventory[productId] ?? 0) + amount);
  await saveInventory(state.inventory);
  syncUi();
}

async function restockAll() {
  if (!requireAdmin()) return;
  state.products.forEach((product) => { state.inventory[product.id] = Number(product.restock || 0); });
  await saveInventory(state.inventory);
  syncUi();
  showToast("Magazzino rifornito.");
}

async function saveFreshCut() {
  if (!requireAdmin()) return;
  const image = await uploadImage(dom.cutFileInput.files[0], { bucket: "cuts" }).catch(() => state.featuredCut.image);
  const cut = {
    id: `cut-${Date.now()}`,
    name: dom.cutNameInput.value.trim() || defaultFreshCut.name,
    description: dom.cutTextInput.value.trim() || defaultFreshCut.description,
    image: image || state.featuredCut.image,
    date: dom.cutDateInput.value || todayISO()
  };
  state.featuredCut = cut;
  state.monthlyCuts = normalizeCuts([cut, ...state.monthlyCuts]);
  await saveFeaturedCut(cut);
  await saveMonthlyCuts(state.monthlyCuts);
  dom.cutFileInput.value = "";
  syncUi();
  showToast("Taglio pubblicato.");
}

async function saveProductFromForm() {
  if (!requireAdmin()) return;
  const id = dom.productSelect.value;
  if (id === "__new__") {
    const name = dom.productNameInput.value.trim();
    const category = dom.productCategoryInput.value.trim().toLowerCase() || "accessories";
    if (!name) {
      showToast("Inserisci il nome prodotto.");
      return;
    }
    const newIdBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    let newId = newIdBase || `product-${Date.now()}`;
    let suffix = 1;
    while (state.products.some((item) => item.id === newId)) {
      newId = `${newIdBase}-${suffix++}`;
    }
    const packshot = dom.productPackshotInput.files[0]
      ? await uploadImage(dom.productPackshotInput.files[0], { bucket: "products" })
      : "";
    const lifestyle = dom.productLifestyleInput.files[0]
      ? await uploadImage(dom.productLifestyleInput.files[0], { bucket: "products" })
      : packshot;
    const restock = Math.max(0, Number(dom.productRestockInput.value || 0));
    const product = {
      id: newId,
      name,
      category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      description: "Nuovo prodotto inserito da pannello admin.",
      badge: "Novità",
      price: Math.max(0, Number(dom.productPriceInput.value || 0)),
      stock: restock,
      restock,
      colors: ["#111111", "#d40f19", "#ffffff"],
      shape: "jar",
      images: { packshot, lifestyle }
    };
    state.products.unshift(product);
    state.inventory[newId] = restock;
    await saveProducts(state.products);
    await saveInventory(state.inventory);
    dom.productSelect.value = newId;
    dom.productPackshotInput.value = "";
    dom.productLifestyleInput.value = "";
    syncUi();
    showToast("Prodotto aggiunto al catalogo.");
    return;
  }
  const index = state.products.findIndex((item) => item.id === id);
  if (index < 0) return;
  const base = state.products[index];
  const packshot = dom.productPackshotInput.files[0] ? await uploadImage(dom.productPackshotInput.files[0], { bucket: "products" }) : (base.images?.packshot || "");
  const lifestyle = dom.productLifestyleInput.files[0] ? await uploadImage(dom.productLifestyleInput.files[0], { bucket: "products" }) : (base.images?.lifestyle || packshot);
  state.products[index] = {
    ...base,
    name: dom.productNameInput.value.trim() || base.name,
    category: dom.productCategoryInput.value.trim() || base.category,
    label: dom.productCategoryInput.value.trim() || base.label,
    price: Math.max(0, Number(dom.productPriceInput.value || base.price)),
    restock: Math.max(0, Number(dom.productRestockInput.value || base.restock)),
    images: { packshot, lifestyle }
  };
  await saveProducts(state.products);
  dom.productPackshotInput.value = "";
  dom.productLifestyleInput.value = "";
  syncUi();
  showToast("Prodotto aggiornato.");
}

async function deleteSelectedProduct() {
  if (!requireAdmin()) return;
  if (state.products.length <= 1) return showToast("Serve almeno un prodotto nel catalogo.");
  const id = dom.productSelect.value;
  const product = state.products.find((item) => item.id === id);
  state.products = state.products.filter((item) => item.id !== id);
  state.cart = state.cart.filter((item) => item.productId !== id);
  delete state.inventory[id];
  await saveProducts(state.products);
  await saveInventory(state.inventory);
  await persistCart();
  syncUi();
  showToast(`${product?.name || "Prodotto"} rimosso.`);
}

function validateCheckout(formData) {
  const errors = {};
  if (!String(formData.get("fullName") || "").trim()) errors.fullName = "Inserisci nome completo.";
  if (!/\S+@\S+\.\S+/.test(String(formData.get("email") || ""))) errors.email = "Email non valida.";
  if (String(formData.get("phone") || "").trim().length < 6) errors.phone = "Telefono non valido.";
  if (formData.get("fulfillment") === "shipping") {
    if (!String(formData.get("address") || "").trim()) errors.address = "Inserisci indirizzo.";
    if (!String(formData.get("city") || "").trim()) errors.city = "Inserisci città.";
    if (!String(formData.get("zip") || "").trim()) errors.zip = "Inserisci CAP.";
  }
  dom.checkoutForm.querySelectorAll(".field-error").forEach((node) => { node.textContent = ""; });
  Object.entries(errors).forEach(([key, message]) => {
    const node = dom.checkoutForm.querySelector(`[data-error-for="${key}"]`);
    if (node) node.textContent = message;
  });
  return Object.keys(errors).length === 0;
}

function buildOrderPayload(formData) {
  const items = cartExpanded().map((row) => ({
    productId: row.product.id,
    productName: row.product.name,
    unitPrice: row.product.price,
    quantity: row.quantity,
    lineTotal: row.quantity * row.product.price
  }));
  const subtotal = items.reduce((sum, row) => sum + row.lineTotal, 0);
  const shipping = formData.get("fulfillment") === "shipping" ? 6 : 0;
  const total = subtotal + shipping;
  return {
    id: `order-${Date.now()}`,
    orderNumber: `NC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
    customer: {
      fullName: String(formData.get("fullName")).trim(),
      email: String(formData.get("email")).trim(),
      phone: String(formData.get("phone")).trim()
    },
    fulfillment: formData.get("fulfillment"),
    shippingAddress: formData.get("fulfillment") === "shipping"
      ? { address: formData.get("address"), city: formData.get("city"), zip: formData.get("zip") }
      : null,
    items,
    subtotal,
    shipping,
    total,
    status: "demo-created",
    paymentMode: formData.get("paymentMode") || "in-shop"
  };
}

async function saveSiteSectionsFromForm() {
  if (!requireAdmin()) return;
  state.siteSections = {
    shopTitle: dom.sectionShopTitleInput.value.trim() || state.siteSections.shopTitle,
    shopCopy: dom.sectionShopCopyInput.value.trim() || state.siteSections.shopCopy
  };
  await saveSiteSections(state.siteSections);
  applySiteSections();
  showToast("Sezioni aggiornate.");
}

async function submitCheckout(event) {
  event.preventDefault();
  if (!state.cart.length) {
    showToast("Carrello vuoto.");
    window.location.hash = "#shop";
    return;
  }
  const formData = new FormData(dom.checkoutForm);
  if (!validateCheckout(formData)) return;
  const payButton = dom.checkoutForm.querySelector("[data-pay-now]");
  const old = payButton.textContent;
  payButton.disabled = true;
  payButton.textContent = "Creazione ordine...";
  const order = buildOrderPayload(formData);
  if (order.paymentMode === "paypal") {
    showToast("PayPal selezionato: in demo viene creato un ordine simulato.");
  }
  await new Promise((resolve) => setTimeout(resolve, 900));
  await createOrder(order);
  await clearCart();
  state.orders = await getOrders();
  state.cart = [];
  syncUi();
  dom.orderNumber.textContent = order.orderNumber;
  renderCheckoutSuccessSummary(dom, order);
  dom.checkoutForm.hidden = true;
  dom.checkoutSummary.hidden = true;
  dom.checkoutSuccess.hidden = false;
  payButton.disabled = false;
  payButton.textContent = old;
  showToast("Ordine demo creato con successo.");
}

function setFulfillmentUi() {
  const value = dom.checkoutForm.querySelector('input[name="fulfillment"]:checked')?.value;
  const shipping = value === "shipping";
  dom.shippingFields.hidden = !shipping;
}

async function unlockAdmin(password, email = "") {
  if (CONFIG.ADMIN_MODE === "supabase-auth") {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      dom.adminLoginError.textContent = "Inserisci email admin.";
      return;
    }
    if (!String(password || "").trim()) {
      dom.adminLoginError.textContent = "Inserisci password admin.";
      return;
    }
    const sb = await getSupabaseClient();
    if (!sb) {
      dom.adminLoginError.textContent = "Supabase non configurato.";
      return;
    }
    const { error } = await sb.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });
    if (error) {
      dom.adminLoginError.textContent = error.message || "Credenziali non valide.";
      showToast(`Login admin fallito: ${error.message || "errore sconosciuto"}`);
      return;
    }
    state.adminAuthenticated = true;
    sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    syncAdminVisibility();
    showToast("Accesso admin eseguito.");
    return;
  }

  if (CONFIG.ADMIN_MODE === "demo") {
    if (password !== CONFIG.DEMO_ADMIN_PASSWORD) {
      dom.adminLoginError.textContent = "Password non valida.";
      return;
    }
    state.adminAuthenticated = true;
    sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    syncAdminVisibility();
    showToast("Area gestore sbloccata.");
  }
}

async function logoutAdmin() {
  if (CONFIG.ADMIN_MODE === "supabase-auth") {
    const sb = await getSupabaseClient();
    if (sb) await sb.auth.signOut();
  }
  state.adminAuthenticated = false;
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  syncAdminVisibility();
}

function exportJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function bindEvents() {
  document.addEventListener("click", async (event) => {
    const add = event.target.closest("[data-add-to-cart]");
    const cat = event.target.closest("[data-category]");
    const catLink = event.target.closest("[data-category-link]");
    const adjust = event.target.closest("[data-adjust]");
    const remove = event.target.closest("[data-remove-cart]");
    const restock = event.target.closest("[data-restock]");
    const toggleImage = event.target.closest("[data-toggle-product-image]");

    if (add) await addToCart(add.dataset.addToCart);
    if (cat) setCategory(cat.dataset.category);
    if (catLink) setCategory(catLink.dataset.categoryLink);
    if (adjust) await adjustInventory(adjust.dataset.adjust, Number(adjust.dataset.delta));
    if (remove) await removeFromCart(remove.dataset.removeCart);
    if (restock) {
      const product = state.products.find((item) => item.id === restock.dataset.restock);
      if (product) await adjustInventory(product.id, Number(product.restock || 0));
    }
    if (toggleImage) {
      const card = toggleImage.closest(".product-card");
      const shown = card.classList.toggle("is-showing-result");
      toggleImage.textContent = shown ? "Vedi prodotto" : "Vedi risultato";
      toggleImage.setAttribute("aria-pressed", shown ? "true" : "false");
    }

    if (event.target.closest(".cart-trigger")) openDrawer(dom.cartDrawer, ".cart-trigger");
    if (event.target.closest("[data-close-cart]")) closeDrawer(dom.cartDrawer, ".cart-trigger");
    if (event.target.closest("[data-restock-all]")) await restockAll();
    if (event.target.closest("[data-reset-demo]")) {
      if (!requireAdmin()) return;
      if (!confirm("Confermi il reset totale della demo?")) return;
      localStorage.clear();
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      window.location.reload();
    }
    if (event.target.closest("[data-cut-reset]")) {
      state.featuredCut = { ...defaultFreshCut };
      state.monthlyCuts = [defaultFreshCut];
      await saveFeaturedCut(state.featuredCut);
      await saveMonthlyCuts(state.monthlyCuts);
      syncUi();
    }
    if (event.target.closest("[data-checkout]")) {
      closeDrawer(dom.cartDrawer, ".cart-trigger");
      if (!state.cart.length) return showToast("Il carrello è vuoto.");
      window.location.hash = "#checkout";
    }
    if (event.target.closest("[data-product-delete]")) await deleteSelectedProduct();
    if (event.target.closest("[data-admin-logout]")) await logoutAdmin();
    if (event.target.closest("[data-export-products]")) {
      if (!requireAdmin()) return;
      exportJson("products-demo.json", state.products);
    }
    if (event.target.closest("[data-export-orders]")) {
      if (!requireAdmin()) return;
      exportJson("orders-demo.json", state.orders);
    }
    if (event.target.closest("[data-export-leads]")) {
      if (!requireAdmin()) return;
      exportJson("leads-demo.json", state.leads);
    }
    if (event.target.closest("[data-export-cuts]")) {
      if (!requireAdmin()) return;
      exportJson("cuts-demo.json", state.monthlyCuts);
    }
    if (event.target.closest("[data-copy-order]")) {
      const summary = dom.checkoutSuccessSummary.textContent || "";
      await navigator.clipboard.writeText(`Ordine ${dom.orderNumber.textContent}\n${summary}`);
      showToast("Riepilogo copiato.");
    }
    if (event.target.closest("[data-download-order]")) {
      const order = state.orders[0];
      if (order) exportJson(`${order.orderNumber}.json`, order);
    }
  });

  dom.productSearchInput?.addEventListener("input", () => renderProducts(dom, state.products, state.inventory, state.activeCategory));
  dom.productSortSelect?.addEventListener("change", () => renderProducts(dom, state.products, state.inventory, state.activeCategory));
  dom.productSelect?.addEventListener("change", (event) => fillProductForm(event.target.value));
  dom.productNewButton?.addEventListener("click", () => {
    dom.productSelect.value = "__new__";
    fillProductForm("__new__");
  });

  dom.checkoutForm.addEventListener("change", (event) => {
    if (event.target.name === "fulfillment") setFulfillmentUi();
  });
  dom.checkoutForm.addEventListener("submit", submitCheckout);
  dom.adminLoginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("adminEmail") || "").trim();
    const password = String(formData.get("adminPassword") || "").trim();
    unlockAdmin(password, email);
  });
  document.querySelector("[data-product-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveProductFromForm();
  });
  document.querySelector("[data-sections-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveSiteSectionsFromForm();
  });
  document.querySelector("[data-cut-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveFreshCut();
  });
  document.querySelector("[data-contact-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const message = String(fd.get("message") || "").trim();
    const privacy = fd.get("privacy") === "on";
    if (!/\S+@\S+\.\S+/.test(email) || message.length < 5 || !privacy || phone.length < 6) {
      return showToast("Compila correttamente il form contatti.");
    }
    await createLead({
      email,
      phone,
      subject: String(fd.get("subject") || "").trim(),
      message,
      privacy_accepted: true,
      source: "contact-form-demo"
    });
    state.leads = await getLeads();
    form.reset();
    showToast("Messaggio salvato in modalità demo. In produzione verrà inviato allo staff.");
  });

  window.addEventListener("hashchange", routeToPage);
  window.addEventListener("scroll", () => {
    document.querySelector(".site-header").dataset.elevated = window.scrollY > 12 ? "true" : "false";
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer(dom.cartDrawer, ".cart-trigger");
    }
    if (event.altKey && event.key.toLowerCase() === "g") window.location.hash = "#admin";
    if (event.altKey && event.key.toLowerCase() === "l") logoutAdmin();
  });
}

async function init() {
  if (CONFIG.ADMIN_MODE === "supabase-auth") {
    const sb = await getSupabaseClient();
    if (sb) {
      const { data } = await sb.auth.getSession();
      state.adminAuthenticated = Boolean(data?.session);
      sb.auth.onAuthStateChange((_event, session) => {
        state.adminAuthenticated = Boolean(session);
        if (!state.adminAuthenticated) {
          syncAdminVisibility();
        }
      });
    } else {
      state.adminAuthenticated = false;
    }
  }
  await loadState();
  bindEvents();
  syncUi();
  setFulfillmentUi();
  routeToPage();
}

init();
