"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

export type CheckoutInShopProduct = {
  id?: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number | string | null;
  image: string | null;
  stock?: number | null;
  checkoutHref?: string;
  contactHref?: string;
};

export type CheckoutInShopProps = {
  products: CheckoutInShopProduct[];
};

type CartItem = {
  productId: string;
  quantity: number;
};

type FulfillmentMode = "pickup" | "shipping";
type PaymentMode = "in-shop" | "paypal" | "stripe";

type CheckoutFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  notes: string;
  privacy: boolean;
};

type CheckoutOrder = {
  orderNumber: string;
  itemCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  fulfillment: FulfillmentMode;
  paymentMode: PaymentMode;
};

type NormalizedCheckoutProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image: string;
  stock: number | null;
};

const CART_STORAGE_KEY = "no-cap-next-cart-v1";
const ORDER_STORAGE_KEY = "no-cap-next-orders-v1";
const SHIPPING_PRICE = 6.9;

const emptyForm: CheckoutFormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  zip: "",
  notes: "",
  privacy: false,
};

const currencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        productId: String(item.productId || ""),
        quantity: Math.max(1, Number(item.quantity || 1)),
      }))
      .filter((item) => item.productId);
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

function buildOrderNumber() {
  return `NC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function validateForm(form: CheckoutFormState, fulfillment: FulfillmentMode) {
  if (form.name.trim().length < 2) return "Inserisci nome e cognome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return "Inserisci una email valida.";
  }
  if (form.phone.trim().length < 6) return "Inserisci un telefono valido.";

  if (fulfillment === "shipping") {
    if (form.address.trim().length < 5) return "Inserisci indirizzo di spedizione.";
    if (form.city.trim().length < 2) return "Inserisci la citta.";
    if (form.zip.trim().length < 4) return "Inserisci il CAP.";
  }

  if (!form.privacy) return "Accetta la privacy per continuare.";

  return null;
}

export function CheckoutInShop({ products }: CheckoutInShopProps) {
  const catalogProducts = useMemo<NormalizedCheckoutProduct[]>(
    () =>
      products
        .map((product, index) => {
          const price = Number(product.price || 0);

          return {
            id:
              product.id ||
              product.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "") ||
              `product-${index}`,
            name: product.name,
            category: product.category || "shop",
            description:
              product.description ||
              "Prodotto No Cap disponibile per ordine simulato.",
            price,
            image: product.image || "/Img/products/black-wax-packshot-opt.webp",
            stock: product.stock ?? null,
          };
        })
        .filter((product) => product.name && product.price > 0),
    [products],
  );

  const availableProducts = useMemo(
    () =>
      catalogProducts.filter(
        (product) => product.stock === null || product.stock > 0,
      ),
    [catalogProducts],
  );

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(
    availableProducts[0]?.id || "",
  );
  const [fulfillment, setFulfillment] = useState<FulfillmentMode>("pickup");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("paypal");
  const [form, setForm] = useState<CheckoutFormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<CheckoutOrder | null>(null);
  const [showPaypalModal, setShowPaypalModal] = useState(false);

  useEffect(() => {
    const storedCart = readCart().filter((item) =>
      catalogProducts.some((product) => product.id === item.productId),
    );

    setCart(storedCart);
  }, [catalogProducts]);

  useEffect(() => {
    if (availableProducts.length && !selectedProductId) {
      setSelectedProductId(availableProducts[0].id);
    }
  }, [availableProducts, selectedProductId]);

  useEffect(() => {
    if (typeof window !== "undefined") writeCart(cart);
  }, [cart]);

  const cartRows = useMemo(
    () =>
      cart
        .map((item) => {
          const product = catalogProducts.find((entry) => entry.id === item.productId);
          if (!product) return null;

          return {
            product,
            quantity: item.quantity,
            lineTotal: product.price * item.quantity,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
    [cart, catalogProducts],
  );

  const subtotal = cartRows.reduce((total, row) => total + row.lineTotal, 0);
  const shipping = fulfillment === "shipping" && subtotal > 0 ? SHIPPING_PRICE : 0;
  const total = subtotal + shipping;
  const itemCount = cartRows.reduce((count, row) => count + row.quantity, 0);
  const selectedProduct = catalogProducts.find(
    (product) => product.id === selectedProductId,
  );

  function updateCart(productId: string, quantity: number) {
    setSuccessOrder(null);
    setMessage(null);

    setCart((items) => {
      const existing = items.find((item) => item.productId === productId);
      if (existing) {
        return items.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(1, item.quantity + quantity) }
            : item,
        );
      }

      return [...items, { productId, quantity: Math.max(1, quantity) }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((items) => items.filter((item) => item.productId !== productId));
  }

  function setItemQuantity(productId: string, quantity: number) {
    setCart((items) =>
      items.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item,
      ),
    );
  }

  function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSuccessOrder(null);

    if (!cartRows.length) {
      setMessage("Aggiungi almeno un prodotto al carrello.");
      return;
    }

    const validationMessage = validateForm(form, fulfillment);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    const order: CheckoutOrder = {
      orderNumber: buildOrderNumber(),
      itemCount,
      subtotal,
      shipping,
      total,
      fulfillment,
      paymentMode,
    };

    const storedOrders = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || "[]");
    const nextOrders = Array.isArray(storedOrders) ? storedOrders : [];
    nextOrders.unshift({
      ...order,
      customer: form,
      items: cartRows.map((row) => ({
        id: row.product.id,
        name: row.product.name,
        quantity: row.quantity,
        price: row.product.price,
      })),
      createdAt: new Date().toISOString(),
      status: "in-attesa",
    });

    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(nextOrders.slice(0, 20)));
    setSuccessOrder(order);
    setCart([]);
    setForm(emptyForm);

    if (paymentMode === "paypal") {
      setShowPaypalModal(true);
    }
  }

  return (
    <section className="checkout-experience" aria-label="Checkout No Cap">
      <div className="checkout-hero">
        <div>
          <p className="eyebrow">Checkout</p>
          <h2>Carrello No Cap</h2>
          <p>
            Esperienza ispirata al checkout originale: ordine simulato, riepilogo
            immediato e pagamenti predisposti senza transazioni reali.
          </p>
        </div>
        <div className="checkout-hero__meta">
          <strong>{itemCount}</strong>
          <span>articoli</span>
        </div>
      </div>

      <div className="checkout-layout">
        <section className="checkout-panel checkout-panel--catalog">
          <div className="checkout-panel__heading">
            <div>
              <p className="eyebrow">Shop</p>
              <h3>Aggiungi prodotti</h3>
            </div>
            <span>{availableProducts.length} disponibili</span>
          </div>

          <div className="quick-add">
            <select
              aria-label="Seleziona prodotto"
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
            >
              {availableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {formatCurrency(product.price)}
                </option>
              ))}
            </select>
            <button
              className="primary-button"
              disabled={!selectedProduct}
              type="button"
              onClick={() => selectedProduct && updateCart(selectedProduct.id, 1)}
            >
              Aggiungi
            </button>
          </div>

          <div className="checkout-product-list">
            {availableProducts.slice(0, 6).map((product) => (
              <article className="checkout-product-card" key={product.id}>
                <img src={product.image} alt={product.name} loading="lazy" />
                <div>
                  <span>{product.category}</span>
                  <h4>{product.name}</h4>
                  <p>{product.description}</p>
                  <div className="checkout-product-card__footer">
                    <strong>{formatCurrency(product.price)}</strong>
                    <button type="button" onClick={() => updateCart(product.id, 1)}>
                      +
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="checkout-panel checkout-panel--cart">
          <div className="checkout-panel__heading">
            <div>
              <p className="eyebrow">Riepilogo</p>
              <h3>Il tuo carrello</h3>
            </div>
            <button className="ghost-button" type="button" onClick={() => setCart([])}>
              Svuota
            </button>
          </div>

          {cartRows.length ? (
            <div className="cart-lines">
              {cartRows.map(({ product, quantity, lineTotal }) => (
                <article className="cart-line" key={product.id}>
                  <img src={product.image} alt="" loading="lazy" />
                  <div>
                    <strong>{product.name}</strong>
                    <span>{formatCurrency(product.price)}</span>
                  </div>
                  <input
                    aria-label={`Quantita ${product.name}`}
                    min="1"
                    type="number"
                    value={quantity}
                    onChange={(event) =>
                      setItemQuantity(product.id, Number(event.target.value))
                    }
                  />
                  <strong>{formatCurrency(lineTotal)}</strong>
                  <button type="button" onClick={() => removeFromCart(product.id)}>
                    Rimuovi
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-cart">
              <strong>Carrello vuoto</strong>
              <p>Aggiungi un prodotto per simulare l&apos;ordine.</p>
            </div>
          )}

          <div className="checkout-totals">
            <span>
              Subtotale <strong>{formatCurrency(subtotal)}</strong>
            </span>
            <span>
              Spedizione <strong>{shipping ? formatCurrency(shipping) : "Gratis"}</strong>
            </span>
            <span className="checkout-total">
              Totale <strong>{formatCurrency(total)}</strong>
            </span>
          </div>
        </section>
      </div>

      <form className="checkout-form-grid" onSubmit={submitOrder}>
        <section className="checkout-panel">
          <div className="checkout-panel__heading">
            <div>
              <p className="eyebrow">Cliente</p>
              <h3>Dati ordine</h3>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Nome e cognome
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Nome Cognome"
              />
            </label>
            <label>
              Email
              <input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="nome@email.com"
                type="email"
              />
            </label>
            <label>
              Telefono
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="+39 320 000 0000"
              />
            </label>
            <label>
              Note
              <textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Taglie, preferenze ritiro o note per il team."
              />
            </label>
          </div>
        </section>

        <section className="checkout-panel">
          <div className="checkout-panel__heading">
            <div>
              <p className="eyebrow">Consegna</p>
              <h3>Ritiro o spedizione</h3>
            </div>
          </div>

          <div className="checkout-options">
            <label className="checkout-radio">
              <input
                checked={fulfillment === "pickup"}
                name="fulfillment"
                type="radio"
                value="pickup"
                onChange={() => setFulfillment("pickup")}
              />
              <span>
                <strong>Ritiro in shop</strong>
                <small>Pagamento o conferma finale in negozio.</small>
              </span>
            </label>
            <label className="checkout-radio">
              <input
                checked={fulfillment === "shipping"}
                name="fulfillment"
                type="radio"
                value="shipping"
                onChange={() => setFulfillment("shipping")}
              />
              <span>
                <strong>Spedizione</strong>
                <small>Placeholder con costo fisso {formatCurrency(SHIPPING_PRICE)}.</small>
              </span>
            </label>
          </div>

          {fulfillment === "shipping" ? (
            <div className="form-grid">
              <label>
                Indirizzo
                <input
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  placeholder="Via e numero civico"
                />
              </label>
              <label>
                Citta
                <input
                  value={form.city}
                  onChange={(event) => setForm({ ...form, city: event.target.value })}
                  placeholder="Citta"
                />
              </label>
              <label>
                CAP
                <input
                  value={form.zip}
                  onChange={(event) => setForm({ ...form, zip: event.target.value })}
                  placeholder="00000"
                />
              </label>
            </div>
          ) : null}
        </section>

        <section className="checkout-panel checkout-panel--payment">
          <div className="checkout-panel__heading">
            <div>
              <p className="eyebrow">Pagamento</p>
              <h3>Modalita</h3>
            </div>
          </div>

          <div className="checkout-options">
            <label className="checkout-radio">
              <input
                checked={paymentMode === "in-shop"}
                name="paymentMode"
                type="radio"
                value="in-shop"
                onChange={() => setPaymentMode("in-shop")}
              />
              <span>
                <strong>In sede</strong>
                <small>Ordine registrato, saldo gestito in shop.</small>
              </span>
            </label>
            <label className="checkout-radio">
              <input
                checked={paymentMode === "paypal"}
                name="paymentMode"
                type="radio"
                value="paypal"
                onChange={() => setPaymentMode("paypal")}
              />
              <span>
                <strong>PayPal</strong>
                <small>Placeholder: nessuna transazione reale viene avviata.</small>
              </span>
            </label>
            <label className="checkout-radio checkout-radio--disabled">
              <input disabled name="paymentMode" type="radio" value="stripe" />
              <span>
                <strong>Stripe</strong>
                <small>Predisposto per integrazione futura, non attivo.</small>
              </span>
            </label>
          </div>

          <label className="checkout-privacy">
            <input
              checked={form.privacy}
              type="checkbox"
              onChange={(event) => setForm({ ...form, privacy: event.target.checked })}
            />
            <span>Accetto privacy e trattamento dati per la gestione dell&apos;ordine.</span>
          </label>

          {message ? <p className="checkout-message checkout-message--error">{message}</p> : null}
          {successOrder ? (
            <div className="checkout-message checkout-message--success">
              <strong>Ordine {successOrder.orderNumber} creato.</strong>
              <span>
                {successOrder.itemCount} articoli, totale {formatCurrency(successOrder.total)}.
              </span>
            </div>
          ) : null}

          <button className="primary-button checkout-submit" type="submit">
            Conferma ordine simulato
          </button>
        </section>
      </form>

      {showPaypalModal ? (
        <div className="payment-modal" role="dialog" aria-modal="true">
          <div className="payment-modal__panel">
            <p className="eyebrow">PayPal placeholder</p>
            <h3>Pagamento non attivato</h3>
            <p>
              Nel progetto sorgente PayPal e predisposto come modalita checkout,
              ma qui resta un placeholder sicuro: nessuna chiave reale e nessuna
              transazione.
            </p>
            <button className="primary-button" type="button" onClick={() => setShowPaypalModal(false)}>
              Ho capito
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
