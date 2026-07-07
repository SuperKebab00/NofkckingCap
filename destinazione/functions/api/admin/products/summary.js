import {
  json,
  parseGuardedJson,
  safeError,
  statusFromError,
  supabaseRequest,
} from "../../_lib/checkout.js";

function getBearerToken(request) {
  const header = String(request.headers.get("Authorization") || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function normalizeProductSummary(row) {
  return {
    category: typeof row.category === "string" ? row.category : null,
    id: typeof row.id === "string" ? row.id : String(row.id || ""),
    name: typeof row.name === "string" ? row.name : "",
    price: Number.isFinite(Number(row.price)) ? Number(row.price) : 0,
  };
}

async function readProductSummary(env) {
  const response = await supabaseRequest(
    env,
    "/rest/v1/products?select=id,name,price,category&order=name.asc",
    {
      method: "GET",
    },
  );

  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response?.rows)
      ? response.rows
      : [];
  const products = rows
    .map(normalizeProductSummary)
    .filter((product) => product.id && product.name);

  return {
    products,
    total: products.length,
  };
}

export async function onRequest(context) {
  try {
    if (context.request.method !== "GET") {
      return json({ error: "Metodo non consentito." }, 405);
    }

    const expectedToken = String(context.env.ADMIN_API_TOKEN || "").trim();
    const receivedToken = getBearerToken(context.request);

    if (!expectedToken || receivedToken !== expectedToken) {
      return json({ error: "Non autorizzato." }, 401);
    }

    void parseGuardedJson;

    const summary = await readProductSummary(context.env);

    return json({
      adminApi: "available",
      mode: "read-only",
      products: summary.products,
      total: summary.total,
      writes: "disabled",
    });
  } catch (error) {
    return json(
      { error: safeError(error, "Admin products summary non disponibile.") },
      statusFromError(error),
    );
  }
}
