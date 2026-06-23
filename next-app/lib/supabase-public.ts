type SupabasePublicConfig =
  | {
      configured: true;
      anonKey: string;
      url: string;
    }
  | {
      configured: false;
      reason: string;
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
  price: number | null;
  shape: string | null;
  stock: number | null;
};

export type PublicProductsResult =
  | {
      configured: true;
      products: PublicProduct[];
    }
  | {
      configured: false;
      products: [];
      reason: string;
    };

const PRODUCT_COLUMNS = [
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
].join(",");

function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return {
      configured: false,
      reason:
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  return { configured: true, anonKey, url: url.replace(/\/+$/, "") };
}

function mapProductRow(row: SupabaseProductRow): PublicProduct {
  return {
    badge: row.badge,
    category: row.category,
    colors: row.colors,
    description: row.description,
    id: row.id,
    label: row.label,
    lifestyleUrl: row.lifestyle_url,
    name: row.name || "Prodotto",
    packshotUrl: row.packshot_url,
    price:
      typeof row.price === "number"
        ? row.price
        : row.price
          ? Number(row.price)
          : null,
    shape: row.shape,
    stock: row.stock,
  };
}

export async function getPublicProducts(): Promise<PublicProductsResult> {
  const config = getSupabasePublicConfig();

  if (!config.configured) {
    return {
      configured: false,
      products: [],
      reason: config.reason,
    };
  }

  const searchParams = new URLSearchParams({
    is_active: "eq.true",
    order: "created_at.desc",
    select: PRODUCT_COLUMNS,
  });

  const response = await fetch(
    `${config.url}/rest/v1/products?${searchParams.toString()}`,
    {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
      // Future step: decide no-store vs revalidate once /shop uses live data.
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase public products read failed: ${response.status}`);
  }

  const rows = (await response.json()) as SupabaseProductRow[];

  return {
    configured: true,
    products: rows.map(mapProductRow),
  };
}
