"use client";

import { useEffect, useState } from "react";

import { CART_UPDATED_EVENT, readCart } from "../lib/cart-storage";

function readCartCount() {
  return readCart().reduce((total, item) => total + item.quantity, 0);
}

export function CartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(readCartCount());
    update();

    window.addEventListener("storage", update);
    window.addEventListener(CART_UPDATED_EVENT, update);
    window.addEventListener("focus", update);

    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener(CART_UPDATED_EVENT, update);
      window.removeEventListener("focus", update);
    };
  }, []);

  return <span className="cart-trigger__count">{count}</span>;
}
