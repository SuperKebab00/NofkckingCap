import "server-only";

import { createHash } from "node:crypto";

import { z } from "zod";

import {
  jsonResponse,
  parseGuardedJson,
  safeError,
  safeLog,
  statusFromError,
  supabaseRequest,
  type ServerEnv,
} from "./api-core";

type NormalizedOrderItem = {
  productId?: string;
  quantity: number;
  slug?: string;
};

type NormalizedOrderPayload = {
  city?: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  fulfillment: "pickup" | "shipping";
  idempotencyKey: string;
  items: NormalizedOrderItem[];
  notes?: string | null;
  paymentMode: "in-shop" | "paypal";
  shippingAddress?: string | null;
  zip?: string | null;
};

const optionalText = (maxLength: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === undefined || value === null) return null;
      const normalized = value.replace(/\s+/g, " ").trim().slice(0, maxLength);
      return normalized || null;
    });

const identifier = z
  .string()
  .transform((value) => value.trim().slice(0, 160))
  .refine((value) => value.length > 0, "Prodotto non valido.");

const orderItemSchema = z
  .object({
    product_id: identifier.optional(),
    productId: identifier.optional(),
    quantity: z.coerce.number().int().min(1).max(20),
    slug: identifier.optional(),
  })
  .transform((value) => ({
    productId: value.product_id || value.productId,
    quantity: value.quantity,
    slug: value.slug,
  }))
  .refine((value) => Boolean(value.productId || value.slug), {
    message: "Ogni riga ordine deve indicare prodotto o slug.",
  });

const orderCreateSchema = z
  .object({
    address: optionalText(240),
    city: optionalText(120),
    customer: z
      .object({
        email: optionalText(160),
        fullName: optionalText(160),
        name: optionalText(160),
        phone: optionalText(40),
      })
      .optional()
      .default({}),
    customer_email: optionalText(160),
    customer_name: optionalText(160),
    customer_phone: optionalText(40),
    fulfillment: optionalText(40),
    fulfillment_mode: optionalText(40),
    idempotencyKey: optionalText(120),
    idempotency_key: optionalText(120),
    items: z.array(orderItemSchema).min(1).max(50),
    notes: optionalText(1000),
    paymentMode: optionalText(40),
    payment_mode: optionalText(40),
    shippingAddress: z
      .object({
        address: optionalText(240),
        city: optionalText(120),
        zip: optionalText(20),
      })
      .optional(),
    zip: optionalText(20),
  })
  .transform((payload) => {
    const fulfillmentValue = String(
      payload.fulfillment || payload.fulfillment_mode || "pickup",
    )
      .trim()
      .toLowerCase();
    const fulfillment =
      fulfillmentValue === "shipping" || fulfillmentValue === "delivery"
        ? "shipping"
        : "pickup";
    const paymentValue = String(payload.payment_mode || payload.paymentMode || "in-shop")
      .trim()
      .toLowerCase()
      .replace("_", "-");
    const paymentMode = paymentValue === "paypal" ? "paypal" : "in-shop";
    const customerName =
      payload.customer_name || payload.customer.fullName || payload.customer.name || "";
    const customerEmail = payload.customer_email || payload.customer.email || "";
    const customerPhone = payload.customer_phone || payload.customer.phone || "";
    const idempotencyKey = payload.idempotency_key || payload.idempotencyKey || "";

    return {
      city: payload.shippingAddress?.city || payload.city,
      customerEmail,
      customerName,
      customerPhone,
      fulfillment,
      idempotencyKey,
      items: payload.items,
      notes: payload.notes,
      paymentMode,
      shippingAddress: payload.shippingAddress?.address || payload.address,
      zip: payload.shippingAddress?.zip || payload.zip,
    } satisfies NormalizedOrderPayload;
  })
  .refine((value) => value.customerName.length >= 2, {
    message: "Nome cliente obbligatorio.",
  })
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.customerEmail), {
    message: "Email cliente non valida.",
  })
  .refine((value) => value.customerPhone.replace(/[^\d+]/g, "").length >= 6, {
    message: "Telefono cliente non valido.",
  })
  .refine((value) => value.idempotencyKey.length >= 12, {
    message: "Idempotency key obbligatoria.",
  })
  .refine(
    (value) =>
      value.fulfillment === "pickup" ||
      Boolean(value.shippingAddress && value.city && value.zip),
    {
      message: "Indirizzo, citta e CAP sono obbligatori per la spedizione.",
    },
  );

