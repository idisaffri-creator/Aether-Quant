# Aether Quant – AI-Powered Autonomous Trading Platform

**Where AI Agents Become Your Trading Workforce**

Aether Quant is a complete Idea-to-Autonomous-Agent pipeline for quantitative commodity trading. Extract trading ideas from natural language, backtest against 10+ years of institutional data, optimize parameters using AI-driven search, and deploy winning strategies as fully autonomous trading agents.

## 🚀 Features

### Core Capabilities
- **Idea Extractor** — Convert unstructured input (text, YouTube, PDF, code) into structured strategy definitions
- **Backtest Engine** — Run strategies against 10+ years of historical data (Bloomberg, Kpler, IIR Energy)
- **Parameter Optimization** — AI-driven search optimizing for Sharpe ratio, CAGR, win rate, and custom metrics
- **Agent Workforce Dashboard** — Monitor autonomous trading agents with real-time P&L, uptime, and trade counts
- **Agent Team View** — Meet the Agents page showing each agent's identity, skills, rules, and context system (SOUL.md pattern)
- **Skill Chaining Pipeline** — Visualize the complete Idea-to-Agent workflow with skill dependencies
- **Daily Operations Timeline** — Track what each agent does throughout the trading day
- **Outcome Billing Dashboard** — Track value generated per agent, performance fees, and credits consumed
- **Strategy Library** — Save, re-run, and deploy winning strategies

### Design & UX
- **Dark "Void Terminal" Theme** — Professional trading platform aesthetic (Bloomberg Terminal meets modern SaaS)
- **Electric Cyan Accents** — Primary action color for modern feel
- **Profit/Loss Color Coding** — Green for gains, red for losses
- **Animated Interactions** — Smooth transitions, pulsing status indicators, loading animations
- **Responsive Design** — Desktop-first, tablet-friendly layout
- **Real-time Visualizations** — Equity curves, P&L charts, portfolio allocation donuts, compounding value curves

### Agent-Centric Architecture
- **Agent Identity Cards** — Each agent has personality, rules, skills, and schedule
- **P&L Attribution** — Track value generated per agent for outcome-based billing
- **Global Kill Switch** — Emergency stop for all agents with confirmation dialog
- **Agent Context System** — SOUL.md pattern showing market context, strategy parameters, risk limits, memory
- **Skill Chaining** — Agents compose skills (Extraction, Analysis, Backtesting, Optimization, Deployment, Monitoring, Reporting)
- **Daily Heartbeat** — Agents report status at configurable intervals (10s–120s depending on strategy)

## 📋 Project Structure

```
aether-quant/
├── client/                          # React 19 frontend
│   ├── public/                      # Static assets (favicon, robots.txt)
│   ├── src/
│   │   ├── pages/                   # Page components
│   │   │   ├── Dashboard.tsx        # Portfolio overview + compounding chart + before/after
│   │   │   ├── IdeaExtractor.tsx    # 4-tab input for strategy ideas
│   │   │   ├── BacktestResults.tsx  # Metrics + equity curve + trade list
│   │   │   ├── Optimization.tsx     # Parameter search interface
│   │   │   ├── AgentWorkforce.tsx   # Agent cards with P&L attribution + kill switch
│   │   │   ├── AgentTeam.tsx        # Meet the Agents with identity cards
│   │   │   ├── Pipeline.tsx         # Skill chaining + daily timeline
│   │   │   ├── OutcomeBilling.tsx   # Billing dashboard
│   │   │   ├── StrategyLibrary.tsx  # Saved strategies
│   │   │   └── NotFound.tsx         # 404 page
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx  # Sidebar + header layout
│   │   │   ├── ui/                  # shadcn/ui components
│   │   │   └── ErrorBoundary.tsx    # Error handling
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx     # Dark theme provider
│   │   ├── lib/
│   │   │   └── mockData.ts          # Realistic mock data (agents, trades, metrics)
│   │   ├── App.tsx                  # Routes
│   │   ├── main.tsx                 # React entry point
│   │   └── index.css                # Global styles + Void Terminal theme
│   └── index.html                   # HTML template
├── server/
│   └── index.ts                     # Express server (static file serving)
├── shared/
│   └── const.ts                     # Shared constants
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── vite.config.ts                   # Vite config
├── tailwind.config.ts               # Tailwind config
└── README.md                        # This file
```

