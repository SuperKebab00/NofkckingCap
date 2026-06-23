const migrationStatus = [
  "Vanilla app ancora sorgente primaria",
  "API Cloudflare ancora in functions/api",
  "Payments online off",
  "Active flow: in-shop",
];

const placeholders = ["Home", "Shop", "Checkout", "Admin"];

export default function Home() {
  return (
    <main className="shell">
      <nav className="shell-nav" aria-label="Migration sections">
        {placeholders.map((item) => (
          <a key={item} href={`#${item.toLowerCase()}`}>
            {item}
          </a>
        ))}
      </nav>

      <section className="hero" id="home">
        <p className="eyebrow">Parallel Next.js app</p>
        <h1>Next migration shell</h1>
        <p>
          Questa shell serve solo a iniziare la migrazione graduale. Checkout e
          admin non sono ancora migrati.
        </p>
      </section>

      <section className="status" aria-labelledby="migration-status">
        <h2 id="migration-status">Migration status</h2>
        <ul>
          {migrationStatus.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="placeholder-grid" aria-label="Migration placeholders">
        {placeholders.map((item) => (
          <article key={item} id={item.toLowerCase()}>
            <h2>{item}</h2>
            <p>Placeholder: sezione non ancora migrata dalla app vanilla.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
