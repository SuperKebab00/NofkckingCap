import { homeEditorialSections } from "../lib/static-content";

export function HomeEditorialSections() {
  const { freshCut, showcase } = homeEditorialSections;

  return (
    <>
      <section id="fresh-cut" className="section" aria-labelledby="fresh-cut-title">
        <div
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "minmax(0, 1.05fr) minmax(280px, 0.95fr)",
            alignItems: "center",
          }}
        >
          <div className="hero__media" style={{ minHeight: "420px" }}>
            <img src={freshCut.image} alt={freshCut.title} />
          </div>
          <div className="spotlight-card">
            <p className="eyebrow">{freshCut.eyebrow}</p>
            <h2 id="fresh-cut-title">{freshCut.title}</h2>
            <p style={{ marginTop: "1rem" }}>{freshCut.description}</p>
            <a className="ghost-button" href={freshCut.ctaHref} style={{ marginTop: "1rem" }}>
              {freshCut.ctaLabel}
            </a>
          </div>
        </div>
      </section>

      <section id="showcase" className="section" aria-labelledby="showcase-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{showcase.eyebrow}</p>
            <h2 id="showcase-title">{showcase.title}</h2>
          </div>
          <p>{showcase.description}</p>
        </div>

        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {showcase.items.map((item) => (
            <article key={item.title} className="spotlight-card">
              <div
                style={{
                  borderRadius: "18px",
                  overflow: "hidden",
                  aspectRatio: "4 / 5",
                  marginBottom: "1rem",
                }}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
              <h3>{item.title}</h3>
              <p style={{ marginTop: "0.75rem" }}>{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
