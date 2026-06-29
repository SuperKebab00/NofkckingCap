import { BrandStory } from "../components/brand-story";
import { HeroSection } from "../components/hero-section";
import { HomePublicHighlights } from "../components/home-public-highlights";
import { LiveShopSections } from "../components/live-shop-sections";
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
      <HomePublicHighlights />
    </>
  );
}