function normalizePayload(payload: unknown): NormalizedOrderPayload {
  const result = orderCreateSchema.safeParse(payload);
  if (!result.success) {
    throw Object.assign(
      new Error(
        `CLIENT: Payload ordine non valido: ${result.error.issues
          .map((issue) => issue.message)
          .join(" ")}`,
      ),
      { status: 400 },
    );
  }

  return result.data;
}

async function writeOrderAudit(
  env: ServerEnv,
  action: string,
  entityId: string | null,
  payload: Record<string, unknown>,
) {
  try {
    await supabaseRequest(env, "admin_audit_log", {
      body: JSON.stringify({
        action,
        entity_id: entityId,
        entity_type: "order",
        payload,
      }),
      headers: { Prefer: "return=minimal" },
      method: "POST",
    });
  } catch (error) {
    safeLog(env, "order audit log failed", {
      action,
      entityId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => {
        const record = value as Record<string, unknown>;
        return `${JSON.stringify(key)}:${stableStringify(record[key])}`;
      })
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function buildRpcPayload(orderPayload: NormalizedOrderPayload) {
  return {
    address: orderPayload.fulfillment === "shipping" ? orderPayload.shippingAddress : null,
    city: orderPayload.fulfillment === "shipping" ? orderPayload.city : null,
    customer_email: orderPayload.customerEmail,
    customer_name: orderPayload.customerName,
    customer_phone: orderPayload.customerPhone,
    fulfillment: orderPayload.fulfillment,
    items: orderPayload.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      slug: item.slug,
    })),
    notes: orderPayload.notes,
    payment_mode: orderPayload.paymentMode,
    zip: orderPayload.fulfillment === "shipping" ? orderPayload.zip : null,
  };
}

function hashPayload(payload: Record<string, unknown>) {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function orderFromRpcResponse(response: unknown) {
  const payload = response as { order?: Record<string, unknown> } | null;
  const order = payload?.order;
  if (!order?.order_number) {
    throw new Error("Ordine creato senza order_number.");
  }

  return order;
}

export async function createOrder(env: ServerEnv, payload: unknown) {
  const orderPayload = normalizePayload(payload);
  const rpcPayload = buildRpcPayload(orderPayload);
  const payloadHash = hashPayload(rpcPayload);

  const response = await supabaseRequest(env, "rpc/create_order_with_items", {
    body: JSON.stringify({
      p_idempotency_key: orderPayload.idempotencyKey,
      p_payload: rpcPayload,
      p_payload_hash: payloadHash,
    }),
    headers: { Prefer: "return=representation" },
    method: "POST",
  });

  const order = orderFromRpcResponse(response);

  await writeOrderAudit(env, "order.create", String(order.id || ""), {
    idempotency_key: orderPayload.idempotencyKey,
    order_number: order.order_number,
    payload_hash: payloadHash,
    total: order.total,
  });

  return order;
}

function statusFromOrderCreateError(error: unknown) {
  const status = Number((error as { status?: unknown })?.status);
  if ([400, 404, 409, 429, 503].includes(status)) return status;
  const message = String(error instanceof Error ? error.message : error || "");
  if (
    message.includes("Idempotency conflict") ||
    message.includes("Stock insufficiente") ||
    message.includes("orders_idempotency_key") ||
    message.includes("orders_order_number_key")
  ) {
    return 409;
  }
  if (message.includes("Prodotto ordine non trovato")) return 404;
  return statusFromError(error);
}

export async function handleOrderCreate(
  request: Request,
  env: ServerEnv,
): Promise<Response> {
  try {
    const payload = await parseGuardedJson(request, env, {
      rateLimit: 8,
      rateLimitKey: "orders:create",
      turnstile: true,
    });

    return jsonResponse({ order: await createOrder(env, payload) }, 201);
  } catch (error) {
    return jsonResponse(
      {
        error: safeError(
          error,
          "Creazione ordine non disponibile.",
          env.APP_ENV !== "production",
        ),
      },
      statusFromOrderCreateError(error),
    );
  }
}

export const __ordersCreateTest = {
  buildRpcPayload,
  hashPayload,
  normalizePayload,
  statusFromOrderCreateError,
};
