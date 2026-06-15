export class RiskAgent {
  private running = false;
  private alertsTriggered = 0;
  private positionsMonitored = 0;

  async start() {
    this.running = true;
    console.log("[RiskAgent] Started — monitoring positions");
  }

  async stop() {
    this.running = false;
    console.log("[RiskAgent] Stopped");
  }

  getStatus() {
    return {
      alertsTriggered: this.alertsTriggered,
      positionsMonitored: this.positionsMonitored,
      running: this.running,
    };
  }

  assessTrade(params: { quantity: number; price: number; portfolioValue: number }) {
    const exposure = (params.quantity * params.price) / params.portfolioValue;
    const riskLevel = exposure > 0.1 ? "high" : exposure > 0.05 ? "medium" : "low";

    if (riskLevel === "high") {
      this.alertsTriggered++;
      return { approved: false, reason: "Position size exceeds 10% of portfolio", riskLevel };
    }

    this.positionsMonitored++;
    return { approved: true, riskLevel };
  }
}
