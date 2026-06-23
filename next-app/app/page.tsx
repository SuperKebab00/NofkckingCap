import { BrandStory } from "../components/brand-story";
import { HeroSection } from "../components/hero-section";
import { MigrationPlaceholders } from "../components/migration-placeholders";
import { MigrationStatus } from "../components/migration-status";
import { ShopTeaser } from "../components/shop-teaser";
import { SiteHeader } from "../components/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <ShopTeaser />
        <BrandStory />
        <MigrationPlaceholders />
        <MigrationStatus />
      </main>
    </>
  );
}
