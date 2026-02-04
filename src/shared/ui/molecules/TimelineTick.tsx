/**
 * TimelineTick Molecule
 *
 * A tick marker for temporal timelines showing IIIF resources.
 * Supports single items and clustered items at the same time point.
 *
 * ATOMIC DESIGN:
 * - Composes: Icon atom, Badge atom
 * - Has local state: hover, expanded
 * - No domain logic (timeline state managed by parent)
 *
 * IDEAL OUTCOME: Clear temporal representation of resource distribution
 * FAILURE PREVENTED: Timeline overcrowding, unclear temporal relationships
 *
 * @example
 * <TimelineTick
 *   timestamp="2023-01-15"
 *   label="Jan 15"
 *   items={[{ id: '1', title: 'Photo 1', type: 'Canvas' }]}
 *   position={0.5}
 *   onSelectItem={(id) => openItem(id)}
 * />
 */

import React, { useState } from 'react';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';
import { TIMELINE_DENSITY } from '../../config/tokens';

export interface TimelineItem {
  id: string;
  title: string;
  type: string;
  thumbnail?: string;
  timestamp: string;
}

export interface TimelineTickProps {
  /** ISO timestamp for this tick */
  timestamp: string;
  /** Display label (e.g., "Jan 15" or "2023") */
  label: string;
  /** Items at this time point */
  items: TimelineItem[];
  /** Position along timeline (0-1) */
  position: number;
  /** Called when an item is selected */
  onSelectItem: (id: string) => void;
  /** Whether this tick is currently selected */
  selected?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state */
  disabled?: boolean;
  /** Contextual styles from template (required for theming) */
  cx: ContextualClassNames;
}

/**
 * TimelineTick Component
 *
 * Temporal marker with expandable item preview.
 */
export const TimelineTick: React.FC<TimelineTickProps> = ({
  timestamp,
  label,
  items,
  position,
  onSelectItem,
  selected = false,
  size = 'md',
  disabled = false,
  cx,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const count = items.length;

  // Size configurations
  const sizeConfig = {
    sm: { dot: 'w-2 h-2', label: 'text-[10px]', badge: 'text-[8px]' },
    md: { dot: 'w-3 h-3', label: 'text-xs', badge: 'text-[10px]' },
    lg: { dot: 'w-4 h-4', label: 'text-sm', badge: 'text-xs' },
  };

  const config = sizeConfig[size];

  // Determine tick intensity based on item count — from design tokens
  const getIntensity = () => {
    const match = TIMELINE_DENSITY.thresholds.find(t => count >= t.min);
    return match ? match.color : TIMELINE_DENSITY.single;
  };

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: `${position * 100}%` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Label above tick */}
      <span
        className={`
          ${config.label} ${cx.textMuted} whitespace-nowrap mb-1
          transition-opacity ${isHovered || selected ? 'opacity-100' : 'opacity-60'}
        `}
      >
        {label}
      </span>

      {/* Tick dot */}
      <button
        onClick={() => {
          if (count === 1) {
            onSelectItem(items[0].id);
          } else {
            setIsExpanded(!isExpanded);
          }
        }}
        disabled={disabled}
        className={`
          ${config.dot} rounded-full transition-all duration-200
          ${getIntensity()}
          ${selected ? 'ring-2 ring-offset-2 ring-current scale-150' : 'hover:scale-125'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isHovered ? 'shadow-lg' : ''}
        `}
        aria-label={`${label}: ${count} items`}
        aria-expanded={isExpanded}
      >
        {/* Count badge for multiple items */}
        {count > 1 && (
          <span
            className={`
              absolute -top-2 -right-2 min-w-[14px] h-3.5 px-1
              rounded-full bg-current text-white font-bold
              flex items-center justify-center ${config.badge}
            `}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Expanded item popup */}
      {isExpanded && count > 1 && (
        <div
          className={`
            absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56
            rounded-lg shadow-xl border ${cx.border} ${cx.surface}
            z-50 overflow-hidden
          `}
        >
          {/* Header */}
          <div
            className={`
              px-3 py-2 border-b ${cx.border} ${cx.headerBg}
              flex justify-between items-center
            `}
          >
            <span className={`text-sm font-medium ${cx.text}`}>
              {label} ({count} items)
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className={`${cx.textMuted} hover:${cx.text}`}
            >
              <span className="material-icons text-sm">close</span>
            </button>
          </div>

          {/* Item list */}
          <div className="p-2 space-y-1 max-h-48 overflow-auto">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelectItem(item.id);
                  setIsExpanded(false);
                }}
                className={`
                  w-full flex items-center gap-2 p-2 rounded
                  text-left transition-colors hover:${cx.headerBg}
                `}
              >
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  <div
                    className={`
                      w-8 h-8 rounded flex items-center justify-center
                      ${cx.headerBg}
                    `}
                  >
                    <span className={`material-icons text-sm ${cx.textMuted}`}>
                      image
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${cx.text}`}>{item.title}</p>
                  <p className={`text-xs ${cx.textMuted}`}>{item.type}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
