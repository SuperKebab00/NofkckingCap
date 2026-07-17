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

const CATEGORY_SELECT = "id,value,label,description,is_active,sort_order,created_at,updated_at";
const SECTION_SELECT = "id,key,title,subtitle,body,settings,is_active,sort_order,created_at,updated_at";
const ITEM_SELECT = "id,section_id,section_key,item_key,title,label,href,image_url,content,is_active,sort_order,created_at,updated_at";

const text = (maxLength: number) =>
  z.string().transform((value) => value.replace(/\s+/g, " ").trim().slice(0, maxLength));

const requiredText = (maxLength: number) =>
  text(maxLength).refine((value) => value.length > 0, "Campo obbligatorio.");

const optionalText = (maxLength: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const normalized = value.replace(/\s+/g, " ").trim().slice(0, maxLength);
      return normalized || null;
    });

const slug = z
  .string()
  .transform((value) => slugify(value))
  .refine((value) => value.length > 0, "Slug/key non valido.");

const optionalUuid = z
  .union([z.string().uuid(), z.literal(""), z.null()])
  .optional()
  .transform((value) => value || null);

const urlOrPath = optionalText(400).refine(
  (value) =>
    value === undefined ||
    value === null ||
    value.startsWith("/") ||
    /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(value),
  "URL o path non valido.",
);

const categoryCreateSchema = z.object({
  description: optionalText(320),
  is_active: z.boolean().optional().default(true),
  label: requiredText(120),
  name: text(120).optional(),
  slug: slug.optional(),
  sort_order: z.coerce.number().int().optional().default(0),
  value: slug.optional(),
});

const categoryUpdateSchema = categoryCreateSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "Payload update vuoto.",
});

const sectionCreateSchema = z.object({
  body: optionalText(1000),
  description: optionalText(320),
  is_active: z.boolean().optional().default(true),
  key: slug.optional(),
  layout: optionalText(80),
  name: text(160).optional(),
  settings: z.record(z.unknown()).optional().default({}),
  slug: slug.optional(),
  sort_order: z.coerce.number().int().optional().default(0),
  subtitle: optionalText(240),
  title: requiredText(160),
  type: optionalText(80),
});

const sectionUpdateSchema = sectionCreateSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "Payload update vuoto.",
});

const itemCreateSchema = z.object({
  content: z.record(z.unknown()).optional().default({}),
  href: urlOrPath,
  image_url: urlOrPath,
  is_active: z.boolean().optional().default(true),
  item_key: slug.optional(),
  label: optionalText(80),
  name: text(160).optional(),
  section_id: optionalUuid,
  section_key: slug.optional(),
  sort_order: z.coerce.number().int().optional().default(0),
  title: requiredText(160),
});

const itemUpdateSchema = itemCreateSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "Payload update vuoto.",
});

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

function rows(response: unknown): Record<string, unknown>[] {
  return Array.isArray(response)
    ? response.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
    : [];
}

function first(response: unknown) {
  return rows(response)[0] || null;
}

function notFound(label: string) {
  const error = new Error(`CLIENT: ${label} non trovato.`);
  Object.assign(error, { status: 404 });
  return error;
}

function statusFromCrudError(error: unknown) {
  const status = (error as { status?: unknown })?.status;
  if ([400, 401, 403, 404, 409, 503].includes(Number(status))) return Number(status);
  const message = String(error instanceof Error ? error.message : error || "");
  if (message.includes("duplicate key") || message.includes("_key")) return 409;
  return statusFromError(error);
}

function parseOrThrow<T>(schema: z.ZodType<T>, payload: unknown, label: string): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new Error(
      `CLIENT: Payload ${label} non valido: ${result.error.issues.map((issue) => issue.message).join(" ")}`,
    );
  }
  return result.data;
}

function normalizeCategory(payload: unknown, mode: "create" | "update") {
  const parsed = parseOrThrow(mode === "create" ? categoryCreateSchema : categoryUpdateSchema, payload, "categoria") as Partial<{
    description: string | null;
    is_active: boolean;
    label: string;
    name: string;
    slug: string;
    sort_order: number;
    value: string;
  }>;
  const label = parsed.label || parsed.name;
  const value = parsed.value || parsed.slug || (label ? slugify(label) : undefined);
  const row: Record<string, unknown> = {};
  if (value !== undefined) row.value = value;
  if (label !== undefined) row.label = label;
  if (parsed.description !== undefined) row.description = parsed.description;
  if (parsed.is_active !== undefined) row.is_active = parsed.is_active;
  if (parsed.sort_order !== undefined) row.sort_order = parsed.sort_order;
  if (mode === "create" && (!row.value || !row.label)) throw new Error("CLIENT: Categoria senza nome o slug.");
  return row;
}

