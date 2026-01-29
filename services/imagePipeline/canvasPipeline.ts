/**
 * Canvas Tile Pipeline
 *
 * Pipeline class for generating IIIF tile pyramids using the Canvas API.
 * Generates multi-resolution tiles for efficient image streaming and zooming.
 *
 * @example
 * ```typescript
 * const pipeline = createCanvasTilePipeline({ tileSize: 512 });
 *
 * const result = await pipeline.generateTilePyramid(imageFile, 'asset-123');
 * if (result) {
 *   console.log(`Generated ${result.totalTiles} tiles`);
 * }
 * ```
 */

import {
  TilePyramidConfig,
  TilePyramidResult,
  TilePyramidLevel,
  calculateTilePyramid,
  shouldGenerateTiles,
} from './tileCalculator';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Progress information for tile generation
 */
export interface TileGenerationProgress {
  /** Current pyramid level being processed */
  level: number;
  /** Current tile column */
  tileX: number;
  /** Current tile row */
  tileY: number;
  /** Total number of tiles to generate */
  totalTiles: number;
  /** Number of tiles completed so far */
  completedTiles: number;
  /** Percentage complete (0-100) */
  percentComplete: number;
}

/**
 * Options for CanvasTilePipeline
 */
export interface CanvasTilePipelineOptions {
  /** JPEG quality (0-1), default: 0.85 */
  quality?: number;
  /** Callback for progress updates */
  onProgress?: (progress: TileGenerationProgress) => void;
  /** Callback when a single tile is generated */
  onTileGenerated?: (level: number, x: number, y: number, blob: Blob) => void;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

/**
 * Result of tile pyramid generation
 */
export interface TilePyramidGenerationResult {
  /** Map of tile keys to blob data */
  tiles: Map<string, Blob>;
  /** IIIF descriptor for the pyramid */
  descriptor: TilePyramidResult['descriptor'];
  /** Total number of tiles generated */
  totalTiles: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_PIPELINE_OPTIONS: Required<Omit<CanvasTilePipelineOptions, 'onProgress' | 'onTileGenerated' | 'signal'>> = {
  quality: 0.85,
};

const DEFAULT_TILE_CONFIG: TilePyramidConfig = {
  tileSize: 512,
  overlap: 0,
  format: 'jpg',
  maxTiles: 10000,
  minLevel: 0,
};

/** Number of tiles to process in each batch to avoid memory issues */
const DEFAULT_BATCH_SIZE = 4;

// ============================================================================
// CanvasTilePipeline Class
// ============================================================================

/**
 * Pipeline for generating IIIF tile pyramids using the Canvas API.
 *
 * This class handles:
 * - Decoding images efficiently using createImageBitmap
 * - Generating scaled pyramid levels
 * - Slicing levels into tiles
 * - Converting tiles to JPEG with configurable quality
 * - Memory management via bitmap.close()
 * - Progress tracking and cancellation support
 */
export class CanvasTilePipeline {
  private config: TilePyramidConfig;
  private options: CanvasTilePipelineOptions;

  /**
   * Creates a new CanvasTilePipeline instance
   *
   * @param config - Partial tile pyramid configuration
   * @param options - Pipeline options
   */
  constructor(
    config: Partial<TilePyramidConfig> = {},
    options: CanvasTilePipelineOptions = {}
  ) {
    this.config = {
      ...DEFAULT_TILE_CONFIG,
      ...config,
    };
    this.options = {
      ...DEFAULT_PIPELINE_OPTIONS,
      ...options,
    };
  }

