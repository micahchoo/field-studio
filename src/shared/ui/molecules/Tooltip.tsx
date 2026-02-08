/**
 * Tooltip Molecule
 *
 * Dismissible hover tooltip with content card.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Local UI state (visibility, dismissed)
 * - No domain logic / no service calls
 * - Props-only API
 * - Uses design tokens
 *
 * @module shared/ui/molecules/Tooltip
 */

import React, { useCallback, useRef, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';

// Re-export extracted components for backwards compatibility
export { FirstTimeHint } from './FirstTimeHint';
export type { FirstTimeHintProps } from './FirstTimeHint';
export { QuickReference } from './QuickReference';
export type { QuickReferenceProps } from './QuickReference';
export { GuidanceEmptyState as EmptyState } from './GuidanceEmptyState';
export type { GuidanceEmptyStateProps as EmptyStateProps } from './GuidanceEmptyState';

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
  position?:'top' |'bottom' |'left' |'right';
  /** Show a help indicator (?) on the element */
  showIndicator?: boolean;
  /** Delay before showing (ms) */
  delay?: number;
  /** Always show regardless of dismissal state */
  persist?: boolean;
  /** Whether already dismissed (from parent/service) */
  initialDismissed?: boolean;
  /** Called when user dismisses (parent persists) */
  onDismiss?: () => void;
}

// ============================================================================
// Tooltip Component
// ============================================================================

export const Tooltip: React.FC<TooltipProps> = ({
  id,
  content,
  children,
  position ='top',
  showIndicator = false,
  delay = 400,
  persist = false,
  initialDismissed = false,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(initialDismissed);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = useCallback(() => {
    if (isDismissed && !persist) return;
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  }, [isDismissed, persist, delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  }, []);

  const dismiss = useCallback(() => {
    onDismiss?.();
    setIsDismissed(true);
    setIsVisible(false);
  }, [onDismiss]);

  // Position classes
  const positionClasses = {
    top:'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom:'top-full left-1/2 -translate-x-1/2 mt-2',
    left:'right-full top-1/2 -translate-y-1/2 mr-2',
    right:'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top:'top-full left-1/2 -translate-x-1/2 border-t-nb-black border-x-transparent border-b-transparent',
    bottom:'bottom-full left-1/2 -translate-x-1/2 border-b-nb-black border-x-transparent border-t-transparent',
    left:'left-full top-1/2 -translate-y-1/2 border-l-nb-black border-y-transparent border-r-transparent',
    right:'right-full top-1/2 -translate-y-1/2 border-r-nb-black border-y-transparent border-l-transparent'
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
        <span className="ml-1 w-3.5 h-3.5 bg-nb-blue/20 text-nb-blue text-[9px] font-bold flex items-center justify-center cursor-help">
          ?
        </span>
      )}

      {isVisible && (
        <div
          className={`absolute ${positionClasses[position]} z-[300] animate-in fade-in zoom-in-95`}
          role="tooltip"
        >
          <div className="bg-nb-black text-white shadow-brutal max-w-xs min-w-[200px] overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 border-b border-nb-black/80 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white">{content.title}</span>
              {!persist && (
                <Button variant="ghost" size="bare"
                  onClick={(e) => { e.stopPropagation(); dismiss(); }}
                  className="text-nb-black/40 hover:text-white text-xs"
                  title="Don't show again"
                >
                  <Icon name="close" className="text-xs" />
                </Button>
              )}
            </div>

            {/* Body */}
            <div className="px-3 py-2 space-y-2">
              <p className="text-[11px] text-nb-black/30 leading-relaxed">{content.body}</p>

              {content.action && (
                <p className="text-[10px] text-nb-blue/60 flex items-center gap-1">
                  <Icon name="touch_app" className="text-[10px]" />
                  {content.action}
                </p>
              )}

              {content.shortcut && (
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-nb-black/80 text-[9px] font-mono text-nb-black/30">
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
