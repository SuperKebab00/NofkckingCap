import { placeholders } from "../lib/static-content";
import { PlaceholderCard } from "./placeholder-card";

export function MigrationPlaceholders() {
  return (
    <section
      className="section placeholders"
      aria-label="Migration placeholders"
    >
      {placeholders.map((placeholder) => (
        <PlaceholderCard key={placeholder.id} {...placeholder} />
      ))}
    </section>
  );
}
