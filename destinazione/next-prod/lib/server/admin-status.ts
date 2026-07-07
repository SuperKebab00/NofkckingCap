import "server-only";

import {
  jsonResponse,
  requireAdminApiToken,
  safeError,
  statusFromError,
  supabaseRequest,
  type ServerEnv,
} from "./api-core";

export type AdminStatusPayload = {
  adminApi: "available";
  catalog: {
    categoriesCount: number;
    productsCount: number;
  };
  mode: "read-only";
  writes: "disabled";
};

async function readCount(env: ServerEnv, table: string) {
  const rows = await supabaseRequest(env, `${table}?select=id&is_active=eq.true`, {
    method: "GET",
  });

  return Array.isArray(rows) ? rows.length : 0;
}

export async function readAdminStatus(env: ServerEnv): Promise<AdminStatusPayload> {
  const [productsCount, categoriesCount] = await Promise.all([
    readCount(env, "products"),
    readCount(env, "shop_categories"),
  ]);

  return {
    adminApi: "available",
    catalog: {
      categoriesCount,
      productsCount,
    },
    mode: "read-only",
    writes: "disabled",
  };
}

export async function handleAdminStatus(
  request: Request,
  env: ServerEnv,
): Promise<Response> {
  try {
    if (request.method !== "GET") {
      return jsonResponse({ error: "Metodo non consentito." }, 405);
    }

    if (!requireAdminApiToken(request, env)) {
      return jsonResponse({ error: "Non autorizzato." }, 401);
    }

    return jsonResponse(await readAdminStatus(env));
  } catch (error) {
    return jsonResponse(
      {
        error: safeError(
          error,
          "Impossibile leggere lo stato admin.",
          env.APP_ENV !== "production",
        ),
      },
      statusFromError(error),
    );
  }
}
