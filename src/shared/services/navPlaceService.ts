/**
 * NavPlace & Geospatial Service
 *
 * Implements support for the IIIF navPlace extension for geospatial metadata.
 * Provides GeoJSON-to-IIIF mapping and Leaflet integration helpers.
 *
 * @see https://iiif.io/api/extension/navplace/
 * @see https://geojson.org/
 */

import { IIIFCanvas, IIIFItem, IIIFManifest, LanguageMap } from '@/src/shared/types';

// GeoJSON type declarations (subset needed for this service)
declare namespace GeoJSON {
  interface FeatureCollection {
    type: 'FeatureCollection';
    features: Feature[];
  }
  interface Feature {
    type: 'Feature';
    geometry: Geometry;
    properties: Record<string, any> | null;
  }
  type Geometry =
    | { type: 'Point'; coordinates: [number, number] }
    | { type: 'LineString'; coordinates: Array<[number, number]> }
    | { type: 'Polygon'; coordinates: Array<Array<[number, number]>> }
    | { type: 'MultiPoint'; coordinates: Array<[number, number]> }
    | { type: 'MultiLineString'; coordinates: Array<Array<[number, number]>> }
    | { type: 'MultiPolygon'; coordinates: Array<Array<Array<[number, number]>>> }
    | { type: 'GeometryCollection'; geometries: Geometry[] };
}

// ============================================================================
// Types
// ============================================================================

export interface NavPlace {
  id?: string;
  type: 'Feature' | 'FeatureCollection';
  features?: GeoFeature[];
  // For single Feature
  geometry?: GeoGeometry;
  properties?: GeoProperties;
}

export interface GeoFeature {
  id?: string;
  type: 'Feature';
  geometry: GeoGeometry;
  properties?: GeoProperties;
}

export type GeoGeometry =
  | PointGeometry
  | LineStringGeometry
  | PolygonGeometry
  | MultiPointGeometry
  | MultiLineStringGeometry
  | MultiPolygonGeometry
  | GeometryCollection;

export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number] | [number, number, number]; // [lng, lat] or [lng, lat, alt]
}

export interface LineStringGeometry {
  type: 'LineString';
  coordinates: Array<[number, number]>;
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Array<Array<[number, number]>>; // Array of rings
}

export interface MultiPointGeometry {
  type: 'MultiPoint';
  coordinates: Array<[number, number]>;
}

export interface MultiLineStringGeometry {
  type: 'MultiLineString';
  coordinates: Array<Array<[number, number]>>;
}

export interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: Array<Array<Array<[number, number]>>>;
}

export interface GeometryCollection {
  type: 'GeometryCollection';
  geometries: GeoGeometry[];
}

export interface GeoProperties {
  label?: string | LanguageMap;
  summary?: string | LanguageMap;
  [key: string]: any;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LatLngBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeocodedLocation {
  name: string;
  lat: number;
  lng: number;
  bounds?: LatLngBounds;
  type?: string; // city, country, etc.
}

// ============================================================================
// NavPlace Service
// ============================================================================

class NavPlaceService {
  /**
   * Extract navPlace from an IIIF resource
   */
  getNavPlace(item: IIIFItem): NavPlace | null {
    return (item as any).navPlace || null;
  }

  /**
   * Set navPlace on an IIIF resource
   */
  setNavPlace(item: IIIFItem, navPlace: NavPlace | null): IIIFItem {
    const updated = { ...item };
    if (navPlace) {
      (updated as any).navPlace = navPlace;
    } else {
      delete (updated as any).navPlace;
    }
    return updated;
  }

