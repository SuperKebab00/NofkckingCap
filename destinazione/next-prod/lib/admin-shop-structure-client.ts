export type AdminShopCategory = {
  description?: string | null;
  id: string;
  is_active?: boolean;
  label: string;
  sort_order?: number | null;
  value: string;
};

export type AdminShopSection = {
  body?: string | null;
  id: string;
  is_active?: boolean;
  key: string;
  settings?: Record<string, unknown> | null;
  sort_order?: number | null;
  subtitle?: string | null;
  title: string;
};

export type AdminShopSectionItem = {
  id: string;
  is_active?: boolean;
  item_key: string;
  label?: string | null;
  section_key: string;
  sort_order?: number | null;
  title?: string | null;
};

export type AdminShopCategoryPayload = {
  description?: string | null;
  is_active?: boolean;
  label: string;
  slug?: string;
  sort_order?: number;
};

export type AdminShopSectionPayload = {
  body?: string | null;
  is_active?: boolean;
  key?: string;
  sort_order?: number;
  subtitle?: string | null;
  title: string;
};

type FetchOptions = {
  fetchImpl?: typeof fetch;
};

type ApiErrorPayload = {
  error?: string;
};

export class AdminShopStructureClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminShopStructureClientError";
    this.status = status;
  }
}

function assertToken(token: string) {
  if (!token.trim()) {
    throw new AdminShopStructureClientError("Sessione admin mancante.", 401);
  }
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiErrorPayload | T | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? payload.error || "Richiesta shop structure non riuscita."
        : "Richiesta shop structure non riuscita.";
    throw new AdminShopStructureClientError(message, response.status);
  }

  return payload as T;
}

async function request<T>(
  token: string,
  path: string,
  init: RequestInit = {},
  options: FetchOptions = {},
) {
  assertToken(token);

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await (options.fetchImpl || fetch)(path, { ...init, headers });
  return parseApiResponse<T>(response);
}

export async function listAdminShopCategories(token: string, options: FetchOptions = {}) {
  const payload = await request<{ categories?: AdminShopCategory[] }>(
    token,
    "/api/admin/shop-categories",
    { method: "GET" },
    options,
  );
  return Array.isArray(payload.categories) ? payload.categories : [];
}

export async function createAdminShopCategory(token: string, payload: AdminShopCategoryPayload, options: FetchOptions = {}) {
  const response = await request<{ category: AdminShopCategory }>(
    token,
    "/api/admin/shop-categories",
    { body: JSON.stringify(payload), method: "POST" },
    options,
  );
  return response.category;
}

export async function updateAdminShopCategory(token: string, id: string, payload: Partial<AdminShopCategoryPayload>, options: FetchOptions = {}) {
  const response = await request<{ category: AdminShopCategory }>(
    token,
    `/api/admin/shop-categories/${encodeURIComponent(id)}`,
    { body: JSON.stringify(payload), method: "PATCH" },
    options,
  );
  return response.category;
}

export async function deleteAdminShopCategory(token: string, id: string, options: FetchOptions = {}) {
  const response = await request<{ category: AdminShopCategory }>(
    token,
    `/api/admin/shop-categories/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    options,
  );
  return response.category;
}

export async function listAdminShopSections(token: string, options: FetchOptions = {}) {
  const payload = await request<{ sections?: AdminShopSection[] }>(
    token,
    "/api/admin/shop-sections",
    { method: "GET" },
    options,
  );
  return Array.isArray(payload.sections) ? payload.sections : [];
}

export async function createAdminShopSection(token: string, payload: AdminShopSectionPayload, options: FetchOptions = {}) {
  const response = await request<{ section: AdminShopSection }>(
    token,
    "/api/admin/shop-sections",
    { body: JSON.stringify(payload), method: "POST" },
    options,
  );
  return response.section;
}

export async function updateAdminShopSection(token: string, id: string, payload: Partial<AdminShopSectionPayload>, options: FetchOptions = {}) {
  const response = await request<{ section: AdminShopSection }>(
    token,
    `/api/admin/shop-sections/${encodeURIComponent(id)}`,
    { body: JSON.stringify(payload), method: "PATCH" },
    options,
  );
  return response.section;
}

export async function deleteAdminShopSection(token: string, id: string, options: FetchOptions = {}) {
  const response = await request<{ section: AdminShopSection }>(
    token,
    `/api/admin/shop-sections/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    options,
  );
  return response.section;
}
