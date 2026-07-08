export type PublicOrderItemPayload = {
  product_id?: string;
  productId?: string;
  quantity: number;
  slug?: string;
};

export type PublicOrderPayload = {
  customer: {
    email: string;
    fullName: string;
    phone: string;
  };
  fulfillment: "pickup" | "shipping";
  idempotency_key: string;
  items: PublicOrderItemPayload[];
  paymentMode: "in-shop" | "paypal";
  shippingAddress?: {
    address: string;
    city: string;
    zip: string;
  };
};

export type PublicOrderResponse = {
  order: {
    fulfillment?: "pickup" | "shipping";
    id?: string;
    items?: unknown[];
    order_number?: string;
    payment_mode?: "in-shop" | "paypal";
    shipping?: number | string;
    status?: string;
    subtotal?: number | string;
    total?: number | string;
  };
};

type OrdersClientOptions = {
  fetchImpl?: typeof fetch;
};

export class OrdersClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OrdersClientError";
    this.status = status;
  }
}

export function createOrderIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `order-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}

function errorMessage(status: number, data: unknown) {
  const apiError = String((data as { error?: unknown } | null)?.error || "").trim();
  if (apiError) return apiError;

  switch (status) {
    case 400:
      return "Controlla i dati inseriti e riprova.";
    case 404:
      return "Uno dei prodotti non e piu disponibile.";
    case 409:
      return "Stock insufficiente o ordine in conflitto.";
    case 429:
      return "Troppe richieste: attendi qualche secondo e riprova.";
    default:
      return "Creazione ordine non disponibile. Riprova tra poco.";
  }
}

export async function createPublicOrder(
  payload: PublicOrderPayload,
  options: OrdersClientOptions = {},
): Promise<PublicOrderResponse["order"]> {
  const fetchImpl = options.fetchImpl || fetch;
  const response = await fetchImpl("/api/orders/create", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const data = (await readJson(response)) as PublicOrderResponse | { error?: string } | null;

  if (!response.ok) {
    throw new OrdersClientError(errorMessage(response.status, data), response.status);
  }

  const order = (data as PublicOrderResponse | null)?.order;
  if (!order?.order_number) {
    throw new OrdersClientError("Risposta ordine non valida.", 500);
  }

  return order;
}