  /**
   * Create a navPlace from coordinates
   */
  createNavPlace(
    coordinates: LatLng | LatLng[] | LatLng[][],
    properties?: GeoProperties
  ): NavPlace {
    let geometry: GeoGeometry;

    if (Array.isArray(coordinates)) {
      if (Array.isArray(coordinates[0])) {
        // Polygon (array of rings)
        const rings = coordinates as LatLng[][];
        geometry = {
          type: 'Polygon',
          coordinates: rings.map(ring =>
            ring.map(c => [c.lng, c.lat] as [number, number])
          )
        };
      } else {
        // LineString or MultiPoint
        const points = coordinates as LatLng[];
        if (points.length > 2) {
          // Assume LineString for 3+ points
          geometry = {
            type: 'LineString',
            coordinates: points.map(c => [c.lng, c.lat] as [number, number])
          };
        } else {
          geometry = {
            type: 'MultiPoint',
            coordinates: points.map(c => [c.lng, c.lat] as [number, number])
          };
        }
      }
    } else {
      // Single point
      geometry = {
        type: 'Point',
        coordinates: [coordinates.lng, coordinates.lat]
      };
    }

    return {
      type: 'Feature',
      geometry,
      properties: properties || {}
    };
  }

  /**
   * Create a navPlace FeatureCollection from multiple features
   */
  createFeatureCollection(features: GeoFeature[]): NavPlace {
    return {
      type: 'FeatureCollection',
      features
    };
  }

  /**
   * Create a point feature
   */
  createPointFeature(lat: number, lng: number, properties?: GeoProperties): GeoFeature {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      properties: properties || {}
    };
  }

