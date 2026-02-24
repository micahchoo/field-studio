/**
 * NavPlace types and service for GeoEditor/GeoPreview.
 * Stubbed until navPlaceService migration is complete.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NavPlace = any;

export type GeoFeature = {
  type: 'Feature';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geometry: any;
  properties: Record<string, unknown>;
};

export type GeocodedLocation = {
  name: string;
  lat: number;
  lng: number;
  bounds?: { north: number; south: number; east: number; west: number };
};

export type LatLng = { lat: number; lng: number };

export type DrawMode = 'none' | 'marker' | 'bounds';

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';
export const DEFAULT_CENTER: LatLng = { lat: 20, lng: 0 };
export const DEFAULT_ZOOM = 2;

export const navPlaceService = {
  getNavPlace: (item: { navPlace?: NavPlace }): NavPlace | null => item.navPlace || null,
  toGeoJSON: (np: NavPlace): NavPlace => np,
  getBounds: (_np: NavPlace): { north: number; south: number; east: number; west: number } | null => null,
  createPointFeature: (lat: number, lng: number, props?: Record<string, unknown>): GeoFeature => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [lng, lat] },
    properties: props || {},
  }),
  createBoundsFeature: (bounds: { north: number; south: number; east: number; west: number }): GeoFeature => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [bounds.west, bounds.south],
        [bounds.east, bounds.south],
        [bounds.east, bounds.north],
        [bounds.west, bounds.north],
        [bounds.west, bounds.south],
      ]],
    },
    properties: {},
  }),
  geocode: async (_query: string): Promise<GeocodedLocation[]> => [],
  formatCoordinates: (lat: number, lng: number): string =>
    `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
};
