/**
 * Tile Calculator
 *
 * Utility for calculating IIIF Image API 3.0 compliant tile pyramid configurations.
 * Generates multi-resolution tile pyramids for efficient image streaming and zooming.
 *
 * @example
 * ```typescript
 * const pyramid = calculateTilePyramid(8000, 6000, {
 *   tileSize: 512,
 *   overlap: 0,
 *   format: 'jpg'
 * });
 *
 * // Get tile URL
 * const url = getTileUrl('asset-123', 2, 0, 0, 'jpg');
 * ```
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface TilePyramidConfig {
  /** Default tile dimension in pixels */
  tileSize: number;
  /** Pixel overlap between adjacent tiles */
  overlap: number;
  /** Image format for tiles */
  format: 'jpg' | 'png';
  /** Maximum number of tiles before pyramid generation is skipped */
  maxTiles: number;
  /** Minimum pyramid level (0 = full resolution) */
  minLevel: number;
  /** Maximum pyramid level (auto-calculated if not provided) */
  maxLevel?: number;
}

export interface TilePyramidLevel {
  /** Pyramid level index (0 = full resolution) */
  level: number;
  /** Width of the image at this level */
  width: number;
  /** Height of the image at this level */
  height: number;
  /** Number of tile columns at this level */
  tileCols: number;
  /** Number of tile rows at this level */
  tileRows: number;
  /** Scale factor relative to full resolution */
  scale: number;
}

/**
 * IIIF Image API 3.0 compliant descriptor for a tile pyramid
 */
export interface TilePyramidDescriptor {
  width: number;
  height: number;
  tileSize: number;
  overlap: number;
  format: string;
  levels: number;
}

