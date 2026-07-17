import "server-only";

import { z } from "zod";

import { requireSuperAdminFromRequest, type AdminContext } from "./admin-products-crud";
import {
  jsonResponse,
  readJson,
  safeError,
  safeLog,
  statusFromError,
  supabaseRequest,
  type ServerEnv,
} from "./api-core";
import type { AdminRole } from "./admin-auth";

const ADMIN_USER_SELECT = "user_id,is_admin,role,created_at,updated_at";
const AUDIT_SELECT = "id,action,entity_type,entity_id,payload,created_at";
const ADMIN_ROLES = ["admin", "super_admin"] as const;

type AdminUserRow = {
  created_at?: unknown;
  is_admin: boolean;
  role: AdminRole;
  updated_at?: unknown;
  user_id: string;
};

const adminUserPayloadSchema = z.object({
  is_admin: z.boolean().optional().default(true),
  role: z.enum(ADMIN_ROLES).optional().default("admin"),
  user_id: z.string().uuid(),
});

const adminUserUpdateSchema = z
  .object({
    is_admin: z.boolean().optional(),
    role: z.enum(ADMIN_ROLES).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Payload update vuoto.",
  });

function rows(response: unknown): Record<string, unknown>[] {
  return Array.isArray(response)
    ? response.filter((row): row is Record<string, unknown> =>
        Boolean(row && typeof row === "object"),
      )
    : [];
}

function statusFromSuperAdminError(error: unknown) {
  const status = Number((error as { status?: unknown })?.status);
  if ([400, 401, 403, 404, 409, 503].includes(status)) return status;
  return statusFromError(error);
}

async function audit(
  env: ServerEnv,
  action: string,
  admin: AdminContext,
  payload: Record<string, unknown>,
) {
  try {
    await supabaseRequest(env, "admin_audit_log", {
      body: JSON.stringify({
        action,
        entity_id: String(payload.user_id || ""),
        entity_type: "admin_user",
        payload: { ...payload, admin_auth_user_id: admin.userId },
      }),
      headers: { Prefer: "return=minimal" },
      method: "POST",
    });
  } catch (error) {
    safeLog(env, "admin user audit log failed", {
      action,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function parseRole(value: unknown): AdminRole {
  return value === "super_admin" ? "super_admin" : "admin";
}

export async function listAdminUsers(env: ServerEnv): Promise<AdminUserRow[]> {
  return rows(
    await supabaseRequest(
      env,
      `admin_users?select=${ADMIN_USER_SELECT}&order=created_at.asc`,
      { method: "GET" },
    ),
  ).map((row) => ({
    created_at: row.created_at,
    is_admin: row.is_admin === true,
    role: parseRole(row.role),
    updated_at: row.updated_at,
    user_id: String(row.user_id || ""),
  }));
}

export async function upsertAdminUser(
  env: ServerEnv,
  payload: unknown,
  admin: AdminContext,
) {
  const parsed = adminUserPayloadSchema.parse(payload);
  const rowsResult = rows(
    await supabaseRequest(env, `admin_users?select=${ADMIN_USER_SELECT}`, {
      body: JSON.stringify(parsed),
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      method: "POST",
    }),
  );
  await audit(env, "admin_user.upsert", admin, {
    role: parsed.role,
    user_id: parsed.user_id,
  });
  return rowsResult[0] || null;
}

export async function updateAdminUserRole(
  env: ServerEnv,
  userId: string,
  payload: unknown,
  admin: AdminContext,
) {
  const parsed = adminUserUpdateSchema.parse(payload);
  const currentUsers = await listAdminUsers(env);
  const target = currentUsers.find((user) => String(user.user_id) === userId);
  if (!target) {
    const error = new Error("CLIENT: Utente admin non trovato.");
    Object.assign(error, { status: 404 });
    throw error;
  }
  const activeSuperAdmins = currentUsers.filter(
    (user) => user.is_admin === true && user.role === "super_admin",
  );
  const wouldRemoveSuperAdmin =
    target.is_admin === true &&
    target.role === "super_admin" &&
    (parsed.role === "admin" || parsed.is_admin === false);

  if (wouldRemoveSuperAdmin && activeSuperAdmins.length <= 1) {
    const error = new Error("CLIENT: Non puoi rimuovere l'ultimo super admin.");
    Object.assign(error, { status: 409 });
    throw error;
  }

  if (admin.userId === userId && wouldRemoveSuperAdmin) {
    const error = new Error("CLIENT: Auto-demozione super admin non consentita.");
    Object.assign(error, { status: 409 });
    throw error;
  }

  const rowsResult = rows(
    await supabaseRequest(
      env,
      `admin_users?select=${ADMIN_USER_SELECT}&user_id=eq.${encodeURIComponent(userId)}`,
      {
        body: JSON.stringify(parsed),
        headers: { Prefer: "return=representation" },
        method: "PATCH",
      },
    ),
  );
  const row = rowsResult[0] || null;
  if (!row) {
    const error = new Error("CLIENT: Utente admin non trovato.");
    Object.assign(error, { status: 404 });
    throw error;
  }
  await audit(env, "admin_user.update_role", admin, {
    role: parsed.role,
    user_id: userId,
  });
  return row;
}

export async function listAuditLog(env: ServerEnv) {
  return rows(
    await supabaseRequest(
      env,
      `admin_audit_log?select=${AUDIT_SELECT}&order=created_at.desc&limit=100`,
      { method: "GET" },
    ),
  );
}

export async function handleAdminUsersCollection(
  request: Request,
  env: ServerEnv,
): Promise<Response> {
  try {
    const admin = await requireSuperAdminFromRequest(request, env);
    if (request.method === "GET") {
      return jsonResponse({ users: await listAdminUsers(env) });
    }
    if (request.method === "POST") {
      return jsonResponse(
        { user: await upsertAdminUser(env, await readJson(request), admin) },
        201,
      );
    }
    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return jsonResponse(
      { error: safeError(error, "Gestione utenti non disponibile.", env.APP_ENV !== "production") },
      statusFromSuperAdminError(error),
    );
  }
}

export async function handleAdminUserItem(
  request: Request,
  env: ServerEnv,
  userId: string,
): Promise<Response> {
  try {
    const admin = await requireSuperAdminFromRequest(request, env);
    if (request.method === "PATCH") {
      return jsonResponse({
        user: await updateAdminUserRole(env, userId, await readJson(request), admin),
      });
    }
    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return jsonResponse(
      { error: safeError(error, "Gestione utente non disponibile.", env.APP_ENV !== "production") },
      statusFromSuperAdminError(error),
    );
  }
}

export async function handleAdminAuditLog(
  request: Request,
  env: ServerEnv,
): Promise<Response> {
  try {
    await requireSuperAdminFromRequest(request, env);
    if (request.method === "GET") {
      return jsonResponse({ entries: await listAuditLog(env) });
    }
    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return jsonResponse(
      { error: safeError(error, "Audit log non disponibile.", env.APP_ENV !== "production") },
      statusFromSuperAdminError(error),
    );
  }
}

export const __adminSuperCrudTest = {
  adminUserPayloadSchema,
  adminUserUpdateSchema,
  statusFromSuperAdminError,
};
