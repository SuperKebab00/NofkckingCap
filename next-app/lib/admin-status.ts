import "server-only";

import { getServerEnv } from "./server/api-core";
import { readAdminStatus, type AdminStatusPayload } from "./server/admin-status";

export type AdminApiState = "configured" | "not-configured" | "error";

export type AdminStatusSummary = {
  apiState: AdminApiState;
  categoriesCount: number | null;
  message: string;
  mode: "read-only";
  productsCount: number | null;
  source: "endpoint" | "fallback";
  writes: "disabled";
};

type AdminStatusConfig = {
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
};

export function getAdminStatusConfig(
  env: NodeJS.ProcessEnv = process.env,
): AdminStatusConfig | null {
  const supabaseUrl = env.SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return {
    supabaseServiceRoleKey,
    supabaseUrl,
  };
}

export function normalizeAdminStatusPayload(
  payload: unknown,
): AdminStatusSummary {
  const value = (payload || {}) as Partial<AdminStatusPayload>;
  const catalog = (value.catalog || {}) as Partial<AdminStatusPayload["catalog"]>;

  return {
    apiState: value.adminApi === "available" ? "configured" : "error",
    categoriesCount:
      typeof catalog.categoriesCount === "number" ? catalog.categoriesCount : 0,
    message:
      value.adminApi === "available"
        ? "Admin API read-only disponibile in nocap-next."
        : "Admin API read-only non disponibile.",
    mode: value.mode === "read-only" ? "read-only" : "read-only",
    productsCount:
      typeof catalog.productsCount === "number" ? catalog.productsCount : 0,
    source: "endpoint",
    writes: value.writes === "disabled" ? "disabled" : "disabled",
  };
}

function createFallbackStatus(
  apiState: AdminApiState,
  message: string,
): AdminStatusSummary {
  return {
    apiState,
    categoriesCount: null,
    message,
    mode: "read-only",
    productsCount: null,
    source: "fallback",
    writes: "disabled",
  };
}

export async function getAdminStatus(
  options: { env?: NodeJS.ProcessEnv } = {},
): Promise<AdminStatusSummary> {
  const env = options.env || process.env;

  if (!getAdminStatusConfig(env)) {
    return createFallbackStatus(
      "not-configured",
      "Admin API non configurata: servono SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY lato server.",
    );
  }

  try {
    const payload = await readAdminStatus(getServerEnv(env));
    return normalizeAdminStatusPayload(payload);
  } catch (error) {
    return createFallbackStatus(
      "error",
      error instanceof Error && error.message
        ? error.message
        : "Admin API non disponibile.",
    );
  }
}
