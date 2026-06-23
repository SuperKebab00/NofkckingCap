import assert from "node:assert/strict";

import {
  getDefaultShopCategories,
  getOrderStatusLabel,
  isValidEmail,
  isValidPhone,
  normalizeCart,
  normalizeOrderStatus,
  normalizePhone,
  normalizeShopCategories,
} from "../js/app-domain.js";

assert.equal(normalizeOrderStatus("pending"), "prenotato");
assert.equal(normalizeOrderStatus(" paid "), "pagato");
assert.equal(normalizeOrderStatus("completed"), "completato");
assert.equal(normalizeOrderStatus("custom-status"), "custom-status");
assert.equal(normalizeOrderStatus(""), "prenotato");

assert.equal(getOrderStatusLabel("pending-payment"), "Attesa pagamento");
assert.equal(getOrderStatusLabel("paid"), "Pagato");
assert.equal(getOrderStatusLabel("custom-status"), "custom-status");
assert.equal(getOrderStatusLabel(null), "Prenotato");

assert.equal(normalizePhone("+39 320 000-0000"), "+393200000000");
assert.equal(normalizePhone("abc 123 456"), "123456");

assert.equal(isValidEmail("cliente@example.com"), true);
assert.equal(isValidEmail(" cliente@example.com "), true);
assert.equal(isValidEmail("cliente.example.com"), false);
assert.equal(isValidEmail("cliente@localhost"), false);

assert.equal(isValidPhone("+393200000000"), true);
assert.equal(isValidPhone("3200000000"), true);
assert.equal(isValidPhone("123"), false);
assert.equal(isValidPhone("1111111111"), false);
assert.equal(isValidPhone("+39 abc"), false);

const products = [
  { id: "aftershave", category: "hair" },
  { id: "wax", category: "styling" },
  { id: "comb", category: "styling" },
];
const inventory = { aftershave: 2, wax: 0, comb: 5 };
const rawCart = [
  { productId: "aftershave", quantity: 10 },
  { productId: "wax", quantity: 1 },
  { productId: "missing", quantity: 1 },
  { productId: "comb", quantity: -1 },
  { id: "comb", quantity: 3 },
];
const rawCartSnapshot = structuredClone(rawCart);

assert.deepEqual(normalizeCart(rawCart, products, inventory), [
  { productId: "aftershave", quantity: 2 },
  { productId: "comb", quantity: 3 },
]);
assert.deepEqual(rawCart, rawCartSnapshot);
assert.deepEqual(normalizeCart(null, products, inventory), []);

const defaultCategories = getDefaultShopCategories(products);
assert.deepEqual(defaultCategories, [
  { value: "all", label: "All products" },
  { value: "hair", label: "Hair" },
  { value: "styling", label: "Styling" },
]);

const rawCategories = [
  { value: "tools", label: "Tools" },
  { value: "TOOLS", label: "Duplicate tools" },
  { value: "", label: "Empty" },
  { value: "accessories", label: "" },
];
const rawCategoriesSnapshot = structuredClone(rawCategories);

assert.deepEqual(normalizeShopCategories(rawCategories, products), [
  { value: "all", label: "All products" },
  { value: "tools", label: "Tools" },
  { value: "accessories", label: "Accessories" },
]);
assert.deepEqual(rawCategories, rawCategoriesSnapshot);
assert.deepEqual(normalizeShopCategories([], products), defaultCategories);

console.log("App domain tests passed.");