export interface TilePyramidResult {
  /** Array of pyramid levels from min to max */
  levels: TilePyramidLevel[];
  /** Total number of tiles across all levels */
  totalTiles: number;
  /** IIIF Image API 3.0 compliant descriptor */
  descriptor: TilePyramidDescriptor;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: TilePyramidConfig = {
  tileSize: 512,
  overlap: 0,
  format: 'jpg',
  maxTiles: 10000,
  minLevel: 0,
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Calculates the maximum pyramid level for an image.
 * The maximum level is the number of times the image can be halved
 * until both dimensions are smaller than the tile size.
 *
 * @param width - Full resolution image width
 * @param height - Full resolution image height
 * @returns Maximum pyramid level (0-based)
 *
 * @example
 * ```typescript
 * calculateMaxLevel(8000, 6000); // Returns 4
 * ```
 */
export function calculateMaxLevel(width: number, height: number): number {
  if (width <= 0 || height <= 0) {
    return 0;
  }

  let level = 0;
  let currentWidth = width;
  let currentHeight = height;

  // Continue halving until both dimensions are 1x1 or smaller
  while (currentWidth > 1 && currentHeight > 1) {
    currentWidth = Math.floor(currentWidth / 2);
    currentHeight = Math.floor(currentHeight / 2);
    level++;
  }

  return level;
}

/**
 * Determines if tiles should be generated based on image size and maxTiles threshold.
 * Small images may not benefit from tiling and can be served as single files.
 *
 * @param imageWidth - Full resolution image width
 * @param imageHeight - Full resolution image height
 * @param maxTiles - Maximum tiles threshold
 * @returns True if tiling should be performed
 *
 * @example
 * ```typescript
 * shouldGenerateTiles(8000, 6000, 10000); // Returns true
 * shouldGenerateTiles(100, 100, 10000);   // Returns false
 * ```
 */
export function shouldGenerateTiles(
  imageWidth: number,
  imageHeight: number,
  maxTiles: number
): boolean {
  if (imageWidth <= 0 || imageHeight <= 0 || maxTiles <= 0) {
    return false;
  }

  // Calculate total tiles at full resolution with default tile size
  const tileSize = DEFAULT_CONFIG.tileSize;
  const cols = Math.ceil(imageWidth / tileSize);
  const rows = Math.ceil(imageHeight / tileSize);
  const fullResTiles = cols * rows;

  // If even full resolution would exceed maxTiles, don't tile
  if (fullResTiles > maxTiles) {
    return false;
  }

  // For very small images (smaller than 2x tile size), tiling may not be beneficial
  const minTiledDimension = tileSize * 2;
  if (imageWidth < minTiledDimension && imageHeight < minTiledDimension) {
    return false;
  }

  // Estimate total tiles across all pyramid levels
  const maxLevel = calculateMaxLevel(imageWidth, imageHeight);
  let estimatedTotalTiles = 0;

  for (let level = 0; level <= maxLevel; level++) {
    const scale = 1 / Math.pow(2, level);
    const levelWidth = Math.max(1, Math.floor(imageWidth * scale));
    const levelHeight = Math.max(1, Math.floor(imageHeight * scale));
    const levelCols = Math.ceil(levelWidth / tileSize);
    const levelRows = Math.ceil(levelHeight / tileSize);
    estimatedTotalTiles += levelCols * levelRows;
  }

  return estimatedTotalTiles <= maxTiles;
}

/**
 * Calculates a complete IIIF Image API 3.0 compliant tile pyramid.
 *
 * @param imageWidth - Full resolution image width
 * @param imageHeight - Full resolution image height
 * @param config - Optional partial configuration
 * @returns Complete tile pyramid result
 *
 * @example
 * ```typescript
 * const pyramid = calculateTilePyramid(8000, 6000, {
 *   tileSize: 512,
 *   overlap: 0,
 *   format: 'jpg',
 *   maxTiles: 10000
 * });
 * ```
 */
export function calculateTilePyramid(
  imageWidth: number,
  imageHeight: number,
  config?: Partial<TilePyramidConfig>
): TilePyramidResult {
  // Merge with defaults
  const mergedConfig: TilePyramidConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Validate inputs
  if (imageWidth <= 0 || imageHeight <= 0) {
    throw new Error(
      `Invalid image dimensions: ${imageWidth}x${imageHeight}. Both must be positive.`
    );
  }

  if (mergedConfig.tileSize <= 0) {
    throw new Error(`Invalid tile size: ${mergedConfig.tileSize}. Must be positive.`);
  }

  if (mergedConfig.overlap < 0) {
    throw new Error(`Invalid overlap: ${mergedConfig.overlap}. Must be non-negative.`);
  }

  // Calculate max level if not provided
  const calculatedMaxLevel =
    mergedConfig.maxLevel ?? calculateMaxLevel(imageWidth, imageHeight);

  // Clamp max level to valid range
  const effectiveMaxLevel = Math.max(
    mergedConfig.minLevel,
    Math.min(calculatedMaxLevel, 20) // Prevent excessive levels
  );

  const levels: TilePyramidLevel[] = [];
  let totalTiles = 0;

  // Generate each pyramid level
  for (let level = mergedConfig.minLevel; level <= effectiveMaxLevel; level++) {
    const scale = 1 / Math.pow(2, level);

    // Calculate dimensions at this level
    const levelWidth = Math.max(1, Math.floor(imageWidth * scale));
    const levelHeight = Math.max(1, Math.floor(imageHeight * scale));

    // Calculate tile grid
    // For IIIF compliance, we use ceiling division
    const effectiveTileSize = mergedConfig.tileSize - mergedConfig.overlap;
    const tileCols = Math.max(1, Math.ceil(levelWidth / effectiveTileSize));
    const tileRows = Math.max(1, Math.ceil(levelHeight / effectiveTileSize));

    // Count tiles at this level
    const levelTiles = tileCols * tileRows;
    totalTiles += levelTiles;

    // Check max tiles threshold (but always include at least minLevel)
    if (level > mergedConfig.minLevel && totalTiles > mergedConfig.maxTiles) {
      // Roll back and stop
      totalTiles -= levelTiles;
      break;
    }

    levels.push({
      level,
      width: levelWidth,
      height: levelHeight,
      tileCols,
      tileRows,
      scale,
    });
  }

  return {
    levels,
    totalTiles,
    descriptor: {
      width: imageWidth,
      height: imageHeight,
      tileSize: mergedConfig.tileSize,
      overlap: mergedConfig.overlap,
      format: mergedConfig.format,
      levels: levels.length,
    },
  };
}

/**
 * Generates a tile URL following IIIF Image API 3.0 format.
 *
 * @param assetId - Unique asset identifier
 * @param level - Pyramid level
 * @param x - Tile column index
 * @param y - Tile row index
 * @param format - Image format extension
 * @returns IIIF compliant tile URL
 *
 * @example
 * ```typescript
 * getTileUrl('asset-123', 2, 0, 0, 'jpg');
 * // Returns: "/tiles/asset-123/2/0_0.jpg"
 * ```
 */
export function getTileUrl(
  assetId: string,
  level: number,
  x: number,
  y: number,
  format: string
): string {
  // Sanitize inputs
  const safeAssetId = encodeURIComponent(assetId);
  const safeLevel = Math.max(0, Math.floor(level));
  const safeX = Math.max(0, Math.floor(x));
  const safeY = Math.max(0, Math.floor(y));
  const safeFormat = format.replace(/^\./, ''); // Remove leading dot if present

  return `/tiles/${safeAssetId}/${safeLevel}/${safeX}_${safeY}.${safeFormat}`;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculates the region for a specific tile in IIIF region format.
 *
 * @param level - Pyramid level
 * @param x - Tile column
 * @param y - Tile row
 * @param config - Tile configuration
 * @returns IIIF region string (e.g., "0,0,512,512")
 */
export function calculateTileRegion(
  level: TilePyramidLevel,
  x: number,
  y: number,
  config: TilePyramidConfig
): string {
  const tileSize = config.tileSize;
  const overlap = config.overlap;

  // Calculate pixel coordinates
  const xStart = Math.max(0, x * tileSize - overlap);
  const yStart = Math.max(0, y * tileSize - overlap);
  const xEnd = Math.min(level.width, (x + 1) * tileSize + overlap);
  const yEnd = Math.min(level.height, (y + 1) * tileSize + overlap);

  const width = xEnd - xStart;
  const height = yEnd - yStart;

  return `${xStart},${yStart},${width},${height}`;
}

/**
 * Calculates the IIIF size parameter for a tile.
 *
 * @param level - Pyramid level
 * @param config - Tile configuration
 * @returns IIIF size string
 */
export function calculateTileSize(
  level: TilePyramidLevel,
  config: TilePyramidConfig
): string {
  // Full size at this level
  return `${level.width},${level.height}`;
}

/**
 * Gets the pixel dimensions for a specific tile.
 *
 * @param level - Pyramid level
 * @param x - Tile column
 * @param y - Tile row
 * @param config - Tile configuration
 * @returns Tile dimensions
 */
export function getTileDimensions(
  level: TilePyramidLevel,
  x: number,
  y: number,
  config: TilePyramidConfig
): { width: number; height: number } {
  const tileSize = config.tileSize;
  const overlap = config.overlap;

  const xStart = Math.max(0, x * tileSize - overlap);
  const yStart = Math.max(0, y * tileSize - overlap);
  const xEnd = Math.min(level.width, (x + 1) * tileSize + overlap);
  const yEnd = Math.min(level.height, (y + 1) * tileSize + overlap);

  return {
    width: xEnd - xStart,
    height: yEnd - yStart,
  };
}

/**
 * Estimates the storage size for a tile pyramid.
 *
 * @param result - Tile pyramid result
 * @param bytesPerTile - Estimated bytes per tile (default: 50KB)
 * @returns Estimated total bytes
 */
export function estimatePyramidStorage(
  result: TilePyramidResult,
  bytesPerTile: number = 50 * 1024
): number {
  return result.totalTiles * bytesPerTile;
}

/**
 * Formats a byte size into human readable string.
 *
 * @param bytes - Number of bytes
 * @returns Human readable string (e.g., "2.5 MB")
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// ============================================================================
// IIIF Image API 3.0 Info.json Generation
// ============================================================================

/**
 * Generates IIIF Image API 3.0 info.json content.
 *
 * @param baseUrl - Base URL for the image service
 * @param result - Tile pyramid result
 * @returns IIIF info.json object
 */
export function generateInfoJson(
  baseUrl: string,
  result: TilePyramidResult
): Record<string, unknown> {
  const { descriptor, levels } = result;

  return {
    '@context': 'http://iiif.io/api/image/3/context.json',
    id: baseUrl,
    type: 'ImageService3',
    protocol: 'http://iiif.io/api/image',
    width: descriptor.width,
    height: descriptor.height,
    profile: 'level2',
    tiles: [
      {
        width: descriptor.tileSize,
        height: descriptor.tileSize,
        scaleFactors: levels.map((l) => Math.round(1 / l.scale)),
      },
    ],
    sizes: levels.map((l) => ({
      width: l.width,
      height: l.height,
    })),
    preferredFormats: [descriptor.format],
  };
}
