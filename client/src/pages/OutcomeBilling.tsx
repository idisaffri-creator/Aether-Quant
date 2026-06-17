/*
 * Billing — placeholder. Paper trading is free; live trading uses
 * underlying broker fees (no platform markup). No billing yet.
 */
import ComingSoon from "./ComingSoon";

export default function OutcomeBilling() {
  return (
    <ComingSoon
      title="Billing"
      description="Paper trading is free. Live trading uses underlying broker fees (Alpaca, etc.) with no platform markup. No billing system yet — when we ship it, you'll see usage and fees here."
      nextSteps={[
        "Track broker commissions and SEC fees per trade",
        "View monthly cost breakdown by strategy and asset class",
        "Export accounting reports (CSV/PDF) for tax filing",
        "Multi-currency support (USD, EUR, GBP)",
      ]}
      relatedLinks={[
        { label: "Trading", href: "/dashboard/trading" },
        { label: "Portfolio Analytics", href: "/dashboard/portfolio" },
        { label: "Account Settings", href: "/dashboard/settings" },
      ]}
    />
  );
}
