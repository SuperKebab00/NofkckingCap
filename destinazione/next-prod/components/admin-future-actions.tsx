const futureActions = [
  {
    description:
      "Insert prodotto futuro disattivato. Nessun form o submit admin disponibile.",
    label: "Inserimento prodotto",
  },
  {
    description:
      "Update prodotto futuro, disattivato. Nessun editor, nessuna action server, nessun endpoint Next.",
    label: "Aggiornamento prodotto",
  },
  {
    description:
      "Delete prodotto futuro da implementare solo come DELETE reale del record `products`, non come soft-delete `is_active=false`, salvo task esplicito futuro.",
    label: "Rimozione prodotto",
  },
  {
    description:
      "Lead e ordini futuri da migrare solo con backend e protezioni dedicate. Nessun accesso in questa fase.",
    label: "Gestione ordini / lead",
  },
];

export function AdminFutureActions() {
  return (
    <section className="admin-section-panel">
      <div className="missing-panel missing-panel--wide">
        <p className="eyebrow">Azioni future</p>
        <h2>CRUD e operativita amministrativa ancora disabilitati</h2>
        <p>
          Questa area documenta le superfici future senza attivarle. Nessun
          pulsante modifica, elimina o crea prodotto e nessuna auth improvvisata.
        </p>
      </div>

      <div className="admin-split-grid">
        <section className="missing-panel" aria-labelledby="admin-future-crud">
          <p className="eyebrow">CRUD futuro</p>
          <h2 id="admin-future-crud">Azioni amministrative previste</h2>
          <ul>
            {futureActions.map((action) => (
              <li key={action.label}>
                <strong>{action.label}:</strong> {action.description}
              </li>
            ))}
          </ul>
        </section>

        <section className="missing-panel" aria-labelledby="admin-future-guardrails">
          <p className="eyebrow">Guardrail</p>
          <h2 id="admin-future-guardrails">Vincoli gia fissati</h2>
          <ul>
            <li>Nessun service role nel client.</li>
            <li>Nessuna API route Next per admin in questa fase.</li>
            <li>Nessuna scrittura Supabase senza task esplicito e backend sicuro.</li>
            <li>I conteggi mostrati qui non equivalgono a un admin completo protetto.</li>
          </ul>
        </section>
      </div>
    </section>
  );
}
