/**
 * LayerToggle Atom
 *
 * Single row for toggling an annotation layer's visibility.
 * Shows checkbox, label, count, color dot, and eye icon.
 *
 * @module features/viewer/ui/atoms/LayerToggle
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { Button } from '@/ui/primitives/Button';

export interface LayerToggleProps {
  /** Layer identifier */
  id: string;
  /** Display label */
  label: string;
  /** Number of annotations in this layer */
  count: number;
  /** Assigned color */
  color: string;
  /** Whether this layer is visible */
  visible: boolean;
  /** Whether this layer has hidden behavior */
  hidden: boolean;
  /** Toggle callback */
  onToggle: (id: string) => void;
  /** Field mode styling */
  fieldMode?: boolean;
}

export const LayerToggle: React.FC<LayerToggleProps> = ({
  id,
  label,
  count,
  color,
  visible,
  hidden,
  onToggle,
  fieldMode = false,
}) => {
  return (
    <button
      onClick={() => onToggle(id)}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-nb ${
        visible
          ? fieldMode
            ? 'bg-nb-black text-white'
            : 'bg-nb-white text-nb-black/80'
          : fieldMode
            ? 'bg-transparent text-nb-black/50'
            : 'bg-transparent text-nb-black/40'
      } hover:bg-nb-cream ${fieldMode ? 'hover:bg-nb-black' : ''}`}
      role="checkbox"
      aria-checked={visible}
      aria-label={`Toggle ${label} layer`}
    >
      {/* Color dot */}
      <span
        className="w-2.5 h-2.5 shrink-0"
        style={{ backgroundColor: visible ? color : 'transparent', border: `2px solid ${color}` }}
      />

      {/* Label */}
      <span className="flex-1 text-left truncate">
        {label}
      </span>

      {/* Count */}
      <span className={`text-xs tabular-nums ${fieldMode ? 'text-nb-black/60' : 'text-nb-black/40'}`}>
        ({count})
      </span>

      {/* Hidden badge */}
      {hidden && (
        <Icon
          name="visibility_off"
          className={`text-xs ${fieldMode ? 'text-nb-black/60' : 'text-nb-black/40'}`}
          title="Hidden by default (behavior: hidden)"
        />
      )}

      {/* Visibility icon */}
      <Icon
        name={visible ? 'visibility' : 'visibility_off'}
        className={`text-sm ${
          visible
            ? fieldMode ? 'text-nb-black/30' : 'text-nb-black/50'
            : fieldMode ? 'text-nb-black/80' : 'text-nb-black/30'
        }`}
      />
    </button>
  );
};

export default LayerToggle;