  /**
   * Create a polygon feature from bounds
   */
  createBoundsFeature(bounds: LatLngBounds, properties?: GeoProperties): GeoFeature {
    const { north, south, east, west } = bounds;
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south] // Close the ring
        ]]
      },
      properties: properties || {}
    };
  }

  /**
   * Extract all coordinates from navPlace
   */
  extractCoordinates(navPlace: NavPlace): LatLng[] {
    const coords: LatLng[] = [];

    const extractFromGeometry = (geometry: GeoGeometry) => {
      switch (geometry.type) {
        case 'Point':
          coords.push({
            lat: geometry.coordinates[1],
            lng: geometry.coordinates[0]
          });
          break;
        case 'MultiPoint':
        case 'LineString':
          for (const c of geometry.coordinates) {
            coords.push({ lat: c[1], lng: c[0] });
          }
          break;
        case 'Polygon':
        case 'MultiLineString':
          for (const ring of geometry.coordinates) {
            for (const c of ring) {
              coords.push({ lat: c[1], lng: c[0] });
            }
          }
          break;
        case 'MultiPolygon':
          for (const polygon of geometry.coordinates) {
            for (const ring of polygon) {
              for (const c of ring) {
                coords.push({ lat: c[1], lng: c[0] });
              }
            }
          }
          break;
        case 'GeometryCollection':
          for (const geom of geometry.geometries) {
            extractFromGeometry(geom);
          }
          break;
      }
    };

    if (navPlace.type === 'Feature' && navPlace.geometry) {
      extractFromGeometry(navPlace.geometry);
    } else if (navPlace.type === 'FeatureCollection' && navPlace.features) {
      for (const feature of navPlace.features) {
        extractFromGeometry(feature.geometry);
      }
    }

    return coords;
  }

  /**
   * Get center point of navPlace
   */
  getCenter(navPlace: NavPlace): LatLng | null {
    const coords = this.extractCoordinates(navPlace);
    if (coords.length === 0) return null;

    const sum = coords.reduce(
      (acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }),
      { lat: 0, lng: 0 }
    );

    return {
      lat: sum.lat / coords.length,
      lng: sum.lng / coords.length
    };
  }

  /**
   * Get bounding box of navPlace
   */
  getBounds(navPlace: NavPlace): LatLngBounds | null {
    const coords = this.extractCoordinates(navPlace);
    if (coords.length === 0) return null;

    let north = -90, south = 90, east = -180, west = 180;

    for (const c of coords) {
      if (c.lat > north) north = c.lat;
      if (c.lat < south) south = c.lat;
      if (c.lng > east) east = c.lng;
      if (c.lng < west) west = c.lng;
    }

    return { north, south, east, west };
  }

  /**
   * Collect all navPlaces from a manifest tree
   */
  collectNavPlaces(root: IIIFItem): Array<{ item: IIIFItem; navPlace: NavPlace }> {
    const results: Array<{ item: IIIFItem; navPlace: NavPlace }> = [];

    const traverse = (item: IIIFItem) => {
      const navPlace = this.getNavPlace(item);
      if (navPlace) {
        results.push({ item, navPlace });
      }
      if (item.items) {
        for (const child of item.items) {
          traverse(child);
        }
      }
    };

    traverse(root);
    return results;
  }

  /**
   * Convert navPlace to GeoJSON for Leaflet
   */
  toGeoJSON(navPlace: NavPlace): GeoJSON.FeatureCollection {
    if (navPlace.type === 'FeatureCollection') {
      return {
        type: 'FeatureCollection',
        features: (navPlace.features || []).map(f => ({
          type: 'Feature' as const,
          geometry: f.geometry as GeoJSON.Geometry,
          properties: f.properties || {}
        }))
      };
    } else if (navPlace.type === 'Feature' && navPlace.geometry) {
      return {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature' as const,
          geometry: navPlace.geometry as GeoJSON.Geometry,
          properties: navPlace.properties || {}
        }]
      };
    }

    return { type: 'FeatureCollection', features: [] };
  }

  /**
   * Convert GeoJSON to navPlace
   */
  fromGeoJSON(geojson: GeoJSON.FeatureCollection | GeoJSON.Feature): NavPlace {
    if (geojson.type === 'FeatureCollection') {
      return {
        type: 'FeatureCollection',
        features: geojson.features.map(f => ({
          type: 'Feature' as const,
          geometry: f.geometry as GeoGeometry,
          properties: f.properties || {}
        }))
      };
    } else if (geojson.type === 'Feature') {
      return {
        type: 'Feature',
        geometry: geojson.geometry as GeoGeometry,
        properties: geojson.properties || {}
      };
    }

    return { type: 'FeatureCollection', features: [] };
  }

  /**
   * Geocode a place name (using Nominatim)
   */
  async geocode(query: string): Promise<GeocodedLocation[]> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'IIIF-Field-Studio/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const results = await response.json();

      return results.map((r: any) => ({
        name: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        bounds: r.boundingbox ? {
          south: parseFloat(r.boundingbox[0]),
          north: parseFloat(r.boundingbox[1]),
          west: parseFloat(r.boundingbox[2]),
          east: parseFloat(r.boundingbox[3])
        } : undefined,
        type: r.type
      }));
    } catch (e) {
      console.error('[NavPlace] Geocoding failed:', e);
      return [];
    }
  }

  /**
   * Reverse geocode coordinates to place name
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodedLocation | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'IIIF-Field-Studio/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.status}`);
      }

      const result = await response.json();

      return {
        name: result.display_name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        type: result.type
      };
    } catch (e) {
      console.error('[NavPlace] Reverse geocoding failed:', e);
      return null;
    }
  }

  /**
   * Check if a point is within a navPlace boundary
   */
  pointInNavPlace(point: LatLng, navPlace: NavPlace): boolean {
    const bounds = this.getBounds(navPlace);
    if (!bounds) return false;

    return (
      point.lat >= bounds.south &&
      point.lat <= bounds.north &&
      point.lng >= bounds.west &&
      point.lng <= bounds.east
    );
  }

  /**
   * Calculate distance between two points (in meters)
   */
  calculateDistance(point1: LatLng, point2: LatLng): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Format coordinates as string
   */
  formatCoordinates(lat: number, lng: number, format: 'dms' | 'dd' = 'dd'): string {
    if (format === 'dd') {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    // DMS format
    const toDMS = (deg: number, isLat: boolean) => {
      const d = Math.floor(Math.abs(deg));
      const m = Math.floor((Math.abs(deg) - d) * 60);
      const s = ((Math.abs(deg) - d) * 60 - m) * 60;
      const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
      return `${d}°${m}'${s.toFixed(1)}"${dir}`;
    };

    return `${toDMS(lat, true)} ${toDMS(lng, false)}`;
  }
}

export const navPlaceService = new NavPlaceService();

export default navPlaceService;
