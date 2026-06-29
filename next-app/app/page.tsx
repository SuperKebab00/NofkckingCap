import { BrandStory } from "../components/brand-story";
import { HeroSection } from "../components/hero-section";
import { LiveShopSections } from "../components/live-shop-sections";
import { MigrationPlaceholders } from "../components/migration-placeholders";
import { MigrationStatus } from "../components/migration-status";
import { ShopTeaser } from "../components/shop-teaser";
import { SiteHeader } from "../components/site-header";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <HeroSection />
      <ShopTeaser />
      <LiveShopSections />
      <BrandStory />
      <MigrationPlaceholders />
      <MigrationStatus />
    </>
  );
}
