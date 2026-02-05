/**
 * PlayPauseButton Atom
 *
 * Play/pause toggle button with icon transition.
 * Replaces inline play/pause controls in MediaPlayer.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (controlled by parent)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/PlayPauseButton
 */

import React from 'react';
import { IconButton } from '@/src/shared/ui/molecules';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface PlayPauseButtonProps {
  /** Whether media is currently playing */
  isPlaying: boolean;
  /** Callback when play/pause is toggled */
  onToggle: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Visual variant */
  variant?: 'default' | 'primary' | 'ghost';
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const PlayPauseButton: React.FC<PlayPauseButtonProps> = ({
  isPlaying,
  onToggle,
  size = 'lg',
  variant = 'ghost',
  disabled = false,
  className = '',
  cx: _cx,
  fieldMode = false,
}) => {
  const icon = isPlaying ? 'pause' : 'play_arrow';
  const label = isPlaying ? 'Pause' : 'Play';

  return (
    <IconButton
      icon={icon}
      ariaLabel={label}
      onClick={onToggle}
      variant={variant}
      size={size}
      disabled={disabled}
      className={className}
      fieldMode={fieldMode}
    />
  );
};

export default PlayPauseButton;
