import { CONFIG, isPaymentMethodEnabled } from "./js/config.js";
import { buildCheckoutOrderPayload } from "./js/checkout-domain.js";
import { defaultFreshCut } from "./js/data.js";
import {
  getOrderStatusLabel,
  isValidEmail,
  isValidPhone,
  normalizeCart,
  normalizeOrderStatus,
  normalizeShopCategories,
  ORDER_COMPLETED_STATUSES,
  ORDER_PENDING_STATUSES,
} from "./js/app-domain.js";
import {
  clearAdminSession,
  clearLocalAppData,
  clearPendingPaypal,
  clearPendingStripe,
  hasAdminSession,
  readPendingPaypal,
  readPendingStripe,
  readStoredConsent,
  writeAdminSession,
  writePendingPaypal,
  writePendingStripe,
  writeStoredConsent,
} from "./js/app-storage.js";
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
  renderShowcase,
} from "./js/render.js";
import { escapeHtml, formatCurrency, todayISO } from "./js/utils.js";

const {
  clearCart,
  deleteProduct,
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
  uploadImage,
} = repository;

const MAX_MONTHLY_CUTS = 24;
const MOBILE_HEADER_BREAKPOINT = 780;

const state = {
  activeCategory: "all",
  adminAuthenticated: CONFIG.ADMIN_MODE === "local" && hasAdminSession(),
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
    shopCopy:
      "Catalogo professionale, disponibilità aggiornata e acquisto rapido.",
    shopCategories: [
      { value: "all", label: "All products" },
      { value: "hair", label: "Hair care" },
      { value: "styling", label: "Styling" },
      { value: "tools", label: "Tools" },
      { value: "accessories", label: "Accessories" },
    ],
  },
  toastTimer: null,
};

const dom = getDom();
const drawerFocus = { previous: null };
let lastScrollY = 0;

function defaultConsent() {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: new Date().toISOString(),
    version: Number(CONFIG.COOKIE_POLICY_VERSION || 1),
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
  return readStoredConsent({
    defaultConsent: defaultConsent(),
    expectedVersion: Number(CONFIG.COOKIE_POLICY_VERSION || 1),
    isExpired: isConsentExpired,
  });
}

function syncHeaderOnScroll() {
  if (!dom.siteHeader) return;

  const currentScrollY = window.scrollY;
  dom.siteHeader.dataset.elevated = currentScrollY > 12 ? "true" : "false";

  if (
    !window.matchMedia(`(max-width: ${MOBILE_HEADER_BREAKPOINT}px)`).matches
  ) {
    dom.siteHeader.dataset.scroll = "visible";
    lastScrollY = currentScrollY;
    return;
  }

  if (currentScrollY <= 16) {
    dom.siteHeader.dataset.scroll = "visible";
    lastScrollY = currentScrollY;
    return;
  }

  if (currentScrollY > lastScrollY + 4) {
    dom.siteHeader.dataset.scroll = "hidden";
  } else if (currentScrollY < lastScrollY - 4) {
    dom.siteHeader.dataset.scroll = "visible";
  }

  lastScrollY = currentScrollY;
}

function applyConsent(consent) {
  state.consent = { ...defaultConsent(), ...(consent || {}), necessary: true };
  document.documentElement.dataset.consentAnalytics = state.consent.analytics
    ? "granted"
    : "denied";
  document.documentElement.dataset.consentMarketing = state.consent.marketing
    ? "granted"
    : "denied";
  window.NoCapConsent = {
    ...state.consent,
    canUse: (category) => Boolean(state.consent?.[category]),
  };
}

