import "server-only";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
};

const MAX_JSON_BYTES = 32 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const LOCAL_RATE_LIMITS = new Map<string, { count: number; resetAt: number }>();

export type ServerEnv = {
  APP_ENV?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_JWKS_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_URL?: string;
  TURNSTILE_SECRET_KEY?: string;
};

export function getServerEnv(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnv {
  return {
    APP_ENV: source.APP_ENV,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_JWKS_URL: source.SUPABASE_JWKS_URL,
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL: source.SUPABASE_URL,
    TURNSTILE_SECRET_KEY: source.TURNSTILE_SECRET_KEY,
  };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: JSON_HEADERS,
    status,
  });
}

export function safeError(
  error: unknown,
  fallback = "Richiesta non riuscita.",
  exposeDetails = false,
): string {
  const message = String(
    error instanceof Error ? error.message : error || "",
  ).trim();

  if (message.startsWith("CLIENT:")) {
    return message.replace(/^CLIENT:\s*/, "");
  }

  if (exposeDetails && message) {
    return message;
  }

  return fallback;
}

export function safeLog(env: ServerEnv, message: string, details: unknown = {}) {
  if (env.APP_ENV === "production") {
    return;
  }

  console.warn(message, details);
}

export function statusFromError(error: unknown, fallback = 500): number {
  const message = String(
    error instanceof Error ? error.message : error || "",
  );

  if (
    message.startsWith("CLIENT:") ||
    message.includes("Payload JSON non valido") ||
    message.includes("Payload troppo grande") ||
    message.includes("Content-Type non supportato")
  ) {
    return 400;
  }

  if (message.includes("Metodo non consentito")) return 405;
  if (message.includes("Troppe richieste")) return 429;
  return fallback;
}

function getRequiredEnv(env: ServerEnv, key: keyof ServerEnv): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Variabile ambiente mancante: ${key}`);
  }

  return value;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

async function applyRateLimit(
  request: Request,
  bucket: string,
  maxRequests: number,
) {
  const key = `${bucket}:${clientIp(request)}`;
  const now = Date.now();
  const resetAt = now + RATE_LIMIT_WINDOW_MS;
  const current = LOCAL_RATE_LIMITS.get(key);

  const next =
    current && current.resetAt > now
      ? { count: current.count + 1, resetAt: current.resetAt }
      : { count: 1, resetAt };

  LOCAL_RATE_LIMITS.set(key, next);

  if (next.count > maxRequests) {
    throw new Error("Troppe richieste.");
  }
}

export async function readJson(request: Request): Promise<unknown> {
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
  } catch {
    throw new Error("CLIENT: Payload JSON non valido.");
  }
}

async function verifyTurnstileIfConfigured(
  env: ServerEnv,
  request: Request,
  token: string,
) {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return;
  if (!token) throw new Error("CLIENT: Verifica anti-spam richiesta.");

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      body: new URLSearchParams({
        remoteip: clientIp(request),
        response: token,
        secret,
      }).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    },
  );

  const result = (await response.json().catch(() => null)) as
    | { success?: boolean }
    | null;

  if (!result?.success) {
    throw new Error("CLIENT: Verifica anti-spam non valida.");
  }
}

export async function parseGuardedJson<T>(
  request: Request,
  env: ServerEnv,
  options: {
    rateLimit?: number;
    rateLimitKey?: string;
    turnstile?: boolean;
  } = {},
): Promise<T> {
  if (request.method !== "POST") {
    throw new Error("Metodo non consentito.");
  }

  await applyRateLimit(
    request,
    options.rateLimitKey || "api",
    options.rateLimit || 30,
  );

  const payload = (await readJson(request)) as Record<string, unknown>;
  if (options.turnstile) {
    await verifyTurnstileIfConfigured(
      env,
      request,
      String(
        payload.turnstileToken || payload["cf-turnstile-response"] || "",
      ).trim(),
    );
  }

  return payload as T;
}

async function parseResponse(response: Response, fallbackMessage: string) {
  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const responseData = data as
      | { error?: string; error_description?: string; message?: string }
      | null;

    throw new Error(
      responseData?.message ||
        responseData?.error_description ||
        responseData?.error ||
        fallbackMessage,
    );
  }

  return data;
}

export async function supabaseRequest(
  env: ServerEnv,
  path: string,
  init: RequestInit = {},
) {
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

export function clampText(value: unknown, maxLength: number): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizePhone(value: unknown): string {
  return String(value || "")
    .replace(/[^\d+]/g, "")
    .slice(0, 20);
}

export function getBearerToken(request: Request): string {
  const header = String(request.headers.get("Authorization") || "").trim();
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}
