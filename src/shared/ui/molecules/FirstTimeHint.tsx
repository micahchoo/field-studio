/**
 * FirstTimeHint Molecule
 *
 * Subtle inline prompt for first-time guidance.
 * Shows a dismissible hint with icon and message.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Local UI state (visibility)
 * - No domain logic / no service calls
 * - Props-only API
 * - Uses design tokens
 *
 * @module shared/ui/molecules/FirstTimeHint
 */

import React, { useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';

export interface FirstTimeHintProps {
  id: string;
  message: string;
  icon?: string;
  className?: string;
  /** Whether already dismissed (from parent/service) */
  initialDismissed?: boolean;
  /** Called when user dismisses (parent persists) */
  onDismiss?: () => void;
}

export const FirstTimeHint: React.FC<FirstTimeHintProps> = ({
  id,
  message,
  icon ='lightbulb',
  className ='',
  initialDismissed = false,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(!initialDismissed);

  const dismiss = () => {
    onDismiss?.();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 bg-nb-blue/10 border border-nb-blue/20 text-xs text-nb-blue ${className}`}>
      <Icon name={icon} className="text-nb-blue text-sm shrink-0" />
      <span className="flex-1">{message}</span>
      <Button variant="ghost" size="bare"
        onClick={dismiss}
        className="text-nb-blue hover:text-nb-blue shrink-0"
        title="Dismiss"
      >
        <Icon name="close" className="text-xs" />
      </Button>
    </div>
  );
};

export default FirstTimeHint;
