/**
 * IIIF Image API 3.0 Pipeline Types
 * Types for tile pyramid generation, processing pipeline, and image transforms.
 * @see https://iiif.io/api/image/3.0/
 */

// ---------------------------------------------------------------------------
// Tile Pyramid Configuration
// ---------------------------------------------------------------------------

export interface TilePipelineConfig {
  /** Tile size in pixels (both width and height). Default: 512 */
  tileSize: number;
  /** Output format for tiles. Default: 'jpeg' */
  format: 'jpeg' | 'png' | 'webp';
  /** JPEG/WebP quality (1-100). Default: 80 */
  quality: number;
  /** Maximum number of scale factors to generate. Default: auto-calculated */
  maxScaleFactors?: number;
  /** Maximum tiles per image before falling back to derivative-only. Default: 10000 */
  maxTilesPerImage: number;
  /** Maximum concurrent processing workers. Default: 4 */
  maxConcurrentWorkers: number;
  /** Maximum memory budget in MB. Default: 512 */
  maxMemoryMB: number;
  /** Whether to generate tiles automatically after ingest. Default: true */
  autoGenerate: boolean;
  /** Minimum image dimension (px) before tile generation is triggered. Default: 2048 */
  minDimensionForTiling: number;
}

export const DEFAULT_TILE_CONFIG: TilePipelineConfig = {
  tileSize: 512,
  format: 'jpeg',
  quality: 80,
  maxTilesPerImage: 10000,
  maxConcurrentWorkers: 4,
  maxMemoryMB: 512,
  autoGenerate: true,
  minDimensionForTiling: 2048,
};

// ---------------------------------------------------------------------------
// Tile Coordinates & Storage
// ---------------------------------------------------------------------------

/** A single tile's coordinates within the pyramid */
export interface TileCoord {
  /** Scale factor level (0 = full resolution, higher = smaller) */
  level: number;
  /** Column index */
  x: number;
  /** Row index */
  y: number;
}

/** Stored tile entry in IndexedDB */
export interface StoredTile {
  /** Composite key: `${assetId}/${level}/${x}_${y}` */
  id: string;
  assetId: string;
  level: number;
  x: number;
  y: number;
  /** Tile image data */
  blob: Blob;
  /** Byte size */
  size: number;
  /** When this tile was generated */
  createdAt: number;
  /** Last time this tile was accessed (for LRU eviction) */
  lastAccessedAt: number;
}

/** Tile manifest for an asset (describes the pyramid structure) */
export interface TileManifest {
  assetId: string;
  /** Full image width */
  width: number;
  /** Full image height */
  height: number;
  /** Available scale factors */
  scaleFactors: number[];
  /** Tile size used */
  tileSize: number;
  /** Output format */
  format: string;
  /** Total tile count */
  totalTiles: number;
  /** Total storage size in bytes */
  totalSize: number;
  /** Generation status */
  status: TileGenerationStatus;
  /** When generation started */
  startedAt?: number;
  /** When generation completed */
  completedAt?: number;
}

export type TileGenerationStatus =
  | 'pending'      // Queued but not started
  | 'generating'   // In progress
  | 'complete'     // All tiles generated
  | 'partial'      // Some tiles generated (interrupted)
  | 'failed'       // Generation failed
  | 'skipped';     // Image too small, using derivatives only

// ---------------------------------------------------------------------------
// Generation Progress
// ---------------------------------------------------------------------------

export interface TileGenerationProgress {
  assetId: string;
  assetLabel: string;
  status: TileGenerationStatus;
  /** Tiles generated so far */
  tilesCompleted: number;
  /** Total tiles to generate */
  tilesTotal: number;
  /** Bytes written so far */
  bytesWritten: number;
  /** Current scale factor being processed */
  currentLevel?: number;
  /** Error message if failed */
  error?: string;
}

export interface PipelineQueueState {
  /** Assets waiting to be processed */
  queue: PipelineQueueEntry[];
  /** Currently processing */
  active: TileGenerationProgress[];
  /** Total tiles generated across all assets */
  totalTilesGenerated: number;
  /** Total storage used by tiles in bytes */
  totalStorageUsed: number;
  /** Processing is paused */
  paused: boolean;
}

