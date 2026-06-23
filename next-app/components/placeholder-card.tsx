import type { PlaceholderContent } from "../lib/static-content";

export function PlaceholderCard({
  id,
  label,
  title,
  description,
}: PlaceholderContent) {
  return (
    <article id={id}>
      <span>{label}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </article>
  );
}
