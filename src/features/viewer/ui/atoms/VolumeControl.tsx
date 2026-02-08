/**
 * VolumeControl Atom
 *
 * Volume slider with mute toggle button.
 * Replaces inline volume controls in MediaPlayer.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (controlled by parent)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/VolumeControl
 */

import React, { useCallback } from 'react';
import { IconButton } from '@/src/shared/ui/molecules/IconButton';
export interface VolumeControlProps {
  /** Current volume level (0-1) */
  volume: number;
  /** Whether audio is muted */
  isMuted: boolean;
  /** Callback when volume changes */
  onVolumeChange: (volume: number) => void;
  /** Callback when mute is toggled */
  onMuteToggle: () => void;
  /** Width of the volume slider */
  sliderWidth?: string;
  /** Additional CSS classes for container */
  className?: string;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onMuteToggle,
  sliderWidth = '5rem',
  className = '',
  fieldMode = false,
}) => {
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      onVolumeChange(newVolume);
    },
    [onVolumeChange]
  );

  // Determine which volume icon to show
  const getVolumeIcon = (): string => {
    if (isMuted || volume === 0) return 'volume_off';
    if (volume > 0.5) return 'volume_up';
    return 'volume_down';
  };

  const displayVolume = isMuted ? 0 : volume;
  const accentColor = fieldMode ? '#facc15' : '#3b82f6';
  const trackBg = fieldMode ? '#475569' : '#cbd5e1';
  const percentage = displayVolume * 100;

  const sliderBg = `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${percentage}%, ${trackBg} ${percentage}%, ${trackBg} 100%)`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconButton
        icon={getVolumeIcon()}
        ariaLabel={isMuted ? 'Unmute' : 'Mute'}
        onClick={onMuteToggle}
        variant="ghost"
        size="md"
        className="!text-white hover:!text-nb-blue"
        fieldMode={fieldMode}
      />
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={displayVolume}
        onChange={handleSliderChange}
        className="h-1"
        style={{
          width: sliderWidth,
          appearance: 'none',
          borderRadius: '3px',
          background: sliderBg,
          outline: 'none',
          cursor: 'pointer',
        }}
        aria-label="Volume"
      />
    </div>
  );
};

export default VolumeControl;
