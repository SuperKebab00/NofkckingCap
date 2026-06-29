import "server-only";

export type AdminProductsSummaryState =
  | "configured"
  | "not-configured"
  | "error";

export type AdminProductSummaryItem = {
  category: string | null;
  id: string;
  name: string;
  price: number;
};

export type AdminProductsSummaryResult = {
  adminApi: string;
  message: string;
  mode: string;
  products: AdminProductSummaryItem[];
  source: "endpoint" | "fallback";
  state: AdminProductsSummaryState;
  total: number;
  writes: string;
};

type AdminProductsSummaryPayload = {
  adminApi?: unknown;
  mode?: unknown;
  products?: unknown;
  total?: unknown;
  writes?: unknown;
};

type GetAdminProductsSummaryOptions = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
};

function createFallbackResult(
  state: AdminProductsSummaryState,
  message: string,
): AdminProductsSummaryResult {
  return {
    adminApi: state === "configured" ? "unavailable" : "not-configured",
    message,
    mode: "read-only",
    products: [],
    source: "fallback",
    state,
    total: 0,
    writes: "disabled",
  };
}

function normalizeProduct(value: unknown): AdminProductSummaryItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id =
    typeof row.id === "string" ? row.id : String(row.id === undefined ? "" : row.id);
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const priceValue = Number(row.price);
  const category =
    typeof row.category === "string" ? row.category.trim() || null : null;

  if (!id || !name || !Number.isFinite(priceValue)) {
    return null;
  }

  return {
    category,
    id,
    name,
    price: priceValue,
  };
}

export function getAdminProductsSummaryConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const baseUrl = env.ADMIN_API_BASE_URL?.trim();
  const token = env.ADMIN_API_TOKEN?.trim();

  if (!baseUrl || !token) {
    return null;
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    token,
  };
}

export function normalizeAdminProductsSummaryPayload(
  payload: AdminProductsSummaryPayload,
) {
  const products = Array.isArray(payload.products)
    ? payload.products
        .map(normalizeProduct)
        .filter((product): product is AdminProductSummaryItem => Boolean(product))
    : [];

  return {
    adminApi:
      typeof payload.adminApi === "string" ? payload.adminApi : "available",
    mode: typeof payload.mode === "string" ? payload.mode : "read-only",
    products,
    total:
      typeof payload.total === "number" && Number.isFinite(payload.total)
        ? payload.total
        : products.length,
    writes: typeof payload.writes === "string" ? payload.writes : "disabled",
  };
}

export async function getAdminProductsSummary(
  options: GetAdminProductsSummaryOptions = {},
): Promise<AdminProductsSummaryResult> {
  const env = options.env ?? process.env;
  const config = getAdminProductsSummaryConfig(env);

  if (!config) {
    return createFallbackResult(
      "not-configured",
      "Admin products summary non configurato in questa shell Next.",
    );
  }

  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(
      `${config.baseUrl}/api/admin/products/summary`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
        method: "GET",
      },
    );

    if (!response.ok) {
      return createFallbackResult(
        "error",
        `Admin products summary non disponibile (${response.status}).`,
      );
    }

    const payload = (await response.json()) as AdminProductsSummaryPayload;
    const normalized = normalizeAdminProductsSummaryPayload(payload);

    return {
      ...normalized,
      message: "Admin products summary collegato lato server.",
      source: "endpoint",
      state: "configured",
    };
  } catch {
    return createFallbackResult(
      "error",
      "Admin products summary non raggiungibile dalla shell Next.",
    );
  }
}
