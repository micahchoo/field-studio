/**
 * GeoEditor - Geospatial Editor Component
 *
 * Provides map-based editing for IIIF navPlace properties.
 * Uses Leaflet for map rendering and drawing.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GeocodedLocation,
  GeoFeature,
  LatLng,
  LatLngBounds,
  NavPlace,
  navPlaceService
} from '../services/navPlaceService';
import { getIIIFValue, IIIFItem } from '../types';
import { Icon } from './Icon';

// Leaflet type declaration for dynamic import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletModule = any;

interface GeoEditorProps {
  /** The IIIF item to edit navPlace for */
  item: IIIFItem;
  /** Callback when navPlace changes */
  onChange: (navPlace: NavPlace | null) => void;
  /** Height of the map */
  height?: number;
  /** Whether editing is enabled */
  editable?: boolean;
}

export const GeoEditor: React.FC<GeoEditorProps> = ({
  item,
  onChange,
  height = 400,
  editable = true
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodedLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [currentCenter, setCurrentCenter] = useState<LatLng | null>(null);
  const [drawMode, setDrawMode] = useState<'marker' | 'polygon' | 'rectangle' | null>(null);

  const navPlace = navPlaceService.getNavPlace(item);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    // Check if map is already initialized on this container (React Strict Mode double-mount)
    if (leafletMapRef.current) {
      return;
    }

    // Also check if container already has Leaflet initialized (DOM check)
    if ((mapRef.current as any)._leaflet_id) {
      return;
    }

    // Dynamic import of Leaflet
    const initMap = async () => {
      // Double-check refs are still valid after async
      if (!mapRef.current || leafletMapRef.current) return;

      // @ts-ignore - Leaflet loaded via CDN
      const L = (await import('leaflet' as any)).default as LeafletModule;

      // Fix default marker icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
      });

      // Final check before creating map
      if ((mapRef.current as any)._leaflet_id) {
        return;
      }

      // Create map
      const map = L.map(mapRef.current!, {
        center: [0, 0],
        zoom: 2
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      // Create feature group for drawn items
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;

      leafletMapRef.current = map;

      // Load existing navPlace
      if (navPlace) {
        loadNavPlaceToMap(navPlace, map, drawnItems, L);
      }

      // Handle map clicks for adding markers
      map.on('click', (e: any) => {
        if (drawMode === 'marker' && editable) {
          const feature = navPlaceService.createPointFeature(e.latlng.lat, e.latlng.lng);
          addFeatureToNavPlace(feature);
          setDrawMode(null);
        }
      });

      // Track center
      map.on('moveend', () => {
        const center = map.getCenter();
        setCurrentCenter({ lat: center.lat, lng: center.lng });
      });
    };

    initMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update map when navPlace changes externally
  useEffect(() => {
    if (!leafletMapRef.current || !drawnItemsRef.current) return;

    const loadLeaflet = async () => {
      // @ts-ignore - Leaflet loaded via CDN
      const L = (await import('leaflet' as any)).default as LeafletModule;
      drawnItemsRef.current.clearLayers();
      if (navPlace) {
        loadNavPlaceToMap(navPlace, leafletMapRef.current, drawnItemsRef.current, L);
      }
    };

    loadLeaflet();
  }, [navPlace]);

  const loadNavPlaceToMap = async (
    np: NavPlace,
    map: any,
    drawnItems: any,
    L: any
  ) => {
    const geoJSON = navPlaceService.toGeoJSON(np);

    const geoJSONLayer = L.geoJSON(geoJSON, {
      pointToLayer: (feature: any, latlng: any) => {
        return L.marker(latlng);
      },
      onEachFeature: (feature: any, layer: any) => {
        const props = feature.properties || {};
        if (props.label) {
          const label = typeof props.label === 'string'
            ? props.label
            : Object.values(props.label)[0]?.[0] || '';
          if (label) {
            layer.bindPopup(label);
          }
        }
      }
    });

    geoJSONLayer.eachLayer((layer: any) => {
      drawnItems.addLayer(layer);
    });

    // Fit bounds
    const bounds = navPlaceService.getBounds(np);
    if (bounds) {
      map.fitBounds([
        [bounds.south, bounds.west],
        [bounds.north, bounds.east]
      ], { padding: [50, 50] });
    }
  };

  const addFeatureToNavPlace = useCallback((feature: GeoFeature) => {
    let newNavPlace: NavPlace;

    if (navPlace?.type === 'FeatureCollection' && navPlace.features) {
      newNavPlace = {
        ...navPlace,
        features: [...navPlace.features, feature]
      };
    } else if (navPlace?.type === 'Feature') {
      newNavPlace = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: navPlace.geometry!, properties: navPlace.properties },
          feature
        ]
      };
    } else {
      newNavPlace = {
        type: 'Feature',
        geometry: feature.geometry,
        properties: feature.properties
      };
    }

    onChange(newNavPlace);
  }, [navPlace, onChange]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await navPlaceService.geocode(searchQuery);
      setSearchResults(results);
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (location: GeocodedLocation) => {
    if (leafletMapRef.current) {
      if (location.bounds) {
        leafletMapRef.current.fitBounds([
          [location.bounds.south, location.bounds.west],
          [location.bounds.north, location.bounds.east]
        ]);
      } else {
        leafletMapRef.current.setView([location.lat, location.lng], 12);
      }
    }

    // Add as feature if in add mode
    if (editable) {
      const feature = navPlaceService.createPointFeature(
        location.lat,
        location.lng,
        { label: location.name }
      );
      addFeatureToNavPlace(feature);
    }

    setSearchResults([]);
    setSearchQuery('');
    setShowSearch(false);
  };

  const handleClear = () => {
    onChange(null);
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
    }
  };

  const handleAddCurrentView = async () => {
    if (!leafletMapRef.current) return;

    const bounds = leafletMapRef.current.getBounds();
    const feature = navPlaceService.createBoundsFeature({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    });
    addFeatureToNavPlace(feature);
  };

  const label = getIIIFValue(item.label) || 'Untitled';

  return (
    <div className="flex flex-col bg-white rounded-lg border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-slate-50">
        <span className="text-sm font-medium text-slate-700 mr-2">
          NavPlace: {label}
        </span>

        <div className="flex-1" />

        {editable && (
          <>
            {/* Search */}
            <div className="relative">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2 rounded-lg transition-colors ${
                  showSearch ? 'bg-iiif-blue text-white' : 'hover:bg-slate-200'
                }`}
                title="Search location"
              >
                <Icon name="search" />
              </button>

              {showSearch && (
                <div className="absolute top-full right-0 mt-1 w-80 bg-white rounded-lg shadow-xl border z-50">
                  <div className="p-2 flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder="Search for a place..."
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      autoFocus
                    />
                    <button
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="px-3 py-2 bg-iiif-blue text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      {isSearching ? '...' : 'Go'}
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="max-h-60 overflow-auto border-t">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectLocation(result)}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 text-sm border-b last:border-b-0"
                        >
                          <div className="font-medium text-slate-800 truncate">
                            {result.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {navPlaceService.formatCoordinates(result.lat, result.lng)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawing tools */}
            <div className="flex items-center border-l pl-2 ml-2">
              <button
                onClick={() => setDrawMode(drawMode === 'marker' ? null : 'marker')}
                className={`p-2 rounded-lg transition-colors ${
                  drawMode === 'marker' ? 'bg-iiif-blue text-white' : 'hover:bg-slate-200'
                }`}
                title="Add marker (click on map)"
              >
                <Icon name="place" />
              </button>
              <button
                onClick={handleAddCurrentView}
                className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                title="Add current view as boundary"
              >
                <Icon name="crop_free" />
              </button>
            </div>

            {/* Clear */}
            {navPlace && (
              <button
                onClick={handleClear}
                className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                title="Clear all locations"
              >
                <Icon name="delete" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        style={{ height }}
        className="w-full"
      />

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-t text-xs text-slate-500">
        <div>
          {navPlace ? (
            <>
              {navPlace.type === 'FeatureCollection'
                ? `${navPlace.features?.length || 0} features`
                : '1 feature'}
            </>
          ) : (
            'No location set'
          )}
        </div>
        {currentCenter && (
          <div>
            {navPlaceService.formatCoordinates(currentCenter.lat, currentCenter.lng)}
          </div>
        )}
      </div>

      {/* Draw mode indicator */}
      {drawMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-iiif-blue text-white px-4 py-2 rounded-full text-sm shadow-lg z-50">
          Click on map to add {drawMode}
          <button
            onClick={() => setDrawMode(null)}
            className="ml-2 hover:text-red-200"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Mini map preview component (non-editable)
 */
export const GeoPreview: React.FC<{
  item: IIIFItem;
  height?: number;
  onClick?: () => void;
}> = ({ item, height = 150, onClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  const navPlace = navPlaceService.getNavPlace(item);

  useEffect(() => {
    if (!mapRef.current || !navPlace || leafletMapRef.current) return;

    const initMap = async () => {
      // @ts-ignore - Leaflet loaded via CDN
      const L = (await import('leaflet' as any)).default as LeafletModule;

      const map = L.map(mapRef.current!, {
        center: [0, 0],
        zoom: 2,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      const geoJSON = navPlaceService.toGeoJSON(navPlace);
      L.geoJSON(geoJSON).addTo(map);

      const bounds = navPlaceService.getBounds(navPlace);
      if (bounds) {
        map.fitBounds([
          [bounds.south, bounds.west],
          [bounds.north, bounds.east]
        ], { padding: [20, 20] });
      }

      leafletMapRef.current = map;
    };

    initMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [navPlace]);

  if (!navPlace) {
    return (
      <div
        className="flex items-center justify-center bg-slate-100 rounded-lg text-slate-400"
        style={{ height }}
      >
        <div className="text-center">
          <Icon name="map" className="text-3xl mb-1" />
          <div className="text-xs">No location</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{ height }}
      className={`w-full rounded-lg overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    />
  );
};

export default GeoEditor;
