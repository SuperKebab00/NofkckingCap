import { parseGuardedJson } from "./checkout.js";

// Future DB-backed admin verification must use a server-side table such as
// public.admin_users and must never trust browser-provided admin flags.
export const ADMIN_USERS_TABLE = "admin_users";

export function getBearerToken(request) {
  const header = String(request.headers.get("Authorization") || "").trim();
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export function getAdminJwtVerificationState(
  env = {},
  options = {},
) {
  const hasJwtSecret = Boolean(String(env.SUPABASE_JWT_SECRET || "").trim());
  const hasAdminRoleClaim = Boolean(
    String(options.adminRoleClaim || env.ADMIN_ROLE_CLAIM || "").trim(),
  );
  const hasAdminRoleValue = Boolean(
    String(options.adminRoleValue || env.ADMIN_ROLE_VALUE || "").trim(),
  );

  if (!hasJwtSecret) {
    return {
      configured: false,
      reason:
        "SUPABASE_JWT_SECRET non documentato o non configurato lato Cloudflare.",
    };
  }

  if (!hasAdminRoleClaim || !hasAdminRoleValue) {
    return {
      configured: false,
      reason:
        "Regola server-side per riconoscere un admin non ancora documentata.",
    };
  }

  return {
    configured: true,
    reason: "",
  };
}

export function verifyAdminJwt(request, env = {}, options = {}) {
  void parseGuardedJson;

  const token = getBearerToken(request);

  if (!token) {
    return {
      admin: false,
      authenticated: false,
      error: "Token admin mancante.",
      ok: false,
      status: 401,
    };
  }

  const verification = getAdminJwtVerificationState(env, options);
  if (!verification.configured) {
    return {
      admin: false,
      authenticated: false,
      error: verification.reason,
      ok: false,
      status: 503,
    };
  }

  return {
    admin: false,
    authenticated: false,
    error:
      "Admin JWT verification not implemented: manca la validazione crittografica server-side e il controllo DB-backed su admin_users.is_admin = true.",
    ok: false,
    status: 501,
  };
}
