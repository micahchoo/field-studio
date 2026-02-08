/**
 * AutoAdvanceToast Atom
 *
 * Countdown toast shown when auto-advance is about to move to next canvas.
 * Shows canvas label, countdown, and cancel button.
 *
 * @module features/viewer/ui/atoms/AutoAdvanceToast
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';

export interface AutoAdvanceToastProps {
  /** Label of the next canvas */
  nextLabel: string;
  /** Duration of countdown in seconds */
  duration?: number;
  /** Called when countdown completes */
  onAdvance: () => void;
  /** Called when user cancels auto-advance */
  onCancel: () => void;
  /** Field mode styling */
  fieldMode?: boolean;
}

export const AutoAdvanceToast: React.FC<AutoAdvanceToastProps> = ({
  nextLabel,
  duration = 3,
  onAdvance,
  onCancel,
  fieldMode = false,
}) => {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    if (remaining <= 0) {
      onAdvance();
      return;
    }

    const timer = setTimeout(() => {
      setRemaining(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [remaining, onAdvance]);

  return (
    <div className={`absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 shadow-brutal backdrop-blur-sm border animate-in slide-in-from-bottom-4 ${
      fieldMode
        ? 'bg-nb-black/95 border-nb-black/80'
        : 'bg-nb-white border-nb-black/20'
    }`}>
      <Icon
        name="skip_next"
        className={`text-lg ${fieldMode ? 'text-nb-yellow' : 'text-nb-blue'}`}
      />
      <div>
        <div className={`text-sm font-medium ${fieldMode ? 'text-white' : 'text-nb-black/80'}`}>
          Next: {nextLabel}
        </div>
        <div className={`text-xs ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}>
          in {remaining}s
        </div>
      </div>

      {/* Progress bar */}
      <div className={`w-16 h-1 overflow-hidden ${
        fieldMode ? 'bg-nb-black/80' : 'bg-nb-cream'
      }`}>
        <div
          className={`h-full transition-nb duration-1000 ease-linear ${
            fieldMode ? 'bg-nb-yellow' : 'bg-nb-blue'
          }`}
          style={{ width: `${((duration - remaining) / duration) * 100}%` }}
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
      >
        Cancel
      </Button>
    </div>
  );
};

export default AutoAdvanceToast;
