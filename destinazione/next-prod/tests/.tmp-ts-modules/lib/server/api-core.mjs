
const JSON_HEADERS = {
    "Content-Type": "application/json; charset=UTF-8",
};
const MAX_JSON_BYTES = 32 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const LOCAL_RATE_LIMITS = new Map();
export function getServerEnv(source = process.env) {
    return {
        ADMIN_API_TOKEN: source.ADMIN_API_TOKEN,
        APP_ENV: source.APP_ENV,
        SUPABASE_JWKS_URL: source.SUPABASE_JWKS_URL,
        SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_URL: source.SUPABASE_URL,
        TURNSTILE_SECRET_KEY: source.TURNSTILE_SECRET_KEY,
    };
}
export function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        headers: JSON_HEADERS,
        status,
    });
}
export function safeError(error, fallback = "Richiesta non riuscita.", exposeDetails = false) {
    const message = String(error instanceof Error ? error.message : error || "").trim();
    if (message.startsWith("CLIENT:")) {
        return message.replace(/^CLIENT:\s*/, "");
    }
    if (exposeDetails && message) {
        return message;
    }
    return fallback;
}
export function safeLog(env, message, details = {}) {
    if (env.APP_ENV === "production") {
        return;
    }
    console.warn(message, details);
}
export function statusFromError(error, fallback = 500) {
    const message = String(error instanceof Error ? error.message : error || "");
    if (message.startsWith("CLIENT:") ||
        message.includes("Payload JSON non valido") ||
        message.includes("Payload troppo grande") ||
        message.includes("Content-Type non supportato")) {
        return 400;
    }
    if (message.includes("Metodo non consentito"))
        return 405;
    if (message.includes("Troppe richieste"))
        return 429;
    return fallback;
}
function getRequiredEnv(env, key) {
    const value = env[key];
    if (!value) {
        throw new Error(`Variabile ambiente mancante: ${key}`);
    }
    return value;
}
function clientIp(request) {
    return (request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "local");
}
async function applyRateLimit(request, bucket, maxRequests) {
    const key = `${bucket}:${clientIp(request)}`;
    const now = Date.now();
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    const current = LOCAL_RATE_LIMITS.get(key);
    const next = current && current.resetAt > now
        ? { count: current.count + 1, resetAt: current.resetAt }
        : { count: 1, resetAt };
    LOCAL_RATE_LIMITS.set(key, next);
    if (next.count > maxRequests) {
        throw new Error("Troppe richieste.");
    }
}
export async function readJson(request) {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
        throw new Error("CLIENT: Content-Type non supportato.");
    }
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_JSON_BYTES) {
        throw new Error("CLIENT: Payload troppo grande.");
    }
    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_JSON_BYTES) {
        throw new Error("CLIENT: Payload troppo grande.");
    }
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error("CLIENT: Payload JSON non valido.");
    }
}
async function verifyTurnstileIfConfigured(env, request, token) {
    const secret = env.TURNSTILE_SECRET_KEY;
    if (!secret)
        return;
    if (!token)
        throw new Error("CLIENT: Verifica anti-spam richiesta.");
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        body: new URLSearchParams({
            remoteip: clientIp(request),
            response: token,
            secret,
        }).toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        method: "POST",
    });
    const result = (await response.json().catch(() => null));
    if (!result?.success) {
        throw new Error("CLIENT: Verifica anti-spam non valida.");
    }
}
export async function parseGuardedJson(request, env, options = {}) {
    if (request.method !== "POST") {
        throw new Error("Metodo non consentito.");
    }
    await applyRateLimit(request, options.rateLimitKey || "api", options.rateLimit || 30);
    const payload = (await readJson(request));
    if (options.turnstile) {
        await verifyTurnstileIfConfigured(env, request, String(payload.turnstileToken || payload["cf-turnstile-response"] || "").trim());
    }
    return payload;
}
async function parseResponse(response, fallbackMessage) {
    const text = await response.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        }
        catch {
            data = { message: text };
        }
    }
    if (!response.ok) {
        const responseData = data;
        throw new Error(responseData?.message ||
            responseData?.error_description ||
            responseData?.error ||
            fallbackMessage);
    }
    return data;
}
export async function supabaseRequest(env, path, init = {}) {
    const supabaseUrl = getRequiredEnv(env, "SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
    const headers = new Headers(init.headers || {});
    headers.set("apikey", serviceRoleKey);
    headers.set("Authorization", `Bearer ${serviceRoleKey}`);
    if (init.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    const normalizedPath = path.replace(/^\/+/, "");
    const response = await fetch(`${supabaseUrl}/rest/v1/${normalizedPath}`, {
        ...init,
        headers,
    });
    return parseResponse(response, "Errore chiamata Supabase.");
}
export function clampText(value, maxLength) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
}
export function normalizePhone(value) {
    return String(value || "")
        .replace(/[^\d+]/g, "")
        .slice(0, 20);
}
export function getBearerToken(request) {
    const header = String(request.headers.get("Authorization") || "").trim();
    return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}
export function requireAdminApiToken(request, env) {
    const expectedToken = String(env.ADMIN_API_TOKEN || "").trim();
    const providedToken = getBearerToken(request);
    return Boolean(expectedToken && providedToken && expectedToken === providedToken);
}
