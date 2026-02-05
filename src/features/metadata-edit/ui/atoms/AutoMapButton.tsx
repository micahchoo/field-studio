/**
 * AutoMapButton Atom
 *
 * Button to trigger automatic column mapping detection.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/AutoMapButton
 */

import React from 'react';
import { Icon, Button } from '@/src/shared/ui/atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface AutoMapButtonProps {
  /** Called when auto-map is triggered */
  onClick: () => void;
  /** Whether auto-mapping is in progress */
  isLoading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Button label (default: "Auto-Detect Mappings") */
  label?: string;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const AutoMapButton: React.FC<AutoMapButtonProps> = ({
  onClick,
  isLoading = false,
  disabled = false,
  label = 'Auto-Detect Mappings',
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      variant="secondary"
      size="sm"
      icon={
        isLoading ? (
          <span className="animate-spin">
            <Icon name="refresh" />
          </span>
        ) : (
          <Icon name="auto_fix_high" />
        )
      }
    >
      {isLoading ? 'Detecting...' : label}
    </Button>
  );
};

export default AutoMapButton;
