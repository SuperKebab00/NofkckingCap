export const ADMIN_LEAD_STATUSES = ["new", "open", "contacted", "closed", "spam"] as const;

export type AdminLeadStatus = (typeof ADMIN_LEAD_STATUSES)[number];

export type AdminLead = {
  created_at?: string | null;
  email?: string | null;
  id: string;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  phone?: string | null;
  privacy_accepted?: boolean | null;
  source?: string | null;
  status?: AdminLeadStatus | string | null;
  subject?: string | null;
  updated_at?: string | null;
};

export type AdminLeadsFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AdminLeadStatus | "";
};

export type AdminLeadStatusPayload = {
  metadata?: Record<string, unknown>;
  status: AdminLeadStatus;
};

type ApiErrorPayload = {
  error?: string;
};

type FetchOptions = {
  fetchImpl?: typeof fetch;
};

export class AdminLeadsClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminLeadsClientError";
    this.status = status;
  }
}

function assertToken(token: string) {
  if (!token.trim()) {
    throw new AdminLeadsClientError("Sessione admin mancante.", 401);
  }
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | ApiErrorPayload
    | T
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? payload.error || "Richiesta admin leads non riuscita."
        : "Richiesta admin leads non riuscita.";
    throw new AdminLeadsClientError(message, response.status);
  }

  return payload as T;
}

async function adminLeadsRequest<T>(
  token: string,
  path: string,
  init: RequestInit = {},
  options: FetchOptions = {},
): Promise<T> {
  assertToken(token);

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const fetchImpl = options.fetchImpl || fetch;
  return parseApiResponse<T>(await fetchImpl(path, { ...init, headers }));
}

function buildListPath(filters: AdminLeadsFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.status) params.set("status", filters.status);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  const query = params.toString();
  return query ? `/api/admin/leads?${query}` : "/api/admin/leads";
}

export async function listAdminLeads(
  token: string,
  filters: AdminLeadsFilters = {},
  options: FetchOptions = {},
): Promise<AdminLead[]> {
  const payload = await adminLeadsRequest<{ leads?: AdminLead[] }>(
    token,
    buildListPath(filters),
    { method: "GET" },
    options,
  );
  return Array.isArray(payload.leads) ? payload.leads : [];
}

export async function getAdminLead(
  token: string,
  id: string,
  options: FetchOptions = {},
): Promise<AdminLead> {
  const payload = await adminLeadsRequest<{ lead: AdminLead }>(
    token,
    `/api/admin/leads/${encodeURIComponent(id)}`,
    { method: "GET" },
    options,
  );
  return payload.lead;
}

export async function updateAdminLeadStatus(
  token: string,
  id: string,
  payload: AdminLeadStatusPayload,
  options: FetchOptions = {},
): Promise<AdminLead> {
  const response = await adminLeadsRequest<{ lead: AdminLead }>(
    token,
    `/api/admin/leads/${encodeURIComponent(id)}`,
    {
      body: JSON.stringify(payload),
      method: "PATCH",
    },
    options,
  );
  return response.lead;
}

export async function archiveAdminLead(
  token: string,
  id: string,
  options: FetchOptions = {},
): Promise<AdminLead> {
  const response = await adminLeadsRequest<{ lead: AdminLead }>(
    token,
    `/api/admin/leads/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    options,
  );
  return response.lead;
}