function saveConsent(consent) {
  const next = {
    ...defaultConsent(),
    ...(consent || {}),
    necessary: true,
    timestamp: new Date().toISOString(),
  };
  writeStoredConsent(next);
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
  if (dom.consentAnalytics)
    dom.consentAnalytics.checked = Boolean(state.consent?.analytics);
  if (dom.consentMarketing)
    dom.consentMarketing.checked = Boolean(state.consent?.marketing);
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
  state.adminView = ["data", "manage", "orders", "leads"].includes(next)
    ? next
    : "data";
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
    const normalized = {
      ...defaultFreshCut,
      ...cut,
      date: cut?.date || todayISO(),
    };
    const key = `${normalized.date}|${normalized.name}|${String(normalized.image).slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(normalized);
    if (unique.length >= MAX_MONTHLY_CUTS) break;
  }
  return unique;
}

function getRealMonthlyCuts(cuts) {
  return (Array.isArray(cuts) ? cuts : []).filter(
    (cut) => cut?.id && cut.id !== defaultFreshCut.id,
  );
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

async function loadPublicState() {
  const [products, inventory, featuredCut, monthlyCuts, cart, siteSections] =
    await Promise.all([
      getProducts(),
      getInventory(),
      getFeaturedCut(),
      getMonthlyCuts(),
      getCart(),
      getSiteSections(),
    ]);
  state.products = products;
  state.inventory = inventory;
  state.featuredCut = { ...defaultFreshCut, ...featuredCut };
  state.monthlyCuts = normalizeCuts(monthlyCuts);
  state.cart = normalizeCart(cart, state.products, state.inventory);
  state.orders = [];
  state.leads = [];
  state.siteSections = { ...state.siteSections, ...(siteSections || {}) };
  state.siteSections.shopCategories = normalizeShopCategories(
    state.siteSections.shopCategories,
    state.products,
  );
  await persistCart();
}

async function loadAdminState() {
  if (!state.adminAuthenticated) {
    state.orders = [];
    state.leads = [];
    renderOrdersDashboard();
    renderLeadsDashboard();
    renderAdminStats();
    return;
  }

  const [orders, leads] = await Promise.all([getOrders(), getLeads()]);
  state.orders = orders;
  state.leads = leads;
  renderOrdersDashboard();
  renderLeadsDashboard();
  renderAdminStats();
}

async function reloadDbBackedState() {
  await loadPublicState();
  if (state.adminAuthenticated) {
    await loadAdminState();
  }
  syncUi();
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
  syncPaymentMethodAvailability();
  syncCheckoutButtonLabel();
}

function renderOrdersDashboard() {
  if (!dom.adminOrdersList) return;
  const orders = [...state.orders];
  const totalOrders = orders.length;
  const todayKey = todayISO();
  const todayOrders = orders.filter(
    (order) => String(order.createdAt || "").slice(0, 10) === todayKey,
  ).length;
  const pendingOrders = orders.filter((order) =>
    ORDER_PENDING_STATUSES.includes(normalizeOrderStatus(order.status)),
  ).length;
  const completedOrders = orders.filter((order) =>
    ORDER_COMPLETED_STATUSES.includes(normalizeOrderStatus(order.status)),
  ).length;
  const revenue = orders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0,
  );
  const avg = totalOrders ? revenue / totalOrders : 0;

  if (dom.adminOrdersTotal)
    dom.adminOrdersTotal.textContent = String(totalOrders);
  if (dom.adminOrdersToday)
    dom.adminOrdersToday.textContent = String(todayOrders);
  if (dom.adminOrdersPending)
    dom.adminOrdersPending.textContent = String(pendingOrders);
  if (dom.adminOrdersCompleted)
    dom.adminOrdersCompleted.textContent = String(completedOrders);
  if (dom.adminOrdersRevenue)
    dom.adminOrdersRevenue.textContent = formatCurrency(revenue);
  if (dom.adminOrdersAvg) dom.adminOrdersAvg.textContent = formatCurrency(avg);

  if (!orders.length) {
    dom.adminOrdersList.innerHTML = `<tr><td colspan="6">Nessun ordine registrato.</td></tr>`;
    return;
  }

  dom.adminOrdersList.innerHTML = orders
    .slice(0, 12)
    .map(
      (order) => `
      <tr>
        <td><strong>${escapeHtml(order.orderNumber || order.id || "-")}</strong></td>
        <td>${escapeHtml(order.customer?.fullName || "-")}</td>
        <td>${escapeHtml(String(order.createdAt || "").slice(0, 10) || "-")}</td>
        <td>${formatCurrency(Number(order.total || 0))}</td>
        <td>${escapeHtml(getOrderStatusLabel(order.status))}</td>
        <td>
          <div class="order-actions">
            <select data-order-status="${escapeHtml(order.id)}" aria-label="Stato ordine ${escapeHtml(order.orderNumber || order.id || "-")}">
              <option value="prenotato" ${normalizeOrderStatus(order.status) === "prenotato" ? "selected" : ""}>Prenotato</option>
              <option value="pending-payment" ${normalizeOrderStatus(order.status) === "pending-payment" ? "selected" : ""}>Attesa pagamento</option>
              <option value="pagato" ${normalizeOrderStatus(order.status) === "pagato" ? "selected" : ""}>Pagato</option>
              <option value="in-lavorazione" ${normalizeOrderStatus(order.status) === "in-lavorazione" ? "selected" : ""}>In lavorazione</option>
              <option value="spedito" ${normalizeOrderStatus(order.status) === "spedito" ? "selected" : ""}>Spedito</option>
              <option value="completato" ${normalizeOrderStatus(order.status) === "completato" ? "selected" : ""}>Completato</option>
              <option value="annullato" ${normalizeOrderStatus(order.status) === "annullato" ? "selected" : ""}>Annullato</option>
            </select>
            <button class="mini-button" type="button" data-order-status-save="${escapeHtml(order.id)}">Salva</button>
            <button class="mini-button" type="button" data-order-detail="${escapeHtml(order.id)}">Dettagli</button>
          </div>
        </td>
      </tr>`,
    )
    .join("");
}

function renderLeadsDashboard() {
  if (!dom.adminLeadsList) return;
  const leads = [...state.leads];
  const todayKey = todayISO();
  const todayLeads = leads.filter(
    (lead) => String(lead.createdAt || "").slice(0, 10) === todayKey,
  ).length;
  if (dom.adminLeadsTotal)
    dom.adminLeadsTotal.textContent = String(leads.length);
  if (dom.adminLeadsToday) dom.adminLeadsToday.textContent = String(todayLeads);
  if (!leads.length) {
    dom.adminLeadsList.innerHTML = `<tr><td colspan="6">Nessuna richiesta contatto registrata.</td></tr>`;
    return;
  }

  dom.adminLeadsList.innerHTML = leads
    .slice(0, 12)
    .map(
      (lead) => `
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
      </tr>`,
    )
    .join("");
}

async function removeLeadFromUi(leadId, label = "Richiesta rimossa.") {
  if (!requireAdmin()) return;
  try {
    await deleteLead(leadId);
    await reloadDbBackedState();
    showToast(label);
  } catch (error) {
    showToast(error.message || "Impossibile aggiornare la richiesta.");
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
    await reloadDbBackedState();
    showToast("Stato ordine aggiornato.");
  } catch (error) {
    showToast(error.message || "Impossibile aggiornare lo stato ordine.");
  }
}

function showOrderDetail(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  const itemCount = Array.isArray(order.items)
    ? order.items.reduce((sum, row) => sum + Number(row.quantity || 0), 0)
    : 0;
  const delivery = order.fulfillment === "shipping" ? "Spedizione" : "Ritiro";
  const payment =
    order.paymentMode === "paypal"
      ? "PayPal"
      : order.paymentMode === "stripe"
        ? "Carta / Stripe"
        : "In sede";
  showToast(
    `${order.orderNumber || order.id} · ${delivery} · ${payment} · ${itemCount} articoli`,
  );
}

function renderCategoryBar() {
  if (!dom.categoryBar) return;
  const categories = normalizeShopCategories(
    state.siteSections.shopCategories,
    state.products,
  );
  state.siteSections.shopCategories = categories;
  dom.categoryBar.innerHTML = categories
    .map(
      (category) =>
        `<button class="category-pill ${state.activeCategory === category.value ? "is-active" : ""}" type="button" data-category="${category.value}">${category.label}</button>`,
    )
    .join("");
}

function renderCategoryEditor() {
  if (!dom.categorySelect) return;
  const categories = state.siteSections.shopCategories || [];
  dom.categorySelect.innerHTML = categories
    .map(
      (category) =>
        `<option value="${category.value}">${category.label}</option>`,
    )
    .join("");
  const current = categories.some(
    (item) => item.value === dom.categorySelect.value,
  )
    ? dom.categorySelect.value
    : "all";
  dom.categorySelect.value = current;
  fillCategoryEditor(current);
}

function fillCategoryEditor(value) {
  const category = (state.siteSections.shopCategories || []).find(
    (item) => item.value === value,
  );
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
  if (dom.siteShopTitle && state.siteSections.shopTitle)
    dom.siteShopTitle.textContent = state.siteSections.shopTitle;
  if (dom.siteShopCopy && state.siteSections.shopCopy)
    dom.siteShopCopy.textContent = state.siteSections.shopCopy;
}

function renderAdminStats() {
  const quantities = state.products.map(
    (product) => state.inventory[product.id] ?? 0,
  );
  const totalUnits = quantities.reduce((sum, value) => sum + value, 0);
  const lowStock = quantities.filter((value) => value > 0 && value <= 2).length;
  const soldOut = quantities.filter((value) => value <= 0).length;
  const inventoryValue = state.products.reduce(
    (sum, product) =>
      sum + (state.inventory[product.id] ?? 0) * Number(product.price || 0),
    0,
  );
  const monthlyCount = getRealMonthlyCuts(state.monthlyCuts).filter((cut) =>
    String(cut.date).startsWith(todayISO().slice(0, 7)),
  ).length;
  const todayOrders = state.orders.filter(
    (order) => String(order.createdAt || "").slice(0, 10) === todayISO(),
  ).length;
  document.querySelector("[data-summary-total]").textContent = totalUnits;
  document.querySelector("[data-summary-low]").textContent = lowStock;
  document.querySelector("[data-summary-soldout]").textContent = soldOut;
  document.querySelector("[data-summary-cuts]").textContent = monthlyCount;
  document.querySelector("[data-summary-value]").textContent =
    formatCurrency(inventoryValue);
  document.querySelector("[data-summary-orders]").textContent = todayOrders;
  if (dom.dataInventoryValue)
    dom.dataInventoryValue.textContent = formatCurrency(inventoryValue);
  if (dom.dataLowStock) dom.dataLowStock.textContent = String(lowStock);
  if (dom.adminKpiOrders) dom.adminKpiOrders.textContent = state.orders.length;
  if (dom.adminKpiLeads) dom.adminKpiLeads.textContent = state.leads.length;
  if (dom.adminKpiProducts)
    dom.adminKpiProducts.textContent = state.products.length;
}

function renderProductEditor() {
  if (!dom.productSelect) return;
  const current = dom.productSelect.value || state.products[0]?.id || "";
  dom.productSelect.innerHTML = [
    `<option value="__new__">+ Nuovo prodotto</option>`,
    ...state.products.map((p) => `<option value="${p.id}">${p.name}</option>`),
  ].join("");
  dom.productSelect.value = state.products.some((p) => p.id === current)
    ? current
    : current === "__new__"
      ? "__new__"
      : state.products[0]?.id || "__new__";
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
  state.toastTimer = setTimeout(
    () => dom.toast.classList.remove("is-visible"),
    2600,
  );
}

function getEnabledPaymentMode(requestedMode) {
  if (requestedMode === "stripe" && isPaymentMethodEnabled("stripe"))
    return "stripe";
  if (requestedMode === "paypal" && isPaymentMethodEnabled("paypal"))
    return "paypal";
  return "in-shop";
}

function syncPaymentMethodAvailability() {
  document.querySelectorAll('input[name="paymentMode"]').forEach((input) => {
    const enabled = getEnabledPaymentMode(input.value) === input.value;
    input.disabled = !enabled;
    input
      .closest(".checkout-option")
      ?.classList.toggle("is-disabled", !enabled);
  });

  const selectedValue =
    dom.checkoutForm.querySelector('input[name="paymentMode"]:checked')
      ?.value || "in-shop";
  const validValue = getEnabledPaymentMode(selectedValue);
  if (selectedValue !== validValue) {
    const fallbackInput = dom.checkoutForm.querySelector(
      `input[name="paymentMode"][value="${validValue}"]`,
    );
    if (fallbackInput) fallbackInput.checked = true;
  }
}

function syncCheckoutButtonLabel() {
  const payButton = dom.checkoutForm?.querySelector("[data-pay-now]");
  if (!payButton) return;
  const paymentMode = getEnabledPaymentMode(
    dom.checkoutForm.querySelector('input[name="paymentMode"]:checked')?.value,
  );
  if (paymentMode === "paypal") {
    payButton.textContent = "Continua con PayPal";
    return;
  }
  if (paymentMode === "stripe") {
    payButton.textContent = "Continua con carta";
    return;
  }
  payButton.textContent = "Conferma ordine";
}

function renderCheckoutSuccess(order) {
  dom.orderNumber.textContent = order.orderNumber;
  renderCheckoutSuccessSummary(dom, order);
  renderCheckoutSummary(
    dom,
    order.items.map((item) => ({
      product: { name: item.productName, price: item.unitPrice },
      quantity: item.quantity,
    })),
    order.total,
  );
  dom.checkoutForm.hidden = true;
  dom.checkoutSummary.hidden = false;
  dom.checkoutSuccess.hidden = false;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 404 || response.status === 501) {
    throw new Error(
      "API backend non disponibile in questo ambiente locale. Avvia il progetto con Cloudflare Pages Functions attive.",
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("API error", {
      url,
      status: response.status,
    });
    throw new Error(data?.error || "Richiesta non riuscita.");
  }
  return data;
}

async function submitLeadRequest(payload) {
  return postJson("/api/contact/create", payload);
}

function clearCheckoutSearch(hash = "#checkout") {
  window.history.replaceState({}, "", `${window.location.pathname}${hash}`);
}

async function refreshStorefrontState() {
  state.inventory = await getInventory();
  state.products = await getProducts();
}

async function handlePaypalReturn() {
  const url = new URL(window.location.href);
  const paypalState = url.searchParams.get("paypal");
  if (!paypalState) return;

  const pending = readPendingPaypal();
  const orderId = url.searchParams.get("orderId") || pending?.orderId || "";
  const paypalOrderId =
    url.searchParams.get("token") || pending?.paypalOrderId || "";

  window.location.hash = "#checkout";

  if (paypalState === "cancel") {
    clearPendingPaypal();
    clearCheckoutSearch("#checkout");
    showToast("Pagamento PayPal annullato.");
    return;
  }

  if (paypalState !== "success" || !orderId || !paypalOrderId) {
    clearPendingPaypal();
    clearCheckoutSearch("#checkout");
    showToast("Ritorno PayPal non valido.");
    return;
  }

  try {
    const { order } = await postJson("/api/checkout/capture", {
      orderId,
      paypalOrderId,
    });
    await clearCart();
    clearPendingPaypal();
    state.cart = [];
    await refreshStorefrontState();
    if (state.adminAuthenticated) {
      await loadAdminState();
    }
    syncUi();
    renderCheckoutSuccess(order);
    clearCheckoutSearch("#checkout");
    showToast("Pagamento PayPal completato.");
  } catch (error) {
    clearCheckoutSearch("#checkout");
    showToast(error.message || "Impossibile confermare il pagamento PayPal.");
  }
}

async function handleStripeReturn() {
  const url = new URL(window.location.href);
  const stripeState = url.searchParams.get("stripe");
  if (!stripeState) return;

  const pending = readPendingStripe();
  const orderId = url.searchParams.get("orderId") || pending?.orderId || "";
  const stripeSessionId =
    url.searchParams.get("session_id") || pending?.stripeSessionId || "";

  window.location.hash = "#checkout";

  if (stripeState === "cancel") {
    clearPendingStripe();
    clearCheckoutSearch("#checkout");
    showToast("Pagamento con carta annullato.");
    return;
  }

  if (stripeState !== "success" || !orderId || !stripeSessionId) {
    clearPendingStripe();
    clearCheckoutSearch("#checkout");
    showToast("Ritorno Stripe non valido.");
    return;
  }

  try {
    const { order } = await postJson("/api/checkout/stripe/verify", {
      orderId,
      stripeSessionId,
    });
    await clearCart();
    clearPendingStripe();
    state.cart = [];
    await refreshStorefrontState();
    if (state.adminAuthenticated) {
      await loadAdminState();
    }
    syncUi();
    renderCheckoutSuccess(order);
    clearCheckoutSearch("#checkout");
    showToast("Pagamento con carta completato.");
  } catch (error) {
    clearCheckoutSearch("#checkout");
    showToast(error.message || "Impossibile confermare il pagamento Stripe.");
  }
}

function routeToPage() {
  syncAdminVisibility();
  const aliases = { products: "shop", top: "home" };
  const requestedRoute = window.location.hash.replace("#", "") || "home";
  const route = aliases[requestedRoute] || requestedRoute;
  const valid = document.querySelector(`[data-page="${route}"]`)
    ? route
    : "home";
  document
    .querySelectorAll("[data-page]")
    .forEach((page) =>
      page.classList.toggle("is-active", page.dataset.page === valid),
    );
  document
    .querySelectorAll(".main-nav a")
    .forEach((link) =>
      link.classList.toggle(
        "is-active",
        link.getAttribute("href") === `#${valid}`,
      ),
    );
  if (valid !== "checkout") {
    dom.checkoutForm.hidden = false;
    dom.checkoutSummary.hidden = true;
    dom.checkoutSuccess.hidden = true;
  }
  if (valid === "admin" && !state.adminAuthenticated) {
    dom.adminLoginError.textContent =
      "Accedi con account gestore per entrare nel pannello.";
    setTimeout(
      () =>
        dom.adminLoginForm?.querySelector('input[name="adminEmail"]')?.focus(),
      0,
    );
  }
  window.scrollTo({ top: 0, behavior: "auto" });
}