function normalizeSection(payload: unknown, mode: "create" | "update") {
  const parsed = parseOrThrow(mode === "create" ? sectionCreateSchema : sectionUpdateSchema, payload, "sezione") as Partial<{
    body: string | null;
    description: string | null;
    is_active: boolean;
    key: string;
    layout: string | null;
    name: string;
    settings: Record<string, unknown>;
    slug: string;
    sort_order: number;
    subtitle: string | null;
    title: string;
    type: string | null;
  }>;
  const title = parsed.title || parsed.name;
  const key = parsed.key || parsed.slug || (title ? slugify(title) : undefined);
  const settings = {
    ...(parsed.settings || {}),
    ...(parsed.layout ? { layout: parsed.layout } : {}),
    ...(parsed.type ? { type: parsed.type } : {}),
  };
  const row: Record<string, unknown> = {};
  if (key !== undefined) row.key = key;
  if (title !== undefined) row.title = title;
  if (parsed.subtitle !== undefined) row.subtitle = parsed.subtitle;
  if (parsed.body !== undefined || parsed.description !== undefined) row.body = parsed.body ?? parsed.description ?? null;
  if (parsed.settings !== undefined || parsed.layout !== undefined || parsed.type !== undefined) row.settings = settings;
  if (parsed.is_active !== undefined) row.is_active = parsed.is_active;
  if (parsed.sort_order !== undefined) row.sort_order = parsed.sort_order;
  if (mode === "create" && (!row.key || !row.title)) throw new Error("CLIENT: Sezione senza titolo o key.");
  return row;
}

function normalizeItem(payload: unknown, mode: "create" | "update", sectionKey?: string) {
  const parsed = parseOrThrow(mode === "create" ? itemCreateSchema : itemUpdateSchema, payload, "section item") as Partial<{
    content: Record<string, unknown>;
    href: string | null;
    image_url: string | null;
    is_active: boolean;
    item_key: string;
    label: string | null;
    name: string;
    section_id: string | null;
    section_key: string;
    sort_order: number;
    title: string;
  }>;
  const title = parsed.title || parsed.name;
  const itemKey = parsed.item_key || (title ? slugify(title) : undefined);
  const content = {
    ...(parsed.content || {}),
    ...(title ? { title } : {}),
    ...(parsed.label ? { label: parsed.label } : {}),
    ...(parsed.href ? { href: parsed.href } : {}),
    ...(parsed.image_url ? { imageUrl: parsed.image_url } : {}),
  };
  const row: Record<string, unknown> = {};
  if (parsed.section_id !== undefined) row.section_id = parsed.section_id;
  if (sectionKey || parsed.section_key) row.section_key = sectionKey || parsed.section_key;
  if (itemKey !== undefined) row.item_key = itemKey;
  if (title !== undefined) row.title = title;
  if (parsed.label !== undefined) row.label = parsed.label;
  if (parsed.href !== undefined) row.href = parsed.href;
  if (parsed.image_url !== undefined) row.image_url = parsed.image_url;
  if (parsed.content !== undefined || title || parsed.label || parsed.href || parsed.image_url) row.content = content;
  if (parsed.is_active !== undefined) row.is_active = parsed.is_active;
  if (parsed.sort_order !== undefined) row.sort_order = parsed.sort_order;
  if (mode === "create" && (!row.section_key || !row.item_key || !row.title)) throw new Error("CLIENT: Item senza sezione, key o titolo.");
  return row;
}

async function audit(env: ServerEnv, action: string, entityType: string, entityId: string | null, admin: AdminContext, payload: Record<string, unknown>) {
  try {
    await supabaseRequest(env, "admin_audit_log", {
      body: JSON.stringify({
        action,
        entity_id: entityId,
        entity_type: entityType,
        payload: { ...payload, admin_auth_user_id: admin.userId },
      }),
      headers: { Prefer: "return=minimal" },
      method: "POST",
    });
  } catch (error) {
    safeLog(env, "shop structure audit failed", { action, entityId, message: error instanceof Error ? error.message : String(error) });
  }
}

async function list(env: ServerEnv, table: string, select: string) {
  return rows(await supabaseRequest(env, `${table}?select=${select}&order=sort_order.asc,created_at.asc`, { method: "GET" }));
}

