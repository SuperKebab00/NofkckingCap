export const ADMIN_ORDER_STATUSES = [
  "prenotato",
  "in-attesa",
  "in-lavorazione",
  "pronto",
  "spedito",
  "completato",
  "annullato",
] as const;

export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];

export type AdminOrder = {
  created_at?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  fulfillment?: string | null;
  fulfillment_mode?: string | null;
  id: string;
  items?: AdminOrderItem[];
  notes?: string | null;
  order_number?: string | null;
  payment_mode?: string | null;
  shipping?: number | string | null;
  source?: string | null;
  status?: AdminOrderStatus | string | null;
  subtotal?: number | string | null;
  total?: number | string | null;
  updated_at?: string | null;
};

export type AdminOrderItem = {
  id?: string;
  line_total?: number | string | null;
  order_id?: string;
  product_id?: string | null;
  product_name?: string | null;
  product_name_snapshot?: string | null;
  product_sku_snapshot?: string | null;
  quantity?: number | string | null;
  total_price_snapshot?: number | string | null;
  unit_price?: number | string | null;
  unit_price_snapshot?: number | string | null;
};

export type AdminOrdersFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AdminOrderStatus | "";
};

export type AdminOrderStatusPayload = {
  notes?: string | null;
  status: AdminOrderStatus;
};

type ApiErrorPayload = {
  error?: string;
};

type FetchOptions = {
  fetchImpl?: typeof fetch;
};

export class AdminOrdersClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminOrdersClientError";
    this.status = status;
  }
}

function assertToken(token: string) {
  if (!token.trim()) {
    throw new AdminOrdersClientError("Sessione admin mancante.", 401);
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
        ? payload.error || "Richiesta admin orders non riuscita."
        : "Richiesta admin orders non riuscita.";

    throw new AdminOrdersClientError(message, response.status);
  }

  return payload as T;
}

async function adminOrdersRequest<T>(
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
  const response = await fetchImpl(path, {
    ...init,
    headers,
  });

  return parseApiResponse<T>(response);
}

function buildListPath(filters: AdminOrdersFilters = {}) {
  const params = new URLSearchParams();

  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.status) params.set("status", filters.status);
  if (filters.search?.trim()) params.set("search", filters.search.trim());

  const query = params.toString();
  return query ? `/api/admin/orders?${query}` : "/api/admin/orders";
}

export async function listAdminOrders(
  token: string,
  filters: AdminOrdersFilters = {},
  options: FetchOptions = {},
): Promise<AdminOrder[]> {
  const payload = await adminOrdersRequest<{ orders?: AdminOrder[] }>(
    token,
    buildListPath(filters),
    { method: "GET" },
    options,
  );

  return Array.isArray(payload.orders) ? payload.orders : [];
}

export async function getAdminOrder(
  token: string,
  id: string,
  options: FetchOptions = {},
): Promise<AdminOrder> {
  const payload = await adminOrdersRequest<{ order: AdminOrder }>(
    token,
    `/api/admin/orders/${encodeURIComponent(id)}`,
    { method: "GET" },
    options,
  );

  return payload.order;
}

export async function updateAdminOrderStatus(
  token: string,
  id: string,
  payload: AdminOrderStatusPayload,
  options: FetchOptions = {},
): Promise<AdminOrder> {
  const response = await adminOrdersRequest<{ order: AdminOrder }>(
    token,
    `/api/admin/orders/${encodeURIComponent(id)}`,
    {
      body: JSON.stringify(payload),
      method: "PATCH",
    },
    options,
  );

  return response.order;
}
