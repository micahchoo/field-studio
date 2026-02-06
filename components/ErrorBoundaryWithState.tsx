/**
 * ErrorBoundaryWithState - Error boundary that preserves scroll position and view state
 * 
 * Addresses Issue 1.5: View Router Error Boundaries Don't Preserve State
 * Enhanced with state preservation and recovery mechanisms
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { LoadingSpinner } from './LoadingState';

interface StatePreservation {
  scrollPosition: { x: number; y: number };
  viewState: Record<string, unknown>;
  timestamp: number;
}

interface Props {
  children?: ReactNode;
  fallback?: ReactNode | ((error: Error | null, retry: () => void, preserveState: StatePreservation | null) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo, preserveState: StatePreservation) => void;
  onRetry?: () => void;
  viewId: string; // Unique identifier for this view (e.g., 'archive', 'collections')
  preserveScroll?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRecovering: boolean;
  preserveState: StatePreservation | null;
}

const STORAGE_KEY = 'field-studio-error-state';

export class ErrorBoundaryWithState extends Component<Props, State> {
  private scrollPosition = { x: 0, y: 0 };
  private viewState: Record<string, unknown> = {};

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isRecovering: false,
    preserveState: null
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Capture scroll position
    const scrollPosition = {
      x: window.scrollX,
      y: window.scrollY
    };

    // Try to get view state from localStorage
    let viewState: Record<string, unknown> = {};
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-${this.props.viewId}`);
      if (saved) {
        viewState = JSON.parse(saved);
      }
    } catch {
      // Ignore storage errors
    }

    const preserveState: StatePreservation = {
      scrollPosition,
      viewState,
      timestamp: Date.now()
    };

    this.setState({ errorInfo, preserveState });

    // Report error with preserved state
    this.props.onError?.(error, errorInfo, preserveState);

    // Store error for debugging
    console.error(`[ErrorBoundary:${this.props.viewId}]`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ isRecovering: true });

    // Restore scroll position after a short delay
    setTimeout(() => {
      if (this.state.preserveState?.scrollPosition && this.props.preserveScroll !== false) {
        window.scrollTo(
          this.state.preserveState.scrollPosition.x,
          this.state.preserveState.scrollPosition.y
        );
      }

      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false
      });

      this.props.onRetry?.();
    }, 100);
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      preserveState: null
    });
  };

  public render() {
    if (this.state.isRecovering) {
      return (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Recovering...</p>
          </div>
        </div>
      );
    }

    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(
            this.state.error,
            this.handleRetry,
            this.state.preserveState
          );
        }
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          viewId={this.props.viewId}
          error={this.state.error}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          preserveState={this.state.preserveState}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  viewId: string;
  error: Error | null;
  onRetry: () => void;
  onReset: () => void;
  preserveState: StatePreservation | null;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  viewId,
  error,
  onRetry,
  onReset,
  preserveState
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden border border-red-100">
        <div className="bg-red-50 p-6 flex items-start gap-4 border-b border-red-100">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500 shrink-0">
            <Icon name="error_outline" className="text-2xl" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-red-900 mb-1">
              {viewId.charAt(0).toUpperCase() + viewId.slice(1)} View Error
            </h1>
            <p className="text-red-700 text-sm">
              Something went wrong in this view. Your data is safe.
            </p>
            {preserveState && (
              <p className="text-amber-600 text-xs mt-2">
                <Icon name="restore" className="text-xs inline mr-1" />
                State from {new Date(preserveState.timestamp).toLocaleTimeString()} can be restored
              </p>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-48">
              <code className="text-red-300 font-mono text-xs block mb-2">
                {error.toString()}
              </code>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="flex-1 px-4 py-3 bg-iiif-blue text-white rounded-xl font-bold text-sm hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Icon name="refresh" /> Try Again (Restore State)
            </button>
            <button
              onClick={onReset}
              className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
            >
              Reset View
            </button>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
          >
            <Icon name={showDetails ? 'expand_less' : 'expand_more'} className="text-xs" />
            {showDetails ? 'Hide' : 'Show'} Technical Details
          </button>

          {showDetails && (
            <div className="bg-slate-100 rounded-lg p-4 text-xs text-slate-600 space-y-2">
              <p><strong>View ID:</strong> {viewId}</p>
              <p><strong>Error Time:</strong> {new Date().toISOString()}</p>
              {preserveState && (
                <>
                  <p><strong>Scroll Position:</strong> {preserveState.scrollPosition.x}, {preserveState.scrollPosition.y}</p>
                  <p><strong>View State Keys:</strong> {Object.keys(preserveState.viewState).join(', ') || 'None'}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// View-specific error fallback with switch view option
interface ViewErrorFallbackWithSwitchProps {
  viewName: string;
  error: Error | null;
  onRetry: () => void;
  onSwitchView?: () => void;
  preserveState: StatePreservation | null;
}

export const ViewErrorFallbackWithSwitch: React.FC<ViewErrorFallbackWithSwitchProps> = ({
  viewName,
  error,
  onRetry,
  onSwitchView,
  preserveState
}) => {
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

          {preserveState && (
            <p className="text-xs text-slate-500">
              <Icon name="restore" className="text-xs inline mr-1" />
              Your previous state will be restored
            </p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            {onSwitchView && (
              <button
                onClick={onSwitchView}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded text-sm font-medium flex items-center gap-1"
              >
                <Icon name="swap_horiz" className="text-sm" /> Switch View
              </button>
            )}
            <button
              onClick={onRetry}
              className="px-3 py-1.5 bg-amber-500 text-white rounded text-sm font-bold hover:bg-amber-600 flex items-center gap-1"
            >
              <Icon name="refresh" className="text-sm" /> Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundaryWithState;
