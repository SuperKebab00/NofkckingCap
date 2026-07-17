import "server-only";

import { getServerEnv } from "./server/api-core";
import { verifyAdminJwt, type AdminRole } from "./server/admin-auth";

export type AdminAuthCheckState =
  | "not-configured"
  | "missing-session"
  | "admin"
  | "non-admin"
  | "error";

export type AdminAuthCheckResult = {
  admin: boolean;
  authenticated: boolean;
  message: string;
  role?: AdminRole;
  source: "endpoint" | "fallback";
  state: AdminAuthCheckState;
  superAdmin?: boolean;
};

type AdminAuthCheckPayload = {
  admin?: unknown;
  authenticated?: unknown;
  error?: unknown;
  role?: unknown;
  superAdmin?: unknown;
};

type AdminAuthCheckConfig = {
  supabaseJwksUrl: string;
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
};

export function getAdminAuthCheckConfig(
  env: NodeJS.ProcessEnv = process.env,
): AdminAuthCheckConfig | null {
  const supabaseJwksUrl = env.SUPABASE_JWKS_URL?.trim();
  const supabaseUrl = env.SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseJwksUrl || !supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return {
    supabaseJwksUrl,
    supabaseServiceRoleKey,
    supabaseUrl,
  };
}

export function normalizeAdminAuthCheckPayload(
  payload: AdminAuthCheckPayload,
): AdminAuthCheckResult {
  if (payload.admin === true && payload.authenticated === true) {
    return {
      admin: true,
      authenticated: true,
      message: "Admin verificato.",
      role: payload.role === "super_admin" ? "super_admin" : "admin",
      source: "endpoint",
      state: "admin",
      superAdmin: payload.superAdmin === true,
    };
  }

  if (payload.authenticated === true) {
    return {
      admin: false,
      authenticated: true,
      message:
        typeof payload.error === "string" && payload.error
          ? payload.error
          : "Utente autenticato ma non admin.",
      source: "endpoint",
      state: "non-admin",
    };
  }

  return {
    admin: false,
    authenticated: false,
    message:
      typeof payload.error === "string" && payload.error
        ? payload.error
        : "Admin auth check non disponibile.",
    source: "endpoint",
    state: "error",
  };
}

function createFallbackResult(
  state: AdminAuthCheckState,
  message: string,
): AdminAuthCheckResult {
  return {
    admin: false,
    authenticated: false,
    message,
    source: "fallback",
    state,
  };
}

export async function getAdminAuthCheck(
  options: { accessToken?: string | null; env?: NodeJS.ProcessEnv } = {},
): Promise<AdminAuthCheckResult> {
  const env = options.env || process.env;
  const accessToken = options.accessToken?.trim() || "";

  if (!getAdminAuthCheckConfig(env)) {
    return createFallbackResult(
      "not-configured",
      "Admin auth check non configurato: servono SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_JWKS_URL lato server.",
    );
  }

  if (!accessToken) {
    return createFallbackResult(
      "missing-session",
      "Sessione admin mancante.",
    );
  }

  try {
    const request = new Request("http://localhost/api/admin/auth/check", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "GET",
    });

    const result = await verifyAdminJwt(request, getServerEnv(env));
    if (result.ok) {
      return {
        admin: true,
        authenticated: true,
        message: "Admin verificato.",
        role: result.role,
        source: "endpoint",
        state: "admin",
        superAdmin: result.superAdmin,
      };
    }

    if (result.status === 403) {
      return {
        admin: false,
        authenticated: true,
        message: result.error,
        source: "endpoint",
        state: "non-admin",
      };
    }

    return createFallbackResult("error", result.error);
  } catch (error) {
    return createFallbackResult(
      "error",
      error instanceof Error && error.message
        ? error.message
        : "Admin auth check non disponibile.",
    );
  }
}
