export type AdminProduct = {
  badge?: string | null;
  category?: string | null;
  description?: string | null;
  id: string;
  image_url?: string | null;
  is_active?: boolean;
  name: string;
  price?: number | string | null;
  slug?: string | null;
  sort_order?: number | null;
  status?: string | null;
  stock?: number | null;
  stock_quantity?: number | null;
};

export type AdminProductPayload = {
  badge?: string | null;
  category?: string | null;
  description?: string;
  image_url?: string | null;
  is_active?: boolean;
  name: string;
  price?: number;
  slug?: string;
  sort_order?: number;
  status?: string;
  stock_quantity?: number;
};

type ApiErrorPayload = {
  error?: string;
};

type FetchOptions = {
  fetchImpl?: typeof fetch;
};

export class AdminProductsClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminProductsClientError";
    this.status = status;
  }
}

function assertExplicitToken(token: string | undefined) {
  if (token !== undefined && !token.trim()) {
    throw new AdminProductsClientError("Sessione admin mancante.", 401);
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
        ? payload.error || "Richiesta admin products non riuscita."
        : "Richiesta admin products non riuscita.";

    throw new AdminProductsClientError(message, response.status);
  }

  return payload as T;
}

async function adminProductsRequest<T>(
  token: string | undefined,
  path: string,
  init: RequestInit = {},
  options: FetchOptions = {},
): Promise<T> {
  assertExplicitToken(token);
  const headers = new Headers(init.headers || {});
  if (token?.trim()) headers.set("Authorization", `Bearer ${token}`);

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

export async function listAdminProducts(
  token?: string,
  options: FetchOptions = {},
): Promise<AdminProduct[]> {
  const payload = await adminProductsRequest<{ products?: AdminProduct[] }>(
    token,
    "/api/admin/products",
    {
      method: "GET",
    },
    options,
  );

  return Array.isArray(payload.products) ? payload.products : [];
}

export async function createAdminProduct(
  token: string | undefined,
  payload: AdminProductPayload,
  options: FetchOptions = {},
): Promise<AdminProduct> {
  const response = await adminProductsRequest<{ product: AdminProduct }>(
    token,
    "/api/admin/products",
    {
      body: JSON.stringify(payload),
      method: "POST",
    },
    options,
  );

  return response.product;
}

export async function updateAdminProduct(
  token: string | undefined,
  id: string,
  payload: Partial<AdminProductPayload>,
  options: FetchOptions = {},
): Promise<AdminProduct> {
  const response = await adminProductsRequest<{ product: AdminProduct }>(
    token,
    `/api/admin/products/${encodeURIComponent(id)}`,
    {
      body: JSON.stringify(payload),
      method: "PATCH",
    },
    options,
  );

  return response.product;
}

export async function deleteAdminProduct(
  token: string | undefined,
  id: string,
  options: FetchOptions = {},
): Promise<AdminProduct> {
  const response = await adminProductsRequest<{ product: AdminProduct }>(
    token,
    `/api/admin/products/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
    options,
  );

  return response.product;
}

export async function permanentlyDeleteAdminProduct(
  token: string | undefined,
  id: string,
  options: FetchOptions = {},
): Promise<{ deleted_files?: number; id?: string; shared_files?: number }> {
  const response = await adminProductsRequest<{
    product: { deleted_files?: number; id?: string; shared_files?: number };
  }>(
    token,
    `/api/admin/products/${encodeURIComponent(id)}?permanent=true`,
    {
      method: "DELETE",
    },
    options,
  );

  return response.product;
}
