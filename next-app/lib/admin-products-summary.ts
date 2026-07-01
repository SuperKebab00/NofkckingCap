import "server-only";

import {
  readAdminProductsSummary,
  type AdminProductSummaryItem,
  type AdminProductsSummaryPayload,
} from "./server/admin-products-summary";
import { getServerEnv } from "./server/api-core";

export type AdminProductsSummaryState =
  | "configured"
  | "not-configured"
  | "error";

export type { AdminProductSummaryItem };

export type AdminProductsSummaryResult = {
  adminApi: "available" | "not-configured" | "unavailable";
  message: string;
  mode: "read-only";
  products: AdminProductSummaryItem[];
  source: "endpoint" | "fallback";
  state: AdminProductsSummaryState;
  total: number;
  writes: "disabled";
};

type AdminProductsSummaryConfig = {
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
};

export function getAdminProductsSummaryConfig(
  env: NodeJS.ProcessEnv = process.env,
): AdminProductsSummaryConfig | null {
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

export function normalizeAdminProductsSummaryPayload(
  payload: unknown,
): AdminProductsSummaryResult {
  const value = (payload || {}) as Partial<AdminProductsSummaryPayload>;
  const products = Array.isArray(value.products) ? value.products : [];

  return {
    adminApi: value.adminApi === "available" ? "available" : "unavailable",
    message:
      value.adminApi === "available"
        ? "Prodotti admin read-only caricati da nocap-next."
        : "Prodotti admin read-only non disponibili.",
    mode: value.mode === "read-only" ? "read-only" : "read-only",
    products,
    source: "endpoint",
    state: value.adminApi === "available" ? "configured" : "error",
    total: typeof value.total === "number" ? value.total : products.length,
    writes: value.writes === "disabled" ? "disabled" : "disabled",
  };
}

function createFallbackResult(
  state: AdminProductsSummaryState,
  message: string,
): AdminProductsSummaryResult {
  return {
    adminApi: state === "configured" ? "available" : "not-configured",
    message,
    mode: "read-only",
    products: [],
    source: "fallback",
    state,
    total: 0,
    writes: "disabled",
  };
}

export async function getAdminProductsSummary(
  options: { env?: NodeJS.ProcessEnv } = {},
): Promise<AdminProductsSummaryResult> {
  const env = options.env || process.env;

  if (!getAdminProductsSummaryConfig(env)) {
    return createFallbackResult(
      "not-configured",
      "Admin products summary non configurato: servono SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY lato server.",
    );
  }

  try {
    const payload = await readAdminProductsSummary(getServerEnv(env));
    return normalizeAdminProductsSummaryPayload(payload);
  } catch (error) {
    return createFallbackResult(
      "error",
      error instanceof Error && error.message
        ? error.message
        : "Admin products summary non disponibile.",
    );
  }
}