async function get(env: ServerEnv, table: string, select: string, id: string, label: string) {
  const item = first(await supabaseRequest(env, `${table}?select=${select}&id=eq.${encodeURIComponent(id)}&limit=1`, { method: "GET" }));
  if (!item) throw notFound(label);
  return item;
}

async function create(env: ServerEnv, table: string, select: string, row: Record<string, unknown>) {
  return first(await supabaseRequest(env, `${table}?select=${select}`, {
    body: JSON.stringify(row),
    headers: { Prefer: "return=representation" },
    method: "POST",
  }));
}

async function update(env: ServerEnv, table: string, select: string, id: string, row: Record<string, unknown>, label: string) {
  const item = first(await supabaseRequest(env, `${table}?select=${select}&id=eq.${encodeURIComponent(id)}`, {
    body: JSON.stringify(row),
    headers: { Prefer: "return=representation" },
    method: "PATCH",
  }));
  if (!item) throw notFound(label);
  return item;
}

export const listAdminShopCategories = (env: ServerEnv) => list(env, "shop_categories", CATEGORY_SELECT);
export const getAdminShopCategory = (env: ServerEnv, id: string) => get(env, "shop_categories", CATEGORY_SELECT, id, "Categoria");
export async function createAdminShopCategory(env: ServerEnv, payload: unknown, admin: AdminContext) {
  const category = await create(env, "shop_categories", CATEGORY_SELECT, normalizeCategory(payload, "create"));
  await audit(env, "shop_category.create", "shop_category", String(category?.id || ""), admin, { value: category?.value });
  return category;
}
export async function updateAdminShopCategory(env: ServerEnv, id: string, payload: unknown, admin: AdminContext) {
  const category = await update(env, "shop_categories", CATEGORY_SELECT, id, normalizeCategory(payload, "update"), "Categoria");
  await audit(env, "shop_category.update", "shop_category", id, admin, { fields: Object.keys(normalizeCategory(payload, "update")) });
  return category;
}
export async function softDeleteAdminShopCategory(env: ServerEnv, id: string, admin: AdminContext) {
  const category = await update(env, "shop_categories", CATEGORY_SELECT, id, { is_active: false }, "Categoria");
  await audit(env, "shop_category.soft_delete", "shop_category", id, admin, { is_active: false });
  return category;
}

export const listAdminShopSections = (env: ServerEnv) => list(env, "shop_sections", SECTION_SELECT);
export const getAdminShopSection = (env: ServerEnv, id: string) => get(env, "shop_sections", SECTION_SELECT, id, "Sezione");
export async function createAdminShopSection(env: ServerEnv, payload: unknown, admin: AdminContext) {
  const section = await create(env, "shop_sections", SECTION_SELECT, normalizeSection(payload, "create"));
  await audit(env, "shop_section.create", "shop_section", String(section?.id || ""), admin, { key: section?.key });
  return section;
}
export async function updateAdminShopSection(env: ServerEnv, id: string, payload: unknown, admin: AdminContext) {
  const section = await update(env, "shop_sections", SECTION_SELECT, id, normalizeSection(payload, "update"), "Sezione");
  await audit(env, "shop_section.update", "shop_section", id, admin, { fields: Object.keys(normalizeSection(payload, "update")) });
  return section;
}
export async function softDeleteAdminShopSection(env: ServerEnv, id: string, admin: AdminContext) {
  const section = await update(env, "shop_sections", SECTION_SELECT, id, { is_active: false }, "Sezione");
  await audit(env, "shop_section.soft_delete", "shop_section", id, admin, { is_active: false });
  return section;
}

