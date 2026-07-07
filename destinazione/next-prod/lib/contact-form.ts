export type ContactFormValues = {
  email: string;
  message: string;
  phone: string;
  privacy: boolean;
  subject: string;
  website: string;
};

export type ContactFieldErrors = Partial<
  Record<"email" | "message" | "phone" | "privacy" | "subject", string>
>;

export type ContactPayload = {
  email: string;
  message: string;
  phone: string;
  privacy_accepted: boolean;
  subject: string;
  website: string;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizePhone(value: string): string {
  return value.trim().replace(/[\s\-().]/g, "");
}

export function isValidEmail(value: string): boolean {
  const normalized = normalizeWhitespace(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function isValidPhone(value: string): boolean {
  const normalized = normalizePhone(value);
  const digits = normalized.replace(/\D/g, "");

  return (
    /^\+?\d{8,15}$/.test(normalized) &&
    digits.length >= 8 &&
    digits.length <= 15 &&
    !/^(\d)\1+$/.test(digits)
  );
}

export function validateContactFormData(
  values: ContactFormValues,
): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  const email = normalizeWhitespace(values.email);
  const phone = values.phone.trim();
  const subject = normalizeWhitespace(values.subject);
  const message = normalizeWhitespace(values.message);

  if (!email) {
    errors.email = "Inserisci la tua email.";
  } else if (!isValidEmail(email)) {
    errors.email = "Inserisci una email valida.";
  }

  if (!phone) {
    errors.phone = "Inserisci il numero con formato +39 320 000 0000.";
  } else if (!isValidPhone(phone)) {
    errors.phone = "Inserisci il numero con formato +39 320 000 0000.";
  }

  if (!subject) {
    errors.subject = "Inserisci l'oggetto.";
  }

  if (!message) {
    errors.message = "Inserisci un messaggio.";
  } else if (message.length < 10) {
    errors.message = "Scrivi almeno 10 caratteri.";
  }

  if (!values.privacy) {
    errors.privacy = "Accetta la Privacy Policy per inviare la richiesta.";
  }

  return errors;
}

export function buildContactPayload(
  values: ContactFormValues,
): ContactPayload {
  return {
    email: normalizeWhitespace(values.email).toLowerCase(),
    message: normalizeWhitespace(values.message),
    phone: normalizePhone(values.phone),
    privacy_accepted: values.privacy === true,
    subject: normalizeWhitespace(values.subject),
    website: values.website.trim(),
  };
}
