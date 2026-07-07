import {
  json,
  parseGuardedJson,
  safeError,
  statusFromError,
  supabaseRequest,
} from "../_lib/checkout.js";

function getBearerToken(request) {
  const header = String(request.headers.get("Authorization") || "");
  if (!header.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

async function readCount(env, table) {
  const rows = await supabaseRequest(
    env,
    `${table}?select=id&is_active=eq.true`,
    {
      method: "GET",
    },
  );

  return Array.isArray(rows) ? rows.length : 0;
}

export async function onRequest(context) {
  try {
    if (context.request.method !== "GET") {
      return json({ error: "Metodo non consentito." }, 405);
    }

    const expectedToken = String(context.env.ADMIN_API_TOKEN || "").trim();
    const providedToken = getBearerToken(context.request);

    if (!expectedToken || !providedToken || providedToken !== expectedToken) {
      return json({ error: "Non autorizzato." }, 401);
    }

    const [productsCount, categoriesCount] = await Promise.all([
      readCount(context.env, "products"),
      readCount(context.env, "shop_categories"),
    ]);

    return json({
      adminApi: "available",
      catalog: {
        categoriesCount,
        productsCount,
      },
      mode: "read-only",
      writes: "disabled",
    });
  } catch (error) {
    return json(
      {
        error: safeError(
          error,
          "Impossibile leggere lo stato admin.",
          context.env.APP_ENV !== "production",
        ),
      },
      statusFromError(error),
    );
  }
}
