import { BrandStory } from "../components/brand-story";
import { HeroSection } from "../components/hero-section";
import { HomeEditorialSections } from "../components/home-editorial-sections";
import { HomePublicHighlights } from "../components/home-public-highlights";
import { HomeSectionBanners } from "../components/home-section-banners";
import { LiveShopSections } from "../components/live-shop-sections";
import { ShopTeaser } from "../components/shop-teaser";
import { SiteHeader } from "../components/site-header";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <HeroSection />
        <HomeSectionBanners />
        <ShopTeaser />
        <HomeEditorialSections />
        <LiveShopSections />
        <BrandStory />
        <HomePublicHighlights />
      </main>
    </>
  );
}
