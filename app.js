import { CONFIG } from "./js/config.js";
import { defaultFreshCut } from "./js/data.js";
import { getSupabaseClient } from "./js/supabase-client.js";
import * as repository from "./js/repository.js";
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
import { escapeHtml, formatCurrency, todayISO } from "./js/utils.js";

const {
  clearCart,
  createLead,
  createOrder,
  deleteLead,
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
  updateOrderStatus,
  uploadImage
} = repository;

const ADMIN_SESSION_KEY = "no-cap-admin-session-v2";
const CONSENT_STORAGE_KEY = "no-cap-consent-v1";
const MAX_MONTHLY_CUTS = 24;

const state = {
  activeCategory: "all",
  adminAuthenticated: CONFIG.ADMIN_MODE === "local" && sessionStorage.getItem(ADMIN_SESSION_KEY) === "1",
  adminView: "data",
  cart: [],
  consent: null,
  featuredCut: defaultFreshCut,
  inventory: {},
  leads: [],
  monthlyCuts: [defaultFreshCut],
  orders: [],
  products: [],
  siteSections: {
    shopTitle: "Prodotti No Cap",
    shopCopy: "Catalogo professionale, disponibilità aggiornata e acquisto rapido.",
    shopCategories: [
      { value: "all", label: "All products" },
      { value: "hair", label: "Hair care" },
      { value: "styling", label: "Styling" },
      { value: "tools", label: "Tools" },
      { value: "accessories", label: "Accessories" }
    ]
  },
  toastTimer: null
};

const dom = getDom();
const drawerFocus = { previous: null };

function defaultConsent() {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: new Date().toISOString(),
    version: Number(CONFIG.COOKIE_POLICY_VERSION || 1)
  };
}

function isConsentExpired(consent) {
  const maxAgeDays = Number(CONFIG.COOKIE_CONSENT_MAX_AGE_DAYS || 180);
  if (!consent?.timestamp || maxAgeDays <= 0) return true;
  const ts = new Date(consent.timestamp).getTime();
  if (!Number.isFinite(ts)) return true;
  const ageMs = Date.now() - ts;
  return ageMs > maxAgeDays * 24 * 60 * 60 * 1000;
}

function readConsent() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY));
    if (!parsed || typeof parsed !== "object") return null;
    const consent = {
      ...defaultConsent(),
      ...parsed,
      necessary: true
    };
    const expectedVersion = Number(CONFIG.COOKIE_POLICY_VERSION || 1);
    if (Number(consent.version || 0) !== expectedVersion) return null;
    if (isConsentExpired(consent)) return null;
    return consent;
  } catch {
    return null;
  }
}

function applyConsent(consent) {
  state.consent = { ...defaultConsent(), ...(consent || {}), necessary: true };
  document.documentElement.dataset.consentAnalytics = state.consent.analytics ? "granted" : "denied";
  document.documentElement.dataset.consentMarketing = state.consent.marketing ? "granted" : "denied";
  window.NoCapConsent = {
    ...state.consent,
    canUse: (category) => Boolean(state.consent?.[category])
  };
}

function saveConsent(consent) {
  const next = { ...defaultConsent(), ...(consent || {}), necessary: true, timestamp: new Date().toISOString() };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
  applyConsent(next);
  if (dom.consentBanner) dom.consentBanner.hidden = true;
  closeConsentModal();
  showToast("Preferenze cookie salvate.");
}

function closeConsentModal() {
  if (!dom.consentModal) return;
  dom.consentModal.hidden = true;
  document.body.classList.remove("consent-open");
}

function openConsentModal() {
  if (!dom.consentModal) return;
  dom.consentModal.hidden = false;
  document.body.classList.add("consent-open");
  if (dom.consentAnalytics) dom.consentAnalytics.checked = Boolean(state.consent?.analytics);
  if (dom.consentMarketing) dom.consentMarketing.checked = Boolean(state.consent?.marketing);
}

function initConsentUi() {
  const stored = readConsent();
  if (stored) {
    applyConsent(stored);
    if (dom.consentBanner) dom.consentBanner.hidden = true;
    return;
  }
  applyConsent(defaultConsent());
  if (dom.consentBanner) dom.consentBanner.hidden = false;
}

