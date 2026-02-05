/**
 * FullscreenButton Atom
 *
 * Fullscreen toggle button for media player.
 * Handles fullscreen state and browser API differences.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Minimal local UI state (fullscreen detection)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/FullscreenButton
 */

import React, { useCallback, useEffect, useState } from 'react';
import { IconButton } from '@/src/shared/ui/molecules';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface FullscreenButtonProps {
  /** Reference to the container element to make fullscreen */
  containerRef: React.RefObject<HTMLElement>;
  /** Callback when fullscreen state changes */
  onFullscreenChange?: (isFullscreen: boolean) => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const FullscreenButton: React.FC<FullscreenButtonProps> = ({
  containerRef,
  onFullscreenChange,
  size = 'md',
  className = '',
  cx: _cx,
  fieldMode = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Update fullscreen state when it changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement =
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement;
      const newState = !!fullscreenElement;
      setIsFullscreen(newState);
      onFullscreenChange?.(newState);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [onFullscreenChange]);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (isFullscreen) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          await (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
        }
      } else {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (container as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        }
      }
    } catch (error) {
      // Silently fail if fullscreen is not supported or blocked
      console.warn('Fullscreen toggle failed:', error);
    }
  }, [isFullscreen, containerRef]);

  const icon = isFullscreen ? 'fullscreen_exit' : 'fullscreen';
  const label = isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen';

  return (
    <IconButton
      icon={icon}
      ariaLabel={label}
      onClick={toggleFullscreen}
      variant="ghost"
      size={size}
      className={className}
      fieldMode={fieldMode}
    />
  );
};

export default FullscreenButton;
