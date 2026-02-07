
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { guidance } from '@/src/shared/services/guidanceService';

// ============================================================================
// Types
// ============================================================================

export interface TooltipContent {
  /** Short title */
  title: string;
  /** Main explanation (1-2 sentences) */
  body: string;
  /** Optional: What action to take */
  action?: string;
  /** Optional: Keyboard shortcut */
  shortcut?: string;
  /** Optional: Link to learn more */
  learnMore?: string;
}

interface TooltipProps {
  /** Unique ID for tracking dismissal */
  id: string;
  /** Content to display */
  content: TooltipContent;
  /** Element to attach to */
  children: React.ReactNode;
  /** Position relative to trigger */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Show a help indicator (?) on the element */
  showIndicator?: boolean;
  /** Delay before showing (ms) */
  delay?: number;
  /** Always show regardless of dismissal state */
  persist?: boolean;
}

// ============================================================================
// Tooltip Component
// ============================================================================

export const Tooltip: React.FC<TooltipProps> = ({
  id,
  content,
  children,
  position = 'top',
  showIndicator = false,
  delay = 400,
  persist = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if already dismissed
  useEffect(() => {
    if (!persist && guidance.hasSeen(`tooltip-${id}`)) {
      setIsDismissed(true);
    }
  }, [id, persist]);

  const showTooltip = useCallback(() => {
    if (isDismissed && !persist) return;
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  }, [isDismissed, persist, delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  }, []);

  const dismiss = useCallback(() => {
    guidance.markSeen(`tooltip-${id}`);
    setIsDismissed(true);
    setIsVisible(false);
  }, [id]);

  // Position classes
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-800 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-800 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-800 border-y-transparent border-l-transparent'
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}

      {showIndicator && !isDismissed && (
        <span className="ml-1 w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-600 text-[9px] font-bold flex items-center justify-center cursor-help">
          ?
        </span>
      )}

      {isVisible && (
        <div
          className={`absolute ${positionClasses[position]} z-[300] animate-in fade-in zoom-in-95 duration-150`}
          role="tooltip"
        >
          <div className="bg-slate-800 text-white rounded-lg shadow-xl max-w-xs min-w-[200px] overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white">{content.title}</span>
              {!persist && (
                <Button variant="ghost" size="bare"
                  onClick={(e) => { e.stopPropagation(); dismiss(); }}
                  className="text-slate-400 hover:text-white text-xs"
                  title="Don't show again"
                >
                  <Icon name="close" className="text-xs" />
                </Button>
              )}
            </div>

            {/* Body */}
            <div className="px-3 py-2 space-y-2">
              <p className="text-[11px] text-slate-300 leading-relaxed">{content.body}</p>

              {content.action && (
                <p className="text-[10px] text-blue-300 flex items-center gap-1">
                  <Icon name="touch_app" className="text-[10px]" />
                  {content.action}
                </p>
              )}

              {content.shortcut && (
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[9px] font-mono text-slate-300">
                    {content.shortcut}
                  </kbd>
                </div>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Quick Reference Panel (per-view help)
// ============================================================================

interface QuickRefItem {
  icon: string;
  label: string;
  shortcut?: string;
  description?: string;
}

interface QuickRefProps {
  title: string;
  items: QuickRefItem[];
  isOpen: boolean;
  onToggle: () => void;
}

export const QuickReference: React.FC<QuickRefProps> = ({ title, items, isOpen, onToggle }) => {
  // If opened from StatusBar, we don't need the toggle button here
  // The QuickReference panel is now anchored to bottom-right, above StatusBar
  if (!isOpen) {
    return null; // Toggle is now in StatusBar
  }

  return (
    <div className="fixed bottom-10 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
      {/* Panel */}
      <div className="w-72 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">{title}</h3>
          <Button variant="ghost" size="bare"
            onClick={onToggle}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
            aria-label="Close quick help"
          >
            <Icon name="close" className="text-slate-500 text-sm" />
          </Button>
        </div>
        <div className="p-2 max-h-80 overflow-y-auto">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Icon name={item.icon} className="text-slate-400 text-sm mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-700">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] font-mono text-slate-500">
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
                {item.description && (
                  <p className="text-[10px] text-slate-400 mt-0.5">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// First-Time Hint (subtle inline prompt)
// ============================================================================

interface FirstTimeHintProps {
  id: string;
  message: string;
  icon?: string;
  className?: string;
}

export const FirstTimeHint: React.FC<FirstTimeHintProps> = ({
  id,
  message,
  icon = 'lightbulb',
  className = ''
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!guidance.hasSeen(`hint-${id}`)) {
      setVisible(true);
    }
  }, [id]);

  const dismiss = () => {
    guidance.markSeen(`hint-${id}`);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 ${className}`}>
      <Icon name={icon} className="text-blue-500 text-sm shrink-0" />
      <span className="flex-1">{message}</span>
      <Button variant="ghost" size="bare"
        onClick={dismiss}
        className="text-blue-400 hover:text-blue-600 shrink-0"
        title="Dismiss"
      >
        <Icon name="close" className="text-xs" />
      </Button>
    </div>
  );
};

// ============================================================================
// Empty State with Guidance
// ============================================================================

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  tips?: string[];
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  tips
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon name={icon} className="text-3xl text-slate-400" />
      </div>
      <h3 className="text-lg font-bold text-slate-700 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">{description}</p>

      {action && (
        <Button variant="ghost" size="bare"
          onClick={action.onClick}
          className="px-6 py-2.5 bg-iiif-blue text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          {action.label}
          <Icon name="arrow_forward" className="text-sm" />
        </Button>
      )}

      {tips && tips.length > 0 && (
        <div className="mt-8 text-left w-full max-w-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Quick tips</p>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                <Icon name="check_circle" className="text-green-500 text-xs mt-0.5 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
