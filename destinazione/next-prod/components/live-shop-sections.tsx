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
      <section className="section route-crosslinks" aria-labelledby="live-shop-sections-title">
        <div className="panel panel--route">
          <div className="panel-heading">
            <h2 id="live-shop-sections-title">Sezioni shop</h2>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section route-crosslinks" aria-labelledby="live-shop-sections-title">
      <div className="panel panel--route">
        <div className="panel-heading">
          <h2 id="live-shop-sections-title">Sezioni shop</h2>
        </div>
        <div
          className="route-pillars"
        >
          {visibleSections.map((section) => {
            const previews = (groupedItems.get(section.key) || []).slice(0, 2);

            return (
              <article
                key={section.key}
                className="route-pillars__card route-pillars__card--compact"
              >
                <div className="route-pillars__head">
                  <h3>
                    {section.title || section.key}
                  </h3>
                  <span className="status-badge">{section.key}</span>
                </div>
                {section.subtitle ? (
                  <p className="route-pillars__body">
                    {section.subtitle}
                  </p>
                ) : null}
                {previews.length > 0 ? (
                  <ul className="route-pillars__list">
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
                  <p className="route-pillars__body">
                    Contenuti live disponibili per questa sezione
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
