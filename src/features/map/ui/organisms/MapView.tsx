/**
 * MapView Organism
 *
 * Main organism for the map feature. Displays IIIF items with GPS coordinates
 * on an interactive map with clustering and item selection.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props from FieldModeTemplate (no hook calls)
 * - Composes molecules: MapMarker, ClusterBadge, EmptyState, ZoomControl
 * - Domain logic delegated to useMap hook
 * - No prop-drilling of fieldMode
 *
 * IDEAL OUTCOME: Users can visualize and navigate geotagged IIIF items
 * FAILURE PREVENTED: Invalid coordinates, clustering errors, viewport drift
 *
 * LEGACY NOTE: This is the refactored version of components/views/MapView.tsx
 * The original component (379 lines) mixed geographic calculations with UI.
 * This organism delegates to useMap hook and molecules.
 *
 * DECOMPOSITION NOTE: Future molecules to extract:
 * - MapToolbar: Zoom/pan controls
 * - ClusterPopup: Cluster item selector
 * - MapTooltip: Hover info card
 */

import React from 'react';
import { getIIIFValue, type IIIFItem } from '@/src/shared/types';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import { Icon, ZoomControl } from '@/src/shared/ui/atoms';
import { EmptyState } from '@/src/shared/ui/molecules/EmptyState';
import { MapMarker } from '@/src/shared/ui/molecules/MapMarker';
import { ClusterBadge } from '@/src/shared/ui/molecules/ClusterBadge';
import {
  formatBounds,
  formatCoordinates,
  useMap,
} from '../../model';

export interface MapViewProps {
  /** Root IIIF item containing geotagged canvases */
  root: IIIFItem | null;
  /** Called when a canvas is selected */
  onSelect: (item: IIIFItem) => void;
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Current field mode */
  fieldMode: boolean;
  /** Terminology function from template */
  t: (key: string) => string;
  /** Whether user is in advanced mode */
  isAdvanced: boolean;
}

/**
 * MapView Organism
 *
 * @example
 * <FieldModeTemplate>
 *   {({ cx, fieldMode, t, isAdvanced }) => (
 *     <MapView
 *       root={root}
 *       onSelect={handleSelect}
 *       cx={cx}
 *       fieldMode={fieldMode}
 *       t={t}
 *       isAdvanced={isAdvanced}
 *     />
 *   )}
 * </FieldModeTemplate>
 */
