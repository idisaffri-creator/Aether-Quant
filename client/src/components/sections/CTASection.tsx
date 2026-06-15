/* ============================================================
   AETHER ENERGY — CTA Section
   Design: Elemental Precision — Full-bleed dark section with
   amber glow, waitlist form
   ============================================================ */
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const AI_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663489353166/9Yy77UtBAusMMpueToP3Ub/aether-ai-brain-UVTjSB9YmXQcGRtuciKWwm.webp";

export default function CTASection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubmitted(true);
    toast.success("You're on the list! We'll be in touch soon.");
  };

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 bg-[oklch(0.12_0.009_260)]" />
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={AI_IMG}
          alt=""
          className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full object-cover opacity-10 blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.12_0.009_260)] via-[oklch(0.12_0.009_260/90%)] to-transparent" />
      </div>

      {/* Amber glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10" ref={ref}>
        <div className={`max-w-2xl transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="section-number mb-4">Join the Revolution</div>
          <h2 className="font-display text-4xl lg:text-5xl xl:text-6xl font-700 text-white leading-tight mb-6">
            Ready to Trade with{" "}
            <span className="shimmer-text">Institutional Intelligence?</span>
          </h2>
          <p className="text-white/60 text-lg leading-relaxed mb-10">
            Join over 1,000 traders already on the Aether waitlist. Get early access
            to the platform that's changing how oil markets are traded.
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap gap-4 mb-10">
            {[
              "Free paper trading forever",
              "No credit card required",
              "Cancel anytime",
            ].map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 text-white/60 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                {benefit}
              </div>
            ))}
          </div>

          {/* Form */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="flex-1 px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white placeholder-white/35 text-sm focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all"
              />
              <Button
                type="submit"
                className="btn-amber px-6 py-3 text-sm rounded-xl shrink-0 group"
              >
                Get Early Access
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 max-w-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-white font-600 text-sm">You're on the list!</div>
                <div className="text-white/55 text-sm">We'll notify you when early access opens.</div>
              </div>
            </div>
          )}

          <p className="text-white/30 text-xs mt-4">
            By signing up, you agree to our Terms of Service and Privacy Policy.
            We respect your privacy and will never share your data.
          </p>
        </div>
      </div>
    </section>
  );
}
