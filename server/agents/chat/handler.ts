import { orchestrator } from "../orchestrator.js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const conversationHistory: ChatMessage[] = [];

const SYSTEM_PROMPT = `You are Aether AI, the intelligent assistant for the Aether Energy trading platform.
You help users with:
- Market analysis and trading strategies
- Portfolio management and risk assessment
- Platform features and navigation
- Agent system management
- Web3 and Solana integration

Keep responses concise, professional, and data-driven.`;

export async function handleChatMessage(userMessage: string): Promise<string> {
  conversationHistory.push({ role: "user", content: userMessage, timestamp: new Date().toISOString() });

  const lower = userMessage.toLowerCase();
  let response = "";

  if (lower.includes("agent") || lower.includes("orchestrator")) {
    const statuses = orchestrator.getStatus();
    response = `**Agent System Status:**\n\n${statuses.map((s: any) =>
      `- **${s.name}**: ${s.status}${s.lastRun ? ` (last run: ${new Date(s.lastRun).toLocaleTimeString()})` : ""}`
    ).join("\n")}`;
  } else if (lower.includes("wti") || lower.includes("crude") || lower.includes("market")) {
    response = `**Market Insight**\n\nWTI Crude is currently the most active contract. Key levels to watch:\n- Support: $77.50\n- Resistance: $79.20\n- 24h Volume: Above average\n\nSuggest monitoring OPEC announcements this week for volatility catalysts.`;
  } else if (lower.includes("portfolio") || lower.includes("allocation")) {
    response = `**Portfolio Analysis**\n\nYour current allocation is diversified across 5 energy assets. The WTI position is your largest at 29.8%. Consider rebalancing if any single position exceeds 35% to maintain risk-adjusted returns.`;
  } else if (lower.includes("risk") || lower.includes("stop") || lower.includes("drawdown")) {
    response = `**Risk Assessment**\n\nCurrent portfolio VaR (95%): 2.3%\nMax drawdown limit: 15%\nPositions at risk: None\n\nAll positions are within acceptable risk parameters. Stop-losses are active on all open trades.`;
  } else if (lower.includes("strategy") || lower.includes("backtest")) {
    response = `**Strategy Lab**\n\nYou have 4 strategies available. "Momentum Breakout" has the highest Sharpe ratio (1.87). Would you like me to:\n1. Run a backtest on a specific strategy\n2. Compare strategy performance\n3. Suggest parameter optimization`;
  } else if (lower.includes("solana") || lower.includes("wallet") || lower.includes("web3")) {
    response = `**Web3 Integration**\n\nYour Solana wallet is connected to Devnet. On-chain trade settlement is available for all executed trades. Smart contract address: \`AETHRp1ace...111111\`\n\nGas fees are covered by the platform for Professional tier users.`;
  } else if (lower.includes("signal") || lower.includes("alert") || lower.includes("opportunity")) {
    const signalAgent = orchestrator.getAgent("signals");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agent = signalAgent as any;
    const activeSignals = agent.getActiveSignals?.() ?? [];
    if (activeSignals.length === 0) {
      response = "**Trade Signals**\n\nNo active signals at this time. I'll notify you when new opportunities arise.";
    } else {
      const top = activeSignals.slice(0, 3);
      const lines = top.map((s: { symbol: string; direction: string; confidence: number; strategy: string; reason: string }) =>
        `- **${s.symbol}** ${s.direction === "long" ? "🟢" : "🔴"} ${s.direction.toUpperCase()} | ${(s.confidence * 100).toFixed(0)}% confidence | ${s.strategy}\n  → ${s.reason}`
      );
      response = `**Trade Signals (${activeSignals.length} active)**\n\n${lines.join("\n")}\n\n*Signals update every 60 seconds. Use the Signal Panel for full details.*`;
    }
  } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    response = `Welcome to Aether Energy. I'm your AI trading assistant. I can help with market analysis, portfolio management, agent orchestration, and platform navigation. What would you like to explore?`;
  } else {
    response = `I understand you're asking about "${userMessage}". To give you the most accurate response, could you specify which area this relates to:\n- Market analysis (e.g., "Analyze WTI crude")\n- Portfolio (e.g., "Check my allocation")\n- Risk (e.g., "What's my current risk exposure")\n- Agents (e.g., "Show agent status")\n- Strategies (e.g., "Compare my strategies")`;
  }

  conversationHistory.push({ role: "assistant", content: response, timestamp: new Date().toISOString() });

  if (conversationHistory.length > 50) {
    conversationHistory.splice(0, 10);
  }

  return response;
}

export function getConversationHistory(): ChatMessage[] {
  return conversationHistory;
}