function trapFocus(drawer) {
  const focusables = [
    ...drawer.querySelectorAll(
      "button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])",
    ),
  ].filter((el) => !el.disabled && !el.hidden);
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
  document
    .querySelectorAll(triggerSelector)
    .forEach((item) => item.setAttribute("aria-expanded", "true"));
  document.body.classList.add("drawer-open");
  trapFocus(drawer);
}

function closeDrawer(drawer, triggerSelector) {
  drawer.setAttribute("aria-hidden", "true");
  document
    .querySelectorAll(triggerSelector)
    .forEach((item) => item.setAttribute("aria-expanded", "false"));
  if (drawer._focusTrap)
    drawer.removeEventListener("keydown", drawer._focusTrap);
  const anyOpen = [dom.cartDrawer].some(
    (item) => item.getAttribute("aria-hidden") === "false",
  );
  if (!anyOpen) document.body.classList.remove("drawer-open");
  drawerFocus.previous?.focus?.({ preventScroll: true });
}

function setCategory(category) {
  const allowed = new Set(
    (state.siteSections.shopCategories || []).map((item) => item.value),
  );
  state.activeCategory = allowed.has(category) ? category : "all";
  document
    .querySelectorAll("[data-category]")
    .forEach((button) =>
      button.classList.toggle(
        "is-active",
        button.dataset.category === state.activeCategory,
      ),
    );
  renderProducts(dom, state.products, state.inventory, state.activeCategory);
}

