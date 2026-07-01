export type PublicFlowProduct = {
  name: string;
  price?: number | string | null;
};

export type ContactInitialContext = {
  message?: string;
  product?: string;
  subject?: string;
};

export type ContactFormMode = "live" | "preview" | "disabled";

export const CONTACT_FORM_ENDPOINT = "/api/contact/create";

export const SHOP_FLOW_COPY = {
  checkoutCta: "Prepara ritiro in shop",
  contactCta: "Chiedi disponibilita",
  helperText:
    "Vuoi ritirarlo o comprarlo in negozio? Avvia il riepilogo in-shop oppure chiedi disponibilita prima di passare.",
} as const;

export const CHECKOUT_FLOW_COPY = {
  emptyStateTitle: "Nessun prodotto selezionato",
  emptyStateBody:
    "Nessun prodotto selezionato. Parti dallo shop pubblico per scegliere cosa ritirare o acquistare in negozio, poi torna qui per un riepilogo piu mirato.",
  noAutomaticOrderNote:
    "Nessuna conferma ordine automatica: definizione finale in negozio o tramite contatto diretto.",
} as const;

export const CONTACT_FLOW_COPY = {
  contextualBoxLabel: "Richiesta per",
  contextualBoxBody:
    "Questo form puo essere usato per verificare disponibilita, preparare il ritiro in negozio oppure inviare una richiesta generica.",
  genericHelper:
    "Puoi usare questo form per disponibilita prodotto, ritiro in shop o domande generiche. Nessun ordine viene confermato automaticamente da qui.",
  noAutomaticOrderNote:
    "Il form non crea ordini automatici e non conferma pagamenti online.",
} as const;

export function getContactFormMode(value?: string | null): ContactFormMode {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "preview") return "preview";
  if (normalized === "disabled") return "disabled";
  return "live";
}

export function isContactFormSubmissionEnabled(mode: ContactFormMode) {
  return mode === "live";
}

export function getContactFormModeMessage(mode: ContactFormMode) {
  if (mode === "preview") {
    return "Preview attiva: il form resta visibile per verifica UI, ma l'invio e disabilitato per evitare errori same-origin su /api/contact/create.";
  }

  if (mode === "disabled") {
    return "Invio disabilitato da configurazione pubblica. Usa telefono o WhatsApp finche il backend contact non viene collegato allo stesso dominio.";
  }

  return "";
}

export function buildShopCheckoutHref(productName: string) {
  return `/checkout?product=${encodeURIComponent(productName)}`;
}

export function buildShopContactHref(productName: string) {
  const params = new URLSearchParams({
    product: productName,
    subject: `Disponibilita ${productName}`,
  });

  return `/contact?${params.toString()}`;
}

export function buildCheckoutContactHref(productName?: string) {
  if (typeof productName === "string" && productName.trim()) {
    const normalized = productName.trim();
    const params = new URLSearchParams({
      product: normalized,
      subject: `Richiesta ${normalized} in shop`,
    });

    return `/contact?${params.toString()}`;
  }

  return "/contact?subject=Richiesta%20acquisto%20in%20negozio";
}

export function findCheckoutProduct<T extends PublicFlowProduct>(
  products: T[],
  requestedProduct: string,
) {
  const normalizedProduct = requestedProduct.trim().toLowerCase();
  if (!normalizedProduct) return null;

  return (
    products.find(
      (product) => product.name.trim().toLowerCase() === normalizedProduct,
    ) || null
  );
}

export function formatCheckoutPrice(price: number | string | null | undefined) {
  if (typeof price === "number" && Number.isFinite(price)) {
    return new Intl.NumberFormat("it-IT", {
      currency: "EUR",
      style: "currency",
    }).format(price);
  }

  if (typeof price === "string" && price.trim()) {
    return price.trim();
  }

  return null;
}

export function buildContactInitialValues(initialContext?: ContactInitialContext) {
  const product = initialContext?.product?.trim() || "";
  const subject = initialContext?.subject?.trim() || "";
  const message = initialContext?.message?.trim() || "";

  return {
    message:
      message ||
      (product
        ? `Ciao, vorrei ricevere disponibilita per ${product} e capire come procedere con l'acquisto o il ritiro in negozio.`
        : ""),
    subject: subject || (product ? `Richiesta ${product} in shop` : ""),
  };
}
