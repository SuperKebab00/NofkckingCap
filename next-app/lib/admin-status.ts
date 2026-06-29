import "server-only";

export type AdminApiState = "configured" | "not-configured" | "error";

export type AdminStatusSummary = {
  adminApi: string;
  apiState: AdminApiState;
  categoriesCount: number | null;
  message: string;
  mode: string;
  productsCount: number | null;
  source: "endpoint" | "fallback";
  writes: string;
};

type AdminStatusPayload = {
  adminApi?: unknown;
  catalog?: {
    categoriesCount?: unknown;
    productsCount?: unknown;
  };
  mode?: unknown;
  writes?: unknown;
};

type GetAdminStatusOptions = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
};

function toCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function createFallbackStatus(
  apiState: AdminApiState,
  message: string,
): AdminStatusSummary {
  return {
    adminApi: apiState === "configured" ? "unavailable" : "not-configured",
    apiState,
    categoriesCount: null,
    message,
    mode: "read-only",
    productsCount: null,
    source: "fallback",
    writes: "disabled",
  };
}

export function getAdminStatusConfig(
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

export function normalizeAdminStatusPayload(
  payload: AdminStatusPayload,
): Pick<
  AdminStatusSummary,
  "adminApi" | "categoriesCount" | "mode" | "productsCount" | "writes"
> {
  return {
    adminApi:
      typeof payload.adminApi === "string" ? payload.adminApi : "available",
    categoriesCount: toCount(payload.catalog?.categoriesCount),
    mode: typeof payload.mode === "string" ? payload.mode : "read-only",
    productsCount: toCount(payload.catalog?.productsCount),
    writes: typeof payload.writes === "string" ? payload.writes : "disabled",
  };
}

export async function getAdminStatus(
  options: GetAdminStatusOptions = {},
): Promise<AdminStatusSummary> {
  const env = options.env ?? process.env;
  const config = getAdminStatusConfig(env);

  if (!config) {
    return createFallbackStatus(
      "not-configured",
      "Admin API non configurata in questa shell Next.",
    );
  }

  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(`${config.baseUrl}/api/admin/status`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
      method: "GET",
    });

    if (!response.ok) {
      return createFallbackStatus(
        "error",
        `Admin API non disponibile (${response.status}).`,
      );
    }

    const payload = (await response.json()) as AdminStatusPayload;
    const normalized = normalizeAdminStatusPayload(payload);

    return {
      ...normalized,
      apiState: "configured",
      message: "Admin API read-only collegata lato server.",
      source: "endpoint",
    };
  } catch {
    return createFallbackStatus(
      "error",
      "Admin API non raggiungibile dalla shell Next.",
    );
  }
}
