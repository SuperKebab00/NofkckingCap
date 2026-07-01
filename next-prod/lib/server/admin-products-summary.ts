import "server-only";

import {
  jsonResponse,
  requireAdminApiToken,
  safeError,
  statusFromError,
  supabaseRequest,
  type ServerEnv,
} from "./api-core";

export type AdminProductSummaryItem = {
  category: string | null;
  id: string;
  name: string;
  price: number;
};

export type AdminProductsSummaryPayload = {
  adminApi: "available";
  mode: "read-only";
  products: AdminProductSummaryItem[];
  total: number;
  writes: "disabled";
};

function normalizeProductSummary(row: Record<string, unknown>): AdminProductSummaryItem {
  return {
    category: typeof row.category === "string" ? row.category : null,
    id: typeof row.id === "string" ? row.id : String(row.id || ""),
    name: typeof row.name === "string" ? row.name : "",
    price: Number.isFinite(Number(row.price)) ? Number(row.price) : 0,
  };
}

export async function readAdminProductsSummary(
  env: ServerEnv,
): Promise<AdminProductsSummaryPayload> {
  const response = await supabaseRequest(
    env,
    "products?select=id,name,price,category&order=name.asc",
    {
      method: "GET",
    },
  );

  const rows = Array.isArray(response)
    ? response
    : Array.isArray((response as { rows?: unknown[] })?.rows)
      ? ((response as { rows: unknown[] }).rows ?? [])
      : [];

  const products = rows
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
    .map(normalizeProductSummary)
    .filter((product) => product.id && product.name);

  return {
    adminApi: "available",
    mode: "read-only",
    products,
    total: products.length,
    writes: "disabled",
  };
}

export async function handleAdminProductsSummary(
  request: Request,
  env: ServerEnv,
): Promise<Response> {
  try {
    if (request.method !== "GET") {
      return jsonResponse({ error: "Metodo non consentito." }, 405);
    }

    if (!requireAdminApiToken(request, env)) {
      return jsonResponse({ error: "Non autorizzato." }, 401);
    }

    return jsonResponse(await readAdminProductsSummary(env));
  } catch (error) {
    return jsonResponse(
      {
        error: safeError(error, "Admin products summary non disponibile."),
      },
      statusFromError(error),
    );
  }
}
