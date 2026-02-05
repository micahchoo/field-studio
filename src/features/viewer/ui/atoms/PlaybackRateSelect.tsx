/**
 * PlaybackRateSelect Atom
 *
 * Playback speed selector for media controls.
 * Allows selection of common playback rates (0.5x, 1x, 1.5x, 2x).
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Minimal local UI state (dropdown open/closed)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/PlaybackRateSelect
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/ui/primitives/Button';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface PlaybackRate {
  /** Rate value (e.g., 1.0) */
  value: number;
  /** Display label (e.g., "1x") */
  label: string;
}

const DEFAULT_RATES: PlaybackRate[] = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
];

export interface PlaybackRateSelectProps {
  /** Currently selected playback rate */
  value: number;
  /** Callback when rate changes */
  onChange: (rate: number) => void;
  /** Available playback rates (defaults to standard set) */
  rates?: PlaybackRate[];
  /** Size variant */
  size?: 'sm' | 'base';
  /** Additional CSS classes */
  className?: string;
  /** Contextual styles from parent */
  cx?: ContextualClassNames | Record<string, string>;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const PlaybackRateSelect: React.FC<PlaybackRateSelectProps> = ({
  value,
  onChange,
  rates = DEFAULT_RATES,
  size = 'sm',
  className = '',
  cx: _cx,
  fieldMode = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedRate = rates.find(r => r.value === value) || rates[2]; // Default to 1x

  const handleSelect = useCallback(
    (newValue: number) => {
      onChange(newValue);
      setIsOpen(false);
    },
    [onChange]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const dropdownBg = fieldMode ? '#0f172a' : '#1e293b';
  const dropdownBorder = fieldMode ? '#334155' : '#475569';
  const hoverBg = fieldMode ? '#334155' : '#334155';
  const selectedBg = fieldMode ? 'rgba(250, 204, 21, 0.2)' : '#3b82f6';
  const selectedColor = fieldMode ? '#facc15' : '#ffffff';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size={size}
        style={{
          fontSize: '0.75rem',
          minWidth: '3.5rem',
          color: fieldMode ? '#facc15' : '#ffffff',
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedRate.label}
      </Button>

      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-1 rounded-md shadow-lg z-50 py-1 min-w-[5rem]"
          style={{
            backgroundColor: dropdownBg,
            border: `1px solid ${dropdownBorder}`,
          }}
          role="listbox"
        >
          {rates.map(rate => (
            <Button
              key={rate.value}
              onClick={() => handleSelect(rate.value)}
              variant="ghost"
              size="sm"
              fullWidth
              style={{
                fontSize: '0.875rem',
                justifyContent: 'flex-start',
                backgroundColor: rate.value === value ? selectedBg : 'transparent',
                color: rate.value === value ? selectedColor : fieldMode ? '#e2e8f0' : '#ffffff',
                borderRadius: 0,
              }}
              onMouseEnter={e => {
                if (rate.value !== value) {
                  e.currentTarget.style.backgroundColor = hoverBg;
                }
              }}
              onMouseLeave={e => {
                if (rate.value !== value) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              role="option"
              aria-selected={rate.value === value}
            >
              {rate.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaybackRateSelect;
