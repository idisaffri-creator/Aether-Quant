/* ============================================================
   AETHER ENERGY — Footer
   Design: Elemental Precision — Dark footer with links,
   legal, and amber accent
   ============================================================ */
import { Twitter, Linkedin, Github } from "lucide-react";
import { toast } from "sonner";

const footerLinks = {
  Platform: [
    { label: "Strategy Builder", href: "#platform" },
    { label: "AI Assistant", href: "#platform" },
    { label: "Market Data", href: "#platform" },
    { label: "Risk Management", href: "#platform" },
    { label: "Paper Trading", href: "#platform" },
  ],
  Company: [
    { label: "About Us", href: "#about" },
    { label: "Roadmap", href: "#roadmap" },
    { label: "Pricing", href: "#pricing" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Risk Disclosure", href: "#" },
    { label: "Compliance", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

export default function Footer() {
  const handleNavClick = (href: string) => {
    if (href === "#") {
      toast.info("Coming soon!");
      return;
    }
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="relative border-t border-white/8 bg-[oklch(0.10_0.008_260)]">
      <div className="container py-16 lg:py-20">
        {/* Top row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-16">
          {/* Brand */}
          <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
              <img src="/logo.png" alt="Aether Energy" className="h-8 w-auto" />
            </div>
            <p className="text-white/45 text-sm leading-relaxed max-w-xs mb-6">
              The quantitative edge for energy markets. AI-powered strategies
              built by traders, for traders — no terminal required.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3">
              {[
                { icon: Twitter, label: "Twitter" },
                { icon: Linkedin, label: "LinkedIn" },
                { icon: Github, label: "GitHub" },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => toast.info(`${label} coming soon!`)}
                  className="w-8 h-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/12 hover:border-white/20 transition-all"
                  aria-label={label}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <div className="text-white/70 text-sm font-600 mb-4 font-display">{category}</div>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => handleNavClick(link.href)}
                      className="text-white/40 text-sm hover:text-white/80 transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Amber rule */}
        <div className="amber-rule mb-8" />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-white/30 text-xs leading-relaxed max-w-xl">
            © 2024 Aether Energy. All rights reserved. Trading involves significant risk.
            Past performance is not indicative of future results. This platform is for
            informational purposes only and does not constitute financial advice.
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/30 text-xs font-data">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
