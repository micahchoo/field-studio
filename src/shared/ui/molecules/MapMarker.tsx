/**
 * MapMarker Molecule
 *
 * A map marker for displaying IIIF resources on a geographic map.
 * Composes with interactive states and cluster support.
 *
 * ATOMIC DESIGN:
 * - Composes: Icon atom, Badge atom
 * - Has local state: hover, selected
 * - No domain logic (map state managed by parent)
 *
 * IDEAL OUTCOME: Clear geographic representation of IIIF resources
 * FAILURE PREVENTED: Overlapping markers, unclear selection
 *
 * @example
 * <MapMarker
 *   id="item-123"
 *   lat={40.7128}
 *   lng={-74.0060}
 *   title="NYC Photo"
 *   type="Canvas"
 *   selected={false}
 *   onSelect={() => openItem('item-123')}
 * />
 */

import React, { useState } from 'react';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';
import { MAP_MARKER_COLORS, MAP_MARKER_DEFAULT } from '../../config/tokens';

export interface MapMarkerProps {
  /** Unique identifier */
  id: string;
  /** Latitude coordinate */
  lat: number;
  /** Longitude coordinate */
  lng: number;
  /** Resource title/label */
  title: string;
  /** IIIF resource type */
  type: string;
  /** Thumbnail URL */
  thumbnail?: string;
  /** Whether this marker is selected */
  selected?: boolean;
  /** Called when marker is clicked */
  onSelect: (id: string) => void;
  /** Number of items at this location (for clustering) */
  count?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state */
  disabled?: boolean;
  /** Contextual styles from template (required for theming) */
  cx: ContextualClassNames;
}

/**
 * MapMarker Component
 *
 * Interactive map marker with type indicator and selection state.
 */
export const MapMarker: React.FC<MapMarkerProps> = ({
  id,
  lat,
  lng,
  title,
  type,
  thumbnail,
  selected = false,
  onSelect,
  count = 1,
  size = 'md',
  disabled = false,
  cx,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: { marker: 'w-6 h-6', icon: 'text-xs', badge: 'text-[8px]' },
    md: { marker: 'w-8 h-8', icon: 'text-sm', badge: 'text-xs' },
    lg: { marker: 'w-10 h-10', icon: 'text-base', badge: 'text-xs' },
  };

  const config = sizeConfig[size];

  const markerColor = MAP_MARKER_COLORS[type] ?? MAP_MARKER_DEFAULT;

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Tooltip on hover */}
      {isHovered && (
        <div
          className={`
            absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1
            rounded shadow-lg whitespace-nowrap z-50
            ${cx.surface} ${cx.text} text-xs
          `}
        >
          {title}
          <div
            className={`
              absolute top-full left-1/2 -translate-x-1/2
              border-4 border-transparent border-t-current
            `}
          />
        </div>
      )}

      {/* Marker */}
      <button
        onClick={() => !disabled && onSelect(id)}
        disabled={disabled}
        className={`
          ${config.marker} rounded-full flex items-center justify-center
          transition-all duration-200 cursor-pointer
          ${selected ? 'ring-2 ring-offset-2 ring-current scale-110' : 'hover:scale-105'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${markerColor} text-white shadow-lg
        `}
        aria-label={`${title} (${type})`}
        aria-selected={selected}
      >
        {thumbnail && !imageError && count === 1 ? (
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full rounded-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className={`material-icons ${config.icon}`}>
            {count > 1 ? 'layers' : 'place'}
          </span>
        )}

        {/* Count badge for clusters */}
        {count > 1 && (
          <span
            className={`
              absolute -top-1 -right-1 min-w-[16px] h-4 px-1
              rounded-full bg-red-500 text-white font-bold
              flex items-center justify-center ${config.badge}
            `}
          >
            {count}
          </span>
        )}
      </button>

      {/* Selection indicator pulse */}
      {selected && (
        <span
          className={`
            absolute inset-0 rounded-full
            animate-ping opacity-75 ${markerColor}
          `}
        />
      )}
    </div>
  );
};
