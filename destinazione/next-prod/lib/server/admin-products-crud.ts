import "server-only";

import { z } from "zod";

import { verifyAdminJwt } from "./admin-auth";
import {
  jsonResponse,
  readJson,
  safeError,
  safeLog,
  statusFromError,
  supabaseRequest,
  type ServerEnv,
} from "./api-core";

export type AdminContext = {
  userId: string;
};

export type AdminProductPayload = {
  badge?: string | null;
  category?: string | null;
  category_id?: string | null;
  colors?: unknown;
  code?: string | null;
  description?: string;
  image_url?: string | null;
  is_active?: boolean;
  label?: string | null;
  lifestyle_url?: string | null;
  metadata?: Record<string, unknown>;
  name: string;
  packshot_url?: string | null;
  price?: number;
  restock?: number;
  shape?: string | null;
  sku?: string | null;
  slug?: string;
  sort_order?: number;
  status?: "active" | "draft" | "archived" | "sold_out";
  stock_quantity?: number;
};

type ProductWriteRow = {
  badge?: string | null;
  category?: string | null;
  category_id?: string | null;
  code?: string | null;
  colors?: unknown;
  description?: string;
  image_url?: string | null;
  is_active?: boolean;
  label?: string | null;
  lifestyle_url?: string | null;
  metadata?: Record<string, unknown>;
  name?: string;
  packshot_url?: string | null;
  price?: number;
  restock?: number;
  shape?: string | null;
  sku?: string | null;
  slug?: string;
  sort_order?: number;
  status?: string;
  stock?: number;
};

const PRODUCT_SELECT = [
  "id",
  "sku",
  "code",
  "name",
  "slug",
  "description",
  "category",
  "category_id",
  "label",
  "price",
  "image_url",
  "packshot_url",
  "lifestyle_url",
  "badge",
  "status",
  "stock",
  "stock_quantity",
  "restock",
  "colors",
  "shape",
  "is_active",
  "sort_order",
  "metadata",
  "created_at",
  "updated_at",
].join(",");

const PRODUCT_STATUS = ["active", "draft", "archived", "sold_out"] as const;

const optionalText = (maxLength: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const trimmed = value.replace(/\s+/g, " ").trim().slice(0, maxLength);
      return trimmed || null;
    });

const requiredTrimmedText = (maxLength: number) =>
  z
    .string()
    .transform((value) => value.replace(/\s+/g, " ").trim().slice(0, maxLength))
    .refine((value) => value.length > 0, "Campo obbligatorio.");

const slugSchema = z
  .string()
  .transform((value) => slugify(value))
  .refine((value) => value.length > 0, "Slug non valido.");

const nonNegativeNumber = z.coerce.number().finite().min(0);
const nonNegativeInteger = z.coerce.number().int().min(0);

const urlOrPathSchema = optionalText(400).refine(
  (value) =>
    value === undefined ||
    value === null ||
    value.startsWith("/") ||
    /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(value),
  "Usa un path locale /Img/... o una URL http/https valida.",
);

const productCreateSchema = z.object({
  badge: optionalText(80),
  category: optionalText(80),
  category_id: optionalUuid(),
  code: optionalText(80),
  colors: z.unknown().optional(),
  description: z.string().optional().default(""),
  image_url: urlOrPathSchema,
  is_active: z.boolean().optional().default(true),
  label: optionalText(80),
  lifestyle_url: urlOrPathSchema,
  metadata: z.record(z.unknown()).optional().default({}),
  name: requiredTrimmedText(160),
  packshot_url: urlOrPathSchema,
  price: nonNegativeNumber.optional().default(0),
  restock: nonNegativeInteger.optional().default(0),
  shape: optionalText(80),
  sku: optionalText(80),
  slug: slugSchema.optional(),
  sort_order: z.coerce.number().int().optional().default(0),
  status: z.enum(PRODUCT_STATUS).optional().default("active"),
  stock: nonNegativeInteger.optional(),
  stock_quantity: nonNegativeInteger.optional().default(0),
});

