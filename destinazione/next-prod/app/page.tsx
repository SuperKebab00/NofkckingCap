import { BrandStory } from "../components/brand-story";
import { HeroSection } from "../components/hero-section";
import { HomeSectionBanners } from "../components/home-section-banners";
import { SiteHeader } from "../components/site-header";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell page-shell--landing">
        <HeroSection />
        <HomeSectionBanners />
        <BrandStory />
      </main>
    </>
  );
}
