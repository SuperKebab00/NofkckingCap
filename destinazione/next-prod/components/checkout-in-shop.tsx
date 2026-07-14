"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createOrderIdempotencyKey, createPublicOrder } from "../lib/orders-client";

export type CheckoutInShopProduct = {
  id?: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number | string | null;
  image: string | null;
  stock?: number | null;
};

export type CheckoutInShopProps = {
  products: CheckoutInShopProduct[];
};

type CartItem = {
  productId: string;
  quantity: number;
};

type CheckoutFormState = {
  email: string;
  fullName: string;
  phone: string;
};

type CheckoutOrder = {
  orderNumber: string;
  serverOrderId?: string;
  status?: string;
  subtotal: number;
  total: number;
};

type NormalizedCheckoutProduct = {
  category: string;
  id: string;
  image: string;
  name: string;
  price: number;
};

const CART_STORAGE_KEY = "no-cap-next-cart-v1";
const ORDER_STORAGE_KEY = "no-cap-next-orders-v1";
const emptyForm: CheckoutFormState = {
  email: "",
  fullName: "",
  phone: "",
};

const currencyFormatter = new Intl.NumberFormat("it-IT", {
  currency: "EUR",
  style: "currency",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

function writeOrder(order: CheckoutOrder, form: CheckoutFormState, items: CartRow[]) {
  const storedOrders = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || "[]");
  const nextOrders = Array.isArray(storedOrders) ? storedOrders : [];

  nextOrders.unshift({
    ...order,
    createdAt: new Date().toISOString(),
    customer: {
      email: form.email,
      fullName: form.fullName,
      phone: form.phone,
    },
    id: order.serverOrderId || `order-${Date.now()}`,
    items: items.map((row) => ({
      lineTotal: row.lineTotal,
      productId: row.product.id,
      productName: row.product.name,
      quantity: row.quantity,
      unitPrice: row.product.price,
    })),
    source: "orders-api",
    status: order.status || "prenotato",
  });

  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(nextOrders.slice(0, 200)));
}

function validateForm(form: CheckoutFormState) {
  const errors: Partial<Record<keyof CheckoutFormState, string>> = {};

  if (!form.fullName.trim()) errors.fullName = "Inserisci nome completo.";
  if (!/\S+@\S+\.\S+/.test(form.email.trim())) errors.email = "Email non valida.";
  if (form.phone.trim().length < 6) errors.phone = "Telefono non valido.";

  return errors;
}

type CartRow = {
  lineTotal: number;
  product: NormalizedCheckoutProduct;
  quantity: number;
};

