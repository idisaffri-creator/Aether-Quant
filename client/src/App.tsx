import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AgentProvider } from "./contexts/AgentContext";
import { NotificationProvider } from "./contexts/NotificationContext";
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
import Home from "./pages/Home";

const Overview = lazy(() => import("./pages/Dashboard/Overview"));
const Trade = lazy(() => import("./pages/Dashboard/Trade"));
const Portfolio = lazy(() => import("./pages/Dashboard/Portfolio"));
const Strategies = lazy(() => import("./pages/Dashboard/Strategies"));
const Analysis = lazy(() => import("./pages/Dashboard/Analysis"));
const Intelligence = lazy(() => import("./pages/Dashboard/Intelligence"));
const Mail = lazy(() => import("./pages/Dashboard/Mail"));
const Audit = lazy(() => import("./pages/Dashboard/Audit"));
const Settings = lazy(() => import("./pages/Dashboard/Settings"));

function DashboardLoader() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-accent/30 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-72 bg-accent/20 rounded-xl" />
        <div className="h-72 bg-accent/20 rounded-xl" />
      </div>
      <div className="h-64 bg-accent/20 rounded-xl" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard">
        <DashboardLayout>
          <Suspense fallback={<DashboardLoader />}>
            <Switch>
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/dashboard/extractor" component={IdeaExtractor} />
              <Route path="/dashboard/backtest" component={BacktestResults} />
              <Route path="/dashboard/optimization" component={Optimization} />
              <Route path="/dashboard/agents" component={AgentWorkforce} />
              <Route path="/dashboard/team" component={AgentTeam} />
              <Route path="/dashboard/pipeline" component={Pipeline} />
              <Route path="/dashboard/billing" component={OutcomeBilling} />
              <Route path="/dashboard/library" component={StrategyLibrary} />
              <Route path="/dashboard/overview" component={Overview} />
              <Route path="/dashboard/trade" component={Trade} />
              <Route path="/dashboard/portfolio" component={Portfolio} />
              <Route path="/dashboard/strategies" component={Strategies} />
              <Route path="/dashboard/analysis" component={Analysis} />
              <Route path="/dashboard/intelligence" component={Intelligence} />
              <Route path="/dashboard/mail" component={Mail} />
              <Route path="/dashboard/audit" component={Audit} />
              <Route path="/dashboard/settings" component={Settings} />
              <Route path="/dashboard/404" component={NotFound} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </DashboardLayout>
      </Route>
    </Switch>
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
