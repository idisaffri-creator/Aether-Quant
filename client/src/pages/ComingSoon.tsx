/*
 * Generic placeholder for features that aren't implemented yet.
 * Uses live data when available, shows clear next steps.
 */
import { usePageTitle } from "@/lib/usePageTitle";
import { Construction, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

interface Props {
  title: string;
  description: string;
  nextSteps?: string[];
  relatedLinks?: Array<{ label: string; href: string }>;
}

export default function ComingSoon({ title, description, nextSteps, relatedLinks }: Props) {
  usePageTitle(title);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
          <Construction className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{description}</p>
      </div>

      {nextSteps && nextSteps.length > 0 && (
        <div className="glass-card rounded-xl p-5 mb-4">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Roadmap</h2>
          <ul className="space-y-2">
            {nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground font-mono text-xs mt-0.5">{i + 1}.</span>
                <span className="text-foreground/90">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {relatedLinks && relatedLinks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {relatedLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <div className="glass-card rounded-xl p-3 flex items-center justify-between hover:border-primary/30 transition-colors cursor-pointer">
                <span className="text-sm font-medium">{link.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}
