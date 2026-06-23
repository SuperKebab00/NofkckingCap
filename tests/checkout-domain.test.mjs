import assert from "node:assert/strict";

import { buildCheckoutOrderPayload } from "../js/checkout-domain.js";

function makeFormData(entries) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

const cartRows = [
  {
    product: {
      id: "aftershave",
      name: "Aftershave",
      price: 15,
    },
    quantity: 2,
    lineTotal: 30,
  },
];
const cartRowsSnapshot = structuredClone(cartRows);

const pickupFormData = makeFormData({
  fullName: " Mario Rossi ",
  email: " mario@example.com ",
  phone: " +39 320 000 0000 ",
  fulfillment: "pickup",
  paymentMode: "paypal",
  address: " Via Roma 1 ",
  city: " Vignola ",
  zip: " 41058 ",
});

const pickupPayload = buildCheckoutOrderPayload({
  formData: pickupFormData,
  cartRows,
  resolvePaymentMode: (mode) => (mode === "paypal" ? "paypal" : "in-shop"),
});

assert.deepEqual(pickupPayload, {
  customer: {
    fullName: "Mario Rossi",
    email: "mario@example.com",
    phone: "+39 320 000 0000",
  },
  fulfillment: "pickup",
  shippingAddress: null,
  items: [{ productId: "aftershave", quantity: 2 }],
  paymentMode: "paypal",
});
assert.deepEqual(cartRows, cartRowsSnapshot);
assert.equal(pickupFormData.get("fullName"), " Mario Rossi ");

const shippingFormData = makeFormData({
  fullName: " Giulia Bianchi ",
  email: " giulia@example.com ",
  phone: " 3201111111 ",
  fulfillment: "shipping",
  paymentMode: "stripe",
  address: " Via Gramsci 1 ",
  city: " Vignola ",
  zip: " 41058 ",
});

const shippingPayload = buildCheckoutOrderPayload({
  formData: shippingFormData,
  cartRows,
  resolvePaymentMode: (mode) => (mode === "stripe" ? "stripe" : "in-shop"),
});

assert.deepEqual(shippingPayload.shippingAddress, {
  address: "Via Gramsci 1",
  city: "Vignola",
  zip: "41058",
});
assert.equal(shippingPayload.paymentMode, "stripe");

const fallbackPayload = buildCheckoutOrderPayload({
  formData: makeFormData({
    fullName: "Test",
    email: "test@example.com",
    phone: "3200000000",
    fulfillment: "pickup",
    paymentMode: "stripe",
  }),
  cartRows,
  resolvePaymentMode: () => "in-shop",
});

assert.equal(fallbackPayload.paymentMode, "in-shop");

for (const item of pickupPayload.items) {
  assert.deepEqual(Object.keys(item).sort(), ["productId", "quantity"]);
}

const serialized = JSON.stringify(pickupPayload);
for (const forbiddenKey of [
  "price",
  "total",
  "status",
  "productName",
  "lineTotal",
]) {
  assert.equal(serialized.includes(forbiddenKey), false);
}

console.log("Checkout domain tests passed.");
