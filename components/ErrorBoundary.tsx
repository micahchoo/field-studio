
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
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
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
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
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-slate-800 text-white rounded font-bold text-sm hover:bg-slate-700 flex items-center gap-2"
                >
                  <Icon name="refresh" /> Reload Application
                </button>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t">
              If this persists, please export your data and report the issue.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
