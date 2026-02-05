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
import { getIIIFValue, type IIIFItem } from '@/types';
import { Icon } from '@/src/shared/ui/atoms';
import { EmptyState } from '@/src/shared/ui/molecules/EmptyState';
import { MapMarker } from '@/src/shared/ui/molecules/MapMarker';
import { ClusterBadge } from '@/src/shared/ui/molecules/ClusterBadge';
import { ZoomControl } from '@/src/features/viewer/ui/atoms';
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
  cx: {
    surface: string;
    text: string;
    accent: string;
    border: string;
    divider: string;
    headerBg: string;
    textMuted: string;
    input: string;
    label: string;
    active: string;
  };
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
    <div className={`flex flex-col h-full ${fieldMode ? 'bg-black' : 'bg-slate-200'}`}>
      {/* Header */}
      <div className={`h-14 ${cx.headerBg} ${cx.border} flex items-center justify-between px-6 shadow-sm`}>
        <div className="flex items-center gap-4">
          <h2 className={`font-bold ${cx.text} flex items-center gap-2`}>
            <Icon name="map" className="text-green-500" />
            Map View
          </h2>
          <span className={`text-sm ${cx.textMuted}`}>
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
            className={`absolute ${fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-lg shadow-xl border p-2 z-30 pointer-events-none`}
            style={{
              left: geoToPixel(hoveredItem.lat, hoveredItem.lng).x + 20,
              top: geoToPixel(hoveredItem.lat, hoveredItem.lng).y - 20
            }}
          >
            <div className="flex gap-2 items-center">
              {hoveredItem.canvas._blobUrl && (
                <img src={hoveredItem.canvas._blobUrl} className="w-12 h-12 rounded object-cover" />
              )}
              <div>
                <div className={`font-bold text-sm ${fieldMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {getIIIFValue(hoveredItem.canvas.label, 'none') || 'Untitled'}
                </div>
                {isAdvanced && (
                  <div className="text-xs text-slate-500">
                    {formatCoordinates(hoveredItem.lat, hoveredItem.lng)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cluster Popup */}
        {selectedCluster && (
          <div className="absolute inset-0 bg-black/30 z-40 flex items-center justify-center p-8">
            <div className={`${fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-white'} rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden`}>
              <div className={`p-4 border-b flex justify-between items-center ${fieldMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <h3 className={`font-bold ${cx.text}`}>
                  {selectedCluster.length} items at this location
                </h3>
                <div
                  onClick={() => selectCluster(null)}
                  className={`cursor-pointer ${fieldMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Icon name="close" />
                </div>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] grid grid-cols-3 gap-3">
                {selectedCluster.map(item => (
                  <div
                    key={item.canvas.id}
                    className={`rounded-lg overflow-hidden cursor-pointer transition-all ${
                      fieldMode ? 'bg-slate-800 hover:ring-2 ring-blue-500' : 'bg-slate-50 hover:ring-2 ring-blue-500'
                    }`}
                    onClick={() => { selectCluster(null); onSelect(item.canvas); }}
                  >
                    <div className={`aspect-square ${fieldMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      {item.canvas._blobUrl ? (
                        <img src={item.canvas._blobUrl} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon name="image" className={`text-3xl ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`} />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className={`text-xs font-medium truncate ${fieldMode ? 'text-slate-300' : 'text-slate-700'}`}>
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
          <div className={`absolute bottom-4 left-4 rounded px-3 py-1 text-xs ${
            fieldMode ? 'bg-slate-900/90 text-slate-400' : 'bg-white/90 text-slate-600'
          }`}>
            Bounds: {formatBounds(bounds)}
          </div>
        )}
      </div>
    </div>
  );
};
