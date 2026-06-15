/* ============================================================
   AETHER ENERGY — Compliance & Security Section
   Design: Elemental Precision — Full-width dark band with
   compliance badges and security highlights
   ============================================================ */
import { useRef, useEffect, useState } from "react";
import { Shield, Lock, FileCheck, Globe2, Eye, Server } from "lucide-react";

const complianceItems = [
  { icon: Shield, label: "GDPR Compliant", sub: "Data protection & privacy" },
  { icon: FileCheck, label: "MiFID II Ready", sub: "EU transaction reporting" },
  { icon: Globe2, label: "SEC/FINRA", sub: "US broker-dealer standards" },
  { icon: Lock, label: "AML/KYC", sub: "Identity verification" },
  { icon: Eye, label: "End-to-End Encryption", sub: "All data in transit & at rest" },
  { icon: Server, label: "99.5% Uptime SLA", sub: "Automated failover systems" },
];

export default function ComplianceSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-16 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-[oklch(0.13_0.009_260/70%)]" />
      <div className="absolute top-0 left-0 right-0 h-px amber-rule" />
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, oklch(0.60 0.15 250 / 30%), transparent)" }} />

      <div className="container relative z-10">
        <div className={`flex flex-col lg:flex-row items-start lg:items-center gap-8 lg:gap-16 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {/* Label */}
          <div className="shrink-0">
            <div className="section-number mb-1">Security & Compliance</div>
            <div className="font-display text-xl font-700 text-white max-w-[180px] leading-snug">
              Built to Institutional Standards
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-16 bg-white/10 shrink-0" />

          {/* Badges */}
          <div className="flex flex-wrap gap-3">
            {complianceItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/25 hover:bg-amber-500/5 transition-all duration-300 cursor-default ${
                    inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <Icon className="w-4 h-4 text-amber-400/70 shrink-0" />
                  <div>
                    <div className="text-white text-xs font-semibold">{item.label}</div>
                    <div className="text-white/40 text-xs">{item.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
