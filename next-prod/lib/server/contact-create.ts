import "server-only";

import {
  clampText,
  jsonResponse,
  normalizePhone,
  parseGuardedJson,
  safeError,
  safeLog,
  statusFromError,
  supabaseRequest,
  type ServerEnv,
} from "./api-core";

type ContactPayload = {
  company?: unknown;
  email?: unknown;
  message?: unknown;
  phone?: unknown;
  privacy_accepted?: unknown;
  subject?: unknown;
  turnstileToken?: unknown;
  website?: unknown;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  return (
    /^\+?\d{8,15}$/.test(value) &&
    digits.length >= 8 &&
    digits.length <= 15 &&
    !/^(\d)\1+$/.test(digits)
  );
}

export async function handleContactCreate(
  request: Request,
  env: ServerEnv,
): Promise<Response> {
  try {
    const payload = await parseGuardedJson<ContactPayload>(request, env, {
      rateLimit: 5,
      rateLimitKey: "contact:create",
      turnstile: true,
    });

    const email = clampText(payload.email, 160).toLowerCase();
    const phone = normalizePhone(payload.phone);
    const subject = clampText(payload.subject, 120);
    const message = clampText(payload.message, 2000);
    const privacyAccepted = payload.privacy_accepted === true;
    const honeypot = String(payload.website || payload.company || "").trim();

    if (honeypot) {
      return jsonResponse({ ok: true });
    }

    if (!isValidEmail(email)) throw new Error("CLIENT: Email non valida.");
    if (!isValidPhone(phone)) throw new Error("CLIENT: Telefono non valido.");
    if (!subject) throw new Error("CLIENT: Oggetto mancante.");
    if (message.length < 10) {
      throw new Error("CLIENT: Messaggio troppo corto.");
    }
    if (!privacyAccepted) {
      throw new Error("CLIENT: Consenso privacy richiesto.");
    }

    await supabaseRequest(env, "leads", {
      body: JSON.stringify({
        created_at: new Date().toISOString(),
        email,
        id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message,
        phone: phone || null,
        privacy_accepted: true,
        source: "contact-form",
        subject: subject || null,
      }),
      headers: {
        Prefer: "return=minimal",
      },
      method: "POST",
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    safeLog(env, "contact-create failed", {
      message: error instanceof Error ? error.message : String(error),
      status: statusFromError(error),
    });

    return jsonResponse(
      {
        error: safeError(
          error,
          "Impossibile inviare la richiesta.",
          env.APP_ENV !== "production",
        ),
      },
      statusFromError(error),
    );
  }
}
