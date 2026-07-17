import "server-only";

import { z } from "zod";

import { requireAdminFromRequest, requireSuperAdminFromRequest, type AdminContext } from "./admin-products-crud";
import {
  jsonResponse,
  readJson,
  safeError,
  safeLog,
  statusFromError,
  supabaseRequest,
  supabaseStorageRequest,
  type ServerEnv,
} from "./api-core";

const CUT_SELECT =
  "id,title,description,image_path,image_url,date,is_featured,is_published,published_at,expires_at,created_at,updated_at,created_by,updated_by,metadata";
const MAX_CUT_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const cutPayloadSchema = z.object({
  description: z.string().optional().default(""),
  image_path: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  is_featured: z.boolean().optional().default(false),
  is_published: z.boolean().optional().default(false),
  title: z.string().trim().min(1).max(160),
});

const cutUpdateSchema = cutPayloadSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Payload update vuoto.",
);

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> =>
        Boolean(row && typeof row === "object"),
      )
    : [];
}

function first(value: unknown) {
  return rows(value)[0] || null;
}

function statusFromCutsError(error: unknown) {
  const status = Number((error as { status?: unknown })?.status);
  if ([400, 401, 403, 404, 409, 503].includes(status)) return status;
  return statusFromError(error);
}

function normalizeImagePath(value: unknown) {
  const path = String(value || "").replace(/^\/+/, "").trim();
  if (!path) return null;
  if (path.includes("..") || path.includes("//") || !path.startsWith("cuts/")) {
    throw Object.assign(new Error("CLIENT: Path immagine taglio non valido."), {
      status: 400,
    });
  }
  return path;
}

function extensionForType(type: string) {
  if (type === "image/webp") return "webp";
  if (type === "image/png") return "png";
  return "jpg";
}

