/* ============================================================
   AETHER ENERGY — Home Page
   Design: Elemental Precision — Dark slate + amber + steel blue
   Assembles all sections in order
   ============================================================ */
import { usePageTitle } from "@/lib/usePageTitle";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import StatsSection from "@/components/sections/StatsSection";
import PlatformSection from "@/components/sections/PlatformSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import ComplianceSection from "@/components/sections/ComplianceSection";
import MonteCarloSection from "@/components/sections/MonteCarloSection";
import TerminalSection from "@/components/sections/TerminalSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import AboutSection from "@/components/sections/AboutSection";
import PricingSection from "@/components/sections/PricingSection";
import RoadmapSection from "@/components/sections/RoadmapSection";
import CTASection from "@/components/sections/CTASection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import Footer from "@/components/Footer";

export default function Home() {
  usePageTitle();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <PlatformSection />
      <FeaturesSection />
      <MonteCarloSection />
      <TerminalSection />
      <ComplianceSection />
      <HowItWorksSection />
      <AboutSection />
      <PricingSection />
      <TestimonialsSection />
      <RoadmapSection />
      <CTASection />
      <Footer />
    </div>
  );
}
