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
  /** Layer opacity 0-1 */
  opacity?: number;
  /** Toggle callback */
  onToggle: (id: string) => void;
  /** Opacity change callback */
  onOpacityChange?: (id: string, opacity: number) => void;
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
  opacity = 1,
  onToggle,
  onOpacityChange,
  fieldMode = false,
}) => {
  return (
    <div className="w-full">
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
          style={{ backgroundColor: visible ? color : 'transparent', border: `2px solid ${color}`, opacity }}
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

      {/* Opacity slider - only when visible and callback provided */}
      {visible && onOpacityChange && (
        <div className="flex items-center gap-2 px-3 pb-1">
          <span className={`text-[9px] ${fieldMode ? 'text-nb-yellow/50' : 'text-nb-black/30'}`}>
            Opacity
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => onOpacityChange(id, parseFloat(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 h-1 accent-current"
            style={{ color }}
            aria-label={`${label} opacity`}
          />
          <span className={`text-[9px] tabular-nums w-6 text-right ${fieldMode ? 'text-nb-yellow/50' : 'text-nb-black/30'}`}>
            {Math.round(opacity * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default LayerToggle;
