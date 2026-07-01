import {
  getPublicShopSectionItems,
  getPublicShopSections,
  type PublicShopSectionItem,
} from "../lib/supabase-public";
import { normalizeShopSectionContent } from "../lib/shop-content";

type SectionPreview = {
  description?: string;
  href?: string;
  imageUrl?: string;
  item_key: string;
  label?: string;
  subtitle?: string;
  title?: string;
};

function buildSectionPreview(item: PublicShopSectionItem): SectionPreview {
  const normalized = normalizeShopSectionContent(item.content);

  return {
    description: normalized.description,
    href: normalized.href,
    imageUrl: normalized.imageUrl,
    item_key: item.item_key,
    label: normalized.label,
    subtitle: normalized.subtitle,
    title: normalized.title,
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
          <span className="status-badge">Supabase live</span>
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
                        {item.title || item.label || "Contenuto live disponibile"}
                        {item.subtitle ? ` • ${item.subtitle}` : ""}
                        {item.description ? ` • ${item.description}` : ""}
                        {item.href ? ` • ${item.href}` : ""}
                        {item.imageUrl ? ` • ${item.imageUrl}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ marginBottom: 0, marginTop: "0.85rem" }}>
                    Contenuti live disponibili per questa sezione, con
                    selezione rapida
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
