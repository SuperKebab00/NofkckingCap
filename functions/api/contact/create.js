import {
  clampText,
  json,
  normalizePhone,
  parseGuardedJson,
  safeError,
  safeLog,
  statusFromError,
  supabaseRequest,
} from "../_lib/checkout.js";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());
}

function isValidPhone(value) {
  const normalized = normalizePhone(value);
  const digits = normalized.replace(/\D/g, "");
  return (
    /^\+?\d{8,15}$/.test(normalized) &&
    digits.length >= 8 &&
    digits.length <= 15 &&
    !/^(\d)\1+$/.test(digits)
  );
}

export async function onRequestPost(context) {
  try {
    const payload = await parseGuardedJson(context, {
      rateLimitKey: "contact:create",
      rateLimit: 5,
      turnstile: true,
    });
    const email = clampText(payload.email, 160).toLowerCase();
    const phone = normalizePhone(payload.phone);
    const subject = clampText(payload.subject, 120);
    const message = clampText(payload.message, 2000);
    const privacyAccepted = payload.privacy_accepted === true;
    const honeypot = String(payload.website || payload.company || "").trim();

    if (honeypot) return json({ ok: true });
    if (!isValidEmail(email)) throw new Error("CLIENT: Email non valida.");
    if (!isValidPhone(phone)) throw new Error("CLIENT: Telefono non valido.");
    if (!subject) throw new Error("CLIENT: Oggetto mancante.");
    if (message.length < 10) throw new Error("CLIENT: Messaggio troppo corto.");
    if (!privacyAccepted)
      throw new Error("CLIENT: Consenso privacy richiesto.");

    const lead = {
      id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email,
      phone: phone || null,
      subject: subject || null,
      message,
      privacy_accepted: true,
      source: "contact-form",
      created_at: new Date().toISOString(),
    };

    await supabaseRequest(context.env, "leads", {
      method: "POST",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify(lead),
    });

    return json({ ok: true });
  } catch (error) {
    safeLog(context, "contact-create failed", {
      status: statusFromError(error),
      message: error?.message,
    });
    return json(
      {
        error: safeError(
          error,
          "Impossibile inviare la richiesta.",
          context.env.APP_ENV !== "production",
        ),
      },
      statusFromError(error),
    );
  }
}
