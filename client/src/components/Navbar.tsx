/* ============================================================
   AETHER ENERGY — Navbar
   Design: Elemental Precision — Dark slate, amber accent
   Sticky top nav with logo, nav links, CTA
   ============================================================ */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { useLocation } from "wouter";
import { getAuthToken } from "@/lib/api";

const navLinks = [
  { label: "Platform", href: "#platform" },
  { label: "Features", href: "#features" },
  { label: "Monte Carlo", href: "#monte-carlo" },
  { label: "Terminal", href: "#terminal" },
  { label: "Pricing", href: "#pricing" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "About", href: "#about" },
];

export default function Navbar() {
  const [, setLocation] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoggedIn = !!getAuthToken();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[oklch(0.11_0.008_260/95%)] backdrop-blur-xl border-b border-white/8 shadow-lg shadow-black/30"
          : "bg-transparent"
      }`}
    >
      <div className="container">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <a
            href="#"
            className="flex items-center gap-2.5 group"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          >
            <img src="/logo.png" alt="Aether Energy" className="h-8 w-auto" />
          </a>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors rounded-md hover:bg-white/5"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            {isLoggedIn ? (
              <button
                onClick={() => setLocation("/dashboard")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber hover:text-amber/80 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => setLocation("/login")}
                  className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <Button
                  onClick={() => setLocation("/register")}
                  className="btn-amber px-5 py-2 text-sm rounded-lg"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 text-white/70 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-[oklch(0.13_0.009_260/98%)] backdrop-blur-xl border-b border-white/8">
          <div className="container py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="w-full text-left px-4 py-3 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                {link.label}
              </button>
            ))}
            <div className="mt-3 pt-3 border-t border-white/8 flex flex-col gap-2">
              {isLoggedIn ? (
                <Button
                  onClick={() => { setMobileOpen(false); setLocation("/dashboard"); }}
                  className="btn-amber w-full rounded-lg flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              ) : (
                <>
                  <button
                    onClick={() => { setMobileOpen(false); setLocation("/login"); }}
                    className="w-full px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white rounded-lg transition-colors"
                  >
                    Sign In
                  </button>
                  <Button
                    onClick={() => { setMobileOpen(false); setLocation("/register"); }}
                    className="btn-amber w-full rounded-lg"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
