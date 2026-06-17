/*
 * Aether Energy — Landing Page (2026 Revamp)
 *
 * Flow:
 *   1. MarketTicker       — live prices scrolling
 *   2. HeroSection        — bold promise + dual CTA
 *   3. TrustStrip         — real platform stats
 *   4. LiveTradingFloor   — real-time activity feed
 *   5. AgentFleet         — meet your 6 AI trading agents
 *   6. QuantTools         — backtest + Monte Carlo
 *   7. RiskSafety         — what protects your money
 *   8. CTA                — convert
 *   9. Footer
 */
import { lazy, Suspense } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import Navbar from "@/components/Navbar";
import MarketTicker from "@/components/sections/MarketTicker";
import HeroSection from "@/components/sections/HeroSection";
import TrustStrip from "@/components/sections/TrustStrip";
import LiveTradingFloorSection from "@/components/sections/LiveTradingFloorSection";

const AgentFleetSection = lazy(() => import("@/components/sections/AgentFleetSection"));
const QuantToolsSection = lazy(() => import("@/components/sections/QuantToolsSection"));
const RiskSafetySection = lazy(() => import("@/components/sections/RiskSafetySection"));
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
      <div id="hero"><HeroSection /></div>
      <TrustStrip />
      <div id="floor">
        <LiveTradingFloorSection />
      </div>
      <Suspense fallback={<SectionSkeleton />}>
        <div id="fleet"><AgentFleetSection /></div>
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <div id="quant"><QuantToolsSection /></div>
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <div id="safety"><RiskSafetySection /></div>
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <div id="cta"><CTASection /></div>
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <Footer />
      </Suspense>
    </div>
  );
}