async function addToCart(productId) {
  const product = state.products.find((item) => item.id === productId);
  const available = Math.max(0, Number(state.inventory[productId] ?? 0));
  const row = state.cart.find((item) => item.productId === productId);
  const inCart = Number(row?.quantity || 0);
  if (!product || available <= 0) return showToast("Prodotto esaurito.");
  if (inCart >= available)
    return showToast(
      "Hai raggiunto la disponibilita massima per questo prodotto.",
    );
  if (row) row.quantity += 1;
  else state.cart.push({ productId, quantity: 1 });
  await persistCart();
  syncUi();
  openDrawer(dom.cartDrawer, ".cart-trigger");
}

async function removeFromCart(productId) {
  const row = state.cart.find((item) => item.productId === productId);
  if (!row) return;
  row.quantity -= 1;
  if (row.quantity <= 0)
    state.cart = state.cart.filter((item) => item.productId !== productId);
  await persistCart();
  syncUi();
}

async function adjustInventory(productId, amount) {
  if (!requireAdmin()) return;
  state.inventory[productId] = Math.max(
    0,
    (state.inventory[productId] ?? 0) + amount,
  );
  await saveInventory(state.inventory);
  await reloadDbBackedState();
}

async function restockAll() {
  if (!requireAdmin()) return;
  state.products.forEach((product) => {
    state.inventory[product.id] = Number(product.restock || 0);
  });
  await saveInventory(state.inventory);
  await reloadDbBackedState();
  showToast("Magazzino rifornito.");
}

