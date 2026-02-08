

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';

interface Props {
  // Made children optional to fix"Property'children' is missing" error in index.tsx
  children?: ReactNode;
  // Optional fallback component for custom error display
  fallback?: ReactNode | ((error: Error | null, retry: () => void) => ReactNode);
  // Optional callback when error occurs
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  // Optional retry callback
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Fix: Import Component directly and extend it to ensure property access (setState, props) works correctly in TypeScript
export class ErrorBoundary extends Component<Props, State> {
  // Declare and initialize state to resolve"Property'state' does not exist"
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Fix: setState is now correctly inherited from Component
    this.setState({ errorInfo });
    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  public render() {
    // Accessing state from this.state
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        if (typeof this.props.fallback ==='function') {
          return this.props.fallback(this.state.error, this.handleRetry);
        }
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-nb-white flex items-center justify-center p-4">
          <div className="bg-nb-white max-w-lg w-full shadow-brutal-lg overflow-hidden border border-nb-red/20">
            <div className="bg-nb-red/10 p-6 flex items-center gap-4 border-b border-nb-red/20">
              <div className="w-12 h-12 bg-nb-red/20 flex items-center justify-center text-nb-red shrink-0">
                <Icon name="error_outline" className="text-3xl" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-nb-red">Something went wrong</h1>
                <p className="text-nb-red text-sm">The application encountered an unexpected error.</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-nb-black p-4 overflow-auto max-h-64 custom-scrollbar">
                <code className="text-nb-red/60 font-mono text-xs block mb-2">
                  {this.state.error && this.state.error.message}
                </code>
                {import.meta.env.DEV && (
                  <code className="text-nb-black/50 font-mono text-[10px] whitespace-pre-wrap block">
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </code>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="ghost" size="bare"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-nb-black text-white font-bold text-sm hover:bg-nb-black/80 flex items-center gap-2"
                >
                  <Icon name="refresh" /> Reload Application
                </Button>
              </div>
            </div>

            <div className="bg-nb-white p-4 text-center text-xs text-nb-black/40 border-t">
              If this persists, please export your data and report the issue.
            </div>
          </div>
        </div>
      );
    }

    // Fix: props.children is now correctly inherited and typed from Component
    return this.props.children;
  }
}

// View-specific error fallback component for per-view error boundaries
interface ViewErrorFallbackProps {
  viewName: string;
  error: Error | null;
  onRetry: () => void;
  onSwitchView?: () => void;
}

export const ViewErrorFallback: React.FC<ViewErrorFallbackProps> = ({ viewName, error, onRetry, onSwitchView }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-nb-white">
      <div className="bg-nb-white max-w-md w-full shadow-brutal border border-nb-orange/20 overflow-hidden">
        <div className="bg-nb-orange/10 p-4 flex items-center gap-3 border-b border-nb-orange/20">
          <div className="w-10 h-10 bg-nb-orange/20 flex items-center justify-center text-nb-orange shrink-0">
            <Icon name="warning" className="text-xl" />
          </div>
          <div>
            <h2 className="text-base font-bold text-nb-orange">{viewName} View Error</h2>
            <p className="text-nb-orange text-xs">This view encountered a problem.</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {error && (
            <div className="bg-nb-cream p-3 overflow-auto max-h-32">
              <code className="text-nb-red font-mono text-xs">{error.message}</code>
            </div>
          )}

          <p className="text-nb-black/60 text-sm">
            Your data is safe. You can try again or switch to a different view.
          </p>

          <div className="flex gap-2 justify-end pt-2">
            {onSwitchView && (
              <Button variant="ghost" size="bare"
                onClick={onSwitchView}
                className="px-3 py-1.5 text-nb-black/60 hover:bg-nb-cream text-sm font-medium flex items-center gap-1"
              >
                <Icon name="swap_horiz" className="text-sm" /> Switch View
              </Button>
            )}
            <Button variant="ghost" size="bare"
              onClick={onRetry}
              className="px-3 py-1.5 bg-nb-orange text-white text-sm font-bold hover:bg-nb-orange flex items-center gap-1"
            >
              <Icon name="refresh" className="text-sm" /> Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
