export class ComplianceAgent {
  private running = false;
  private checksPassed = 0;
  private flagsRaised = 0;

  async start() {
    this.running = true;
    console.log("[ComplianceAgent] Started — regulatory monitoring active");
  }

  async stop() {
    this.running = false;
    console.log("[ComplianceAgent] Stopped");
  }

  getStatus() {
    return {
      checksPassed: this.checksPassed,
      flagsRaised: this.flagsRaised,
      running: this.running,
    };
  }

  checkTrade(params: { userId: string; asset: string; quantity: number; price: number }) {
    const isSuspicious = params.quantity > 10000 || params.price > 1000000;

    if (isSuspicious) {
      this.flagsRaised++;
      return { approved: false, reason: "Trade exceeds compliance thresholds", flagged: true };
    }

    this.checksPassed++;
    return { approved: true, flagged: false };
  }
}
