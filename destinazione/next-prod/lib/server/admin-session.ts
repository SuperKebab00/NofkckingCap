import "server-only";

import {
  jsonResponse,
  readJson,
  safeError,
  type ServerEnv,
} from "./api-core";
import {
  ADMIN_SESSION_ACCESS_COOKIE,
  ADMIN_SESSION_REFRESH_COOKIE,
  verifyAdminAccessToken,
  type AdminRole,
} from "./admin-auth";

type AuthSession = {
  access_token?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
};

type LoginPayload = { email?: unknown; password?: unknown };

function getCookie(request: Request, name: string) {
  const cookie = (request.headers.get("cookie") || "")
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));

  if (!cookie) return "";
  try {
    return decodeURIComponent(cookie.slice(name.length + 1)).trim();
  } catch {
    return "";
  }
}

function getAuthConfig(env: ServerEnv) {
  const url = String(env.SUPABASE_URL || "").replace(/\/+$/, "");
  const anonKey = String(
    env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  ).trim();

  if (!url || !anonKey) {
    throw new Error("Configurazione Supabase Auth non disponibile.");
  }

  return { anonKey, url };
}

async function requestSession(
  env: ServerEnv,
  grantType: "password" | "refresh_token",
  payload: Record<string, string>,
) {
  const config = getAuthConfig(env);
  const response = await fetch(
    `${config.url}/auth/v1/token?grant_type=${grantType}`,
    {
      body: JSON.stringify(payload),
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  const body = (await response.json().catch(() => null)) as
    | AuthSession
    | { error_description?: string; msg?: string }
    | null;

  if (!response.ok) {
    const message = (body as { error_description?: string; msg?: string } | null)
      ?.error_description || (body as { msg?: string } | null)?.msg;
    throw Object.assign(new Error(`CLIENT: ${message || "Credenziali non valide."}`), {
      status: response.status === 400 ? 401 : response.status,
    });
  }

  const session = body as AuthSession;
  const accessToken = typeof session.access_token === "string" ? session.access_token : "";
  const refreshToken = typeof session.refresh_token === "string" ? session.refresh_token : "";
  const expiresIn = Number(session.expires_in);

  if (!accessToken || !refreshToken || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error("Sessione Supabase non valida.");
  }

  return { accessToken, expiresIn, refreshToken };
}

function sessionResponse(
  env: ServerEnv,
  session: { accessToken: string; expiresIn: number; refreshToken: string },
  role: AdminRole,
  superAdmin: boolean,
) {
  const response = jsonResponse({ admin: true, authenticated: true, role, superAdmin });
  response.headers.set("Cache-Control", "private, no-store");
  const cookies = response.headers;
  const access = `${ADMIN_SESSION_ACCESS_COOKIE}=${encodeURIComponent(session.accessToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(session.expiresIn)}${env.APP_ENV === "production" ? "; Secure" : ""}`;
  const refresh = `${ADMIN_SESSION_REFRESH_COOKIE}=${encodeURIComponent(session.refreshToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${env.APP_ENV === "production" ? "; Secure" : ""}`;
  cookies.append("Set-Cookie", access);
  cookies.append("Set-Cookie", refresh);
  return response;
}

function clearSessionResponse(env: ServerEnv) {
  const response = jsonResponse({ ok: true });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.append("Set-Cookie", `${ADMIN_SESSION_ACCESS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${env.APP_ENV === "production" ? "; Secure" : ""}`);
  response.headers.append("Set-Cookie", `${ADMIN_SESSION_REFRESH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${env.APP_ENV === "production" ? "; Secure" : ""}`);
  return response;
}

async function confirmAdmin(env: ServerEnv, accessToken: string) {
  const verification = await verifyAdminAccessToken(accessToken, env);
  if (!verification.ok) {
    throw Object.assign(new Error(`CLIENT: ${verification.error}`), { status: verification.status });
  }

  return verification;
}

export async function handleAdminSessionCreate(request: Request, env: ServerEnv) {
  try {
    const payload = (await readJson(request)) as LoginPayload;
    const email = String(payload.email || "").trim();
    const password = String(payload.password || "");
    if (!email || !password) {
      throw Object.assign(new Error("CLIENT: Email e password sono richieste."), { status: 400 });
    }

    const session = await requestSession(env, "password", { email, password });
    const admin = await confirmAdmin(env, session.accessToken);
    return sessionResponse(env, session, admin.role, admin.superAdmin);
  } catch (error) {
    return jsonResponse(
      { error: safeError(error, "Login admin non disponibile.", env.APP_ENV !== "production") },
      Number((error as { status?: unknown })?.status) || 500,
    );
  }
}

export async function handleAdminSessionRefresh(request: Request, env: ServerEnv) {
  try {
    const refreshToken = getCookie(request, ADMIN_SESSION_REFRESH_COOKIE);
    if (!refreshToken) {
      throw Object.assign(new Error("CLIENT: Sessione admin scaduta."), { status: 401 });
    }

    const session = await requestSession(env, "refresh_token", { refresh_token: refreshToken });
    const admin = await confirmAdmin(env, session.accessToken);
    return sessionResponse(env, session, admin.role, admin.superAdmin);
  } catch {
    return clearSessionResponse(env);
  }
}

export async function handleAdminSessionDelete(request: Request, env: ServerEnv) {
  const accessToken = getCookie(request, ADMIN_SESSION_ACCESS_COOKIE);
  try {
    const config = getAuthConfig(env);
    if (accessToken) {
      await fetch(`${config.url}/auth/v1/logout`, {
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        method: "POST",
      });
    }
  } catch {
    // Clear the local secure session even if upstream invalidation is unavailable.
  }
  return clearSessionResponse(env);
}
