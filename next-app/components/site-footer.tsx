export function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        marginTop: "3rem",
        padding: "1.5rem 1.25rem 2.25rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "space-between",
          margin: "0 auto",
          maxWidth: "1120px",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: "0.35rem",
            maxWidth: "560px",
          }}
        >
          <strong>No Cap Barbershop</strong>
          <span
            style={{
              color: "rgba(247, 243, 237, 0.72)",
              fontSize: "0.95rem",
            }}
          >
            Shell pubblica Next in migrazione. Il sito vanilla resta la sorgente
            primaria e production.
          </span>
        </div>

        <nav
          aria-label="Link legali e contatti"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem 1rem",
          }}
        >
          <a href="/">Home</a>
          <a href="/contact">Contatti</a>
          <a href="/privacy">Privacy</a>
          <a href="/cookie">Cookie</a>
        </nav>
      </div>
    </footer>
  );
}
