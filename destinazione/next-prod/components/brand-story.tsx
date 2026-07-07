import { brandStoryContent } from "../lib/static-content";

export function BrandStory() {
  return (
    <section className="section story">
      <div>
        <p className="eyebrow">{brandStoryContent.eyebrow}</p>
        <h2>{brandStoryContent.title}</h2>
      </div>
      <p>{brandStoryContent.description}</p>
    </section>
  );
}
