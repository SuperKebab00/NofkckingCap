"use client";

import { useEffect, useState } from "react";

const CART_STORAGE_KEY = "no-cap-next-cart-v1";

function readCartCount() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return 0;

    return parsed.reduce((total, item) => total + Math.max(1, Number(item.quantity || 1)), 0);
  } catch {
    return 0;
  }
}

export function CartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(readCartCount());
    update();

    window.addEventListener("storage", update);
    window.addEventListener("focus", update);

    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("focus", update);
    };
  }, []);

  return <span className="cart-trigger__count">{count}</span>;
}
