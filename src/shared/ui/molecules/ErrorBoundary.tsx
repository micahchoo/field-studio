

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';

interface Props {
  // Made children optional to fix "Property 'children' is missing" error in index.tsx
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
  // Declare and initialize state to resolve "Property 'state' does not exist"
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
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.handleRetry);
        }
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-xl shadow-2xl overflow-hidden border border-red-100">
            <div className="bg-red-50 p-6 flex items-center gap-4 border-b border-red-100">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500 shrink-0">
                <Icon name="error_outline" className="text-3xl" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-red-900">Something went wrong</h1>
                <p className="text-red-700 text-sm">The application encountered an unexpected error.</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-64 custom-scrollbar">
                <code className="text-red-300 font-mono text-xs block mb-2">
                  {this.state.error && this.state.error.toString()}
                </code>
                <code className="text-slate-500 font-mono text-[10px] whitespace-pre-wrap block">
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </code>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="ghost" size="bare"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-slate-800 text-white rounded font-bold text-sm hover:bg-slate-700 flex items-center gap-2"
                >
                  <Icon name="refresh" /> Reload Application
                </Button>
              </div>
            </div>

            <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t">
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
    <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
      <div className="bg-white max-w-md w-full rounded-xl shadow-lg border border-amber-200 overflow-hidden">
        <div className="bg-amber-50 p-4 flex items-center gap-3 border-b border-amber-200">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
            <Icon name="warning" className="text-xl" />
          </div>
          <div>
            <h2 className="text-base font-bold text-amber-900">{viewName} View Error</h2>
            <p className="text-amber-700 text-xs">This view encountered a problem.</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {error && (
            <div className="bg-slate-100 rounded-lg p-3 overflow-auto max-h-32">
              <code className="text-red-600 font-mono text-xs">{error.message}</code>
            </div>
          )}

          <p className="text-slate-600 text-sm">
            Your data is safe. You can try again or switch to a different view.
          </p>

          <div className="flex gap-2 justify-end pt-2">
            {onSwitchView && (
              <Button variant="ghost" size="bare"
                onClick={onSwitchView}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded text-sm font-medium flex items-center gap-1"
              >
                <Icon name="swap_horiz" className="text-sm" /> Switch View
              </Button>
            )}
            <Button variant="ghost" size="bare"
              onClick={onRetry}
              className="px-3 py-1.5 bg-amber-500 text-white rounded text-sm font-bold hover:bg-amber-600 flex items-center gap-1"
            >
              <Icon name="refresh" className="text-sm" /> Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
