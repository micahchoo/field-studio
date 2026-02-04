/**
 * Map Feature Model
 *
 * Domain-specific logic for geographic visualization of IIIF items.
 * Handles coordinate extraction, clustering, and viewport calculations.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Pure business logic, no UI concerns
 * - Reactive hooks for map state
 * - Geographic calculations
 *
 * IDEAL OUTCOME: Consistent map behavior across the app
 * FAILURE PREVENTED: Invalid coordinates, clustering errors, viewport drift
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IIIFCanvas, IIIFItem } from '@/types';
import { getIIIFValue, isCanvas } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface GeoItem {
  canvas: IIIFCanvas;
  lat: number;
  lng: number;
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface Cluster {
  lat: number;
  lng: number;
  items: GeoItem[];
}

export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface MapState {
  geoItems: GeoItem[];
  bounds: MapBounds | null;
  clusters: Cluster[];
  zoom: number;
  pan: { x: number; y: number };
  hoveredItem: GeoItem | null;
  selectedCluster: GeoItem[] | null;
  dimensions: ViewportDimensions;
}

export interface UseMapReturn extends MapState {
  // Refs
  containerRef: React.RefObject<HTMLDivElement>;
  // Actions
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  setPan: (pan: { x: number; y: number }) => void;
  setHoveredItem: (item: GeoItem | null) => void;
  selectCluster: (cluster: GeoItem[] | null) => void;
  geoToPixel: (lat: number, lng: number) => { x: number; y: number };
  hasGeotaggedItems: boolean;
}

// ============================================================================
// Coordinate Parsing
// ============================================================================

/**
 * Parse coordinate string in various formats
 * Supports:
 * - Decimal: "40.7128, -74.0060"
 * - Degrees with direction: "40.7128°N, 74.0060°W"
 */
export const parseCoordinates = (str: string): { lat: number; lng: number } | null => {
  if (!str || typeof str !== 'string') return null;

  // Simple decimal format: "40.7128, -74.0060"
  const decimalMatch = str.match(/(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)/);
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]);
    const lng = parseFloat(decimalMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  // Degree format with N/S/E/W: "40.7128 N, 74.0060 W"
  const degreeMatch = str.match(/(\d+\.?\d*)\s*°?\s*([NS])?\s*[,\s]\s*(\d+\.?\d*)\s*°?\s*([EW])?/i);
  if (degreeMatch) {
    let lat = parseFloat(degreeMatch[1]);
    let lng = parseFloat(degreeMatch[3]);
    if (degreeMatch[2]?.toUpperCase() === 'S') lat = -lat;
    if (degreeMatch[4]?.toUpperCase() === 'W') lng = -lng;
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  return null;
};

// ============================================================================
// Clustering
// ============================================================================

const CLUSTER_RADIUS = 40; // pixels

export const clusterItems = (
  items: GeoItem[],
  bounds: MapBounds,
  dimensions: ViewportDimensions,
  zoom: number
): Cluster[] => {
  if (items.length === 0 || dimensions.width === 0) return [];

  const latRange = bounds.maxLat - bounds.minLat || 0.01;
  const lngRange = bounds.maxLng - bounds.minLng || 0.01;

  const getPixel = (item: GeoItem) => ({
    x: ((item.lng - bounds.minLng) / lngRange) * dimensions.width * zoom,
    y: ((bounds.maxLat - item.lat) / latRange) * dimensions.height * zoom
  });

  const clusters: Cluster[] = [];

  for (const item of items) {
    const pos = getPixel(item);
    let addedToCluster = false;

    for (const cluster of clusters) {
      const clusterPos = getPixel({ lat: cluster.lat, lng: cluster.lng } as GeoItem);
      const dist = Math.sqrt(
        Math.pow(pos.x - clusterPos.x, 2) + Math.pow(pos.y - clusterPos.y, 2)
      );

      if (dist < CLUSTER_RADIUS) {
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
};

// ============================================================================
// Hook
// ============================================================================

export const useMap = (root: IIIFItem | null): UseMapReturn => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<ViewportDimensions>({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState<GeoItem | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<GeoItem[] | null>(null);

  // Update dimensions on resize
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

  // Extract geotagged items from root
  const geoItems = useMemo(() => {
    if (!root) return [];

    const items: GeoItem[] = [];
    
    const traverse = (item: IIIFItem) => {
      if (isCanvas(item)) {
        const canvas = item as IIIFCanvas;
        // Look for location/GPS metadata
        const locMeta = canvas.metadata?.find(m => {
          const label = getIIIFValue(m.label, 'en')?.toLowerCase() || '';
          return label === 'location' || label === 'gps' || label === 'coordinates';
        });

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
    return items;
  }, [root]);

  // Calculate bounds with padding
  const bounds = useMemo((): MapBounds | null => {
    if (geoItems.length === 0) return null;

    const minLat = Math.min(...geoItems.map(i => i.lat));
    const maxLat = Math.max(...geoItems.map(i => i.lat));
    const minLng = Math.min(...geoItems.map(i => i.lng));
    const maxLng = Math.max(...geoItems.map(i => i.lng));

    // Add padding (10% of range or minimum 0.01 degrees)
    const latPad = Math.max((maxLat - minLat) * 0.1, 0.01);
    const lngPad = Math.max((maxLng - minLng) * 0.1, 0.01);

    return {
      minLat: minLat - latPad,
      maxLat: maxLat + latPad,
      minLng: minLng - lngPad,
      maxLng: maxLng + lngPad
    };
  }, [geoItems]);

  // Calculate clusters
  const clusters = useMemo(() => {
    if (!bounds || geoItems.length === 0) return [];
    return clusterItems(geoItems, bounds, dimensions, zoom);
  }, [geoItems, bounds, dimensions, zoom]);

  // Convert geo coordinates to pixel coordinates
  const geoToPixel = useCallback((lat: number, lng: number): { x: number; y: number } => {
    if (!bounds) return { x: 0, y: 0 };

    const latRange = bounds.maxLat - bounds.minLat || 0.01;
    const lngRange = bounds.maxLng - bounds.minLng || 0.01;

    const x = ((lng - bounds.minLng) / lngRange) * dimensions.width * zoom + pan.x;
    const y = ((bounds.maxLat - lat) / latRange) * dimensions.height * zoom + pan.y;

    return { x, y };
  }, [bounds, dimensions, zoom, pan]);

  // Actions
  const zoomIn = useCallback(() => {
    setZoom(z => Math.min(4, z + 0.25));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(z => Math.max(0.5, z - 0.25));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const selectCluster = useCallback((cluster: GeoItem[] | null) => {
    setSelectedCluster(cluster);
  }, []);

  return {
    geoItems,
    bounds,
    clusters,
    zoom,
    pan,
    hoveredItem,
    selectedCluster,
    dimensions,
    containerRef,
    zoomIn,
    zoomOut,
    resetView,
    setPan,
    setHoveredItem,
    selectCluster,
    geoToPixel,
    hasGeotaggedItems: geoItems.length > 0,
  };
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format coordinates for display
 */
export const formatCoordinates = (lat: number, lng: number, precision = 4): string => {
  return `${lat.toFixed(precision)}°, ${lng.toFixed(precision)}°`;
};

/**
 * Get bounds display string
 */
export const formatBounds = (bounds: MapBounds): string => {
  return `${bounds.minLat.toFixed(2)}°, ${bounds.minLng.toFixed(2)}° to ${bounds.maxLat.toFixed(2)}°, ${bounds.maxLng.toFixed(2)}°`;
};