async function saveFreshCut() {
  if (!requireAdmin()) return;
  const image = dom.cutFileInput.files[0]
    ? await uploadImage(dom.cutFileInput.files[0], { bucket: "cuts" })
    : state.featuredCut.image;
  const cut = {
    id: `cut-${Date.now()}`,
    name: dom.cutNameInput.value.trim() || defaultFreshCut.name,
    description: dom.cutTextInput.value.trim() || defaultFreshCut.description,
    image: image || state.featuredCut.image,
    date: dom.cutDateInput.value || todayISO(),
  };
  state.featuredCut = cut;
  state.monthlyCuts = normalizeCuts([cut, ...state.monthlyCuts]);
  await saveFeaturedCut(cut);
  await saveMonthlyCuts(state.monthlyCuts);
  await reloadDbBackedState();
  dom.cutFileInput.value = "";
  showToast("Taglio pubblicato.");
}

async function saveProductFromForm() {
  if (!requireAdmin()) return;
  const id = dom.productSelect.value;
  if (id === "__new__") {
    const name = dom.productNameInput.value.trim();
    const category =
      dom.productCategoryInput.value.trim().toLowerCase() || "accessories";
    if (!name) {
      showToast("Inserisci il nome prodotto.");
      return;
    }
    const newIdBase = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    let newId = newIdBase || `product-${Date.now()}`;
    let suffix = 1;
    while (state.products.some((item) => item.id === newId)) {
      newId = `${newIdBase}-${suffix++}`;
    }
    const packshot = dom.productPackshotInput.files[0]
      ? await uploadImage(dom.productPackshotInput.files[0], {
          bucket: "products",
        })
      : "";
    const lifestyle = dom.productLifestyleInput.files[0]
      ? await uploadImage(dom.productLifestyleInput.files[0], {
          bucket: "products",
        })
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
      images: { packshot, lifestyle },
    };
    state.products.unshift(product);
    state.inventory[newId] = restock;
    await saveProducts(state.products);
    await saveInventory(state.inventory);
    await reloadDbBackedState();
    dom.productSelect.value = newId;
    fillProductForm(newId);
    dom.productPackshotInput.value = "";
    dom.productLifestyleInput.value = "";
    showToast("Prodotto aggiunto al catalogo.");
    return;
  }
  const index = state.products.findIndex((item) => item.id === id);
  if (index < 0) return;
  const base = state.products[index];
  const packshot = dom.productPackshotInput.files[0]
    ? await uploadImage(dom.productPackshotInput.files[0], {
        bucket: "products",
      })
    : base.images?.packshot || "";
  const lifestyle = dom.productLifestyleInput.files[0]
    ? await uploadImage(dom.productLifestyleInput.files[0], {
        bucket: "products",
      })
    : base.images?.lifestyle || packshot;
  state.products[index] = {
    ...base,
    name: dom.productNameInput.value.trim() || base.name,
    category: dom.productCategoryInput.value.trim() || base.category,
    label: dom.productCategoryInput.value.trim() || base.label,
    price: Math.max(0, Number(dom.productPriceInput.value || base.price)),
    restock: Math.max(0, Number(dom.productRestockInput.value || base.restock)),
    images: { packshot, lifestyle },
  };
  await saveProducts(state.products);
  await reloadDbBackedState();
  dom.productSelect.value = id;
  fillProductForm(id);
  dom.productPackshotInput.value = "";
  dom.productLifestyleInput.value = "";
  showToast("Prodotto aggiornato.");
}

