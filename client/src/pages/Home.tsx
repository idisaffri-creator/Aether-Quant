/* ============================================================
   AETHER ENERGY — Home Page (Immersive Quant Trading Theme)
   Design: Dark slate + amber energy, terminal-first experience
   ============================================================ */
import { usePageTitle } from "@/lib/usePageTitle";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import TerminalSection from "@/components/sections/TerminalSection";
import MonteCarloSection from "@/components/sections/MonteCarloSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import PlatformSection from "@/components/sections/PlatformSection";
import ComplianceSection from "@/components/sections/ComplianceSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import PricingSection from "@/components/sections/PricingSection";
import RoadmapSection from "@/components/sections/RoadmapSection";
import CTASection from "@/components/sections/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  usePageTitle();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <TerminalSection />
      <MonteCarloSection />
      <FeaturesSection />
      <PlatformSection />
      <ComplianceSection />
      <HowItWorksSection />
      <PricingSection />
      <RoadmapSection />
      <CTASection />
      <Footer />
    </div>
  );
}
