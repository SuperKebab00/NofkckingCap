import assert from "node:assert/strict";

import {
  ADMIN_SESSION_KEY,
  clearAdminSession,
  clearLocalAppData,
  clearPendingPaypal,
  clearPendingStripe,
  CONSENT_STORAGE_KEY,
  hasAdminSession,
  PAYPAL_CHECKOUT_KEY,
  readPendingPaypal,
  readPendingStripe,
  readStoredConsent,
  STRIPE_CHECKOUT_KEY,
  writeAdminSession,
  writePendingPaypal,
  writePendingStripe,
  writeStoredConsent,
} from "../js/app-storage.js";

function createStorageMock() {
  const values = new Map();
  return {
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

globalThis.localStorage = createStorageMock();
globalThis.sessionStorage = createStorageMock();

assert.equal(hasAdminSession(), false);
writeAdminSession();
assert.equal(sessionStorage.getItem(ADMIN_SESSION_KEY), "1");
assert.equal(hasAdminSession(), true);
clearAdminSession();
assert.equal(sessionStorage.getItem(ADMIN_SESSION_KEY), null);
assert.equal(hasAdminSession(), false);

const consent = {
  necessary: true,
  analytics: true,
  marketing: false,
  timestamp: "2026-06-23T00:00:00.000Z",
  version: 1,
};
writeStoredConsent(consent);
assert.equal(
  localStorage.getItem(CONSENT_STORAGE_KEY),
  JSON.stringify(consent),
);
assert.deepEqual(
  readStoredConsent({
    defaultConsent: { necessary: true, analytics: false, marketing: false },
    expectedVersion: 1,
    isExpired: () => false,
  }),
  consent,
);
assert.equal(
  readStoredConsent({
    defaultConsent: { necessary: true, analytics: false, marketing: false },
    expectedVersion: 2,
    isExpired: () => false,
  }),
  null,
);
assert.equal(
  readStoredConsent({
    defaultConsent: { necessary: true, analytics: false, marketing: false },
    expectedVersion: 1,
    isExpired: () => true,
  }),
  null,
);

localStorage.setItem(CONSENT_STORAGE_KEY, "{bad json");
assert.equal(
  readStoredConsent({
    defaultConsent: { necessary: true, analytics: false, marketing: false },
    expectedVersion: 1,
    isExpired: () => false,
  }),
  null,
);

const paypalPending = { orderId: "order-1", paypalOrderId: "paypal-1" };
writePendingPaypal(paypalPending);
assert.equal(
  sessionStorage.getItem(PAYPAL_CHECKOUT_KEY),
  JSON.stringify(paypalPending),
);
assert.deepEqual(readPendingPaypal(), paypalPending);
clearPendingPaypal();
assert.equal(readPendingPaypal(), null);

const stripePending = { orderId: "order-2", stripeSessionId: "stripe-1" };
writePendingStripe(stripePending);
assert.equal(
  sessionStorage.getItem(STRIPE_CHECKOUT_KEY),
  JSON.stringify(stripePending),
);
assert.deepEqual(readPendingStripe(), stripePending);
clearPendingStripe();
assert.equal(readPendingStripe(), null);

localStorage.setItem("custom-local-key", "value");
writeAdminSession();
clearLocalAppData();
assert.equal(localStorage.getItem("custom-local-key"), null);
assert.equal(sessionStorage.getItem(ADMIN_SESSION_KEY), null);

console.log("App storage tests passed.");
