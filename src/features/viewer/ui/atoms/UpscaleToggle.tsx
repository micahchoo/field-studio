/**
 * UpscaleToggle Atom
 *
 * Toggle button for allowing upscaling beyond original image size.
 * Displays "^" prefix when active.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (controlled by parent)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/UpscaleToggle
 */

import React from 'react';
import { Button } from '@/ui/primitives/Button';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface UpscaleToggleProps {
  /** Whether upscale is enabled */
  enabled: boolean;
  /** Callback when toggle is clicked */
  onChange: (enabled: boolean) => void;
  /** Tooltip text */
  title?: string;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const UpscaleToggle: React.FC<UpscaleToggleProps> = ({
  enabled,
  onChange,
  title = 'Allow upscaling beyond original size',
  cx: _cx,
  fieldMode = false,
}) => {
  const handleClick = () => {
    onChange(!enabled);
  };

  const activeStyles = {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
    color: '#ffffff',
  };

  const inactiveStyles = fieldMode
    ? { backgroundColor: 'transparent', borderColor: '#475569', color: '#94a3b8' }
    : { backgroundColor: 'transparent', borderColor: '#cbd5e1', color: '#94a3b8' };

  return (
    <Button
      onClick={handleClick}
      variant={enabled ? 'primary' : 'ghost'}
      size="sm"
      title={title}
      style={{
        ...(enabled ? activeStyles : inactiveStyles),
        fontSize: '9px',
        fontWeight: 700,
        textTransform: 'uppercase',
        padding: '4px 8px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: '4px',
        transition: 'all 150ms ease',
      }}
    >
      Upscale ^
    </Button>
  );
};

export default UpscaleToggle;
