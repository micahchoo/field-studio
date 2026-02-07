import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { CONSTANTS } from '@/src/shared/constants';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  persistent?: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, action?: ToastAction) => void;
  showPersistentToast: (message: string, type: ToastType, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const MAX_TOASTS = 3;
  const MAX_HEIGHT = 300; // Maximum height in pixels

  useEffect(() => {
    return () => {
      // Cleanup all timeouts on unmount
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current.clear();
    };
  }, []);

  // Auto-dismiss toasts when clicking anywhere or limit exceeded
  useEffect(() => {
    if (toasts.length === 0) return;

    const handleClick = () => {
      // Dismiss oldest toast on click (progressive dismissal)
      if (toasts.length > 0) {
        const oldestId = toasts[0].id;
        setToasts(prev => prev.filter(t => t.id !== oldestId));
      }
    };

    // Delay listener to avoid dismissing from the same click that triggered the toast
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClick);
    };
  }, [toasts]);

  const showToast = useCallback((message: string, type: ToastType = 'info', action?: ToastAction) => {
    const id = Math.random().toString(36).substr(2, 9);

    setToasts(prev => {
      // Aggressive limit to prevent overflow - remove oldest first
      const newToasts = prev.length >= MAX_TOASTS
        ? prev.slice(-MAX_TOASTS + 1)
        : prev;
      return [...newToasts, { id, message, type, action }];
    });

    const timeout = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timeoutsRef.current.delete(timeout);
    }, CONSTANTS.TOAST_DURATION);

    timeoutsRef.current.add(timeout);
  }, []);

  const showPersistentToast = useCallback((message: string, type: ToastType, action?: ToastAction) => {
    const id = Math.random().toString(36).substr(2, 9);

    setToasts(prev => {
      const newToasts = prev.length >= MAX_TOASTS
        ? prev.slice(-MAX_TOASTS + 1)
        : prev;
      return [...newToasts, { id, message, type, action, persistent: true }];
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showPersistentToast }}>
      {children}
      {/*
        ARIA Live Region for Toast Notifications
        - aria-live="polite": Announces toasts without interrupting
        - aria-atomic="true": Announces entire toast content as a unit
        - role="status": Identifies as status update for screen readers
      */}
      <div
        ref={containerRef}
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-h-[300px] overflow-hidden"
        aria-live="polite"
        aria-atomic="true"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            className={`pointer-events-auto min-w-[300px] max-w-[400px] p-4 rounded-lg shadow-xl border flex flex-col gap-2 animate-fade-in ${
              toast.type === 'success' ? 'bg-white border-green-200 text-green-800' :
              toast.type === 'error' ? 'bg-white border-red-200 text-red-800' :
              toast.type === 'warning' ? 'bg-white border-amber-200 text-amber-800' :
              'bg-slate-800 border-slate-700 text-white'
            } ${index === 0 ? 'opacity-100' : 'opacity-90'}`}
            style={{
              transform: `scale(${1 - index * 0.05})`,
              marginBottom: index > 0 ? '-8px' : '0'
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Icon
                  name={toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : 'info'}
                  className={`shrink-0 ${toast.type === 'success' ? 'text-green-500' : toast.type === 'error' ? 'text-red-500' : toast.type === 'warning' ? 'text-amber-500' : 'text-blue-400'}`}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium truncate">{toast.message}</span>
              </div>
              <Button variant="ghost" size="bare"
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 p-1 hover:bg-black/10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600"
                aria-label="Dismiss notification"
                type="button"
              >
                <Icon name="close" className="text-xs opacity-50 hover:opacity-100" aria-hidden="true" />
              </Button>
            </div>
            {toast.action && (
              <div className="flex justify-end">
                <Button variant="ghost" size="bare"
                  onClick={() => {
                    toast.action?.onClick();
                    dismissToast(toast.id);
                  }}
                  className={`text-xs font-medium px-3 py-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    toast.action.variant === 'primary'
                      ? 'bg-iiif-blue text-white hover:bg-iiif-blue/90 focus:ring-blue-600'
                      : toast.type === 'success' ? 'text-green-700 hover:bg-green-50 focus:ring-green-600' :
                        toast.type === 'error' ? 'text-red-700 hover:bg-red-50 focus:ring-red-600' :
                        toast.type === 'warning' ? 'text-amber-700 hover:bg-amber-50 focus:ring-amber-600' :
                        'text-blue-300 hover:bg-white/10 focus:ring-blue-400'
                  }`}
                  type="button"
                >
                  {toast.action.label}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