export const MapView: React.FC<MapViewProps> = ({
  root,
  onSelect,
  cx,
  fieldMode,
  t,
  isAdvanced,
}) => {
  const {
    geoItems,
    bounds,
    clusters,
    zoom,
    hoveredItem,
    selectedCluster,
    containerRef,
    geoToPixel,
    zoomIn,
    zoomOut,
    resetView,
    setHoveredItem,
    selectCluster,
    hasGeotaggedItems,
  } = useMap(root);

  // Empty state
  if (!hasGeotaggedItems) {
    return (
      <EmptyState
        icon="map"
        title="No Geotagged Items"
        message={isAdvanced
          ? 'Items need GPS coordinates in their metadata to appear on the map. Add a "Location" metadata field with coordinates like "40.7128, -74.0060".'
          : 'Items need GPS coordinates in their metadata to appear on the map.'}
        cx={cx}
        fieldMode={fieldMode}
      />
    );
  }

  return (
    <div className={`flex flex-col h-full ${fieldMode ? 'bg-nb-black' : 'bg-nb-cream'}`}>
      {/* Header */}
      <div className={`h-header border-l-4 border-l-mode-accent-border bg-mode-accent-bg-subtle transition-mode border-b ${cx.border} flex items-center justify-between px-6 shadow-brutal-sm z-10 shrink-0`}>
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-lg text-mode-accent">Map</h2>
          <div className={`h-4 w-px ${fieldMode ? 'bg-nb-yellow' : 'bg-nb-black/40'}`} />
          <span className={`text-[10px] font-black uppercase ${cx.textMuted}`}>
            {geoItems.length} geotagged {t('Canvas').toLowerCase()}{geoItems.length !== 1 ? 'es' : ''}
          </span>
        </div>

        <ZoomControl
          zoom={zoom}
          onZoomChange={(z) => {
            if (z > zoom) zoomIn();
            else if (z < zoom) zoomOut();
          }}
          onReset={resetView}
          cx={cx}
        />
      </div>

      {/* Map Container */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-gradient-to-b from-blue-100 to-green-100"
        style={{
          backgroundImage: `
            linear-gradient(rgba(100,150,200,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100,150,200,0.1) 1px, transparent 1px)
          `,
          backgroundSize: `${50 * zoom}px ${50 * zoom}px`
        }}
      >
        {/* Map Markers & Clusters */}
        {clusters.map((cluster, idx) => {
          const pos = geoToPixel(cluster.lat, cluster.lng);
          const isCluster = cluster.items.length > 1;
          const firstItem = cluster.items[0];

          return (
            <div
              key={idx}
              className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer transition-transform hover:scale-110 z-10"
              style={{ left: pos.x, top: pos.y }}
              onMouseEnter={() => setHoveredItem(firstItem)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => {
                if (isCluster) {
                  selectCluster(cluster.items);
                } else {
                  onSelect(firstItem.canvas);
                }
              }}
            >
              {isCluster ? (
                <ClusterBadge
                  count={cluster.items.length}
                  onExpand={() => {}}
                  cx={cx}
                />
              ) : (
                <MapMarker
                  id={firstItem.canvas.id}
                  lat={cluster.lat}
                  lng={cluster.lng}
                  title={firstItem.canvas.label ? String(firstItem.canvas.label) : 'Untitled'}
                  type="Canvas"
                  thumbnail={firstItem.canvas._blobUrl || undefined}
                  onSelect={() => onSelect(firstItem.canvas)}
                  cx={cx}
                />
              )}
            </div>
          );
        })}

        {/* Hover Tooltip */}
        {hoveredItem && !selectedCluster && (
          <div
            className={`absolute ${fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-white border-nb-black/20'}  shadow-brutal border p-2 z-30 pointer-events-none`}
            style={{
              left: geoToPixel(hoveredItem.lat, hoveredItem.lng).x + 20,
              top: geoToPixel(hoveredItem.lat, hoveredItem.lng).y - 20
            }}
          >
            <div className="flex gap-2 items-center">
              {hoveredItem.canvas._blobUrl && (
                <img src={hoveredItem.canvas._blobUrl} className="w-12 h-12 object-cover" />
              )}
              <div>
                <div className={`font-bold text-sm ${fieldMode ? 'text-nb-black/20' : 'text-nb-black'}`}>
                  {getIIIFValue(hoveredItem.canvas.label, 'none') || 'Untitled'}
                </div>
                {isAdvanced && (
                  <div className="text-xs text-nb-black/50">
                    {formatCoordinates(hoveredItem.lat, hoveredItem.lng)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cluster Popup */}
        {selectedCluster && (
          <div className="absolute inset-0 bg-nb-black/30 z-40 flex items-center justify-center p-8">
            <div className={`${fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-white'}  shadow-brutal-lg max-w-2xl w-full max-h-[80vh] overflow-hidden`}>
              <div className={`p-4 border-b flex justify-between items-center ${fieldMode ? 'border-nb-black' : 'border-nb-black/20'}`}>
                <h3 className={`font-bold ${cx.text}`}>
                  {selectedCluster.length} items at this location
                </h3>
                <div
                  onClick={() => selectCluster(null)}
                  className={`cursor-pointer ${fieldMode ? 'text-nb-black/40 hover:text-nb-black/20' : 'text-nb-black/40 hover:text-nb-black/60'}`}
                >
                  <Icon name="close" />
                </div>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] grid grid-cols-3 gap-3">
                {selectedCluster.map(item => (
                  <div
                    key={item.canvas.id}
                    className={` overflow-hidden cursor-pointer transition-nb ${
                      fieldMode ? 'bg-nb-black hover:ring-2 ring-nb-blue' : 'bg-nb-white hover:ring-2 ring-nb-blue'
                    }`}
                    onClick={() => { selectCluster(null); onSelect(item.canvas); }}
                  >
                    <div className={`aspect-square ${fieldMode ? 'bg-nb-black/80' : 'bg-nb-cream'}`}>
                      {item.canvas._blobUrl ? (
                        <img src={item.canvas._blobUrl} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon name="image" className={`text-3xl ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`} />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className={`text-xs font-medium truncate ${fieldMode ? 'text-nb-black/30' : 'text-nb-black/80'}`}>
                        {getIIIFValue(item.canvas.label, 'none') || 'Untitled'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Coordinates Display (Advanced Users Only) */}
        {bounds && isAdvanced && (
          <div className={`absolute bottom-4 left-4 px-3 py-1 text-xs ${
            fieldMode ? 'bg-nb-black/90 text-nb-black/40' : 'bg-nb-white/90 text-nb-black/60'
          }`}>
            Bounds: {formatBounds(bounds)}
          </div>
        )}
      </div>
    </div>
  );
};