async function deleteSelectedProduct() {
  if (!requireAdmin()) return;
  if (state.products.length <= 1)
    return showToast("Serve almeno un prodotto nel catalogo.");
  const id = dom.productSelect.value;
  const product = state.products.find((item) => item.id === id);
  await deleteProduct(id);
  state.products = state.products.filter((item) => item.id !== id);
  state.cart = state.cart.filter((item) => item.productId !== id);
  delete state.inventory[id];
  await persistCart();
  await reloadDbBackedState();
  showToast(`${product?.name || "Prodotto"} rimosso.`);
}

function validateCheckout(formData) {
  const errors = {};
  if (!String(formData.get("fullName") || "").trim())
    errors.fullName = "Inserisci nome completo.";
  if (!/\S+@\S+\.\S+/.test(String(formData.get("email") || "")))
    errors.email = "Email non valida.";
  if (String(formData.get("phone") || "").trim().length < 6)
    errors.phone = "Telefono non valido.";
  if (formData.get("fulfillment") === "shipping") {
    if (!String(formData.get("address") || "").trim())
      errors.address = "Inserisci indirizzo.";
    if (!String(formData.get("city") || "").trim())
      errors.city = "Inserisci città.";
    if (!String(formData.get("zip") || "").trim())
      errors.zip = "Inserisci CAP.";
  }
  dom.checkoutForm.querySelectorAll(".field-error").forEach((node) => {
    node.textContent = "";
  });
  Object.entries(errors).forEach(([key, message]) => {
    const node = dom.checkoutForm.querySelector(`[data-error-for="${key}"]`);
    if (node) node.textContent = message;
  });
  return Object.keys(errors).length === 0;
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
  else if (!isValidPhone(phone))
    errors.phone =
      "Inserisci un numero reale con prefisso, es. +39 320 000 0000.";
  if (!subject) errors.subject = "Inserisci l'oggetto della richiesta.";
  if (!message) errors.message = "Scrivi il messaggio.";
  else if (message.length < 10) errors.message = "Scrivi almeno 10 caratteri.";
  if (!privacy)
    errors.privacy = "Accetta la Privacy Policy per inviare la richiesta.";

  form.querySelectorAll("[data-contact-error-for]").forEach((node) => {
    node.textContent = "";
  });
  Object.entries(errors).forEach(([key, messageText]) => {
    const node = form.querySelector(`[data-contact-error-for="${key}"]`);
    if (node) node.textContent = messageText;
  });

  return Object.keys(errors).length === 0;
}

function buildOrderPayload(formData) {
  return buildCheckoutOrderPayload({
    formData,
    cartRows: cartExpanded(),
    resolvePaymentMode: getEnabledPaymentMode,
  });
}

async function saveSiteSectionsFromForm() {
  if (!requireAdmin()) return;
  const rawValue = String(dom.categoryValueInput.value || "")
    .trim()
    .toLowerCase();
  const rawLabel = String(dom.categoryLabelInput.value || "").trim();
  if (!rawValue || !rawLabel)
    return showToast("Compila chiave e nome categoria.");
  const nextCategories = [...(state.siteSections.shopCategories || [])];
  const selected = dom.categorySelect.value;
  const existingIndex = nextCategories.findIndex(
    (item) => item.value === selected,
  );
  const duplicateIndex = nextCategories.findIndex(
    (item) => item.value === rawValue,
  );
  if (duplicateIndex >= 0 && duplicateIndex !== existingIndex)
    return showToast("Categoria gia presente.");
  if (existingIndex >= 0) {
    nextCategories[existingIndex] = { value: rawValue, label: rawLabel };
    state.products = state.products.map((product) =>
      product.category === selected
        ? { ...product, category: rawValue, label: rawLabel }
        : product,
    );
  }
  state.siteSections = {
    shopTitle:
      dom.sectionShopTitleInput.value.trim() || state.siteSections.shopTitle,
    shopCopy:
      dom.sectionShopCopyInput.value.trim() || state.siteSections.shopCopy,
    shopCategories: normalizeShopCategories(nextCategories, state.products),
  };
  await saveProducts(state.products);
  await saveSiteSections(state.siteSections);
  await reloadDbBackedState();
  showToast("Sezioni aggiornate.");
}

