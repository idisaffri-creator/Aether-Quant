import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import IdeaExtractor from "./pages/IdeaExtractor";
import BacktestResults from "./pages/BacktestResults";
import Optimization from "./pages/Optimization";
import AgentWorkforce from "./pages/AgentWorkforce";
import OutcomeBilling from "./pages/OutcomeBilling";
import StrategyLibrary from "./pages/StrategyLibrary";
import Dashboard from "./pages/Dashboard";
import AgentTeam from "./pages/AgentTeam";
import Pipeline from "./pages/Pipeline";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/extractor" component={IdeaExtractor} />
        <Route path="/backtest" component={BacktestResults} />
        <Route path="/optimization" component={Optimization} />
        <Route path="/agents" component={AgentWorkforce} />
        <Route path="/team" component={AgentTeam} />
        <Route path="/pipeline" component={Pipeline} />
        <Route path="/billing" component={OutcomeBilling} />
        <Route path="/library" component={StrategyLibrary} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: 'oklch(0.16 0.015 250)',
                border: '1px solid oklch(0.25 0.015 250)',
                color: 'oklch(0.9 0.01 250)',
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
