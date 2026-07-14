import "server-only";

import { z } from "zod";

import { requireAdminFromRequest, type AdminContext } from "./admin-products-crud";
import {
  jsonResponse,
  readJson,
  safeError,
  safeLog,
  statusFromError,
  supabaseRequest,
  type ServerEnv,
} from "./api-core";

const ORDER_SELECT =
  "id,order_number,customer_name,customer_email,customer_phone,fulfillment,payment_mode,status,subtotal,total,notes,source,created_at,updated_at";
const ORDER_ITEM_SELECT =
  "id,order_id,product_id,product_name,product_sku_snapshot,quantity,unit_price,line_total,created_at";
const ORDER_STATUSES = [
  "prenotato",
  "in-lavorazione",
  "pronto-al-ritiro",
  "ritirato",
  "annullato",
] as const;

const statusUpdateSchema = z
  .object({
    notes: z
      .union([z.string(), z.null()])
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        if (value === null) return null;
        return value.replace(/\s+/g, " ").trim().slice(0, 1000) || null;
      }),
    status: z.enum(ORDER_STATUSES),
  })
  .strict();

function rows(response: unknown): Record<string, unknown>[] {
  return Array.isArray(response)
    ? response.filter((row): row is Record<string, unknown> =>
        Boolean(row && typeof row === "object"),
      )
    : [];
}

function first(response: unknown) {
  return rows(response)[0] || null;
}

function notFound() {
  return Object.assign(new Error("CLIENT: Ordine non trovato."), {
    status: 404,
  });
}

function statusFromOrdersError(error: unknown) {
  const status = Number((error as { status?: unknown })?.status);
  if ([400, 401, 403, 404, 409, 503].includes(status)) return status;
  return statusFromError(error);
}

function parsePositiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function validateStatus(value: string | null) {
  if (!value) return "";
  return ORDER_STATUSES.includes(value as (typeof ORDER_STATUSES)[number])
    ? value
    : "";
}

function buildOrdersListPath(request: Request) {
  const url = new URL(request.url);
  const page = parsePositiveInteger(url.searchParams.get("page"), 1, 500);
  const pageSize = parsePositiveInteger(url.searchParams.get("pageSize"), 25, 100);
  const offset = (page - 1) * pageSize;
  const status = validateStatus(url.searchParams.get("status"));
  const search = String(url.searchParams.get("search") || "")
    .replace(/[%(),]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  const params = new URLSearchParams({
    limit: String(pageSize),
    offset: String(offset),
    order: "created_at.desc",
    select: ORDER_SELECT,
  });

  if (status) {
    params.set("status", `eq.${status}`);
  }

  if (search) {
    const encodedSearch = `*${search}*`;
    params.set(
      "or",
      `(order_number.ilike.${encodedSearch},customer_email.ilike.${encodedSearch},customer_name.ilike.${encodedSearch})`,
    );
  }

  return `orders?${params.toString()}`;
}

async function readOrderItems(env: ServerEnv, orderId: string) {
  return rows(
    await supabaseRequest(
      env,
      `order_items?select=${ORDER_ITEM_SELECT}&order_id=eq.${encodeURIComponent(
        orderId,
      )}&order=created_at.asc`,
      { method: "GET" },
    ),
  );
}

async function writeAuditLog(
  env: ServerEnv,
  action: string,
  entityId: string,
  admin: AdminContext,
  payload: Record<string, unknown>,
) {
  try {
    await supabaseRequest(env, "admin_audit_log", {
      body: JSON.stringify({
        action,
        entity_id: entityId,
        entity_type: "order",
        payload: {
          ...payload,
          admin_auth_user_id: admin.userId,
        },
      }),
      headers: { Prefer: "return=minimal" },
      method: "POST",
    });
  } catch (error) {
    safeLog(env, "admin order audit log failed", {
      action,
      entityId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function listAdminOrders(env: ServerEnv, request: Request) {
  return rows(await supabaseRequest(env, buildOrdersListPath(request), { method: "GET" }));
}

export async function getAdminOrder(env: ServerEnv, id: string) {
  const order = first(
    await supabaseRequest(
      env,
      `orders?select=${ORDER_SELECT}&id=eq.${encodeURIComponent(id)}&limit=1`,
      { method: "GET" },
    ),
  );

  if (!order) throw notFound();

  return {
    ...order,
    items: await readOrderItems(env, id),
  };
}

export async function updateAdminOrderStatus(
  env: ServerEnv,
  id: string,
  payload: unknown,
  admin: AdminContext,
) {
  const parsed = statusUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    throw Object.assign(
      new Error(
        `CLIENT: Payload stato ordine non valido: ${parsed.error.issues
          .map((issue) => issue.message)
          .join(" ")}`,
      ),
      { status: 400 },
    );
  }

  const row: Record<string, unknown> = {
    status: parsed.data.status,
  };

  if (parsed.data.notes !== undefined) {
    row.notes = parsed.data.notes;
  }

  const order = first(
    await supabaseRequest(
      env,
      `orders?select=${ORDER_SELECT}&id=eq.${encodeURIComponent(id)}`,
      {
        body: JSON.stringify(row),
        headers: { Prefer: "return=representation" },
        method: "PATCH",
      },
    ),
  );

  if (!order) throw notFound();

  await writeAuditLog(env, "order.status_update", id, admin, {
    status: parsed.data.status,
  });

  return order;
}

export async function handleAdminOrdersCollection(
  request: Request,
  env: ServerEnv,
): Promise<Response> {
  try {
    await requireAdminFromRequest(request, env);

    if (request.method === "GET") {
      return jsonResponse({ orders: await listAdminOrders(env, request) });
    }

    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return jsonResponse(
      {
        error: safeError(
          error,
          "Admin orders non disponibile.",
          env.APP_ENV !== "production",
        ),
      },
      statusFromOrdersError(error),
    );
  }
}

export async function handleAdminOrderItem(
  request: Request,
  env: ServerEnv,
  id: string,
): Promise<Response> {
  try {
    const admin = await requireAdminFromRequest(request, env);

    if (request.method === "GET") {
      return jsonResponse({ order: await getAdminOrder(env, id) });
    }

    if (request.method === "PATCH") {
      return jsonResponse({
        order: await updateAdminOrderStatus(env, id, await readJson(request), admin),
      });
    }

    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return jsonResponse(
      {
        error: safeError(
          error,
          "Admin order non disponibile.",
          env.APP_ENV !== "production",
        ),
      },
      statusFromOrdersError(error),
    );
  }
}

export const __adminOrdersCrudTest = {
  buildOrdersListPath,
  statusFromOrdersError,
};