export async function listAdminShopSectionItems(env: ServerEnv, sectionIdOrKey: string) {
  const section = await getAdminShopSection(env, sectionIdOrKey).catch(() => null);
  const key = String(section?.key || sectionIdOrKey);
  return rows(await supabaseRequest(env, `shop_section_items?select=${ITEM_SELECT}&section_key=eq.${encodeURIComponent(key)}&order=sort_order.asc,created_at.asc`, { method: "GET" }));
}
export async function createAdminShopSectionItem(env: ServerEnv, sectionIdOrKey: string, payload: unknown, admin: AdminContext) {
  const section = await getAdminShopSection(env, sectionIdOrKey).catch(() => null);
  const key = String(section?.key || sectionIdOrKey);
  const item = await create(env, "shop_section_items", ITEM_SELECT, normalizeItem(payload, "create", key));
  await audit(env, "shop_section_item.create", "shop_section_item", String(item?.id || ""), admin, { section_key: key });
  return item;
}
export async function updateAdminShopSectionItem(env: ServerEnv, id: string, payload: unknown, admin: AdminContext) {
  const item = await update(env, "shop_section_items", ITEM_SELECT, id, normalizeItem(payload, "update"), "Section item");
  await audit(env, "shop_section_item.update", "shop_section_item", id, admin, { fields: Object.keys(normalizeItem(payload, "update")) });
  return item;
}
export async function softDeleteAdminShopSectionItem(env: ServerEnv, id: string, admin: AdminContext) {
  const item = await update(env, "shop_section_items", ITEM_SELECT, id, { is_active: false }, "Section item");
  await audit(env, "shop_section_item.soft_delete", "shop_section_item", id, admin, { is_active: false });
  return item;
}

export async function handleAdminShopCategoriesCollection(request: Request, env: ServerEnv): Promise<Response> {
  return handleCollection(request, env, "categories");
}
export async function handleAdminShopCategoryItem(request: Request, env: ServerEnv, id: string): Promise<Response> {
  return handleItem(request, env, "categories", id);
}
export async function handleAdminShopSectionsCollection(request: Request, env: ServerEnv): Promise<Response> {
  return handleCollection(request, env, "sections");
}
export async function handleAdminShopSectionItem(request: Request, env: ServerEnv, id: string): Promise<Response> {
  return handleItem(request, env, "sections", id);
}
export async function handleAdminShopSectionItemsCollection(request: Request, env: ServerEnv, sectionId: string): Promise<Response> {
  try {
    const admin = await requireSuperAdminFromRequest(request, env);
    if (request.method === "GET") return jsonResponse({ items: await listAdminShopSectionItems(env, sectionId) });
    if (request.method === "POST") return jsonResponse({ item: await createAdminShopSectionItem(env, sectionId, await readJson(request), admin) }, 201);
    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return errorResponse(error, env);
  }
}
export async function handleAdminShopSectionItemCrud(request: Request, env: ServerEnv, id: string): Promise<Response> {
  try {
    const admin = await requireSuperAdminFromRequest(request, env);
    if (request.method === "PATCH") return jsonResponse({ item: await updateAdminShopSectionItem(env, id, await readJson(request), admin) });
    if (request.method === "DELETE") return jsonResponse({ item: await softDeleteAdminShopSectionItem(env, id, admin) });
    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return errorResponse(error, env);
  }
}

async function handleCollection(request: Request, env: ServerEnv, type: "categories" | "sections") {
  try {
    const admin = await requireSuperAdminFromRequest(request, env);
    if (request.method === "GET") return jsonResponse(type === "categories" ? { categories: await listAdminShopCategories(env) } : { sections: await listAdminShopSections(env) });
    if (request.method === "POST") {
      const payload = await readJson(request);
      return jsonResponse(
        type === "categories"
          ? { category: await createAdminShopCategory(env, payload, admin) }
          : { section: await createAdminShopSection(env, payload, admin) },
        201,
      );
    }
    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return errorResponse(error, env);
  }
}

async function handleItem(request: Request, env: ServerEnv, type: "categories" | "sections", id: string) {
  try {
    const admin = await requireSuperAdminFromRequest(request, env);
    if (request.method === "GET") return jsonResponse(type === "categories" ? { category: await getAdminShopCategory(env, id) } : { section: await getAdminShopSection(env, id) });
    if (request.method === "PATCH") {
      const payload = await readJson(request);
      return jsonResponse(type === "categories" ? { category: await updateAdminShopCategory(env, id, payload, admin) } : { section: await updateAdminShopSection(env, id, payload, admin) });
    }
    if (request.method === "DELETE") return jsonResponse(type === "categories" ? { category: await softDeleteAdminShopCategory(env, id, admin) } : { section: await softDeleteAdminShopSection(env, id, admin) });
    return jsonResponse({ error: "Metodo non consentito." }, 405);
  } catch (error) {
    return errorResponse(error, env);
  }
}

function errorResponse(error: unknown, env: ServerEnv) {
  return jsonResponse(
    { error: safeError(error, "Admin shop structure CRUD non disponibile.", env.APP_ENV !== "production") },
    statusFromCrudError(error),
  );
}

export const __adminShopStructureCrudTest = {
  normalizeCategory,
  normalizeItem,
  normalizeSection,
  statusFromCrudError,
};
