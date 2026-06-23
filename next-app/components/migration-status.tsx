import { migrationStatus } from "../lib/static-content";

export function MigrationStatus() {
  return (
    <section
      className="section status"
      id="status"
      aria-labelledby="migration-status"
    >
      <div className="section-heading">
        <p className="eyebrow">Migration status</p>
        <h2 id="migration-status">Stato attuale</h2>
      </div>
      <ul>
        {migrationStatus.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
