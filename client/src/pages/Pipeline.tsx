/*
 * Pipeline — placeholder. Real-time observability is provided
 * by the /metrics endpoint + Grafana dashboards.
 */
import ComingSoon from "./ComingSoon";

export default function Pipeline() {
  return (
    <ComingSoon
      title="Pipeline & Ops"
      description="Real-time observability is handled by the /metrics endpoint and the Grafana dashboard. View live request rate, P99 latency, error rate, Postgres connections, and top 5 slowest queries."
      nextSteps={[
        "In-app pipeline visualization (signal → strategy → order → fill)",
        "Per-strategy execution metrics and P&L attribution",
        "Anomaly detection on order flow",
        "Replay historical signals against strategies",
      ]}
      relatedLinks={[
        { label: "Status Page", href: "/status/ui" },
        { label: "Leaderboard", href: "/dashboard/leaderboard" },
        { label: "Notifications", href: "/dashboard/notifications" },
      ]}
    />
  );
}
