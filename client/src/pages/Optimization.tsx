/*
 * Strategy Optimization — placeholder. Portfolio optimization
 * (mean-variance, risk parity) is on the roadmap.
 */
import ComingSoon from "./ComingSoon";

export default function Optimization() {
  return (
    <ComingSoon
      title="Strategy Optimization"
      description="Portfolio-level optimization (mean-variance, risk parity, Kelly sizing) is on the roadmap. Today, use the Backtest page to compare strategies."
      nextSteps={[
        "Mean-variance optimization (Markowitz) over your strategy universe",
        "Risk parity allocation with risk budgeting",
        "Kelly fraction position sizing per strategy",
        "Monte Carlo simulation of strategy combinations (10k+ paths)",
      ]}
      relatedLinks={[
        { label: "Run a Backtest", href: "/dashboard/backtest" },
        { label: "Compare Strategies", href: "/dashboard/comparison" },
        { label: "Strategy Marketplace", href: "/dashboard/marketplace" },
        { label: "AI Advisor", href: "/dashboard/ai" },
      ]}
    />
  );
}
