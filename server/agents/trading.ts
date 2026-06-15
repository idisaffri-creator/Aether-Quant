export class TradingAgent {
  private running = false;
  private tradesExecuted = 0;
  private wins = 0;

  async start() {
    this.running = true;
    console.log("[TradingAgent] Started");
  }

  async stop() {
    this.running = false;
    console.log("[TradingAgent] Stopped");
  }

  getStatus() {
    return {
      tradesExecuted: this.tradesExecuted,
      winRate: this.tradesExecuted > 0 ? (this.wins / this.tradesExecuted) * 100 : 0,
      running: this.running,
    };
  }

  async executeTrade(params: { symbol: string; side: string; quantity: number; price: number }) {
    this.tradesExecuted++;
    console.log(`[TradingAgent] Executing ${params.side} ${params.quantity} ${params.symbol} @ ${params.price}`);
    return { success: true, tradeId: `trade-${Date.now()}` };
  }
}
