import "server-only";

import { z } from "zod";

import { requireAdminFromRequest, type AdminContext } from "./admin-products-crud";
import {
  jsonResponse,
  readJson,
  safeError,
  safeLog,
  statusFromError,
  supabaseRequest,
  type ServerEnv,
} from "./api-core";

const LEAD_SELECT =
  "id,email,phone,subject,message,privacy_accepted,status,source,metadata,created_at,updated_at";
const LEAD_STATUSES = ["new", "open", "contacted", "closed", "spam"] as const;

const leadStatusSchema = z
  .object({
    metadata: z.record(z.unknown()).optional(),
    status: z.enum(LEAD_STATUSES),
  })
  .strict();

function rows(response: unknown): Record<string, unknown>[] {
  return Array.isArray(response)
    ? response.filter((row): row is Record<string, unknown> =>
        Boolean(row && typeof row === "object"),
      )
    : [];
}

function first(response: unknown) {
  return rows(response)[0] || null;
}

function notFound() {
  return Object.assign(new Error("CLIENT: Lead non trovato."), { status: 404 });
}

function statusFromLeadsError(error: unknown) {
  const status = Number((error as { status?: unknown })?.status);
  if ([400, 401, 403, 404, 409, 503].includes(status)) return status;
  return statusFromError(error);
}

function parsePositiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function validateStatus(value: string | null) {
  if (!value) return "";
  return LEAD_STATUSES.includes(value as (typeof LEAD_STATUSES)[number])
    ? value
    : "";
}

function buildLeadsListPath(request: Request) {
  const url = new URL(request.url);
  const page = parsePositiveInteger(url.searchParams.get("page"), 1, 500);
  const pageSize = parsePositiveInteger(url.searchParams.get("pageSize"), 25, 100);
  const offset = (page - 1) * pageSize;
  const status = validateStatus(url.searchParams.get("status"));
  const search = String(url.searchParams.get("search") || "")
    .replace(/[%(),]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  const params = new URLSearchParams({
    limit: String(pageSize),
    offset: String(offset),
    order: "created_at.desc",
    select: LEAD_SELECT,
  });

  if (status) params.set("status", `eq.${status}`);
  if (search) {
    const encodedSearch = `*${search}*`;
    params.set(
      "or",
      `(email.ilike.${encodedSearch},phone.ilike.${encodedSearch},subject.ilike.${encodedSearch},message.ilike.${encodedSearch})`,
    );
  }

  return `leads?${params.toString()}`;
}

async function writeAuditLog(
  env: ServerEnv,
  action: string,
  entityId: string,
  admin: AdminContext,
  payload: Record<string, unknown>,
) {
  try {
    await supabaseRequest(env, "admin_audit_log", {
      body: JSON.stringify({
        action,
        entity_id: entityId,
        entity_type: "lead",
        payload: {
          ...payload,
          admin_auth_user_id: admin.userId,
        },
      }),
      headers: { Prefer: "return=minimal" },
      method: "POST",
    });
  } catch (error) {
    safeLog(env, "admin lead audit log failed", {
      action,
      entityId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function listAdminLeads(env: ServerEnv, request: Request) {
  return rows(await supabaseRequest(env, buildLeadsListPath(request), { method: "GET" }));
}

export async function getAdminLead(env: ServerEnv, id: string) {
  const lead = first(
    await supabaseRequest(
      env,
      `leads?select=${LEAD_SELECT}&id=eq.${encodeURIComponent(id)}&limit=1`,
      { method: "GET" },
    ),
  );

  if (!lead) throw notFound();
  return lead;
}

export async function updateAdminLeadStatus(
  env: ServerEnv,
  id: string,
  payload: unknown,
  admin: AdminContext,
) {
  const parsed = leadStatusSchema.safeParse(payload);
  if (!parsed.success) {
    throw Object.assign(
      new Error(
        `CLIENT: Payload stato lead non valido: ${parsed.error.issues
          .map((issue) => issue.message)
          .join(" ")}`,
      ),
      { status: 400 },
    );
  }

  const lead = first(
    await supabaseRequest(
      env,
      `leads?select=${LEAD_SELECT}&id=eq.${encodeURIComponent(id)}`,
      {
        body: JSON.stringify({
          ...(parsed.data.metadata ? { metadata: parsed.data.metadata } : {}),
          status: parsed.data.status,
        }),
        headers: { Prefer: "return=representation" },
        method: "PATCH",
      },
    ),
  );

  if (!lead) throw notFound();

  await writeAuditLog(env, "lead.status_update", id, admin, {
    status: parsed.data.status,
  });

  return lead;
}

export async function archiveAdminLead(
  env: ServerEnv,
  id: string,
  admin: AdminContext,
) {
  const lead = await updateAdminLeadStatus(env, id, { status: "closed" }, admin);
  await writeAuditLog(env, "lead.archive", id, admin, { status: "closed" });
  return lead;
}

export async function handleAdminLeadsCollection(
  request: Request,
  env: ServerEnv,
): Promise<Response> {
  try {
    await requireAdminFromRequest(request, env);
    if (request.method === "GET") {
      return jsonResponse({ leads: await listAdminLeads(env, request) });
    }
    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return jsonResponse(
      { error: safeError(error, "Admin leads non disponibile.", env.APP_ENV !== "production") },
      statusFromLeadsError(error),
    );
  }
}

export async function handleAdminLeadItem(
  request: Request,
  env: ServerEnv,
  id: string,
): Promise<Response> {
  try {
    const admin = await requireAdminFromRequest(request, env);
    if (request.method === "GET") return jsonResponse({ lead: await getAdminLead(env, id) });
    if (request.method === "PATCH") {
      return jsonResponse({
        lead: await updateAdminLeadStatus(env, id, await readJson(request), admin),
      });
    }
    if (request.method === "DELETE") {
      return jsonResponse({ lead: await archiveAdminLead(env, id, admin) });
    }
    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return jsonResponse(
      { error: safeError(error, "Admin lead non disponibile.", env.APP_ENV !== "production") },
      statusFromLeadsError(error),
    );
  }
}

export const __adminLeadsCrudTest = {
  buildLeadsListPath,
  statusFromLeadsError,
};
