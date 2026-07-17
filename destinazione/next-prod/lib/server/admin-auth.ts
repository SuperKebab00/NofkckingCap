import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

import {
  getBearerToken,
  jsonResponse,
  safeError,
  statusFromError,
  supabaseRequest,
  type ServerEnv,
} from "./api-core";

export const ADMIN_USERS_TABLE = "admin_users";
export const ADMIN_SESSION_ACCESS_COOKIE = "no-cap-admin-session";
export const ADMIN_SESSION_REFRESH_COOKIE = "no-cap-admin-refresh";

export type AdminRole = "admin" | "super_admin";

type AdminJwtVerificationResult =
  | {
      admin: true;
      authenticated: true;
      ok: true;
      role: AdminRole;
      superAdmin: boolean;
      status: 200;
      userId: string;
    }
  | {
      admin: false;
      authenticated: boolean;
      error: string;
      ok: false;
      role?: AdminRole;
      superAdmin?: false;
      status: 401 | 403 | 503;
      userId?: string;
    };

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getSupabaseAuthIssuer(supabaseUrl: string) {
  return `${supabaseUrl.replace(/\/+$/, "")}/auth/v1`;
}

function getRemoteJwks(url: string) {
  const normalized = url.trim();
  const cached = jwksCache.get(normalized);
  if (cached) {
    return cached;
  }

  const remoteSet = createRemoteJWKSet(new URL(normalized));
  jwksCache.set(normalized, remoteSet);
  return remoteSet;
}

export function getAdminJwtVerificationState(env: ServerEnv) {
  const hasJwksUrl = Boolean(String(env.SUPABASE_JWKS_URL || "").trim());
  const hasSupabaseUrl = Boolean(String(env.SUPABASE_URL || "").trim());
  const hasServiceRole = Boolean(String(env.SUPABASE_SERVICE_ROLE_KEY || "").trim());

  if (!hasJwksUrl) {
    return {
      configured: false,
      reason:
        "SUPABASE_JWKS_URL non documentato o non configurato lato Cloudflare.",
    };
  }

  if (!hasSupabaseUrl || !hasServiceRole) {
    return {
      configured: false,
      reason:
        "SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti per il controllo DB-backed admin_users.",
    };
  }

  return {
    configured: true,
    reason: "",
  };
}

export function getAdminSessionToken(request: Request): string {
  const bearerToken = getBearerToken(request);
  if (bearerToken) return bearerToken;

  const cookieHeader = request.headers.get("cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${ADMIN_SESSION_ACCESS_COOKIE}=`));

  if (!cookie) return "";

  try {
    return decodeURIComponent(cookie.slice(ADMIN_SESSION_ACCESS_COOKIE.length + 1)).trim();
  } catch {
    return "";
  }
}

async function readAdminUser(env: ServerEnv, userId: string) {
  const response = await supabaseRequest(
    env,
    `${ADMIN_USERS_TABLE}?select=user_id,is_admin,role&user_id=eq.${encodeURIComponent(
      userId,
    )}&is_admin=eq.true&limit=1`,
    {
      method: "GET",
    },
  );

  const rows = Array.isArray(response)
    ? response
    : Array.isArray((response as { rows?: unknown[] })?.rows)
      ? ((response as { rows: unknown[] }).rows ?? [])
      : [];

  return rows[0] || null;
}

function normalizeAdminRole(value: unknown): AdminRole {
  return value === "super_admin" ? "super_admin" : "admin";
}

export async function verifyAdminJwt(
  request: Request,
  env: ServerEnv,
): Promise<AdminJwtVerificationResult> {
  return verifyAdminAccessToken(getAdminSessionToken(request), env);
}

export async function verifyAdminAccessToken(
  token: string,
  env: ServerEnv,
): Promise<AdminJwtVerificationResult> {
  if (!token) {
    return {
      admin: false,
      authenticated: false,
      error: "Token admin mancante.",
      ok: false,
      status: 401,
    };
  }

  const verification = getAdminJwtVerificationState(env);
  if (!verification.configured) {
    return {
      admin: false,
      authenticated: false,
      error: verification.reason,
      ok: false,
      status: 503,
    };
  }

  try {
    const supabaseUrl = String(env.SUPABASE_URL || "").trim();
    const jwksUrl = String(env.SUPABASE_JWKS_URL || "").trim();

    const { payload } = await jwtVerify(token, getRemoteJwks(jwksUrl), {
      algorithms: ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "EdDSA"],
      issuer: getSupabaseAuthIssuer(supabaseUrl),
    });

    if (typeof payload.sub !== "string" || !payload.sub.trim()) {
      return {
        admin: false,
        authenticated: false,
        error: "JWT admin senza user id valido.",
        ok: false,
        status: 401,
      };
    }

    const adminRow = await readAdminUser(env, payload.sub) as
      | { role?: unknown }
      | null;
    if (!adminRow) {
      return {
        admin: false,
        authenticated: true,
        error: "Utente autenticato ma non admin.",
        ok: false,
        status: 403,
        userId: payload.sub,
      };
    }

    return {
      admin: true,
      authenticated: true,
      ok: true,
      role: normalizeAdminRole(adminRow.role),
      superAdmin: normalizeAdminRole(adminRow.role) === "super_admin",
      status: 200,
      userId: payload.sub,
    };
  } catch {
    return {
      admin: false,
      authenticated: false,
      error: "JWT admin non valido.",
      ok: false,
      status: 401,
    };
  }
}

export async function handleAdminAuthCheck(
  request: Request,
  env: ServerEnv,
): Promise<Response> {
  try {
    if (request.method !== "GET") {
      return jsonResponse({ error: "Metodo non consentito." }, 405);
    }

    const result = await verifyAdminJwt(request, env);
    if (!result.ok) {
      return jsonResponse(
        {
          admin: false,
          authenticated: Boolean(result.authenticated),
          error: result.error,
        },
        result.status,
      );
    }

    return jsonResponse({
      admin: true,
      authenticated: true,
      role: result.role,
      superAdmin: result.superAdmin,
    });
  } catch (error) {
    return jsonResponse(
      { error: safeError(error, "Admin auth check non disponibile.") },
      statusFromError(error),
    );
  }
}
