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

type SupabaseShopSectionRow = {
  is_active?: boolean | null;
  key: string | null;
  settings: unknown;
  sort_order: number | null;
  subtitle: string | null;
  title: string | null;
};

type SupabaseShopSectionItemRow = {
  content: unknown;
  is_active?: boolean | null;
  item_key: string | null;
  section_key: string | null;
  sort_order: number | null;
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

export type PublicShopSection = {
  key: string;
  settings: unknown;
  sort_order: number | null;
  subtitle: string | null;
  title: string | null;
};

export type PublicShopSectionItem = {
  content: unknown;
  item_key: string;
  section_key: string;
  sort_order: number | null;
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

function mapShopSectionRow(
  row: SupabaseShopSectionRow,
): PublicShopSection | null {
  if (!row.key) {
    return null;
  }

  return {
    key: row.key,
    settings: row.settings,
    sort_order: row.sort_order,
    subtitle: row.subtitle,
    title: row.title,
  };
}

function mapShopSectionItemRow(
  row: SupabaseShopSectionItemRow,
): PublicShopSectionItem | null {
  if (!row.section_key || !row.item_key) {
    return null;
  }

  return {
    content: row.content,
    item_key: row.item_key,
    section_key: row.section_key,
    sort_order: row.sort_order,
  };
}

async function fetchSupabaseRows<T>(
  table: string,
  searchParams: URLSearchParams,
): Promise<T[]> {
  const config = getSupabasePublicConfig();

  if (!config.url || !config.anonKey) {
    return [];
  }

  try {
    const response = await fetch(
      buildSupabaseRestUrl(config.url, table, searchParams),
      {
        headers: createSupabaseHeaders(config.anonKey),
      },
    );

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as T[];
  } catch {
    return [];
  }
}

export async function getPublicProducts(): Promise<PublicProductsResult> {
  const rows = await fetchSupabaseRows<SupabaseProductRow>(
    "products",
    new URLSearchParams({
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
    }),
  );

  return {
    products: rows
      .map(mapProductRow)
      .filter((product): product is PublicProduct => Boolean(product)),
    showStock: false,
  };
}

export async function getPublicShopCategories(): Promise<PublicShopCategory[]> {
  const rows = await fetchSupabaseRows<SupabaseShopCategoryRow>(
    "shop_categories",
    new URLSearchParams({
      is_active: "eq.true",
      order: "sort_order.asc",
      select: ["value", "label", "sort_order"].join(","),
    }),
  );

  return rows
    .map(mapShopCategoryRow)
    .filter((category): category is PublicShopCategory => Boolean(category));
}

export async function getPublicShopSections(): Promise<PublicShopSection[]> {
  const rows = await fetchSupabaseRows<SupabaseShopSectionRow>(
    "shop_sections",
    new URLSearchParams({
      is_active: "eq.true",
      order: "sort_order.asc",
      select: ["key", "title", "subtitle", "settings", "sort_order"].join(","),
    }),
  );

  return rows
    .map(mapShopSectionRow)
    .filter((section): section is PublicShopSection => Boolean(section));
}

export async function getPublicShopSectionItems(): Promise<
  PublicShopSectionItem[]
> {
  const rows = await fetchSupabaseRows<SupabaseShopSectionItemRow>(
    "shop_section_items",
    new URLSearchParams({
      is_active: "eq.true",
      order: "sort_order.asc",
      select: ["section_key", "item_key", "content", "sort_order"].join(","),
    }),
  );

  return rows
    .map(mapShopSectionItemRow)
    .filter((item): item is PublicShopSectionItem => Boolean(item));
}
