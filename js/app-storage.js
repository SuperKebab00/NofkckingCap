export const ADMIN_SESSION_KEY = "no-cap-admin-session-v2";
export const CONSENT_STORAGE_KEY = "no-cap-consent-v1";
export const PAYPAL_CHECKOUT_KEY = "no-cap-paypal-checkout-v1";
export const STRIPE_CHECKOUT_KEY = "no-cap-stripe-checkout-v1";

function parseStoredJson(storage, key, fallback = null) {
  try {
    return JSON.parse(storage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function hasAdminSession() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

export function writeAdminSession() {
  sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export function readStoredConsent({
  defaultConsent,
  expectedVersion,
  isExpired,
}) {
  const parsed = parseStoredJson(localStorage, CONSENT_STORAGE_KEY);
  if (!parsed || typeof parsed !== "object") return null;
  const consent = {
    ...defaultConsent,
    ...parsed,
    necessary: true,
  };
  if (Number(consent.version || 0) !== Number(expectedVersion || 0))
    return null;
  if (isExpired(consent)) return null;
  return consent;
}

export function writeStoredConsent(consent) {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
}

export function writePendingPaypal(payload) {
  sessionStorage.setItem(PAYPAL_CHECKOUT_KEY, JSON.stringify(payload));
}

export function readPendingPaypal() {
  return parseStoredJson(sessionStorage, PAYPAL_CHECKOUT_KEY);
}

export function clearPendingPaypal() {
  sessionStorage.removeItem(PAYPAL_CHECKOUT_KEY);
}

export function writePendingStripe(payload) {
  sessionStorage.setItem(STRIPE_CHECKOUT_KEY, JSON.stringify(payload));
}

export function readPendingStripe() {
  return parseStoredJson(sessionStorage, STRIPE_CHECKOUT_KEY);
}

export function clearPendingStripe() {
  sessionStorage.removeItem(STRIPE_CHECKOUT_KEY);
}

export function clearLocalAppData() {
  localStorage.clear();
  clearAdminSession();
}