async function audit(
  env: ServerEnv,
  action: string,
  entityId: string | null,
  admin: AdminContext,
  payload: Record<string, unknown>,
) {
  try {
    await supabaseRequest(env, "admin_audit_log", {
      body: JSON.stringify({
        action,
        entity_id: entityId,
        entity_type: "cut",
        payload: { ...payload, admin_auth_user_id: admin.userId },
      }),
      headers: { Prefer: "return=minimal" },
      method: "POST",
    });
  } catch (error) {
    safeLog(env, "admin cut audit log failed", {
      action,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function normalizeCutPayload(payload: unknown, mode: "create" | "update", admin: AdminContext) {
  const parsed =
    mode === "create"
      ? cutPayloadSchema.parse(payload)
      : cutUpdateSchema.parse(payload);
  const row: Record<string, unknown> = {
    ...parsed,
    updated_by: admin.userId,
  };

  if ("image_path" in row) row.image_path = normalizeImagePath(row.image_path);
  if (mode === "create") row.created_by = admin.userId;
  if (parsed.is_published === true) {
    row.published_at = new Date().toISOString();
    row.expires_at = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  }

  return row;
}

export async function listAdminCuts(env: ServerEnv) {
  return rows(
    await supabaseRequest(env, `cuts?select=${CUT_SELECT}&order=created_at.desc`, {
      method: "GET",
    }),
  );
}

export async function createAdminCut(env: ServerEnv, payload: unknown, admin: AdminContext) {
  const cut = first(
    await supabaseRequest(env, `cuts?select=${CUT_SELECT}`, {
      body: JSON.stringify(normalizeCutPayload(payload, "create", admin)),
      headers: { Prefer: "return=representation" },
      method: "POST",
    }),
  );
  await audit(env, "cut.create", String(cut?.id || ""), admin, {
    is_published: cut?.is_published === true,
  });
  return cut;
}

export async function updateAdminCut(
  env: ServerEnv,
  id: string,
  payload: unknown,
  admin: AdminContext,
) {
  const cut = first(
    await supabaseRequest(env, `cuts?select=${CUT_SELECT}&id=eq.${encodeURIComponent(id)}`, {
      body: JSON.stringify(normalizeCutPayload(payload, "update", admin)),
      headers: { Prefer: "return=representation" },
      method: "PATCH",
    }),
  );
  if (!cut) throw Object.assign(new Error("CLIENT: Taglio non trovato."), { status: 404 });
  await audit(env, "cut.update", id, admin, { fields: Object.keys(payload as object) });
  return cut;
}

export async function archiveAdminCut(env: ServerEnv, id: string, admin: AdminContext) {
  const cut = await updateAdminCut(
    env,
    id,
    { is_featured: false, is_published: false },
    admin,
  );
  await audit(env, "cut.archive", id, admin, {});
  return cut;
}

export async function uploadCutImage(env: ServerEnv, request: Request, admin: AdminContext) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw Object.assign(new Error("CLIENT: File immagine richiesto."), { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw Object.assign(new Error("CLIENT: Formato immagine non supportato."), { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_CUT_IMAGE_BYTES) {
    throw Object.assign(new Error("CLIENT: Immagine troppo grande."), { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const path = `cuts/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extensionForType(file.type)}`;
  await supabaseStorageRequest(env, `object/cuts/${path}`, {
    body: bytes,
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    method: "POST",
  });
  await audit(env, "cut.image_upload", null, admin, { image_path: path });
  return { image_path: path };
}

export async function listCutRetentionCandidates(env: ServerEnv) {
  return rows(
    await supabaseRequest(
      env,
      "rpc/cuts_retention_candidates",
      { body: JSON.stringify({}), method: "POST" },
    ),
  );
}

export async function runCutRetention(env: ServerEnv, admin: AdminContext) {
  const result = await supabaseRequest(env, "rpc/run_cuts_retention", {
    body: JSON.stringify({}),
    method: "POST",
  });
  await audit(env, "cut.retention_manual", null, admin, { result });
  return result;
}

export async function listCutOrphans(env: ServerEnv) {
  const objects = rows(
    await supabaseStorageRequest(env, "object/list/cuts", {
      body: JSON.stringify({ limit: 1000, offset: 0, prefix: "cuts", sortBy: { column: "name", order: "asc" } }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );
  const cuts = rows(
    await supabaseRequest(env, "cuts?select=id,image_path", { method: "GET" }),
  );
  const used = new Set(cuts.map((cut) => String(cut.image_path || "")).filter(Boolean));
  return objects
    .map((object) => ({
      name: String(object.name || ""),
      reason: used.has(String(object.name || "")) ? "" : "no_cut_record",
    }))
    .filter((object) => object.reason);
}

export async function handleAdminCutsCollection(request: Request, env: ServerEnv) {
  try {
    const admin = await requireAdminFromRequest(request, env);
    if (request.method === "GET") return jsonResponse({ cuts: await listAdminCuts(env) });
    if (request.method === "POST") {
      return jsonResponse({ cut: await createAdminCut(env, await readJson(request), admin) }, 201);
    }
    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return jsonResponse(
      { error: safeError(error, "Gestione tagli non disponibile.", env.APP_ENV !== "production") },
      statusFromCutsError(error),
    );
  }
}

export async function handleAdminCutItem(request: Request, env: ServerEnv, id: string) {
  try {
    const admin = await requireAdminFromRequest(request, env);
    if (request.method === "PATCH") {
      return jsonResponse({ cut: await updateAdminCut(env, id, await readJson(request), admin) });
    }
    if (request.method === "DELETE") {
      return jsonResponse({ cut: await archiveAdminCut(env, id, admin) });
    }
    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return jsonResponse(
      { error: safeError(error, "Gestione taglio non disponibile.", env.APP_ENV !== "production") },
      statusFromCutsError(error),
    );
  }
}

export async function handleAdminCutUpload(request: Request, env: ServerEnv) {
  try {
    const admin = await requireAdminFromRequest(request, env);
    if (request.method === "POST") {
      return jsonResponse({ upload: await uploadCutImage(env, request, admin) }, 201);
    }
    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return jsonResponse(
      { error: safeError(error, "Upload taglio non disponibile.", env.APP_ENV !== "production") },
      statusFromCutsError(error),
    );
  }
}

export async function handleAdminCutsRetention(request: Request, env: ServerEnv) {
  try {
    const admin = await requireSuperAdminFromRequest(request, env);
    if (request.method === "GET") {
      return jsonResponse({
        candidates: await listCutRetentionCandidates(env),
        orphans: await listCutOrphans(env),
      });
    }
    if (request.method === "POST") {
      return jsonResponse({ result: await runCutRetention(env, admin) });
    }
    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return jsonResponse(
      { error: safeError(error, "Retention tagli non disponibile.", env.APP_ENV !== "production") },
      statusFromCutsError(error),
    );
  }
}

export const __adminCutsCrudTest = {
  normalizeImagePath,
  statusFromCutsError,
};
