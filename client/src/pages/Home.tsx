/* ============================================================
   AETHER ENERGY — Home Page (Enterprise Trading Portal)
   Professional grade landing with live data previews,
   agent fleet showcase, and institutional design language
   ============================================================ */
import { lazy, Suspense } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import Navbar from "@/components/Navbar";
import MarketTicker from "@/components/sections/MarketTicker";
import HeroSection from "@/components/sections/HeroSection";

// Eagerly load above-the-fold sections for fast LCP
import StatsSection from "@/components/sections/StatsSection";

// Lazy-load below-the-fold sections to reduce initial bundle
const TerminalSection = lazy(() => import("@/components/sections/TerminalSection"));
const AgentFleetSection = lazy(() => import("@/components/sections/AgentFleetSection"));
const MonteCarloSection = lazy(() => import("@/components/sections/MonteCarloSection"));
const FeaturesSection = lazy(() => import("@/components/sections/FeaturesSection"));
const PlatformSection = lazy(() => import("@/components/sections/PlatformSection"));
const ComplianceSection = lazy(() => import("@/components/sections/ComplianceSection"));
const HowItWorksSection = lazy(() => import("@/components/sections/HowItWorksSection"));
const TestimonialsSection = lazy(() => import("@/components/sections/TestimonialsSection"));
const PricingSection = lazy(() => import("@/components/sections/PricingSection"));
const RoadmapSection = lazy(() => import("@/components/sections/RoadmapSection"));
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
        <TerminalSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <AgentFleetSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <MonteCarloSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <FeaturesSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <PlatformSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <ComplianceSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <HowItWorksSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <TestimonialsSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <PricingSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <RoadmapSection />
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
