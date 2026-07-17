import assert from "node:assert/strict";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/cart-storage.ts");

const stored = new Map();
let updateEvents = 0;

globalThis.localStorage = {
  getItem(key) {
    return stored.get(key) ?? null;
  },
  setItem(key, value) {
    stored.set(key, String(value));
  },
};

globalThis.window = {
  dispatchEvent(event) {
    if (event.type === mod.CART_UPDATED_EVENT) updateEvents += 1;
  },
};

stored.clear();
updateEvents = 0;

let cart = mod.addCartItem("black-wax");
assert.deepEqual(cart, [{ productId: "black-wax", quantity: 1 }]);
assert.equal(updateEvents, 1);

cart = mod.addCartItem("black-wax");
assert.deepEqual(cart, [{ productId: "black-wax", quantity: 2 }]);
assert.equal(updateEvents, 2);

cart = mod.addCartItem("clay-pomade", 2);
assert.deepEqual(cart, [
  { productId: "black-wax", quantity: 2 },
  { productId: "clay-pomade", quantity: 2 },
]);
assert.equal(updateEvents, 3);
assert.deepEqual(mod.readCart(), cart);

assert.throws(() => mod.addCartItem(""), /Prodotto non valido/);

console.log("Cart storage tests passed.");
