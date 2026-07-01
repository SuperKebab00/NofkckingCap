const MAX_TITLE_LENGTH = 120;
const MAX_SUBTITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 320;
const MAX_LABEL_LENGTH = 80;
const MAX_URL_LENGTH = 2048;

export type SafeShopSectionContent = {
  description?: string;
  hasContent: boolean;
  href?: string;
  imageUrl?: string;
  label?: string;
  subtitle?: string;
  title?: string;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeTextField(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, maxLength);
}

function isSafeRelativePath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeUrlField(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return undefined;
  }

  const limited = normalized.slice(0, MAX_URL_LENGTH);

  if (isSafeRelativePath(limited) || isSafeHttpUrl(limited)) {
    return limited;
  }

  return undefined;
}

export function normalizeShopSectionContent(
  content: unknown,
): SafeShopSectionContent {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return {
      hasContent: false,
    };
  }

  const record = content as Record<string, unknown>;
  const title = sanitizeTextField(record.title, MAX_TITLE_LENGTH);
  const subtitle = sanitizeTextField(record.subtitle, MAX_SUBTITLE_LENGTH);
  const description = sanitizeTextField(
    record.description,
    MAX_DESCRIPTION_LENGTH,
  );
  const label = sanitizeTextField(record.label, MAX_LABEL_LENGTH);
  const href = sanitizeUrlField(record.href);
  const imageUrl = sanitizeUrlField(record.imageUrl);

  const normalized: SafeShopSectionContent = {
    hasContent: Boolean(
      title || subtitle || description || label || href || imageUrl,
    ),
  };

  if (title) {
    normalized.title = title;
  }

  if (subtitle) {
    normalized.subtitle = subtitle;
  }

  if (description) {
    normalized.description = description;
  }

  if (label) {
    normalized.label = label;
  }

  if (href) {
    normalized.href = href;
  }

  if (imageUrl) {
    normalized.imageUrl = imageUrl;
  }

  return normalized;
}
