/*
 * Pipeline & Operations – Skill Chaining + Daily Timeline
 * Inspired by Openclaw 101 skill chaining concept
 * Shows the Idea-to-Agent pipeline and daily trading operations schedule
 */
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  CheckCircle2,
  Loader2,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { skillPipeline, dailyTimeline } from "@/lib/mockData";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Pipeline() {
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Skill Chaining Pipeline
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          The complete Idea-to-Autonomous-Agent pipeline — each step chains skills together for end-to-end automation.
        </p>
      </div>

      {/* Skill Pipeline Visualization */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Desktop: Horizontal pipeline */}
        <div className="hidden lg:block">
          <div className="flex items-stretch gap-0 overflow-x-auto pb-4">
            {skillPipeline.map((step, idx) => (
              <motion.div
                key={step.id}
                variants={itemVariants}
                className="flex items-stretch"
              >
                <div className={`relative flex flex-col items-center p-5 rounded-xl border min-w-[160px] ${
                  step.status === "complete"
                    ? "bg-profit/5 border-profit/30"
                    : step.status === "active"
                    ? "bg-primary/5 border-primary/30 glow-cyan-sm"
                    : "bg-accent/50 border-border"
                }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 ${
                    step.status === "complete"
                      ? "bg-profit/10"
                      : step.status === "active"
                      ? "bg-primary/10"
                      : "bg-accent"
                  }`}>
                    {step.icon}
                  </div>
                  <h3 className="text-sm font-display font-bold text-foreground text-center">
                    {step.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground text-center mt-1.5 leading-relaxed max-w-[130px]">
                    {step.description}
                  </p>
                  <div className="mt-3">
                    {step.status === "complete" ? (
                      <CheckCircle2 className="w-4 h-4 text-profit" />
                    ) : step.status === "active" ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />
                    )}
                  </div>
                </div>
                {idx < skillPipeline.length - 1 && (
                  <div className="flex items-center px-2">
                    <ArrowRight className="w-5 h-5 text-primary/40" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile: Vertical pipeline */}
        <div className="lg:hidden space-y-3">
          {skillPipeline.map((step, idx) => (
            <motion.div key={step.id} variants={itemVariants}>
              <div className={`flex items-center gap-4 p-4 rounded-xl border ${
                step.status === "complete"
                  ? "bg-profit/5 border-profit/30"
                  : step.status === "active"
                  ? "bg-primary/5 border-primary/30 glow-cyan-sm"
                  : "bg-accent/50 border-border"
              }`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${
                  step.status === "complete"
                    ? "bg-profit/10"
                    : step.status === "active"
                    ? "bg-primary/10"
                    : "bg-accent"
                }`}>
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-display font-bold text-foreground">{step.name}</h3>
                    {step.status === "complete" && <CheckCircle2 className="w-3.5 h-3.5 text-profit" />}
                    {step.status === "active" && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
                <span className="text-xs font-mono text-muted-foreground shrink-0">
                  {idx + 1}/{skillPipeline.length}
                </span>
              </div>
              {idx < skillPipeline.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className="w-px h-4 bg-primary/20" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-display text-muted-foreground uppercase tracking-wider">Daily Operations</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Daily Operations Timeline */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display font-bold text-foreground">
            Trading Day Timeline
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          What each agent does throughout the trading day — from pre-market intelligence to post-market analysis.
        </p>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="relative"
        >
          {/* Vertical line */}
          <div className="absolute left-[18px] top-4 bottom-4 w-px bg-gradient-to-b from-primary/40 via-profit/40 to-primary/40 hidden sm:block" />

          <div className="space-y-4">
            {dailyTimeline.map((phase, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="relative"
              >
                <Card className="bg-card border-border hover:border-primary/20 transition-colors ml-0 sm:ml-10">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      {/* Time indicator (visible on mobile) */}
                      <div className="sm:hidden flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: phase.color }}
                        />
                        <span className="text-xs font-mono text-primary font-semibold">
                          {phase.time}
                        </span>
                      </div>

                      {/* Desktop time dot */}
                      <div
                        className="absolute left-[12px] top-[22px] w-[14px] h-[14px] rounded-full border-2 border-card hidden sm:block"
                        style={{ backgroundColor: phase.color }}
                      />

                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          <span className="text-xs font-mono text-primary font-semibold hidden sm:inline">
                            {phase.time}
                          </span>
                          <h3 className="text-sm font-display font-bold text-foreground">
                            {phase.phase}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {phase.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <Users className="w-3 h-3 text-muted-foreground shrink-0" />
                          {phase.agents.map((agent, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-[9px] font-mono border-border text-muted-foreground"
                            >
                              {agent}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
