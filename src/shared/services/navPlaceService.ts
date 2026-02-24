// Pure TypeScript — no Svelte-specific conversion

/**
 * NavPlace & Geospatial Service
 *
 * Implements support for the IIIF navPlace extension for geospatial metadata.
 * @see https://iiif.io/api/extension/navplace/
 */

import { vaultLog } from './logger';

// ============================================================================
// Types
// ============================================================================

export interface NavPlace {
  id?: string;
  type: 'Feature' | 'FeatureCollection';
  features?: GeoFeature[];
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

export interface PointGeometry { type: 'Point'; coordinates: [number, number] | [number, number, number]; }
export interface LineStringGeometry { type: 'LineString'; coordinates: Array<[number, number]>; }
export interface PolygonGeometry { type: 'Polygon'; coordinates: Array<Array<[number, number]>>; }
export interface MultiPointGeometry { type: 'MultiPoint'; coordinates: Array<[number, number]>; }
export interface MultiLineStringGeometry { type: 'MultiLineString'; coordinates: Array<Array<[number, number]>>; }
export interface MultiPolygonGeometry { type: 'MultiPolygon'; coordinates: Array<Array<Array<[number, number]>>>; }
export interface GeometryCollection { type: 'GeometryCollection'; geometries: GeoGeometry[]; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface GeoProperties { label?: string | Record<string, string[]>; summary?: string | Record<string, string[]>; [key: string]: any; }

export interface LatLng { lat: number; lng: number; }
export interface LatLngBounds { north: number; south: number; east: number; west: number; }
export interface GeocodedLocation { name: string; lat: number; lng: number; bounds?: LatLngBounds; type?: string; }

// ============================================================================
// NavPlace Service
// ============================================================================

class NavPlaceService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getNavPlace(item: any): NavPlace | null {
    return item?.navPlace ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setNavPlace(item: any, navPlace: NavPlace | null): any {
    const updated = { ...item };
    if (navPlace) {
      updated.navPlace = navPlace;
    } else {
      delete updated.navPlace;
    }
    return updated;
  }

  createNavPlace(
    coordinates: LatLng | LatLng[] | LatLng[][],
    properties?: GeoProperties
  ): NavPlace {
    let geometry: GeoGeometry;

    if (Array.isArray(coordinates)) {
      if (Array.isArray(coordinates[0])) {
        const rings = coordinates as LatLng[][];
        geometry = {
          type: 'Polygon',
          coordinates: rings.map(ring => ring.map(c => [c.lng, c.lat] as [number, number]))
        };
      } else {
        const points = coordinates as LatLng[];
        if (points.length > 2) {
          geometry = { type: 'LineString', coordinates: points.map(c => [c.lng, c.lat] as [number, number]) };
        } else {
          geometry = { type: 'MultiPoint', coordinates: points.map(c => [c.lng, c.lat] as [number, number]) };
        }
      }
    } else {
      geometry = { type: 'Point', coordinates: [coordinates.lng, coordinates.lat] };
    }

    return { type: 'Feature', geometry, properties: properties ?? {} };
  }

  createFeatureCollection(features: GeoFeature[]): NavPlace {
    return { type: 'FeatureCollection', features };
  }

  createPointFeature(lat: number, lng: number, properties?: GeoProperties): GeoFeature {
    return { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: properties ?? {} };
  }

  createBoundsFeature(bounds: LatLngBounds, properties?: GeoProperties): GeoFeature {
    const { north, south, east, west } = bounds;
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]]
      },
      properties: properties ?? {}
    };
  }

  extractCoordinates(navPlace: NavPlace): LatLng[] {
    const coords: LatLng[] = [];

    const extractFromGeometry = (geometry: GeoGeometry) => {
      switch (geometry.type) {
        case 'Point':
          coords.push({ lat: geometry.coordinates[1], lng: geometry.coordinates[0] });
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
        default:
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

  getCenter(navPlace: NavPlace): LatLng | null {
    const coords = this.extractCoordinates(navPlace);
    if (coords.length === 0) return null;
    const sum = coords.reduce((acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }), { lat: 0, lng: 0 });
    return { lat: sum.lat / coords.length, lng: sum.lng / coords.length };
  }

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collectNavPlaces(root: any): Array<{ item: any; navPlace: NavPlace }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: Array<{ item: any; navPlace: NavPlace }> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const traverse = (item: any) => {
      const navPlace = this.getNavPlace(item);
      if (navPlace) results.push({ item, navPlace });
      if (item.items) {
        for (const child of item.items) traverse(child);
      }
    };
    traverse(root);
    return results;
  }

  pointInNavPlace(point: LatLng, navPlace: NavPlace): boolean {
    const bounds = this.getBounds(navPlace);
    if (!bounds) return false;
    return point.lat >= bounds.south && point.lat <= bounds.north && point.lng >= bounds.west && point.lng <= bounds.east;
  }

  calculateDistance(point1: LatLng, point2: LatLng): number {
    const R = 6371e3;
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  formatCoordinates(lat: number, lng: number, format: 'dms' | 'dd' = 'dd'): string {
    if (format === 'dd') return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    const toDMS = (deg: number, isLat: boolean) => {
      const d = Math.floor(Math.abs(deg));
      const m = Math.floor((Math.abs(deg) - d) * 60);
      const s = ((Math.abs(deg) - d) * 60 - m) * 60;
      const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
      return `${d}°${m}'${s.toFixed(1)}"${dir}`;
    };
    return `${toDMS(lat, true)} ${toDMS(lng, false)}`;
  }

  async geocode(query: string): Promise<GeocodedLocation[]> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
      const response = await fetch(url, { headers: { 'User-Agent': 'IIIF-Field-Studio/1.0' } });
      if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = await response.json();
      return results.map(r => ({
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
      vaultLog.error('[NavPlace] Geocoding failed', e instanceof Error ? e : undefined);
      return [];
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodedLocation | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
      const response = await fetch(url, { headers: { 'User-Agent': 'IIIF-Field-Studio/1.0' } });
      if (!response.ok) throw new Error(`Reverse geocoding failed: ${response.status}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await response.json();
      return { name: result.display_name, lat: parseFloat(result.lat), lng: parseFloat(result.lon), type: result.type };
    } catch (e) {
      vaultLog.error('[NavPlace] Reverse geocoding failed', e instanceof Error ? e : undefined);
      return null;
    }
  }
}

export const navPlaceService = new NavPlaceService();
export default navPlaceService;
