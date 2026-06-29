import {
  getPublicShopSectionItems,
  getPublicShopSections,
  type PublicShopSectionItem,
} from "../lib/supabase-public";

type SectionPreview = {
  item_key: string;
  previews: string[];
};

function normalizePreviewString(value: string): string | null {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  return normalized.length > 120
    ? `${normalized.slice(0, 117).trimEnd()}...`
    : normalized;
}

function collectPreviewStrings(
  value: unknown,
  bucket: string[],
  maxItems = 3,
): void {
  if (bucket.length >= maxItems || value == null) {
    return;
  }

  if (typeof value === "string") {
    const normalized = normalizePreviewString(value);

    if (normalized) {
      bucket.push(normalized);
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (bucket.length >= maxItems) {
        break;
      }

      collectPreviewStrings(entry, bucket, maxItems);
    }

    return;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredKeys = [
      "title",
      "subtitle",
      "label",
      "name",
      "text",
      "description",
    ];

    for (const key of preferredKeys) {
      if (bucket.length >= maxItems) {
        break;
      }

      if (key in record) {
        collectPreviewStrings(record[key], bucket, maxItems);
      }
    }

    if (bucket.length >= maxItems) {
      return;
    }

    for (const entry of Object.values(record)) {
      if (bucket.length >= maxItems) {
        break;
      }

      collectPreviewStrings(entry, bucket, maxItems);
    }
  }
}

function buildSectionPreview(item: PublicShopSectionItem): SectionPreview {
  const previews: string[] = [];
  collectPreviewStrings(item.content, previews);

  return {
    item_key: item.item_key,
    previews,
  };
}

function groupItemsBySection(items: PublicShopSectionItem[]) {
  const grouped = new Map<string, SectionPreview[]>();

  for (const item of items) {
    const previews = buildSectionPreview(item);
    const currentItems = grouped.get(item.section_key) || [];
    currentItems.push(previews);
    grouped.set(item.section_key, currentItems);
  }

  return grouped;
}

export async function LiveShopSections() {
  const [sections, items] = await Promise.all([
    getPublicShopSections(),
    getPublicShopSectionItems(),
  ]);

  const groupedItems = groupItemsBySection(items);
  const visibleSections = sections.slice(0, 2);

  if (visibleSections.length === 0) {
    return (
      <section className="section" aria-labelledby="live-shop-sections-title">
        <div className="panel">
          <div className="panel-heading">
            <h2 id="live-shop-sections-title">Sezioni shop</h2>
            <span className="status-badge">Fallback statico</span>
          </div>
          <p>
            La home continua a usare i contenuti statici correnti. Le sezioni
            dinamiche Supabase non sono disponibili in questo ambiente.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section" aria-labelledby="live-shop-sections-title">
      <div className="panel">
        <div className="panel-heading">
          <h2 id="live-shop-sections-title">Sezioni live shop</h2>
          <span className="status-badge">Supabase read-only</span>
        </div>
        <p>
          Preview server-side delle sezioni pubbliche attive. Nessuna modifica,
          carrello o checkout da questa area.
        </p>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            marginTop: "1.25rem",
          }}
        >
          {visibleSections.map((section) => {
            const previews = (groupedItems.get(section.key) || []).slice(0, 2);

            return (
              <article
                key={section.key}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "18px",
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                    justifyContent: "space-between",
                  }}
                >
                  <h3 style={{ margin: 0 }}>
                    {section.title || section.key}
                  </h3>
                  <span className="status-badge">{section.key}</span>
                </div>
                {section.subtitle ? (
                  <p style={{ marginBottom: 0, marginTop: "0.5rem" }}>
                    {section.subtitle}
                  </p>
                ) : null}
                {previews.length > 0 ? (
                  <ul style={{ marginBottom: 0, marginTop: "0.85rem" }}>
                    {previews.map((item) => (
                      <li key={item.item_key}>
                        {item.previews.length > 0
                          ? item.previews.join(" • ")
                          : "Contenuto live disponibile"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ marginBottom: 0, marginTop: "0.85rem" }}>
                    Contenuti live disponibili per questa sezione, senza preview
                    stringa sicura.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