function syncAdminVisibility({ clearError = false } = {}) {
  if (!dom.adminLoginForm || !dom.adminContent) return;
  if (clearError && dom.adminLoginError) dom.adminLoginError.textContent = "";
  const isAuthed = Boolean(state.adminAuthenticated);
  dom.adminLoginForm.hidden = isAuthed;
  dom.adminContent.hidden = !isAuthed;
  dom.adminLoginForm.setAttribute("aria-hidden", isAuthed ? "true" : "false");
  dom.adminContent.setAttribute("aria-hidden", isAuthed ? "false" : "true");
  dom.adminLoginForm.classList.toggle("is-hidden", isAuthed);
  dom.adminContent.classList.toggle("is-hidden", !isAuthed);
  document.body.classList.toggle("admin-authenticated", isAuthed);
  if (isAuthed) dom.adminLoginForm.reset();
}

function setAdminView(view) {
  const next = String(view || "").trim();
  state.adminView = ["data", "manage", "orders", "leads"].includes(next) ? next : "data";
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    const active = button.dataset.adminTab === state.adminView;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
    const active = panel.dataset.adminPanel === state.adminView;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
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

function getDefaultShopCategories(products) {
  const base = [{ value: "all", label: "All products" }];
  const seen = new Set(["all"]);
  products.forEach((product) => {
    const value = String(product.category || "").trim().toLowerCase();
    if (!value || seen.has(value)) return;
    seen.add(value);
    base.push({ value, label: value.charAt(0).toUpperCase() + value.slice(1) });
  });
  return base;
}

function normalizeShopCategories(raw, products) {
  const source = Array.isArray(raw) && raw.length ? raw : getDefaultShopCategories(products);
  const unique = [];
  const seen = new Set();
  source.forEach((item) => {
    const value = String(item?.value || "").trim().toLowerCase();
    const label = String(item?.label || "").trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    unique.push({ value, label: label || (value.charAt(0).toUpperCase() + value.slice(1)) });
  });
  if (!unique.some((item) => item.value === "all")) unique.unshift({ value: "all", label: "All products" });
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
  state.siteSections.shopCategories = normalizeShopCategories(state.siteSections.shopCategories, state.products);
  await persistCart();
}

function syncUi() {
  const expanded = cartExpanded();
  renderCategoryBar();
  renderProducts(dom, state.products, state.inventory, state.activeCategory);
  renderInventory(dom, state.products, state.inventory, state.monthlyCuts);
  renderCart(dom, expanded);
  renderCheckoutSummary(dom, expanded);
  renderFreshCut(dom, state.featuredCut);
  renderShowcase(dom, state.monthlyCuts);
  renderAdminStats();
  renderOrdersDashboard();
  renderLeadsDashboard();
  renderProductEditor();
  renderSiteSectionsEditor();
  renderCategoryEditor();
  applySiteSections();
  syncAdminVisibility();
  setAdminView(state.adminView);
}

function renderOrdersDashboard() {
  if (!dom.adminOrdersList) return;
  const orders = [...state.orders];
  const totalOrders = orders.length;
  const todayKey = todayISO();
  const todayOrders = orders.filter((order) => String(order.createdAt || "").slice(0, 10) === todayKey).length;
  const pendingOrders = orders.filter((order) => ["in-attesa", "pending"].includes(String(order.status || "").toLowerCase())).length;
  const completedOrders = orders.filter((order) => ["completato", "completed"].includes(String(order.status || "").toLowerCase())).length;
  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const avg = totalOrders ? revenue / totalOrders : 0;

  if (dom.adminOrdersTotal) dom.adminOrdersTotal.textContent = String(totalOrders);
  if (dom.adminOrdersToday) dom.adminOrdersToday.textContent = String(todayOrders);
  if (dom.adminOrdersPending) dom.adminOrdersPending.textContent = String(pendingOrders);
  if (dom.adminOrdersCompleted) dom.adminOrdersCompleted.textContent = String(completedOrders);
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
        <td>${String(order.createdAt || "").slice(0, 10) || "-"}</td>
        <td>${formatCurrency(Number(order.total || 0))}</td>
        <td>${String(order.status || "in-attesa")}</td>
        <td>
          <div class="order-actions">
            <select data-order-status="${order.id}" aria-label="Stato ordine ${order.orderNumber || order.id}">
              <option value="in-attesa" ${String(order.status || "").toLowerCase() === "in-attesa" ? "selected" : ""}>In attesa</option>
              <option value="in-lavorazione" ${String(order.status || "").toLowerCase() === "in-lavorazione" ? "selected" : ""}>In lavorazione</option>
              <option value="completato" ${String(order.status || "").toLowerCase() === "completato" || String(order.status || "").toLowerCase() === "completed" ? "selected" : ""}>Completato</option>
              <option value="annullato" ${String(order.status || "").toLowerCase() === "annullato" ? "selected" : ""}>Annullato</option>
            </select>
            <button class="mini-button" type="button" data-order-status-save="${order.id}">Salva</button>
            <button class="mini-button" type="button" data-order-detail="${order.id}">Dettagli</button>
          </div>
        </td>
      </tr>`)
    .join("");
}

function renderLeadsDashboard() {
  if (!dom.adminLeadsList) return;
  const leads = [...state.leads];
  const todayKey = todayISO();
  const todayLeads = leads.filter((lead) => String(lead.createdAt || "").slice(0, 10) === todayKey).length;
  if (dom.adminLeadsTotal) dom.adminLeadsTotal.textContent = String(leads.length);
  if (dom.adminLeadsToday) dom.adminLeadsToday.textContent = String(todayLeads);
  if (!leads.length) {
    dom.adminLeadsList.innerHTML = `<tr><td colspan="6">Nessuna richiesta contatto registrata.</td></tr>`;
    return;
  }

  dom.adminLeadsList.innerHTML = leads
    .slice(0, 12)
    .map((lead) => `
      <tr>
        <td>${escapeHtml(String(lead.createdAt || "").slice(0, 10) || "-")}</td>
        <td><a href="mailto:${escapeHtml(lead.email || "")}">${escapeHtml(lead.email || "-")}</a></td>
        <td><a href="tel:${escapeHtml(String(lead.phone || "").replace(/\\s+/g, ""))}">${escapeHtml(lead.phone || "-")}</a></td>
        <td>${escapeHtml(lead.subject || "-")}</td>
        <td>${escapeHtml(lead.message || "-")}</td>
        <td>
          <div class="order-actions order-actions--lead">
            <button class="mini-button" type="button" data-lead-done="${escapeHtml(lead.id)}">Fatta</button>
            <button class="mini-button" type="button" data-lead-delete="${escapeHtml(lead.id)}">Elimina</button>
          </div>
        </td>
      </tr>`)
    .join("");
}

async function removeLeadFromUi(leadId, label = "Richiesta rimossa.") {
  if (!requireAdmin()) return;
  try {
    await deleteLead(leadId);
    state.leads = await getLeads();
    renderLeadsDashboard();
    renderAdminStats();
    showToast(label);
  } catch {
    showToast("Impossibile aggiornare la richiesta.");
  }
}

async function saveOrderStatusFromUi(orderId) {
  if (!requireAdmin()) return;
  const select = document.querySelector(`[data-order-status="${orderId}"]`);
  if (!select) return;
  const nextStatus = String(select.value || "").trim();
  if (!nextStatus) return;
  try {
    await updateOrderStatus(orderId, nextStatus);
    state.orders = await getOrders();
    renderOrdersDashboard();
    showToast("Stato ordine aggiornato.");
  } catch {
    showToast("Impossibile aggiornare lo stato ordine.");
  }
}

function showOrderDetail(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  const itemCount = Array.isArray(order.items) ? order.items.reduce((sum, row) => sum + Number(row.quantity || 0), 0) : 0;
  const delivery = order.fulfillment === "shipping" ? "Spedizione" : "Ritiro";
  const payment = order.paymentMode === "paypal" ? "PayPal" : "In sede";
  showToast(`${order.orderNumber || order.id} · ${delivery} · ${payment} · ${itemCount} articoli`);
}

function renderCategoryBar() {
  if (!dom.categoryBar) return;
  const categories = normalizeShopCategories(state.siteSections.shopCategories, state.products);
  state.siteSections.shopCategories = categories;
  dom.categoryBar.innerHTML = categories
    .map((category) => `<button class="category-pill ${state.activeCategory === category.value ? "is-active" : ""}" type="button" data-category="${category.value}">${category.label}</button>`)
    .join("");
}

function renderCategoryEditor() {
  if (!dom.categorySelect) return;
  const categories = state.siteSections.shopCategories || [];
  dom.categorySelect.innerHTML = categories
    .map((category) => `<option value="${category.value}">${category.label}</option>`)
    .join("");
  const current = categories.some((item) => item.value === dom.categorySelect.value) ? dom.categorySelect.value : "all";
  dom.categorySelect.value = current;
  fillCategoryEditor(current);
}

function fillCategoryEditor(value) {
  const category = (state.siteSections.shopCategories || []).find((item) => item.value === value);
  if (!category) return;
  dom.categoryValueInput.value = category.value;
  dom.categoryLabelInput.value = category.label;
  dom.categoryDeleteButton.disabled = category.value === "all";
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
  if (dom.dataInventoryValue) dom.dataInventoryValue.textContent = formatCurrency(inventoryValue);
  if (dom.dataLowStock) dom.dataLowStock.textContent = String(lowStock);
  if (dom.adminKpiOrders) dom.adminKpiOrders.textContent = state.orders.length;
  if (dom.adminKpiLeads) dom.adminKpiLeads.textContent = state.leads.length;
  if (dom.adminKpiProducts) dom.adminKpiProducts.textContent = state.products.length;
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
  syncAdminVisibility();
  const aliases = { products: "shop", top: "home" };
  const requestedRoute = window.location.hash.replace("#", "") || "home";
  const route = aliases[requestedRoute] || requestedRoute;
  const valid = document.querySelector(`[data-page="${route}"]`) ? route : "home";
  document.querySelectorAll("[data-page]").forEach((page) => page.classList.toggle("is-active", page.dataset.page === valid));
  document.querySelectorAll(".main-nav a").forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === `#${valid}`));
  if (valid !== "checkout") {
    dom.checkoutForm.hidden = false;
    dom.checkoutSummary.hidden = true;
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
  const allowed = new Set((state.siteSections.shopCategories || []).map((item) => item.value));
  state.activeCategory = allowed.has(category) ? category : "all";
  document.querySelectorAll("[data-category]").forEach((button) => button.classList.toggle("is-active", button.dataset.category === state.activeCategory));
  renderProducts(dom, state.products, state.inventory, state.activeCategory);
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

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());
}

function isValidPhone(value) {
  const normalized = normalizePhone(value);
  const digits = normalized.replace(/\D/g, "");
  return /^\+?\d{8,15}$/.test(normalized) && digits.length >= 8 && digits.length <= 15 && !/^(\d)\1+$/.test(digits);
}

function validateContactForm(form, formData) {
  const errors = {};
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const privacy = formData.get("privacy") === "on";

  if (!email) errors.email = "Inserisci la tua email.";
  else if (!isValidEmail(email)) errors.email = "Inserisci una email valida.";
  if (!phone) errors.phone = "Inserisci un numero di telefono.";
  else if (!isValidPhone(phone)) errors.phone = "Inserisci un numero reale con prefisso, es. +39 320 000 0000.";
  if (!subject) errors.subject = "Inserisci l'oggetto della richiesta.";
  if (!message) errors.message = "Scrivi il messaggio.";
  else if (message.length < 10) errors.message = "Scrivi almeno 10 caratteri.";
  if (!privacy) errors.privacy = "Accetta la Privacy Policy per inviare la richiesta.";

  form.querySelectorAll("[data-contact-error-for]").forEach((node) => { node.textContent = ""; });
  Object.entries(errors).forEach(([key, messageText]) => {
    const node = form.querySelector(`[data-contact-error-for="${key}"]`);
    if (node) node.textContent = messageText;
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
    status: "in-attesa",
    paymentMode: formData.get("paymentMode") || "in-shop"
  };
}

async function saveSiteSectionsFromForm() {
  if (!requireAdmin()) return;
  const rawValue = String(dom.categoryValueInput.value || "").trim().toLowerCase();
  const rawLabel = String(dom.categoryLabelInput.value || "").trim();
  if (!rawValue || !rawLabel) return showToast("Compila chiave e nome categoria.");
  const nextCategories = [...(state.siteSections.shopCategories || [])];
  const selected = dom.categorySelect.value;
  const existingIndex = nextCategories.findIndex((item) => item.value === selected);
  const duplicateIndex = nextCategories.findIndex((item) => item.value === rawValue);
  if (duplicateIndex >= 0 && duplicateIndex !== existingIndex) return showToast("Categoria gia presente.");
  if (existingIndex >= 0) {
    nextCategories[existingIndex] = { value: rawValue, label: rawLabel };
    state.products = state.products.map((product) => (
      product.category === selected ? { ...product, category: rawValue, label: rawLabel } : product
    ));
  }
  state.siteSections = {
    shopTitle: dom.sectionShopTitleInput.value.trim() || state.siteSections.shopTitle,
    shopCopy: dom.sectionShopCopyInput.value.trim() || state.siteSections.shopCopy,
    shopCategories: normalizeShopCategories(nextCategories, state.products)
  };
  await saveProducts(state.products);
  await saveSiteSections(state.siteSections);
  applySiteSections();
  renderCategoryBar();
  renderCategoryEditor();
  showToast("Sezioni aggiornate.");
}

async function addCategorySection() {
  if (!requireAdmin()) return;
  const value = String(dom.categoryValueInput.value || "").trim().toLowerCase();
  const label = String(dom.categoryLabelInput.value || "").trim();
  if (!value || !label) return showToast("Inserisci chiave e nome categoria.");
  if ((state.siteSections.shopCategories || []).some((item) => item.value === value)) return showToast("Categoria gia esistente.");
  state.siteSections.shopCategories.push({ value, label });
  state.siteSections.shopCategories = normalizeShopCategories(state.siteSections.shopCategories, state.products);
  await saveSiteSections(state.siteSections);
  renderCategoryBar();
  renderCategoryEditor();
  dom.categorySelect.value = value;
  fillCategoryEditor(value);
  showToast("Sezione categoria aggiunta.");
}

async function deleteCategorySection() {
  if (!requireAdmin()) return;
  const value = String(dom.categorySelect.value || "").trim().toLowerCase();
  if (!value || value === "all") return showToast("ALL non puo essere rimossa.");
  state.siteSections.shopCategories = (state.siteSections.shopCategories || []).filter((item) => item.value !== value);
  state.products = state.products.map((product) => (
    product.category === value ? { ...product, category: "accessories", label: "Accessories" } : product
  ));
  if (state.activeCategory === value) state.activeCategory = "all";
  await saveProducts(state.products);
  await saveSiteSections(state.siteSections);
  syncUi();
  showToast("Sezione categoria rimossa.");
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
    showToast("PayPal selezionato per questo ordine.");
  }
  await new Promise((resolve) => setTimeout(resolve, 900));
  await createOrder(order);
  await clearCart();
  state.orders = await getOrders();
  state.cart = [];
  syncUi();
  dom.orderNumber.textContent = order.orderNumber;
  renderCheckoutSuccessSummary(dom, order);
  renderCheckoutSummary(
    dom,
    order.items.map((item) => ({
      product: { name: item.productName, price: item.unitPrice },
      quantity: item.quantity
    })),
    order.total
  );
  dom.checkoutForm.hidden = true;
  dom.checkoutSummary.hidden = false;
  dom.checkoutSuccess.hidden = false;
  payButton.disabled = false;
  payButton.textContent = old;
  showToast("Ordine creato con successo.");
}

function setFulfillmentUi() {
  const value = dom.checkoutForm.querySelector('input[name="fulfillment"]:checked')?.value;
  const shipping = value === "shipping";
  dom.shippingFields.hidden = !shipping;
}

async function unlockAdmin(password, email = "") {
  if (dom.adminLoginError) dom.adminLoginError.textContent = "";
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
    state.adminView = "data";
    syncAdminVisibility({ clearError: true });
    setAdminView("data");
    showToast("Accesso admin eseguito.");
    return;
  }

  if (CONFIG.ADMIN_MODE === "local") {
    if (password !== CONFIG.LOCAL_ADMIN_PASSWORD) {
      dom.adminLoginError.textContent = "Password non valida.";
      return;
    }
    state.adminAuthenticated = true;
    sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    state.adminView = "data";
    syncAdminVisibility({ clearError: true });
    setAdminView("data");
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
  syncAdminVisibility({ clearError: true });
  setAdminView("data");
  if (isAdminRoute()) dom.adminLoginForm?.querySelector('input[name="adminEmail"]')?.focus();
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
    const consentOpen = event.target.closest("[data-open-consent], [data-consent-open]");
    const consentClose = event.target.closest("[data-consent-close]");
    const consentAccept = event.target.closest("[data-consent-accept]");
    const consentReject = event.target.closest("[data-consent-reject]");
    const consentSaveSelected = event.target.closest("[data-consent-save-selected]");

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
    if (consentOpen) openConsentModal();
    if (consentClose) closeConsentModal();
    if (consentAccept) saveConsent({ necessary: true, analytics: true, marketing: true });
    if (consentReject) saveConsent({ necessary: true, analytics: false, marketing: false });
    if (consentSaveSelected) {
      saveConsent({
        necessary: true,
        analytics: Boolean(dom.consentAnalytics?.checked),
        marketing: Boolean(dom.consentMarketing?.checked)
      });
    }

    if (event.target.closest(".cart-trigger")) openDrawer(dom.cartDrawer, ".cart-trigger");
    if (event.target.closest("[data-close-cart]")) closeDrawer(dom.cartDrawer, ".cart-trigger");
    if (event.target.closest("[data-restock-all]")) await restockAll();
    if (event.target.closest("[data-reset-local]")) {
      if (!requireAdmin()) return;
      if (!confirm("Confermi il ripristino dei dati locali?")) return;
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
    if (event.target.closest("[data-category-new]")) await addCategorySection();
    if (event.target.closest("[data-category-delete]")) await deleteCategorySection();
    const orderSave = event.target.closest("[data-order-status-save]");
    const orderDetail = event.target.closest("[data-order-detail]");
    const leadDone = event.target.closest("[data-lead-done]");
    const leadDelete = event.target.closest("[data-lead-delete]");
    if (orderSave) await saveOrderStatusFromUi(orderSave.dataset.orderStatusSave);
    if (orderDetail) showOrderDetail(orderDetail.dataset.orderDetail);
    if (leadDone) await removeLeadFromUi(leadDone.dataset.leadDone, "Richiesta segnata come fatta.");
    if (leadDelete) await removeLeadFromUi(leadDelete.dataset.leadDelete, "Richiesta eliminata.");
    const adminTab = event.target.closest("[data-admin-tab]");
    if (adminTab && requireAdmin()) {
      setAdminView(adminTab.dataset.adminTab);
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
  dom.categorySelect?.addEventListener("change", (event) => fillCategoryEditor(event.target.value));
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
    if (!validateContactForm(form, fd)) {
      return showToast("Controlla i campi del form contatti.");
    }
    const email = String(fd.get("email") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const subject = String(fd.get("subject") || "").trim();
    const message = String(fd.get("message") || "").trim();
    await createLead({
      email,
      phone,
      subject,
      message,
      privacy_accepted: true,
      source: "contact-form"
    });
    state.leads = await getLeads();
    renderLeadsDashboard();
    renderAdminStats();
    form.reset();
    showToast("Messaggio inviato allo staff.");
  });

  window.addEventListener("hashchange", routeToPage);
  window.addEventListener("scroll", () => {
    document.querySelector(".site-header").dataset.elevated = window.scrollY > 12 ? "true" : "false";
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer(dom.cartDrawer, ".cart-trigger");
      closeConsentModal();
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
        syncAdminVisibility({ clearError: true });
        routeToPage();
      });
    } else {
      state.adminAuthenticated = false;
    }
  }
  await loadState();
  initConsentUi();
  bindEvents();
  syncAdminVisibility({ clearError: true });
  syncUi();
  setFulfillmentUi();
  routeToPage();
}

init();