  /**
   * Generate a complete tile pyramid for an image file.
   *
   * @param file - Image file as Blob
   * @param assetId - Unique identifier for the asset
   * @returns Tile pyramid result or null if generation was skipped
   * @throws Error if image decoding fails or generation is aborted
   *
   * @example
   * ```typescript
   * const result = await pipeline.generateTilePyramid(imageFile, 'asset-123');
   * if (result) {
   *   // Access tiles
   *   const tileBlob = result.tiles.get('2/0_0.jpg');
   * }
   * ```
   */
  async generateTilePyramid(
    file: Blob,
    assetId: string
  ): Promise<TilePyramidGenerationResult | null> {
    // Check for cancellation before starting
    this.checkCancellation();

    // Decode the image file into a bitmap
    let sourceBitmap: ImageBitmap | null = null;
    try {
      sourceBitmap = await createImageBitmap(file);
    } catch (error) {
      throw new Error(
        `Failed to decode image: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    try {
      const { width, height } = sourceBitmap;

      // Check if we should skip pyramid generation for this image
      if (this.shouldSkipGeneration(width, height)) {
        // Clean up the bitmap
        sourceBitmap.close();
        return null;
      }

      // Calculate the tile pyramid structure
      const pyramid = calculateTilePyramid(width, height, this.config);

      // Generate tiles for all levels
      const tiles = new Map<string, Blob>();
      let completedTiles = 0;

      // Process each level
      for (const level of pyramid.levels) {
        // Check for cancellation before processing each level
        this.checkCancellation();

        // Generate tiles for this level
        const levelTiles = await this.generateLevelTiles(
          sourceBitmap,
          level,
          pyramid,
          completedTiles,
          tiles
        );

        completedTiles += levelTiles;
      }

      return {
        tiles,
        descriptor: pyramid.descriptor,
        totalTiles: pyramid.totalTiles,
      };
    } finally {
      // Always clean up the bitmap, even on error
      if (sourceBitmap) {
        sourceBitmap.close();
      }
    }
  }

  /**
   * Generate all tiles for a single pyramid level.
   *
   * @param sourceBitmap - Source image bitmap
   * @param level - Current pyramid level
   * @param pyramid - Complete pyramid result
   * @param completedTiles - Number of tiles already completed
   * @param tiles - Map to store generated tiles
   * @returns Number of tiles generated for this level
   */
  private async generateLevelTiles(
    sourceBitmap: ImageBitmap,
    level: TilePyramidLevel,
    pyramid: TilePyramidResult,
    completedTiles: number,
    tiles: Map<string, Blob>
  ): Promise<number> {
    const { level: levelIndex, width: levelWidth, height: levelHeight, tileCols, tileRows } = level;
    let levelCompletedTiles = 0;

    // Create a scaled canvas for this level
    const levelCanvas = document.createElement('canvas');
    levelCanvas.width = levelWidth;
    levelCanvas.height = levelHeight;
    const levelCtx = levelCanvas.getContext('2d', { alpha: false });

    if (!levelCtx) {
      throw new Error(`Failed to get 2D context for level ${levelIndex}`);
    }

    // Use high-quality scaling
    levelCtx.imageSmoothingEnabled = true;
    levelCtx.imageSmoothingQuality = 'high';

    // Draw the scaled image
    levelCtx.drawImage(sourceBitmap, 0, 0, levelWidth, levelHeight);

    // Process tiles in batches to avoid memory issues
    const totalLevelTiles = tileCols * tileRows;
    const batchSize = DEFAULT_BATCH_SIZE;

    for (let batchStart = 0; batchStart < totalLevelTiles; batchStart += batchSize) {
      this.checkCancellation();

      const batchEnd = Math.min(batchStart + batchSize, totalLevelTiles);
      const batchPromises: Promise<void>[] = [];

      for (let i = batchStart; i < batchEnd; i++) {
        const tileX = i % tileCols;
        const tileY = Math.floor(i / tileCols);

        batchPromises.push(
          this.generateTile(levelCanvas, levelIndex, tileX, tileY).then((blob) => {
            // Store the tile
            const tileKey = `${levelIndex}/${tileX}_${tileY}.${this.config.format}`;
            tiles.set(tileKey, blob);

            // Call individual tile callback if provided
            this.options.onTileGenerated?.(levelIndex, tileX, tileY, blob);

            // Update progress
            levelCompletedTiles++;
            const totalCompleted = completedTiles + levelCompletedTiles;
            this.reportProgress({
              level: levelIndex,
              tileX,
              tileY,
              totalTiles: pyramid.totalTiles,
              completedTiles: totalCompleted,
              percentComplete: Math.round((totalCompleted / pyramid.totalTiles) * 100),
            });
          })
        );
      }

      await Promise.all(batchPromises);
    }

    return levelCompletedTiles;
  }

  /**
   * Generate a single tile from a level canvas.
   *
   * @param levelCanvas - Canvas containing the scaled level image
   * @param level - Pyramid level index
   * @param x - Tile column
   * @param y - Tile row
   * @returns JPEG blob for the tile
   */
  private async generateTile(
    levelCanvas: HTMLCanvasElement,
    level: number,
    x: number,
    y: number
  ): Promise<Blob> {
    const { tileSize } = this.config;

    // Calculate tile dimensions (handle edge tiles)
    const sourceX = x * tileSize;
    const sourceY = y * tileSize;
    const tileWidth = Math.min(tileSize, levelCanvas.width - sourceX);
    const tileHeight = Math.min(tileSize, levelCanvas.height - sourceY);

    // Create tile canvas
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = tileWidth;
    tileCanvas.height = tileHeight;
    const tileCtx = tileCanvas.getContext('2d', { alpha: false });

    if (!tileCtx) {
      throw new Error(`Failed to get 2D context for tile ${level}/${x}_${y}`);
    }

    // Copy tile region from level canvas
    tileCtx.drawImage(
      levelCanvas,
      sourceX,
      sourceY,
      tileWidth,
      tileHeight,
      0,
      0,
      tileWidth,
      tileHeight
    );

    // Convert to JPEG blob
    const quality = this.options.quality ?? DEFAULT_PIPELINE_OPTIONS.quality;
    const blob = await this.canvasToBlob(tileCanvas, 'image/jpeg', quality);

    return blob;
  }

  /**
   * Convert a canvas to a Blob with specified format and quality.
   *
   * @param canvas - Canvas element
   * @param type - MIME type
   * @param quality - Quality (0-1) for lossy formats
   * @returns Blob promise
   */
  private canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        type,
        quality
      );
    });
  }

  /**
   * Check if pyramid generation should be skipped for an image.
   *
   * @param imageWidth - Image width in pixels
   * @param imageHeight - Image height in pixels
   * @returns True if generation should be skipped
   */
  shouldSkipGeneration(imageWidth: number, imageHeight: number): boolean {
    return !shouldGenerateTiles(imageWidth, imageHeight, this.config.maxTiles);
  }

  /**
   * Check if the operation has been cancelled.
   *
   * @throws Error if the AbortSignal has been triggered
   */
  private checkCancellation(): void {
    if (this.options.signal?.aborted) {
      throw new Error('Tile generation cancelled');
    }
  }

  /**
   * Report progress to the callback if provided.
   *
   * @param progress - Current progress information
   */
  private reportProgress(progress: TileGenerationProgress): void {
    this.options.onProgress?.(progress);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new CanvasTilePipeline instance.
 *
 * Factory function for creating pipelines with custom configuration.
 *
 * @param config - Partial tile pyramid configuration
 * @param options - Pipeline options
 * @returns New CanvasTilePipeline instance
 *
 * @example
 * ```typescript
 * const pipeline = createCanvasTilePipeline(
 *   { tileSize: 512, maxTiles: 5000 },
 *   {
 *     quality: 0.9,
 *     onProgress: (p) => console.log(`${p.percentComplete}% complete`)
 *   }
 * );
 * ```
 */
export function createCanvasTilePipeline(
  config?: Partial<TilePyramidConfig>,
  options?: CanvasTilePipelineOptions
): CanvasTilePipeline {
  return new CanvasTilePipeline(config, options);
}