async function addCategorySection() {
  if (!requireAdmin()) return;
  const value = String(dom.categoryValueInput.value || "")
    .trim()
    .toLowerCase();
  const label = String(dom.categoryLabelInput.value || "").trim();
  if (!value || !label) return showToast("Inserisci chiave e nome categoria.");
  if (
    (state.siteSections.shopCategories || []).some(
      (item) => item.value === value,
    )
  )
    return showToast("Categoria gia esistente.");
  state.siteSections.shopCategories.push({ value, label });
  state.siteSections.shopCategories = normalizeShopCategories(
    state.siteSections.shopCategories,
    state.products,
  );
  await saveSiteSections(state.siteSections);
  await reloadDbBackedState();
  dom.categorySelect.value = value;
  fillCategoryEditor(value);
  showToast("Sezione categoria aggiunta.");
}

async function deleteCategorySection() {
  if (!requireAdmin()) return;
  const value = String(dom.categorySelect.value || "")
    .trim()
    .toLowerCase();
  if (!value || value === "all")
    return showToast("ALL non puo essere rimossa.");
  state.siteSections.shopCategories = (
    state.siteSections.shopCategories || []
  ).filter((item) => item.value !== value);
  state.products = state.products.map((product) =>
    product.category === value
      ? { ...product, category: "accessories", label: "Accessories" }
      : product,
  );
  if (state.activeCategory === value) state.activeCategory = "all";
  await saveProducts(state.products);
  await saveSiteSections(state.siteSections);
  await reloadDbBackedState();
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
  payButton.disabled = true;
  payButton.textContent = "Creazione ordine...";

  try {
    const orderDraft = buildOrderPayload(formData);
    const result = await postJson("/api/checkout/create", {
      order: orderDraft,
    });

    if (result.mode === "paypal") {
      writePendingPaypal({
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        paypalOrderId: result.paypalOrderId,
      });
      window.location.href = result.approvalUrl;
      return;
    }

    if (result.mode === "stripe") {
      writePendingStripe({
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        stripeSessionId: result.stripeSessionId,
      });
      window.location.href = result.checkoutUrl;
      return;
    }

    await clearCart();
    state.cart = [];
    await refreshStorefrontState();
    if (state.adminAuthenticated) {
      await loadAdminState();
    }
    syncUi();
    renderCheckoutSuccess(result.order);
    showToast("Ordine creato con successo.");
  } catch (error) {
    showToast(error.message || "Impossibile creare l'ordine.");
  } finally {
    payButton.disabled = false;
    syncCheckoutButtonLabel();
  }
}

function setFulfillmentUi() {
  const value = dom.checkoutForm.querySelector(
    'input[name="fulfillment"]:checked',
  )?.value;
  const shipping = value === "shipping";
  dom.shippingFields.hidden = !shipping;
  syncPaymentMethodAvailability();
  syncCheckoutButtonLabel();
}

async function unlockAdmin(password, email = "") {
  if (dom.adminLoginError) dom.adminLoginError.textContent = "";
  if (CONFIG.ADMIN_MODE === "supabase-auth") {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
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
      password,
    });
    if (error) {
      dom.adminLoginError.textContent =
        error.message || "Credenziali non valide.";
      showToast(
        `Login admin fallito: ${error.message || "errore sconosciuto"}`,
      );
      return;
    }
    state.adminAuthenticated = true;
    await loadAdminState();
    writeAdminSession();
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
    await loadAdminState();
    writeAdminSession();
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
  clearAdminSession();
  await loadAdminState();
  syncAdminVisibility({ clearError: true });
  setAdminView("data");
  if (isAdminRoute())
    dom.adminLoginForm?.querySelector('input[name="adminEmail"]')?.focus();
}

function exportJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
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
    const consentOpen = event.target.closest(
      "[data-open-consent], [data-consent-open]",
    );
    const consentClose = event.target.closest("[data-consent-close]");
    const consentAccept = event.target.closest("[data-consent-accept]");
    const consentReject = event.target.closest("[data-consent-reject]");
    const consentSaveSelected = event.target.closest(
      "[data-consent-save-selected]",
    );

    if (add) await addToCart(add.dataset.addToCart);
    if (cat) setCategory(cat.dataset.category);
    if (catLink) setCategory(catLink.dataset.categoryLink);
    if (adjust)
      await adjustInventory(
        adjust.dataset.adjust,
        Number(adjust.dataset.delta),
      );
    if (remove) await removeFromCart(remove.dataset.removeCart);
    if (restock) {
      const product = state.products.find(
        (item) => item.id === restock.dataset.restock,
      );
      if (product)
        await adjustInventory(product.id, Number(product.restock || 0));
    }
    if (toggleImage) {
      const card = toggleImage.closest(".product-card");
      const shown = card.classList.toggle("is-showing-result");
      toggleImage.textContent = shown ? "Vedi prodotto" : "Vedi risultato";
      toggleImage.setAttribute("aria-pressed", shown ? "true" : "false");
    }
    if (consentOpen) openConsentModal();
    if (consentClose) closeConsentModal();
    if (consentAccept)
      saveConsent({ necessary: true, analytics: true, marketing: true });
    if (consentReject)
      saveConsent({ necessary: true, analytics: false, marketing: false });
    if (consentSaveSelected) {
      saveConsent({
        necessary: true,
        analytics: Boolean(dom.consentAnalytics?.checked),
        marketing: Boolean(dom.consentMarketing?.checked),
      });
    }

    if (event.target.closest(".cart-trigger"))
      openDrawer(dom.cartDrawer, ".cart-trigger");
    if (event.target.closest("[data-close-cart]"))
      closeDrawer(dom.cartDrawer, ".cart-trigger");
    if (event.target.closest("[data-restock-all]")) await restockAll();
    if (event.target.closest("[data-reset-local]")) {
      if (!requireAdmin()) return;
      if (!confirm("Confermi il ripristino dei dati locali?")) return;
      clearLocalAppData();
      window.location.reload();
    }
    if (event.target.closest("[data-cut-reset]")) {
      state.featuredCut = { ...defaultFreshCut };
      state.monthlyCuts = [defaultFreshCut];
      await saveFeaturedCut(state.featuredCut);
      await saveMonthlyCuts(state.monthlyCuts);
      await reloadDbBackedState();
    }
    if (event.target.closest("[data-checkout]")) {
      closeDrawer(dom.cartDrawer, ".cart-trigger");
      if (!state.cart.length) return showToast("Il carrello è vuoto.");
      window.location.hash = "#checkout";
    }
    if (event.target.closest("[data-product-delete]"))
      await deleteSelectedProduct();
    if (event.target.closest("[data-admin-logout]")) await logoutAdmin();
    if (event.target.closest("[data-category-new]")) await addCategorySection();
    if (event.target.closest("[data-category-delete]"))
      await deleteCategorySection();
    const orderSave = event.target.closest("[data-order-status-save]");
    const orderDetail = event.target.closest("[data-order-detail]");
    const leadDone = event.target.closest("[data-lead-done]");
    const leadDelete = event.target.closest("[data-lead-delete]");
    if (orderSave)
      await saveOrderStatusFromUi(orderSave.dataset.orderStatusSave);
    if (orderDetail) showOrderDetail(orderDetail.dataset.orderDetail);
    if (leadDone)
      await removeLeadFromUi(
        leadDone.dataset.leadDone,
        "Richiesta segnata come fatta.",
      );
    if (leadDelete)
      await removeLeadFromUi(
        leadDelete.dataset.leadDelete,
        "Richiesta eliminata.",
      );
    const adminTab = event.target.closest("[data-admin-tab]");
    if (adminTab && requireAdmin()) {
      setAdminView(adminTab.dataset.adminTab);
    }
    if (event.target.closest("[data-copy-order]")) {
      const summary = dom.checkoutSuccessSummary.textContent || "";
      await navigator.clipboard.writeText(
        `Ordine ${dom.orderNumber.textContent}\n${summary}`,
      );
      showToast("Riepilogo copiato.");
    }
    if (event.target.closest("[data-download-order]")) {
      const order = state.orders[0];
      if (order) exportJson(`${order.orderNumber}.json`, order);
    }
  });

  dom.productSearchInput?.addEventListener("input", () =>
    renderProducts(dom, state.products, state.inventory, state.activeCategory),
  );
  dom.productSortSelect?.addEventListener("change", () =>
    renderProducts(dom, state.products, state.inventory, state.activeCategory),
  );
  dom.categorySelect?.addEventListener("change", (event) =>
    fillCategoryEditor(event.target.value),
  );
  dom.productSelect?.addEventListener("change", (event) =>
    fillProductForm(event.target.value),
  );
  dom.productNewButton?.addEventListener("click", () => {
    dom.productSelect.value = "__new__";
    fillProductForm("__new__");
  });

  dom.checkoutForm.addEventListener("change", (event) => {
    if (
      event.target.name === "fulfillment" ||
      event.target.name === "paymentMode"
    )
      setFulfillmentUi();
  });
  dom.checkoutForm.addEventListener("submit", submitCheckout);
  dom.adminLoginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("adminEmail") || "").trim();
    const password = String(formData.get("adminPassword") || "").trim();
    unlockAdmin(password, email);
  });
  document
    .querySelector("[data-product-form]")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveProductFromForm();
    });
  document
    .querySelector("[data-sections-form]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveSiteSectionsFromForm();
    });
  document
    .querySelector("[data-cut-form]")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveFreshCut();
    });
  document
    .querySelector("[data-contact-form]")
    .addEventListener("submit", async (event) => {
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
      await submitLeadRequest({
        email,
        phone,
        subject,
        message,
        privacy_accepted: true,
        source: "contact-form",
        website: String(fd.get("website") || ""),
      });
      if (state.adminAuthenticated) {
        await loadAdminState();
      }
      form.reset();
      showToast("Messaggio inviato allo staff.");
    });

  window.addEventListener("hashchange", routeToPage);
  window.addEventListener("scroll", syncHeaderOnScroll, { passive: true });
  window.addEventListener("resize", syncHeaderOnScroll);
  syncHeaderOnScroll();
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer(dom.cartDrawer, ".cart-trigger");
      closeConsentModal();
    }
    if (event.altKey && event.key.toLowerCase() === "g")
      window.location.hash = "#admin";
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
        loadAdminState().catch(() => {
          state.orders = [];
          state.leads = [];
        });
        syncAdminVisibility({ clearError: true });
        routeToPage();
      });
    } else {
      state.adminAuthenticated = false;
    }
  }
  await loadPublicState();
  if (state.adminAuthenticated) {
    await loadAdminState();
  }
  initConsentUi();
  bindEvents();
  await handlePaypalReturn();
  await handleStripeReturn();
  syncAdminVisibility({ clearError: true });
  syncUi();
  setFulfillmentUi();
  routeToPage();
}

init();
