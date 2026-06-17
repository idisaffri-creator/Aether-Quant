import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LayoutDashboard, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useAtomValue } from "jotai";
import { isAuthenticatedAtom } from "@/store/auth";
import { motion, AnimatePresence } from "framer-motion";
import { QuickStats } from "./QuickStats";
import { LanguagePicker } from "./LanguagePicker";

const navLinks = [
  { label: "Fleet", href: "#fleet" },
  { label: "Quant", href: "#quant" },
  { label: "Safety", href: "#safety" },
  { label: "Docs", href: "/api/docs" },
];

export default function Navbar() {
  const [, setLocation] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("/")) {
      // External route (e.g., docs)
      window.location.href = href;
      return;
    }
    // Smooth scroll to anchor on same page
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // Section not on this page — navigate to home + anchor
      window.location.href = `/${href}`;
    }
  };

  return (
    <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`w-full max-w-5xl transition-all duration-500 rounded-full border pointer-events-auto ${
          scrolled
            ? "bg-[oklch(0.12_0.015_250/80%)] backdrop-blur-xl border-white/10 shadow-2xl shadow-black/50 py-2 px-4"
            : "bg-transparent border-transparent py-4 px-2"
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a
            href="#"
            className="flex items-center gap-2.5 group relative px-2"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          >
            <div className="absolute -inset-2 bg-amber-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
            <img src="/logo.png" alt="Aether Energy" className="h-7 w-auto relative transition-transform group-hover:scale-105" />
          </a>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/[0.03] rounded-full px-2 py-1 border border-white/5">
            {navLinks.map((link, i) => (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="px-4 py-1.5 text-[13px] font-sans font-medium text-white/60 hover:text-amber-400 transition-all rounded-full hover:bg-white/5 relative group"
              >
                {link.label}
                <span className="absolute bottom-1 left-4 right-4 h-px bg-amber-500/50 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-full" />
              </motion.button>
            ))}
          </nav>

          {/* Desktop CTA */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:flex items-center gap-3"
          >
            <LanguagePicker />
            {isAuthenticated && <QuickStats />}
            {isAuthenticated ? (
              <button
                onClick={() => setLocation("/dashboard")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-sans font-medium text-amber-500 hover:text-amber-400 transition-all group bg-amber-500/10 rounded-full border border-amber-500/20 hover:bg-amber-500/20"
              >
                <LayoutDashboard className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                Terminal Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => setLocation("/login")}
                  className="px-4 py-2 text-sm font-sans font-medium text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/5"
                >
                  Sign In
                </button>
                <Button
                  onClick={() => setLocation("/register")}
                  className="btn-amber px-5 py-2 text-sm font-semibold rounded-full shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all"
                >
                  Get Started
                </Button>
              </>
            )}
          </motion.div>

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="lg:hidden fixed top-24 left-4 right-4 bg-[oklch(0.13_0.009_260/98%)] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-40 pointer-events-auto"
          >
            <div className="p-4 flex flex-col gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.href)}
                  className="w-full text-left px-4 py-3 text-sm font-sans font-medium text-white/70 hover:text-amber-400 hover:bg-white/5 rounded-xl transition-all flex items-center justify-between group"
                >
                  {link.label}
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </button>
              ))}
              <div className="mt-4 pt-4 border-t border-white/8 flex flex-col gap-3">
                {isAuthenticated ? (
                  <Button
                    onClick={() => { setMobileOpen(false); setLocation("/dashboard"); }}
                    className="btn-amber w-full rounded-xl flex items-center justify-center gap-2 py-5"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Enter Terminal
                  </Button>
                ) : (
                  <>
                    <button
                      onClick={() => { setMobileOpen(false); setLocation("/login"); }}
                      className="w-full px-4 py-3 text-sm font-sans font-medium text-white/70 hover:text-white rounded-xl transition-colors hover:bg-white/5"
                    >
                      Sign In
                    </button>
                    <Button
                      onClick={() => { setMobileOpen(false); setLocation("/register"); }}
                      className="btn-amber w-full rounded-xl py-5 font-semibold"
                    >
                      Get Started Free
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
