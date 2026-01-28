
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { IIIFItem, IIIFCanvas, isCanvas, getIIIFValue } from '../../types';
import { Icon } from '../Icon';

interface MapViewProps {
  root: IIIFItem | null;
  onSelect: (item: IIIFItem) => void;
}

interface GeoItem {
  canvas: IIIFCanvas;
  lat: number;
  lng: number;
}

interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export const MapView: React.FC<MapViewProps> = ({ root, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredItem, setHoveredItem] = useState<GeoItem | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<GeoItem[] | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const { geoItems, bounds, clusters } = useMemo(() => {
    if (!root) return { geoItems: [], bounds: null, clusters: [] };

    const items: GeoItem[] = [];
    const traverse = (item: IIIFItem) => {
      if (isCanvas(item)) {
        const canvas = item as IIIFCanvas;
        const locMeta = canvas.metadata?.find(m =>
          getIIIFValue(m.label, 'en')?.toLowerCase() === 'location' ||
          getIIIFValue(m.label, 'en')?.toLowerCase() === 'gps'
        );

        if (locMeta) {
          const locValue = getIIIFValue(locMeta.value, 'en');
          if (locValue) {
            const coords = parseCoordinates(locValue);
            if (coords) {
              items.push({ canvas, lat: coords.lat, lng: coords.lng });
            }
          }
        }
      }
      if (item.items) {
        item.items.forEach(traverse);
      }
    };
    traverse(root);

    if (items.length === 0) return { geoItems: [], bounds: null, clusters: [] };

    // Calculate bounds
    const bounds: MapBounds = {
      minLat: Math.min(...items.map(i => i.lat)),
      maxLat: Math.max(...items.map(i => i.lat)),
      minLng: Math.min(...items.map(i => i.lng)),
      maxLng: Math.max(...items.map(i => i.lng))
    };

    // Add padding to bounds
    const latPad = (bounds.maxLat - bounds.minLat) * 0.1 || 0.01;
    const lngPad = (bounds.maxLng - bounds.minLng) * 0.1 || 0.01;
    bounds.minLat -= latPad;
    bounds.maxLat += latPad;
    bounds.minLng -= lngPad;
    bounds.maxLng += lngPad;

    // Simple clustering based on pixel proximity
    const clusters = clusterItems(items, bounds, dimensions, zoom);

    return { geoItems: items, bounds, clusters };
  }, [root, dimensions, zoom]);

  const geoToPixel = (lat: number, lng: number): { x: number; y: number } => {
    if (!bounds) return { x: 0, y: 0 };

    const latRange = bounds.maxLat - bounds.minLat;
    const lngRange = bounds.maxLng - bounds.minLng;

    const x = ((lng - bounds.minLng) / lngRange) * dimensions.width * zoom + pan.x;
    const y = ((bounds.maxLat - lat) / latRange) * dimensions.height * zoom + pan.y;

    return { x, y };
  };

  if (!root || geoItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-8">
        <Icon name="map" className="text-6xl mb-4 text-slate-300" />
        <p className="text-lg font-medium">No Geotagged Items</p>
        <p className="text-sm mt-2">Items need GPS coordinates in their metadata to appear on the map.</p>
        <p className="text-xs mt-4 text-slate-400">
          Add a "Location" metadata field with coordinates like "40.7128, -74.0060"
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-200">
      {/* Header */}
      <div className="h-14 bg-white border-b flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Icon name="map" className="text-green-500" />
            Map View
          </h2>
          <span className="text-sm text-slate-500">{geoItems.length} geotagged items</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
            className="p-2 hover:bg-slate-100 rounded"
          >
            <Icon name="remove" />
          </button>
          <span className="text-sm text-slate-600 w-16 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(4, z + 0.25))}
            className="p-2 hover:bg-slate-100 rounded"
          >
            <Icon name="add" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-2 hover:bg-slate-100 rounded ml-2"
            title="Reset view"
          >
            <Icon name="center_focus_strong" />
          </button>
        </div>
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
        {/* Markers */}
        {clusters.map((cluster, idx) => {
          const pos = geoToPixel(cluster.lat, cluster.lng);
          const isCluster = cluster.items.length > 1;

          return (
            <div
              key={idx}
              className={`absolute transform -translate-x-1/2 -translate-y-full cursor-pointer transition-transform hover:scale-110 z-10 ${
                hoveredItem && cluster.items.includes(hoveredItem) ? 'scale-125 z-20' : ''
              }`}
              style={{ left: pos.x, top: pos.y }}
              onMouseEnter={() => setHoveredItem(cluster.items[0])}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => {
                if (isCluster) {
                  setSelectedCluster(cluster.items);
                } else {
                  onSelect(cluster.items[0].canvas);
                }
              }}
            >
              {/* Pin */}
              <div className={`relative ${isCluster ? 'w-10 h-10' : 'w-8 h-10'}`}>
                <svg viewBox="0 0 24 32" className="w-full h-full drop-shadow-lg">
                  <path
                    d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z"
                    fill={isCluster ? '#ef4444' : '#3b82f6'}
                  />
                  <circle cx="12" cy="12" r="6" fill="white" />
                </svg>
                {isCluster ? (
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-red-600 -mt-2">
                    {cluster.items.length}
                  </span>
                ) : cluster.items[0].canvas._blobUrl ? (
                  <img
                    src={cluster.items[0].canvas._blobUrl}
                    className="absolute top-1 left-1 w-6 h-6 rounded-full object-cover border-2 border-white"
                  />
                ) : (
                  <Icon name="image" className="absolute top-2 left-2 text-blue-600 text-xs" />
                )}
              </div>
            </div>
          );
        })}

        {/* Hover tooltip */}
        {hoveredItem && !selectedCluster && (
          <div
            className="absolute bg-white rounded-lg shadow-xl border p-2 z-30 pointer-events-none"
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
                <div className="font-bold text-sm text-slate-800">
                  {getIIIFValue(hoveredItem.canvas.label, 'none') || 'Untitled'}
                </div>
                <div className="text-xs text-slate-500">
                  {hoveredItem.lat.toFixed(4)}, {hoveredItem.lng.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cluster popup */}
        {selectedCluster && (
          <div className="absolute inset-0 bg-black/30 z-40 flex items-center justify-center p-8">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-slate-800">
                  {selectedCluster.length} items at this location
                </h3>
                <button onClick={() => setSelectedCluster(null)} className="text-slate-400 hover:text-slate-600">
                  <Icon name="close" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] grid grid-cols-3 gap-3">
                {selectedCluster.map(item => (
                  <div
                    key={item.canvas.id}
                    className="bg-slate-50 rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-blue-500 transition-all"
                    onClick={() => { setSelectedCluster(null); onSelect(item.canvas); }}
                  >
                    <div className="aspect-square bg-slate-200">
                      {item.canvas._blobUrl ? (
                        <img src={item.canvas._blobUrl} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon name="image" className="text-slate-400 text-3xl" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="text-xs font-medium text-slate-700 truncate">
                        {getIIIFValue(item.canvas.label, 'none') || 'Untitled'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Coordinates display */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded px-3 py-1 text-xs text-slate-600">
          {bounds && (
            <>
              Bounds: {bounds.minLat.toFixed(2)}°, {bounds.minLng.toFixed(2)}° to {bounds.maxLat.toFixed(2)}°, {bounds.maxLng.toFixed(2)}°
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function parseCoordinates(str: string): { lat: number; lng: number } | null {
  // Try various formats
  // "40.7128, -74.0060"
  // "40.7128°N, 74.0060°W"
  // "40° 42' 46" N, 74° 0' 22" W"

  // Simple decimal format
  const decimalMatch = str.match(/(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)/);
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]);
    const lng = parseFloat(decimalMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  // Degree format with N/S/E/W
  const degreeMatch = str.match(/(\d+\.?\d*)\s*°?\s*([NS])?\s*[,\s]\s*(\d+\.?\d*)\s*°?\s*([EW])?/i);
  if (degreeMatch) {
    let lat = parseFloat(degreeMatch[1]);
    let lng = parseFloat(degreeMatch[3]);
    if (degreeMatch[2]?.toUpperCase() === 'S') lat = -lat;
    if (degreeMatch[4]?.toUpperCase() === 'W') lng = -lng;
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  return null;
}

interface Cluster {
  lat: number;
  lng: number;
  items: GeoItem[];
}

function clusterItems(items: GeoItem[], bounds: MapBounds, dimensions: { width: number; height: number }, zoom: number): Cluster[] {
  const clusterRadius = 40; // pixels
  const clusters: Cluster[] = [];

  const latRange = bounds.maxLat - bounds.minLat;
  const lngRange = bounds.maxLng - bounds.minLng;

  const getPixel = (item: GeoItem) => ({
    x: ((item.lng - bounds.minLng) / lngRange) * dimensions.width * zoom,
    y: ((bounds.maxLat - item.lat) / latRange) * dimensions.height * zoom
  });

  for (const item of items) {
    const pos = getPixel(item);
    let addedToCluster = false;

    for (const cluster of clusters) {
      const clusterPos = getPixel({ lat: cluster.lat, lng: cluster.lng } as GeoItem);
      const dist = Math.sqrt(Math.pow(pos.x - clusterPos.x, 2) + Math.pow(pos.y - clusterPos.y, 2));

      if (dist < clusterRadius) {
        cluster.items.push(item);
        // Update cluster center
        cluster.lat = cluster.items.reduce((sum, i) => sum + i.lat, 0) / cluster.items.length;
        cluster.lng = cluster.items.reduce((sum, i) => sum + i.lng, 0) / cluster.items.length;
        addedToCluster = true;
        break;
      }
    }

    if (!addedToCluster) {
      clusters.push({ lat: item.lat, lng: item.lng, items: [item] });
    }
  }

  return clusters;
}