export interface PipelineQueueEntry {
  assetId: string;
  assetLabel: string;
  width: number;
  height: number;
  estimatedTiles: number;
  priority: 'high' | 'normal' | 'low';
}

// ---------------------------------------------------------------------------
// IIIF Image API Info.json
// ---------------------------------------------------------------------------

/** info.json response structure for IIIF Image API 3.0 */
export interface ImageInfo {
  '@context': 'http://iiif.io/api/image/3/context.json';
  id: string;
  type: 'ImageService3';
  protocol: 'http://iiif.io/api/image';
  profile: 'level0' | 'level1' | 'level2';
  width: number;
  height: number;
  maxWidth?: number;
  maxHeight?: number;
  maxArea?: number;
  sizes?: ImageSize[];
  tiles?: ImageTile[];
  preferredFormats?: string[];
  extraQualities?: string[];
  extraFormats?: string[];
  extraFeatures?: string[];
  rights?: string;
}

export interface ImageSize {
  width: number;
  height: number;
}

export interface ImageTile {
  width: number;
  height?: number;
  scaleFactors: number[];
}

// ---------------------------------------------------------------------------
// Image Request Parameters (for Image Request Workbench)
// ---------------------------------------------------------------------------

export interface ImageRequestParams {
  /** Image identifier */
  identifier: string;
  /** Region: 'full', 'square', 'x,y,w,h', 'pct:x,y,w,h' */
  region: string;
  /** Size: 'max', '^max', 'w,', ',h', 'pct:n', 'w,h', '!w,h', etc. */
  size: string;
  /** Rotation: 0-360, prefix with '!' for mirroring */
  rotation: string;
  /** Quality: 'default', 'color', 'gray', 'bitonal' */
  quality: 'default' | 'color' | 'gray' | 'bitonal';
  /** Output format */
  format: 'jpg' | 'png' | 'webp' | 'tif' | 'gif' | 'jp2' | 'pdf';
}

/** Build a IIIF Image API URL from parameters */
export function buildImageApiUrl(
  baseUrl: string,
  params: ImageRequestParams,
): string {
  return `${baseUrl}/${params.identifier}/${params.region}/${params.size}/${params.rotation}/${params.quality}.${params.format}`;
}

// ---------------------------------------------------------------------------
// Tile Calculation Utilities
// ---------------------------------------------------------------------------

/** Calculate the tile grid dimensions for a given scale factor */
export function calculateTileGrid(
  imageWidth: number,
  imageHeight: number,
  tileSize: number,
  scaleFactor: number,
): { cols: number; rows: number; totalTiles: number } {
  const scaledWidth = Math.ceil(imageWidth / scaleFactor);
  const scaledHeight = Math.ceil(imageHeight / scaleFactor);
  const cols = Math.ceil(scaledWidth / tileSize);
  const rows = Math.ceil(scaledHeight / tileSize);
  return { cols, rows, totalTiles: cols * rows };
}

/** Calculate all scale factors for an image */
export function calculateScaleFactors(
  imageWidth: number,
  imageHeight: number,
  tileSize: number,
  maxFactors?: number,
): number[] {
  const factors: number[] = [];
  let factor = 1;
  const maxDim = Math.max(imageWidth, imageHeight);

  while (maxDim / factor > tileSize) {
    factors.push(factor);
    factor *= 2;
  }
  factors.push(factor); // Include the final level where image fits in one tile

  if (maxFactors && factors.length > maxFactors) {
    return factors.slice(0, maxFactors);
  }
  return factors;
}

/** Estimate total tile count for an image */
export function estimateTotalTiles(
  imageWidth: number,
  imageHeight: number,
  tileSize: number,
  maxFactors?: number,
): number {
  const factors = calculateScaleFactors(imageWidth, imageHeight, tileSize, maxFactors);
  return factors.reduce((total, factor) => {
    const { totalTiles } = calculateTileGrid(imageWidth, imageHeight, tileSize, factor);
    return total + totalTiles;
  }, 0);
}