const productUpdateSchema = productCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Payload update vuoto.",
  });

function optionalUuid() {
  return z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (!value) return null;
      return value;
    });
}

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

function normalizeDescription(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

function normalizeProductWritePayload(
  payload: unknown,
  mode: "create" | "update",
): ProductWriteRow {
  const result =
    mode === "create"
      ? productCreateSchema.safeParse(payload)
      : productUpdateSchema.safeParse(payload);

  if (!result.success) {
    throw new Error(
      `CLIENT: Payload prodotto non valido: ${result.error.issues
        .map((issue) => issue.message)
        .join(" ")}`,
    );
  }

  const parsed = result.data as Partial<AdminProductPayload> & {
    stock?: number;
  };
  const row: ProductWriteRow = {};

  for (const key of [
    "badge",
    "category",
    "category_id",
    "code",
    "colors",
    "image_url",
    "is_active",
    "label",
    "lifestyle_url",
    "metadata",
    "name",
    "packshot_url",
    "price",
    "restock",
    "shape",
    "sku",
    "sort_order",
    "status",
  ] as const) {
    const value = parsed[key];
    if (value !== undefined) {
      row[key] = value as never;
    }
  }

  if (parsed.description !== undefined) {
    row.description = normalizeDescription(parsed.description);
  }

  if (parsed.stock !== undefined || parsed.stock_quantity !== undefined) {
    row.stock = parsed.stock ?? parsed.stock_quantity ?? 0;
  }

  if (mode === "create" || parsed.slug !== undefined || parsed.name) {
    row.slug = parsed.slug || slugify(String(parsed.name || ""));
  }

  if (mode === "create" && !row.slug) {
    throw new Error("CLIENT: Slug prodotto non valido.");
  }

  return row;
}

function rowsFromResponse(response: unknown): Record<string, unknown>[] {
  if (Array.isArray(response)) {
    return response.filter(
      (row): row is Record<string, unknown> =>
        Boolean(row && typeof row === "object"),
    );
  }

  return [];
}

function firstRow(response: unknown) {
  return rowsFromResponse(response)[0] || null;
}

function productNotFound() {
  const error = new Error("CLIENT: Prodotto non trovato.");
  Object.assign(error, { status: 404 });
  return error;
}

function statusFromAdminProductError(error: unknown) {
  const status = (error as { status?: unknown })?.status;
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 409 ||
    status === 503
  ) {
    return status;
  }

  const message = String(error instanceof Error ? error.message : error || "");
  if (
    message.includes("duplicate key") ||
    message.includes("products_slug_key") ||
    message.includes("products_sku_key") ||
    message.includes("products_code_key")
  ) {
    return 409;
  }

  return statusFromError(error);
}

