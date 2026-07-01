import { homeSectionBanners } from "../lib/static-content";

export function HomeSectionBanners() {
  return (
    <section className="section" aria-label="Pagine del sito">
      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        {homeSectionBanners.map((item) => (
          <a key={item.title} className="spotlight-card" href={item.href}>
            <span className="eyebrow">{item.accent}</span>
            <h3 style={{ marginTop: "0.85rem" }}>{item.title}</h3>
            <p style={{ marginTop: "0.75rem" }}>{item.body}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
