export type StoredCartItem = {
  productId: string;
  quantity: number;
};

export const CART_STORAGE_KEY = "no-cap-next-cart-v1";
export const CART_UPDATED_EVENT = "no-cap-cart-updated";

function normalizeCartItem(item: unknown): StoredCartItem | null {
  const candidate = item as Partial<StoredCartItem>;
  const productId = String(candidate?.productId || "").trim();
  if (!productId) return null;

  return {
    productId,
    quantity: Math.max(1, Number(candidate.quantity || 1)),
  };
}

export function readCart(): StoredCartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeCartItem)
      .filter((item): item is StoredCartItem => Boolean(item));
  } catch {
    return [];
  }
}

export function writeCart(items: StoredCartItem[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function addCartItem(productId: string, quantity = 1): StoredCartItem[] {
  const normalizedProductId = productId.trim();
  if (!normalizedProductId) {
    throw new Error("Prodotto non valido.");
  }

  const currentCart = readCart();
  const existingItem = currentCart.find((item) => item.productId === normalizedProductId);
  const nextCart = existingItem
    ? currentCart.map((item) =>
        item.productId === normalizedProductId
          ? { ...item, quantity: item.quantity + Math.max(1, quantity) }
          : item,
      )
    : [...currentCart, { productId: normalizedProductId, quantity: Math.max(1, quantity) }];

  writeCart(nextCart);
  return nextCart;
}
