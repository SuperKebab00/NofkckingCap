export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function getMonthKey(dateValue = todayISO()) {
  return dateValue.slice(0, 7);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function formatDisplayDate(dateValue) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));
}

export function getCurrentMonthName() {
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export function getStockLabel(quantity) {
  if (quantity <= 0) {
    return { text: "Esaurito", level: "empty" };
  }

  if (quantity <= 2) {
    return { text: `Ultimi ${quantity}!`, level: "low" };
  }

  return { text: `${quantity} disponibili`, level: "ok" };
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function readImageFile(file, fallbackImage) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(fallbackImage);
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () =>
      reject(new Error("Immagine non leggibile")),
    );
    reader.readAsDataURL(file);
  });
}
