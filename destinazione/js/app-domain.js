export const ORDER_PENDING_STATUSES = [
  "prenotato",
  "pending-payment",
  "pagato",
  "in-lavorazione",
];

export const ORDER_COMPLETED_STATUSES = ["spedito", "completato", "completed"];

export function normalizeOrderStatus(status) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  if (normalized === "in-attesa" || normalized === "pending")
    return "prenotato";
  if (normalized === "paid") return "pagato";
  if (normalized === "completed") return "completato";
  return normalized || "prenotato";
}

export function getOrderStatusLabel(status) {
  switch (normalizeOrderStatus(status)) {
    case "prenotato":
      return "Prenotato";
    case "pending-payment":
      return "Attesa pagamento";
    case "pagato":
      return "Pagato";
    case "in-lavorazione":
      return "In lavorazione";
    case "spedito":
      return "Spedito";
    case "completato":
      return "Completato";
    case "annullato":
      return "Annullato";
    default:
      return String(status || "Prenotato");
  }
}

export function getDefaultShopCategories(products) {
  const base = [{ value: "all", label: "All products" }];
  const seen = new Set(["all"]);
  products.forEach((product) => {
    const value = String(product.category || "")
      .trim()
      .toLowerCase();
    if (!value || seen.has(value)) return;
    seen.add(value);
    base.push({ value, label: value.charAt(0).toUpperCase() + value.slice(1) });
  });
  return base;
}

export function normalizeShopCategories(raw, products) {
  const source =
    Array.isArray(raw) && raw.length ? raw : getDefaultShopCategories(products);
  const unique = [];
  const seen = new Set();
  source.forEach((item) => {
    const value = String(item?.value || "")
      .trim()
      .toLowerCase();
    const label = String(item?.label || "").trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    unique.push({
      value,
      label: label || value.charAt(0).toUpperCase() + value.slice(1),
    });
  });
  if (!unique.some((item) => item.value === "all"))
    unique.unshift({ value: "all", label: "All products" });
  return unique;
}

export function normalizeCart(rawCart, products, inventory) {
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

export function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());
}

export function isValidPhone(value) {
  const normalized = normalizePhone(value);
  const digits = normalized.replace(/\D/g, "");
  return (
    /^\+?\d{8,15}$/.test(normalized) &&
    digits.length >= 8 &&
    digits.length <= 15 &&
    !/^(\d)\1+$/.test(digits)
  );
}
