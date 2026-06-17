/**
 * ErrorBoundary — catches uncaught React render errors and shows a graceful fallback.
 * Logs to console; can be extended to send to Sentry if DSN is configured.
 */
import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureException(error);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full glass-card rounded-xl p-6 border border-red-500/20">
            <div className="text-red-400 font-display font-bold text-lg mb-2">Something went wrong</div>
            <p className="text-sm text-muted-foreground mb-4">
              {this.state.error?.message || "An unexpected error occurred while rendering this page."}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
return this.props.children;
    }
}

export default ErrorBoundary;