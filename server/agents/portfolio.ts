export class PortfolioAgent {
  private running = false;
  private rebalancesSuggested = 0;
  private optimizationsRun = 0;

  async start() {
    this.running = true;
    console.log("[PortfolioAgent] Started — portfolio optimization active");
  }

  async stop() {
    this.running = false;
    console.log("[PortfolioAgent] Stopped");
  }

  getStatus() {
    return {
      rebalancesSuggested: this.rebalancesSuggested,
      optimizationsRun: this.optimizationsRun,
      running: this.running,
    };
  }

  suggestRebalancing(allocation: { asset: string; percentage: number }[]) {
    const totalPct = allocation.reduce((sum, a) => sum + a.percentage, 0);
    if (Math.abs(totalPct - 100) > 5) {
      this.rebalancesSuggested++;
      return { needsRebalancing: true, message: "Portfolio allocation deviates from target by more than 5%" };
    }
    return { needsRebalancing: false };
  }
}
