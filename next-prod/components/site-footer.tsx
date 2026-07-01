export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ maxWidth: "420px" }}>
          <strong style={{ display: "block", marginBottom: "0.5rem" }}>
            No Cap Barber Shop
          </strong>
          <span style={{ color: "rgba(247, 243, 237, 0.78)", lineHeight: 1.6 }}>
            Shop prodotti barber professionali, contatti diretti e area riservata
            per i controlli admin protetti.
          </span>
        </div>

        <nav
          aria-label="Link legali e servizio"
          style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem 1rem" }}
        >
          <a href="/privacy">Privacy Policy</a>
          <a href="/cookie">Cookie Policy</a>
          <a href="/contact">Contatti</a>
          <a href="/admin">Area admin</a>
        </nav>
      </div>
    </footer>
  );
}
