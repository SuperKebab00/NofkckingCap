
import { getServerEnv } from "./server/api-core.mjs";
import { readAdminStatus } from "./server/admin-status.mjs";
export function getAdminStatusConfig(env = process.env) {
    const supabaseUrl = env.SUPABASE_URL?.trim();
    const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return null;
    }
    return {
        supabaseServiceRoleKey,
        supabaseUrl,
    };
}
export function normalizeAdminStatusPayload(payload) {
    const value = (payload || {});
    const catalog = (value.catalog || {});
    return {
        apiState: value.adminApi === "available" ? "configured" : "error",
        categoriesCount: typeof catalog.categoriesCount === "number" ? catalog.categoriesCount : 0,
        message: value.adminApi === "available"
            ? "Admin API disponibile."
            : "Admin API non disponibile.",
        mode: value.mode === "read-only" ? "read-only" : "read-only",
        productsCount: typeof catalog.productsCount === "number" ? catalog.productsCount : 0,
        source: "endpoint",
        writes: value.writes === "disabled" ? "disabled" : "disabled",
    };
}
function createFallbackStatus(apiState, message) {
    return {
        apiState,
        categoriesCount: null,
        message,
        mode: "read-only",
        productsCount: null,
        source: "fallback",
        writes: "disabled",
    };
}
export async function getAdminStatus(options = {}) {
    const env = options.env || process.env;
    if (!getAdminStatusConfig(env)) {
        return createFallbackStatus("not-configured", "Admin API non configurata: servono SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY lato server.");
    }
    try {
        const payload = await readAdminStatus(getServerEnv(env));
        return normalizeAdminStatusPayload(payload);
    }
    catch (error) {
        return createFallbackStatus("error", error instanceof Error && error.message
            ? error.message
            : "Admin API non disponibile.");
    }
}
