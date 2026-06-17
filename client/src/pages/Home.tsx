/*
 * Aether Energy — Landing Page (Enterprise Trading Portal)
 * Streamlined: Hero → Stats → Platform → AgentFleet → CTASection
 * Removed marketing-heavy sections (testimonials, pricing tiers, roadmap, etc.)
 */
import { lazy, Suspense } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import Navbar from "@/components/Navbar";
import MarketTicker from "@/components/sections/MarketTicker";
import HeroSection from "@/components/sections/HeroSection";
import StatsSection from "@/components/sections/StatsSection";

const PlatformSection = lazy(() => import("@/components/sections/PlatformSection"));
const AgentFleetSection = lazy(() => import("@/components/sections/AgentFleetSection"));
const CTASection = lazy(() => import("@/components/sections/CTASection"));
const Footer = lazy(() => import("@/components/Footer"));

function SectionSkeleton() {
  return (
    <div className="py-24 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

export default function Home() {
  usePageTitle();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <MarketTicker />
      <HeroSection />
      <StatsSection />
      <Suspense fallback={<SectionSkeleton />}>
        <PlatformSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <AgentFleetSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <CTASection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <Footer />
      </Suspense>
    </div>
  );
}
