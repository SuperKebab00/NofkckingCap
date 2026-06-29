type SupabasePublicConfig = {
  anonKey: string | null;
  url: string | null;
};

type SupabaseProductRow = {
  badge: string | null;
  category: string | null;
  colors: unknown;
  description: string | null;
  id: string;
  label: string | null;
  lifestyle_url: string | null;
  name: string | null;
  packshot_url: string | null;
  price: number | string | null;
  shape: string | null;
  stock: number | null;
};

type SupabaseShopCategoryRow = {
  label: string | null;
  sort_order: number | null;
  value: string | null;
};

export type PublicProduct = {
  badge: string | null;
  category: string | null;
  colors: unknown;
  description: string | null;
  id: string;
  label: string | null;
  lifestyleUrl: string | null;
  name: string;
  packshotUrl: string | null;
  price: number | string | null;
  shape: string | null;
  stock: number | null;
};

export type PublicProductsResult = {
  products: PublicProduct[];
  showStock: boolean;
};

export type PublicShopCategory = {
  label: string;
  sort_order: number | null;
  value: string;
};

function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null;

  return {
    anonKey,
    url,
  };
}

function buildSupabaseRestUrl(
  baseUrl: string,
  table: string,
  searchParams: URLSearchParams,
): string {
  return `${baseUrl.replace(/\/+$/, "")}/rest/v1/${table}?${searchParams.toString()}`;
}

function createSupabaseHeaders(anonKey: string): Record<string, string> {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
  };
}

function mapProductRow(row: SupabaseProductRow): PublicProduct | null {
  if (!row.id || !row.name) {
    return null;
  }

  return {
    badge: row.badge,
    category: row.category,
    colors: row.colors,
    description: row.description,
    id: row.id,
    label: row.label,
    lifestyleUrl: row.lifestyle_url,
    name: row.name,
    packshotUrl: row.packshot_url,
    price: row.price,
    shape: row.shape,
    stock: row.stock,
  };
}

function mapShopCategoryRow(
  row: SupabaseShopCategoryRow,
): PublicShopCategory | null {
  if (!row.value || !row.label) {
    return null;
  }

  return {
    label: row.label,
    sort_order: row.sort_order,
    value: row.value,
  };
}

export async function getPublicProducts(): Promise<PublicProductsResult> {
  const config = getSupabasePublicConfig();

  if (!config.url || !config.anonKey) {
    return {
      products: [],
      showStock: false,
    };
  }

  const searchParams = new URLSearchParams({
    is_active: "eq.true",
    select: [
      "id",
      "name",
      "category",
      "label",
      "description",
      "price",
      "stock",
      "packshot_url",
      "lifestyle_url",
      "colors",
      "shape",
      "badge",
    ].join(","),
  });

  try {
    const response = await fetch(
      buildSupabaseRestUrl(config.url, "products", searchParams),
      {
        headers: createSupabaseHeaders(config.anonKey),
      },
    );

    if (!response.ok) {
      return {
        products: [],
        showStock: false,
      };
    }

    const rows = (await response.json()) as SupabaseProductRow[];
    const products = rows
      .map(mapProductRow)
      .filter((product): product is PublicProduct => Boolean(product));

    return {
      products,
      showStock: false,
    };
  } catch {
    return {
      products: [],
      showStock: false,
    };
  }
}

export async function getPublicShopCategories(): Promise<PublicShopCategory[]> {
  const config = getSupabasePublicConfig();

  if (!config.url || !config.anonKey) {
    return [];
  }

  const searchParams = new URLSearchParams({
    is_active: "eq.true",
    order: "sort_order.asc",
    select: ["value", "label", "sort_order"].join(","),
  });

  try {
    const response = await fetch(
      buildSupabaseRestUrl(config.url, "shop_categories", searchParams),
      {
        headers: createSupabaseHeaders(config.anonKey),
      },
    );

    if (!response.ok) {
      return [];
    }

    const rows = (await response.json()) as SupabaseShopCategoryRow[];

    return rows
      .map(mapShopCategoryRow)
      .filter((category): category is PublicShopCategory => Boolean(category));
  } catch {
    return [];
  }
}
