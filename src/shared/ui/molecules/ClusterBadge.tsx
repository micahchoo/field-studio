/**
 * ClusterBadge Molecule
 *
 * A badge indicating a cluster of grouped items on a map or timeline.
 * Shows count and expands on interaction.
 *
 * ATOMIC DESIGN:
 * - Composes: Button atom, Badge atom
 * - Has local state: expanded, hover
 * - No domain logic (clustering managed by parent)
 *
 * IDEAL OUTCOME: Clear indication of item density without overcrowding
 * FAILURE PREVENTED: Map overcrowding, unclear item counts
 *
 * @example
 * <ClusterBadge
 *   count={15}
 *   items={clusteredItems}
 *   onExpand={() => zoomToCluster(bounds)}
 *   onSelectItem={(id) => openItem(id)}
 * />
 */

import React, { useState } from 'react';
import { Button } from '../atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';
import { CLUSTER_INTENSITY } from '../../config/tokens';

export interface ClusterItem {
  id: string;
  title: string;
  type: string;
  thumbnail?: string;
}

export interface ClusterBadgeProps {
  /** Number of items in cluster */
  count: number;
  /** Preview of items in cluster (max 3-5) */
  items?: ClusterItem[];
  /** Called when cluster is clicked to expand */
  onExpand?: () => void;
  /** Called when specific item is selected */
  onSelectItem?: (id: string) => void;
  /** Size based on cluster magnitude */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Disabled state */
  disabled?: boolean;
  /** Contextual styles from template (required for theming) */
  cx: ContextualClassNames;
}

/**
 * ClusterBadge Component
 *
 * Expandable cluster indicator with item preview.
 */
export const ClusterBadge: React.FC<ClusterBadgeProps> = ({
  count,
  items = [],
  onExpand,
  onSelectItem,
  size = 'md',
  disabled = false,
  cx,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Size configurations based on count magnitude
  const sizeConfig = {
    sm: { badge: 'w-8 h-8 text-xs', expanded: 'w-48' },    // 2-5 items
    md: { badge: 'w-10 h-10 text-sm', expanded: 'w-56' },  // 6-15 items
    lg: { badge: 'w-12 h-12 text-base', expanded: 'w-64' }, // 16-50 items
    xl: { badge: 'w-14 h-14 text-lg', expanded: 'w-72' },  // 50+ items
  };

  const config = sizeConfig[size];

  // Color intensity based on cluster size — from design tokens
  const getIntensity = () => CLUSTER_INTENSITY[size] ?? CLUSTER_INTENSITY.default;

  const handleClick = () => {
    if (items.length > 0 && onSelectItem) {
      setIsExpanded(!isExpanded);
    } else if (onExpand) {
      onExpand();
    }
  };

  return (
    <div className="relative">
      {/* Cluster badge button */}
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          ${config.badge} rounded-full flex items-center justify-center
          font-bold text-white shadow-lg transition-all duration-200
          ${getIntensity()}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
          ${isExpanded ? 'ring-4 ring-offset-2 ring-current' : ''}
        `}
        aria-label={`${count} items in cluster`}
      >
        {count > 99 ? '99+' : count}
      </button>

      {/* Expanded item preview */}
      {isExpanded && items.length > 0 && (
        <div
          className={`
            absolute top-full left-1/2 -translate-x-1/2 mt-2
            ${config.expanded} max-h-64 overflow-auto
            rounded-lg shadow-xl border ${cx.border} ${cx.surface}
            z-50
          `}
        >
          {/* Header */}
          <div
            className={`
              sticky top-0 px-3 py-2 border-b ${cx.border} ${cx.headerBg}
              flex justify-between items-center
            `}
          >
            <span className={`text-sm font-medium ${cx.text}`}>
              {count} items
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className={`${cx.textMuted} hover:${cx.text}`}
              aria-label="Close"
            >
              <span className="material-icons text-sm">close</span>
            </button>
          </div>

          {/* Item list */}
          <div className="p-2 space-y-1">
            {items.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelectItem?.(item.id);
                  setIsExpanded(false);
                }}
                className={`
                  w-full flex items-center gap-2 p-2 rounded
                  text-left transition-colors
                  hover:${cx.headerBg}
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

            {/* Show more indicator */}
            {count > 5 && (
              <p className={`text-center text-xs ${cx.textMuted} py-2`}>
                and {count - 5} more...
              </p>
            )}
          </div>

          {/* Expand button */}
          {onExpand && (
            <div className={`p-2 border-t ${cx.border}`}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onExpand();
                  setIsExpanded(false);
                }}
                className="w-full"
              >
                Zoom to cluster
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
