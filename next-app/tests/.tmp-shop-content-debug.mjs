const MAX_TITLE_LENGTH = 120;
const MAX_SUBTITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 320;
const MAX_LABEL_LENGTH = 80;
const MAX_URL_LENGTH = 2048;
function normalizeWhitespace(value) {
    return value.replace(/\s+/g, " ").trim();
}
function sanitizeTextField(value, maxLength) {
    if (typeof value !== "string") {
        return undefined;
    }
    const normalized = normalizeWhitespace(value);
    if (!normalized) {
        return undefined;
    }
    return normalized.slice(0, maxLength);
}
function isSafeRelativePath(value) {
    return value.startsWith("/") && !value.startsWith("//");
}
function isSafeHttpUrl(value) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    }
    catch {
        return false;
    }
}
function sanitizeUrlField(value) {
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
export function normalizeShopSectionContent(content) {
    if (!content || typeof content !== "object" || Array.isArray(content)) {
        return {
            hasContent: false,
        };
    }
    const record = content;
    const normalized = {
        description: sanitizeTextField(record.description, MAX_DESCRIPTION_LENGTH),
        hasContent: false,
        href: sanitizeUrlField(record.href),
        imageUrl: sanitizeUrlField(record.imageUrl),
        label: sanitizeTextField(record.label, MAX_LABEL_LENGTH),
        subtitle: sanitizeTextField(record.subtitle, MAX_SUBTITLE_LENGTH),
        title: sanitizeTextField(record.title, MAX_TITLE_LENGTH),
    };
    normalized.hasContent = Boolean(normalized.title ||
        normalized.subtitle ||
        normalized.description ||
        normalized.label ||
        normalized.href ||
        normalized.imageUrl);
    return normalized;
}