async function writeAuditLog(
  env: ServerEnv,
  action: string,
  entityId: string | null,
  adminContext: AdminContext,
  payload: Record<string, unknown>,
) {
  try {
    await supabaseRequest(env, "admin_audit_log", {
      body: JSON.stringify({
        action,
        entity_id: entityId,
        entity_type: "product",
        payload: {
          ...payload,
          admin_auth_user_id: adminContext.userId,
        },
      }),
      headers: {
        Prefer: "return=minimal",
      },
      method: "POST",
    });
  } catch (error) {
    safeLog(env, "admin product audit log failed", {
      action,
      entityId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function requireAdminFromRequest(
  request: Request,
  env: ServerEnv,
): Promise<AdminContext> {
  const result = await verifyAdminJwt(request, env);
  if (!result.ok) {
    const error = new Error(result.error);
    Object.assign(error, { status: result.status });
    throw error;
  }

  return {
    userId: result.userId,
  };
}

export async function listAdminProducts(env: ServerEnv) {
  return rowsFromResponse(
    await supabaseRequest(
      env,
      `products?select=${PRODUCT_SELECT}&order=sort_order.asc,created_at.asc`,
      {
        method: "GET",
      },
    ),
  );
}

export async function getAdminProduct(env: ServerEnv, id: string) {
  const product = firstRow(
    await supabaseRequest(
      env,
      `products?select=${PRODUCT_SELECT}&id=eq.${encodeURIComponent(id)}&limit=1`,
      {
        method: "GET",
      },
    ),
  );

  if (!product) throw productNotFound();
  return product;
}

export async function createAdminProduct(
  env: ServerEnv,
  payload: unknown,
  adminContext: AdminContext,
) {
  const row = normalizeProductWritePayload(payload, "create");

  const product = firstRow(
    await supabaseRequest(env, `products?select=${PRODUCT_SELECT}`, {
      body: JSON.stringify(row),
      headers: {
        Prefer: "return=representation",
      },
      method: "POST",
    }),
  );

  await writeAuditLog(env, "product.create", String(product?.id || ""), adminContext, {
    slug: product?.slug || row.slug,
  });

  return product;
}

export async function updateAdminProduct(
  env: ServerEnv,
  id: string,
  payload: unknown,
  adminContext: AdminContext,
) {
  const row = normalizeProductWritePayload(payload, "update");

  const product = firstRow(
    await supabaseRequest(
      env,
      `products?select=${PRODUCT_SELECT}&id=eq.${encodeURIComponent(id)}`,
      {
        body: JSON.stringify(row),
        headers: {
          Prefer: "return=representation",
        },
        method: "PATCH",
      },
    ),
  );

  if (!product) throw productNotFound();

  await writeAuditLog(env, "product.update", id, adminContext, {
    fields: Object.keys(row),
  });

  return product;
}

export async function softDeleteAdminProduct(
  env: ServerEnv,
  id: string,
  adminContext: AdminContext,
) {
  const product = firstRow(
    await supabaseRequest(
      env,
      `products?select=${PRODUCT_SELECT}&id=eq.${encodeURIComponent(id)}`,
      {
        body: JSON.stringify({
          is_active: false,
          status: "archived",
        }),
        headers: {
          Prefer: "return=representation",
        },
        method: "PATCH",
      },
    ),
  );

  if (!product) throw productNotFound();

  await writeAuditLog(env, "product.soft_delete", id, adminContext, {
    is_active: false,
    status: "archived",
  });

  return product;
}

export async function handleAdminProductsCollection(
  request: Request,
  env: ServerEnv,
): Promise<Response> {
  try {
    const adminContext = await requireAdminFromRequest(request, env);

    if (request.method === "GET") {
      return jsonResponse({
        products: await listAdminProducts(env),
      });
    }

    if (request.method === "POST") {
      const payload = await readJson(request);
      return jsonResponse(
        {
          product: await createAdminProduct(env, payload, adminContext),
        },
        201,
      );
    }

    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return jsonResponse(
      {
        error: safeError(
          error,
          "Admin products CRUD non disponibile.",
          env.APP_ENV !== "production",
        ),
      },
      statusFromAdminProductError(error),
    );
  }
}

export async function handleAdminProductItem(
  request: Request,
  env: ServerEnv,
  id: string,
): Promise<Response> {
  try {
    const adminContext = await requireAdminFromRequest(request, env);

    if (request.method === "GET") {
      return jsonResponse({
        product: await getAdminProduct(env, id),
      });
    }

    if (request.method === "PATCH") {
      const payload = await readJson(request);
      return jsonResponse({
        product: await updateAdminProduct(env, id, payload, adminContext),
      });
    }

    if (request.method === "DELETE") {
      return jsonResponse({
        product: await softDeleteAdminProduct(env, id, adminContext),
      });
    }

    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return jsonResponse(
      {
        error: safeError(
          error,
          "Admin product CRUD non disponibile.",
          env.APP_ENV !== "production",
        ),
      },
      statusFromAdminProductError(error),
    );
  }
}

export const __adminProductsCrudTest = {
  normalizeProductWritePayload,
  statusFromAdminProductError,
};
