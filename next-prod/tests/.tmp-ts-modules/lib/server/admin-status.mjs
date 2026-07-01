
import { jsonResponse, requireAdminApiToken, safeError, statusFromError, supabaseRequest, } from "./api-core.mjs";
async function readCount(env, table) {
    const rows = await supabaseRequest(env, `${table}?select=id&is_active=eq.true`, {
        method: "GET",
    });
    return Array.isArray(rows) ? rows.length : 0;
}
export async function readAdminStatus(env) {
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
export async function handleAdminStatus(request, env) {
    try {
        if (request.method !== "GET") {
            return jsonResponse({ error: "Metodo non consentito." }, 405);
        }
        if (!requireAdminApiToken(request, env)) {
            return jsonResponse({ error: "Non autorizzato." }, 401);
        }
        return jsonResponse(await readAdminStatus(env));
    }
    catch (error) {
        return jsonResponse({
            error: safeError(error, "Impossibile leggere lo stato admin.", env.APP_ENV !== "production"),
        }, statusFromError(error));
    }
}
