/**
 * Map — State container (Category 2)
 *
 * Replaces useMap React hook.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts.
 *
 * Geographic visualization of IIIF items with coordinate parsing,
 * clustering, and viewport management.
 *
 * Usage in Svelte component:
 *   const map = new MapStore();
 *   map.loadFromManifest(canvases);
 *
 *   // Reactive reads
 *   map.geoItems     // items with parsed coordinates
 *   map.clusters     // spatially clustered items
 *   map.bounds       // geographic bounding box
 *   map.hasGeoData   // whether any items have coordinates
 */

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface GeoItem {
  id: string;
  label: string;
  lat: number;
  lng: number;
  canvasId: string;
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface Cluster {
  id: string;
  centerLat: number;
  centerLng: number;
  items: GeoItem[];
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const DEFAULT_CLUSTER_RADIUS = 40; // pixels
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 20;
const ZOOM_STEP = 1.5;
import * as GeoPoint from '@/src/shared/lib/geometry/point';

const BOUNDS_PADDING = 0.1; // 10% padding on each side

// ──────────────────────────────────────────────
// Coordinate parsing regexes
// ──────────────────────────────────────────────

// Decimal degrees: "40.7128, -74.0060" or "40.7128 -74.0060" or "40.7128°N 74.0060°W"
const DECIMAL_REGEX =
  /(-?\d+\.?\d*)\s*[°]?\s*([NSns])?\s*[,;\s]+\s*(-?\d+\.?\d*)\s*[°]?\s*([EWew])?/;

// DMS: 40°42'46"N 74°0'22"W  or  40° 42' 46" N, 74° 0' 22" W
const DMS_REGEX =
  /(\d+)\s*[°]\s*(\d+)\s*['′]\s*(\d+\.?\d*)\s*["″]?\s*([NSns])\s*[,;\s]*\s*(\d+)\s*[°]\s*(\d+)\s*['′]\s*(\d+\.?\d*)\s*["″]?\s*([EWew])/;

// ──────────────────────────────────────────────
// Store class
// ──────────────────────────────────────────────

export class MapStore {
  // -- Reactive state --
  #geoItems = $state<GeoItem[]>([]);
  #clusters = $state<Cluster[]>([]);
  #bounds = $state<MapBounds | null>(null);
  #zoom = $state(1);
  #panX = $state(0);
  #panY = $state(0);
  #hoveredItemId = $state<string | null>(null);
  #selectedClusterId = $state<string | null>(null);

  // ──────────────────────────────────────────────
  // Reactive getters
  // ──────────────────────────────────────────────

  get geoItems(): GeoItem[] { return this.#geoItems; }
  get clusters(): Cluster[] { return this.#clusters; }
  get bounds(): MapBounds | null { return this.#bounds; }
  get zoom(): number { return this.#zoom; }
  get panX(): number { return this.#panX; }
  get panY(): number { return this.#panY; }
  get hoveredItemId(): string | null { return this.#hoveredItemId; }
  get selectedClusterId(): string | null { return this.#selectedClusterId; }
  get hasGeoData(): boolean { return this.#geoItems.length > 0; }
  get itemCount(): number { return this.#geoItems.length; }

  // ──────────────────────────────────────────────
  // Data loading — extract geo items from manifest canvases
  // ──────────────────────────────────────────────

  /**
   * Parse canvases for geographic coordinates in their metadata.
   *
   * Pseudocode:
   *   For each canvas with metadata:
   *     Look for metadata entries with label containing "coordinate",
   *     "location", "lat", "lng", "geo", "position", "place"
   *     Try to parse the value as decimal or DMS coordinates
   *     If successful, create a GeoItem
   *   After collecting all items:
   *     Calculate bounding box with 10% padding
   *     Cluster nearby items (40px radius at current zoom)
   */
  loadFromManifest(
    canvases: Array<{
      id: string;
      label?: string;
      metadata?: Array<{ label: string; value: string }>;
    }>
  ): void {
    const items: GeoItem[] = [];

    for (const canvas of canvases) {
      if (!canvas.metadata) continue;

      for (const meta of canvas.metadata) {
        const labelLower = (meta.label || '').toLowerCase();

        // Check if this metadata field likely contains coordinates
        const isGeoField =
          labelLower.includes('coordinate') ||
          labelLower.includes('location') ||
          labelLower.includes('lat') ||
          labelLower.includes('lng') ||
          labelLower.includes('lon') ||
          labelLower.includes('geo') ||
          labelLower.includes('position') ||
          labelLower.includes('place') ||
          labelLower.includes('gps');

        if (!isGeoField) continue;

        const coords = this.#parseCoordinates(meta.value);
        if (coords) {
          items.push({
            id: `${canvas.id}-geo`,
            label: canvas.label || canvas.id,
            lat: coords.lat,
            lng: coords.lng,
            canvasId: canvas.id,
          });
          // Only take the first valid coordinate per canvas
          break;
        }
      }
    }

    this.#geoItems = items;

    if (items.length > 0) {
      this.#bounds = this.#calculateBounds(items);
      this.#clusters = this.#clusterItems(items, DEFAULT_CLUSTER_RADIUS);
    } else {
      this.#bounds = null;
      this.#clusters = [];
    }
  }

  // ──────────────────────────────────────────────
  // Viewport controls
  // ──────────────────────────────────────────────

  /** Zoom in by one step, clamped to MAX_ZOOM */
  zoomIn(): void {
    this.#zoom = Math.min(this.#zoom * ZOOM_STEP, MAX_ZOOM);
    // Re-cluster at new zoom level
    this.#clusters = this.#clusterItems(this.#geoItems, DEFAULT_CLUSTER_RADIUS);
  }

  /** Zoom out by one step, clamped to MIN_ZOOM */
  zoomOut(): void {
    this.#zoom = Math.max(this.#zoom / ZOOM_STEP, MIN_ZOOM);
    // Re-cluster at new zoom level
    this.#clusters = this.#clusterItems(this.#geoItems, DEFAULT_CLUSTER_RADIUS);
  }

  /** Reset viewport to default zoom and center */
  resetView(): void {
    this.#zoom = 1;
    this.#panX = 0;
    this.#panY = 0;
    this.#selectedClusterId = null;
    this.#hoveredItemId = null;
    this.#clusters = this.#clusterItems(this.#geoItems, DEFAULT_CLUSTER_RADIUS);
  }

  /** Set pan offset */
  setPan(x: number, y: number): void {
    this.#panX = x;
    this.#panY = y;
  }

  /** Set hovered item for highlight */
  setHoveredItem(id: string | null): void {
    this.#hoveredItemId = id;
  }

  /** Select a cluster to expand/inspect */
  selectCluster(id: string | null): void {
    this.#selectedClusterId = id;
  }

  // ──────────────────────────────────────────────
  // Projection — geographic to pixel coordinates
  // ──────────────────────────────────────────────

  /**
   * Convert geographic coordinates to pixel position within viewport.
   *
   * Pseudocode:
   *   Uses simple equirectangular projection:
   *   - Normalize lat/lng to 0..1 range within bounds
   *   - Scale to viewport dimensions
   *   - Apply zoom and pan offsets
   */
  geoToPixel(
    lat: number,
    lng: number,
    viewportWidth: number,
    viewportHeight: number
  ): { x: number; y: number } {
    const bounds = this.#bounds;
    if (!bounds) return { x: viewportWidth / 2, y: viewportHeight / 2 };

    const latRange = bounds.maxLat - bounds.minLat || 1;
    const lngRange = bounds.maxLng - bounds.minLng || 1;

    // Normalize to 0..1 within bounds
    const normalizedX = (lng - bounds.minLng) / lngRange;
    // Invert Y because screen Y increases downward, latitude increases upward
    const normalizedY = 1 - (lat - bounds.minLat) / latRange;

    // Scale to viewport, apply zoom and pan
    const x = normalizedX * viewportWidth * this.#zoom + this.#panX;
    const y = normalizedY * viewportHeight * this.#zoom + this.#panY;

    return { x, y };
  }

  // ──────────────────────────────────────────────
  // Format utilities
  // ──────────────────────────────────────────────

  /** Format a lat/lng pair as a human-readable string */
  formatCoordinates(lat: number, lng: number): string {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}${latDir}, ${Math.abs(lng).toFixed(4)}${lngDir}`;
  }

  /** Format the current bounds as a readable string */
  formatBounds(): string {
    if (!this.#bounds) return 'No bounds';
    const b = this.#bounds;
    return (
      `${this.formatCoordinates(b.minLat, b.minLng)} to ` +
      `${this.formatCoordinates(b.maxLat, b.maxLng)}`
    );
  }

  // ──────────────────────────────────────────────
  // Internal: coordinate parsing
  // ──────────────────────────────────────────────

  /**
   * Parse a string value into latitude and longitude.
   * Supports:
   *   - Decimal degrees: "40.7128, -74.0060"
   *   - Decimal with direction: "40.7128N, 74.0060W"
   *   - DMS: 40°42'46"N 74°0'22"W
   *
   * Returns null if no valid coordinates found.
   */
  #parseCoordinates(value: string): { lat: number; lng: number } | null {
    if (!value || typeof value !== 'string') return null;

    const trimmed = value.trim();

    // Try DMS format first (more specific pattern)
    const dmsMatch = trimmed.match(DMS_REGEX);
    if (dmsMatch) {
      const latDeg = parseInt(dmsMatch[1], 10);
      const latMin = parseInt(dmsMatch[2], 10);
      const latSec = parseFloat(dmsMatch[3]);
      const latDir = dmsMatch[4].toUpperCase();

      const lngDeg = parseInt(dmsMatch[5], 10);
      const lngMin = parseInt(dmsMatch[6], 10);
      const lngSec = parseFloat(dmsMatch[7]);
      const lngDir = dmsMatch[8].toUpperCase();

      let lat = latDeg + latMin / 60 + latSec / 3600;
      let lng = lngDeg + lngMin / 60 + lngSec / 3600;

      if (latDir === 'S') lat = -lat;
      if (lngDir === 'W') lng = -lng;

      if (this.#isValidCoordinate(lat, lng)) {
        return { lat, lng };
      }
    }

    // Try decimal format
    const decMatch = trimmed.match(DECIMAL_REGEX);
    if (decMatch) {
      let lat = parseFloat(decMatch[1]);
      const latDir = decMatch[2]?.toUpperCase();
      let lng = parseFloat(decMatch[3]);
      const lngDir = decMatch[4]?.toUpperCase();

      // Apply direction modifiers
      if (latDir === 'S') lat = -Math.abs(lat);
      if (latDir === 'N') lat = Math.abs(lat);
      if (lngDir === 'W') lng = -Math.abs(lng);
      if (lngDir === 'E') lng = Math.abs(lng);

      if (this.#isValidCoordinate(lat, lng)) {
        return { lat, lng };
      }
    }

    return null;
  }

  /** Validate coordinate ranges */
  #isValidCoordinate(lat: number, lng: number): boolean {
    return (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  // ──────────────────────────────────────────────
  // Internal: spatial clustering
  // ──────────────────────────────────────────────

  /**
   * Cluster geo items that are within `radius` pixels of each other
   * at the current zoom level.
   *
   * Pseudocode:
   *   Use a simple greedy clustering algorithm:
   *   1. Start with all items unclustered
   *   2. Pick the first unclustered item, create a cluster
   *   3. Find all unclustered items within `radius` pixels
   *   4. Add them to the cluster, compute new center
   *   5. Repeat until all items are clustered
   *
   * Uses a reference viewport of 800x600 for pixel distance estimation.
   */
  #clusterItems(items: GeoItem[], radius: number = DEFAULT_CLUSTER_RADIUS): Cluster[] {
    if (items.length === 0) return [];
    if (items.length === 1) {
      return [{
        id: `cluster-0`,
        centerLat: items[0].lat,
        centerLng: items[0].lng,
        items: [items[0]],
      }];
    }

    // Reference viewport for pixel distance estimation
    const refWidth = 800;
    const refHeight = 600;

    const clustered = new Set<number>();
    const clusters: Cluster[] = [];
    let clusterIdx = 0;

    for (let i = 0; i < items.length; i++) {
      if (clustered.has(i)) continue;

      // Start a new cluster with this item
      const clusterItems: GeoItem[] = [items[i]];
      clustered.add(i);

      const seedPixel = this.geoToPixel(items[i].lat, items[i].lng, refWidth, refHeight);

      // Find all nearby unclustered items
      for (let j = i + 1; j < items.length; j++) {
        if (clustered.has(j)) continue;

        const candidatePixel = this.geoToPixel(items[j].lat, items[j].lng, refWidth, refHeight);
        const dist = GeoPoint.distance(seedPixel, candidatePixel);

        if (dist <= radius) {
          clusterItems.push(items[j]);
          clustered.add(j);
        }
      }

      // Compute cluster center as average of member coordinates
      const centerLat = clusterItems.reduce((sum, it) => sum + it.lat, 0) / clusterItems.length;
      const centerLng = clusterItems.reduce((sum, it) => sum + it.lng, 0) / clusterItems.length;

      clusters.push({
        id: `cluster-${clusterIdx++}`,
        centerLat,
        centerLng,
        items: clusterItems,
      });
    }

    return clusters;
  }

  // ──────────────────────────────────────────────
  // Internal: bounding box calculation
  // ──────────────────────────────────────────────

  /**
   * Calculate the geographic bounding box of all items.
   * Adds 10% padding on each side so items don't sit at edges.
   */
  #calculateBounds(items: GeoItem[]): MapBounds {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const item of items) {
      if (item.lat < minLat) minLat = item.lat;
      if (item.lat > maxLat) maxLat = item.lat;
      if (item.lng < minLng) minLng = item.lng;
      if (item.lng > maxLng) maxLng = item.lng;
    }

    // Add padding (10% of range on each side)
    const latRange = maxLat - minLat || 1; // Avoid zero range for single point
    const lngRange = maxLng - minLng || 1;
    const latPad = latRange * BOUNDS_PADDING;
    const lngPad = lngRange * BOUNDS_PADDING;

    return {
      minLat: Math.max(-90, minLat - latPad),
      maxLat: Math.min(90, maxLat + latPad),
      minLng: Math.max(-180, minLng - lngPad),
      maxLng: Math.min(180, maxLng + lngPad),
    };
  }
}
