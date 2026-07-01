function isLoginPayload(value) {
    return Boolean(value && typeof value === "object" && "access_token" in value);
}
export function getAdminClientConfig(env = process.env) {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!supabaseUrl || !supabaseAnonKey) {
        return null;
    }
    return {
        supabaseAnonKey,
        supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    };
}
export async function signInAdminWithPassword(email, password, options = {}) {
    const config = getAdminClientConfig(options.env);
    if (!config) {
        return {
            accessToken: null,
            admin: false,
            authenticated: false,
            message: "Config client admin non disponibile: servono NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
            state: "not-configured",
        };
    }
    const fetchImpl = options.fetchImpl || fetch;
    try {
        const response = await fetchImpl(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
            body: JSON.stringify({ email, password }),
            headers: {
                apikey: config.supabaseAnonKey,
                Authorization: `Bearer ${config.supabaseAnonKey}`,
                "Content-Type": "application/json",
            },
            method: "POST",
        });
        const payload = (await response.json().catch(() => null));
        if (!response.ok || !isLoginPayload(payload) || typeof payload.access_token !== "string") {
            const errorPayload = payload;
            return {
                accessToken: null,
                admin: false,
                authenticated: false,
                message: errorPayload?.error_description ||
                    errorPayload?.msg ||
                    "Login admin non disponibile.",
                state: "error",
            };
        }
        return {
            accessToken: payload.access_token,
            admin: false,
            authenticated: true,
            message: "Login eseguito. Verifica admin in corso.",
            state: "submitting",
        };
    }
    catch (error) {
        return {
            accessToken: null,
            admin: false,
            authenticated: false,
            message: error instanceof Error && error.message
                ? error.message
                : "Login admin non disponibile.",
            state: "error",
        };
    }
}
export async function verifyAdminAccessToken(accessToken, options = {}) {
    const fetchImpl = options.fetchImpl || fetch;
    try {
        const response = await fetchImpl("/api/admin/auth/check", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            method: "GET",
        });
        const payload = (await response.json().catch(() => null));
        if (response.ok && payload?.admin === true) {
            return {
                accessToken,
                admin: true,
                authenticated: true,
                message: "Admin verificato.",
                state: "admin",
            };
        }
        if (response.status === 403) {
            return {
                accessToken,
                admin: false,
                authenticated: true,
                message: payload?.error || "Utente autenticato ma non admin.",
                state: "non-admin",
            };
        }
        return {
            accessToken,
            admin: false,
            authenticated: false,
            message: payload?.error || "Admin auth check non disponibile.",
            state: "error",
        };
    }
    catch (error) {
        return {
            accessToken,
            admin: false,
            authenticated: false,
            message: error instanceof Error && error.message
                ? error.message
                : "Admin auth check non disponibile.",
            state: "error",
        };
    }
}