## 🎨 Design System

### Color Palette (Void Terminal Theme)
- **Background**: `oklch(0.141 0.005 285.823)` — Deep space black
- **Foreground**: `oklch(0.85 0.005 65)` — Light text
- **Primary (Cyan)**: `oklch(0.82 0.15 195)` — Electric cyan for actions
- **Profit (Green)**: `oklch(0.82 0.19 160)` — Neon green for gains
- **Loss (Red)**: `oklch(0.68 0.22 20)` — Signal red for losses
- **Accent**: `oklch(0.274 0.006 286.033)` — Subtle accent

### Typography
- **Display Font**: Space Grotesk (headings, titles)
- **Body Font**: JetBrains Mono (data, metrics, code)
- **Hierarchy**: Bold display + readable mono creates technical yet modern feel

### Components
- **Cards**: Subtle borders, soft shadows, hover effects
- **Charts**: Recharts with custom tooltips and gradients
- **Buttons**: Cyan primary, transparent outlines, hover animations
- **Status Indicators**: Pulsing dots for live agents, checkmarks for complete, spinners for loading

## 🛠️ Tech Stack

### Frontend
- **React 19** — UI framework
- **TypeScript** — Type safety
- **Tailwind CSS 4** — Utility-first styling
- **Framer Motion** — Animations and transitions
- **Recharts** — Data visualization (charts, graphs)
- **Wouter** — Client-side routing
- **shadcn/ui** — Accessible component library
- **Lucide React** — Icon library
- **Sonner** — Toast notifications

### Build & Dev
- **Vite** — Fast build tool
- **ESBuild** — Bundling
- **TypeScript** — Type checking
- **Prettier** — Code formatting

### Backend (Minimal)
- **Express** — Static file server
- **Node.js** — Runtime

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm 10.4.1+

### Installation

```bash
# Clone the repository
git clone https://github.com/idisaffri-creator/Aether-Quant.git
cd Aether-Quant

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open browser
# Navigate to http://localhost:3000
```

### Development Commands

```bash
# Start dev server with HMR
pnpm dev

# Type check
pnpm check

# Format code
pnpm format

# Build for production
pnpm build

# Preview production build
pnpm preview

# Start production server
pnpm start
```

## 📊 Mock Data

The application includes realistic mock data for demonstration:

- **6 Trading Agents** — Each with unique personality, skills, rules, and schedule
  - Alpha Crude Momentum (Energy Trading Specialist)
  - Gold Spread Arb (Precious Metals Analyst)
  - NatGas Volatility (Gas Market Expert)
  - Copper Trend Follow (Industrial Metals Tracker)
  - Wheat Seasonal (Agricultural Specialist)
  - Silver 0DTE Options (Options Volatility Expert)

- **Portfolio Data** — $2.45M portfolio with 35% crude, 25% gold, 20% nat gas, 10% copper, 10% others

- **Daily P&L** — 30 days of realistic trading results with green/red bars

- **Agent Metrics** — Win rates, trade counts, uptime, P&L attribution, performance fees

- **Skill Pipeline** — 7-step workflow from Extraction → Analysis → Backtest → Optimize → Deploy → Monitor → Report

- **Daily Timeline** — 8 trading phases from pre-market (05:00) to post-market (20:00)

- **Compounding Chart** — 8-week agent intelligence improvement showing learning milestones

- **Before/After Comparison** — Manual trading vs. Aether Quant autonomous execution

## 🔄 Pricing Model

Aether Quant uses a hybrid pricing model:

| Tier | Monthly | Per-Agent | Performance Fee | Optimization |
|------|---------|-----------|-----------------|--------------|
| Intelligence Feed | $30 | — | — | — |
| Strategy Studio | $99 | — | 10% of P&L | 20 runs/month |
| Full AETHER | $199 | $29/agent | 10% of P&L | Unlimited |

## 🎯 Key Screens

### 1. Dashboard
- Hero metrics (Portfolio Value, Daily P&L, Active Agents, Avg Sharpe)
- Daily P&L chart (30-day bar chart)
- Portfolio allocation donut
- **Agent Intelligence Compounding** — Shows performance improvement over 8 weeks
- **Before vs After** — Manual vs. autonomous trading comparison
- Agent Workforce summary
- Recent activity feed

### 2. Idea Extractor
- 4 input tabs: Text, YouTube, PDF, Code
- Simulated extraction flow with loading animation
- Generated strategy output with parameters

### 3. Backtest Results
- 10-metric dashboard (Sharpe, CAGR, Max Drawdown, Win Rate, etc.)
- Equity curve chart
- Sortable trade list with entry/exit prices, P&L

### 4. Parameter Optimization
- Range sliders for strategy parameters
- Goal selector (Sharpe, CAGR, Win Rate)
- Animated grid search results
- Top 20 results table

### 5. Agent Workforce Dashboard
- 6 agent cards with status, P&L, uptime, win rate
- **P&L Attribution** — Value generated and performance fee per agent
- **Global Kill Switch** — Emergency stop for all agents
- **SOUL.md Context** — View agent personality, rules, skills, schedule
- Risk level indicators (Low/Medium/High)
- Heartbeat timestamps

### 6. Agent Team (Meet the Agents)
- 6 agent identity cards
- Agent role and personality description
- Key stats (Trades, Win%, P&L, Uptime)
- Skills breakdown
- Rules and constraints
- Daily schedule
- Context system (SOUL.md) button

### 7. Pipeline & Operations
- **Skill Chaining Pipeline** — 7-step workflow visualization
- **Daily Operations Timeline** — 8 trading phases with agent assignments
- Color-coded timeline with time ranges

### 8. Outcome Billing Dashboard
- Total value generated per agent (bar chart)
- Performance fees accrued (10% of P&L)
- Credits used vs. remaining
- Billing forecast
- Value vs. cost comparison

### 9. Strategy Library
- List of saved strategies with metrics
- Search and filter
- Re-run, Deploy, Delete actions

## 🔐 Security & Best Practices

- **TypeScript** — Full type safety across codebase
- **Error Boundaries** — Graceful error handling
- **Environment Variables** — Secrets managed via env
- **Responsive Design** — Works on desktop, tablet, mobile
- **Accessibility** — Keyboard navigation, focus rings, ARIA labels
- **Performance** — Optimized charts, lazy loading, efficient re-renders

## 📈 Future Enhancements

1. **Real-time Agent Heartbeat** — WebSocket integration for live agent status updates
2. **Agent Configuration Wizard** — Create custom agents with guided setup
3. **Performance Analytics** — ROI, Sharpe evolution, drawdown analysis, correlation matrices
4. **Backtester Integration** — Connect to Backtrader/VectorBT for real historical simulations
5. **Interactive Brokers Integration** — Live trading execution via IB API
6. **Machine Learning** — Agent optimization using reinforcement learning
7. **Multi-user Collaboration** — Team workspaces and shared strategies
8. **Mobile App** — Native iOS/Android companion app

## 📝 License

MIT License — See LICENSE file for details

## 👤 Author

Built by Aether Quant Team

## 🤝 Contributing

Contributions welcome! Please follow the existing code style and submit PRs with clear descriptions.

## 📞 Support

For issues, feature requests, or questions, please open a GitHub issue.

---

**Aether Quant** — Autonomous trading agents for the modern commodity trader. Deploy strategies, let AI agents execute, watch profits compound.