export function CheckoutInShop({ products }: CheckoutInShopProps) {
  const searchParams = useSearchParams();
  const requestedProduct = searchParams.get("product");

  const catalogProducts = useMemo<NormalizedCheckoutProduct[]>(
    () =>
      products
        .map((product, index) => {
          const fallbackId = product.id || slugify(product.name) || `product-${index}`;
          const price = Number(product.price || 0);

          return {
            category: product.category || "shop",
            id: fallbackId,
            image: product.image || "/Img/products/black-wax-packshot-opt.webp",
            name: product.name,
            price,
          };
        })
        .filter((product) => product.name && product.price > 0),
    [products],
  );

  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState<CheckoutFormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CheckoutFormState, string>>
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<CheckoutOrder | null>(null);
  const [confirmedRows, setConfirmedRows] = useState<CartRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingIdempotencyKey, setPendingIdempotencyKey] = useState<string | null>(null);

  useEffect(() => {
    const storedCart = readCart().filter((item) =>
      catalogProducts.some((product) => product.id === item.productId),
    );
    const requested = requestedProduct
      ? catalogProducts.find((product) => product.id === requestedProduct)
      : null;

    if (requested && !storedCart.some((item) => item.productId === requested.id)) {
      setCart([...storedCart, { productId: requested.id, quantity: 1 }]);
      return;
    }

    setCart(storedCart);
  }, [catalogProducts, requestedProduct]);

  useEffect(() => {
    if (typeof window !== "undefined") writeCart(cart);
  }, [cart]);

  const cartRows = useMemo<CartRow[]>(
    () =>
      cart
        .map((item) => {
          const product = catalogProducts.find((entry) => entry.id === item.productId);
          if (!product) return null;

          return {
            lineTotal: product.price * item.quantity,
            product,
            quantity: item.quantity,
          };
        })
        .filter((row): row is CartRow => Boolean(row)),
    [cart, catalogProducts],
  );

  const subtotal = cartRows.reduce((total, row) => total + row.lineTotal, 0);
  const total = subtotal;
  const activeRows = successOrder ? confirmedRows : cartRows;
  const activeTotal = successOrder ? successOrder.total : total;

  function removeFromCart(productId: string) {
    setSuccessOrder(null);
    setMessage(null);
    setCart((items) => items.filter((item) => item.productId !== productId));
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSuccessOrder(null);

    if (!cartRows.length) {
      setMessage("Carrello vuoto.");
      return;
    }

    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setIsSubmitting(true);

    try {
      const idempotencyKey = pendingIdempotencyKey || createOrderIdempotencyKey();
      setPendingIdempotencyKey(idempotencyKey);

      const serverOrder = await createPublicOrder({
        customer: {
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
        },
        fulfillment: "pickup",
        idempotency_key: idempotencyKey,
        items: cartRows.map((row) => ({
          product_id: row.product.id,
          quantity: row.quantity,
        })),
        paymentMode: "in-shop",
      });

      const order: CheckoutOrder = {
        orderNumber: serverOrder.order_number || "",
        serverOrderId: serverOrder.id,
        status: serverOrder.status,
        subtotal: Number(serverOrder.subtotal ?? subtotal),
        total: Number(serverOrder.total ?? total),
      };

      writeOrder(order, form, cartRows);
      setConfirmedRows(cartRows);
      setSuccessOrder(order);
      setCart([]);
      setPendingIdempotencyKey(null);
      setForm(emptyForm);
      setFieldErrors({});
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Creazione ordine non disponibile. Riprova tra poco.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successOrder) {
    return (
      <section className="checkout-success" aria-live="polite">
        <p className="eyebrow">Ordine confermato</p>
        <h2>Ordine ricevuto</h2>
        <p>
          Numero ordine: <strong>{successOrder.orderNumber}</strong>
        </p>
        <div className="checkout-success-summary">
          <p>
            <strong>Totale:</strong> {formatCurrency(successOrder.total)}
          </p>
          <p>
            <strong>Pagamento:</strong> Pagamento in sede
          </p>
          <p>
            <strong>Consegna:</strong> Ritiro in shop
          </p>
          <p>Ritiro disponibile in negozio durante gli orari di apertura.</p>
        </div>
        <CheckoutSummary rows={activeRows} total={activeTotal} />
        <div className="hero__actions">
          <Link className="primary-button" href="/shop">
            Torna allo shop
          </Link>
          <Link className="ghost-button" href="/">
            Torna alla home
          </Link>
          <button
            className="outline-button"
            type="button"
            onClick={() =>
              navigator.clipboard?.writeText(
                `Ordine ${successOrder.orderNumber}\nTotale ${formatCurrency(successOrder.total)}`,
              )
            }
          >
            Copia riepilogo
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              const payload = JSON.stringify({ ...successOrder, items: activeRows }, null, 2);
              const blob = new Blob([payload], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${successOrder.orderNumber}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Scarica JSON ordine
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout-layout" aria-label="Checkout No Cap">
      <form className="checkout-form" noValidate onSubmit={submitOrder}>
        <div className="checkout-block">
          <h2>Dati cliente</h2>
          <CheckoutInput
            error={fieldErrors.fullName}
            label="Nome completo"
            name="fullName"
            onChange={(value) => setForm({ ...form, fullName: value })}
            value={form.fullName}
          />
          <CheckoutInput
            error={fieldErrors.email}
            label="Email"
            name="email"
            onChange={(value) => setForm({ ...form, email: value })}
            type="email"
            value={form.email}
          />
          <CheckoutInput
            error={fieldErrors.phone}
            label="Telefono"
            name="phone"
            onChange={(value) => setForm({ ...form, phone: value })}
            type="tel"
            value={form.phone}
          />
        </div>

        <fieldset className="checkout-block">
          <legend>Modalita di ritiro</legend>
          <div className="checkout-options" aria-label="Modalita di ritiro">
            <div className="checkout-radio checkout-option">
              <span className="checkout-option__body">
                <strong>Ritiro in shop</strong>
                <small>Prepariamo l&apos;ordine per il ritiro in negozio.</small>
              </span>
            </div>
          </div>
        </fieldset>

        <div className="checkout-block">
          <h2>Pagamento</h2>
          <p className="checkout-note">Il pagamento avviene in sede al momento del ritiro.</p>
          <div className="checkout-options" aria-label="Tipo di pagamento">
            <div className="checkout-radio checkout-option">
              <span className="checkout-option__body">
                <strong>Pagamento in sede</strong>
                <small>Saldo al ritiro dell&apos;ordine.</small>
              </span>
            </div>
          </div>
        </div>

        {message ? <p className="checkout-note checkout-note--error">{message}</p> : null}

        <button
          className="primary-button primary-button--wide"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Creazione ordine..." : "Conferma ordine"}
        </button>
      </form>

      <CheckoutSummary
        onRemove={removeFromCart}
        rows={activeRows}
        total={activeTotal}
      />
    </section>
  );
}

function CheckoutInput({
  error,
  label,
  name,
  onChange,
  type = "text",
  value,
}: {
  error?: string;
  label: string;
  name: keyof CheckoutFormState;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <>
      <label>
        {label}
        <input
          autoComplete={name === "fullName" ? "name" : name}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          value={value}
        />
      </label>
      <span className="field-error">{error || ""}</span>
    </>
  );
}

function CheckoutSummary({
  onRemove,
  rows,
  total,
}: {
  onRemove?: (productId: string) => void;
  rows: CartRow[];
  total: number;
}) {
  return (
    <aside className="checkout-summary" aria-label="Riepilogo ordine">
      <h2>Riepilogo ordine</h2>
      <div className="checkout-items">
        {rows.length ? (
          rows.map(({ product, quantity, lineTotal }) => (
            <article className="checkout-summary-item" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <p>
                  {quantity} x {formatCurrency(product.price)}
                </p>
              </div>
              <strong>{formatCurrency(lineTotal)}</strong>
              {onRemove ? (
                <button
                  className="mini-button"
                  type="button"
                  onClick={() => onRemove(product.id)}
                >
                  -
                </button>
              ) : null}
            </article>
          ))
        ) : (
          <div className="cart-empty">
            <strong>Carrello vuoto</strong>
            <span>Aggiungi prodotti per procedere al checkout.</span>
          </div>
        )}
      </div>
      <div className="checkout-total">
        <span>Totale</span>
        <strong>{formatCurrency(total)}</strong>
      </div>
    </aside>
  );
}
