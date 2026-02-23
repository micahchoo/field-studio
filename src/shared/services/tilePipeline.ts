/**
 * Tile Pipeline Service — Framework-agnostic
 *
 * Coordinates IIIF Image API 3.0 tile pyramid generation:
 * - Calculates tile grids and scale factors for images
 * - Manages worker pool for parallel tile generation via OffscreenCanvas
 * - Stores tiles in IndexedDB with LRU eviction
 * - Generates info.json for IIIF Image API compliance
 *
 * @see https://iiif.io/api/image/3.0/
 */

import type {
  TilePipelineConfig,
  TileCoord,
  StoredTile,
  TileManifest,
  TileGenerationProgress,
  ImageInfo,
  ImageTile,
  ImageSize,
} from '@/src/shared/types/image-pipeline';
import {
  DEFAULT_TILE_CONFIG,
  calculateScaleFactors,
  calculateTileGrid,
  estimateTotalTiles,
} from '@/src/shared/types/image-pipeline';

// Re-export utilities used by stores
export { estimateTotalTiles } from '@/src/shared/types/image-pipeline';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = 'field-studio-tiles';
const DB_VERSION = 1;
const TILES_STORE = 'tiles';
const MANIFESTS_STORE = 'tile-manifests';

// ---------------------------------------------------------------------------
// IndexedDB Management
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TILES_STORE)) {
        const store = db.createObjectStore(TILES_STORE, { keyPath: 'id' });
        store.createIndex('assetId', 'assetId', { unique: false });
        store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(MANIFESTS_STORE)) {
        db.createObjectStore(MANIFESTS_STORE, { keyPath: 'assetId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

// ---------------------------------------------------------------------------
// Tile Storage
// ---------------------------------------------------------------------------

/** Store a generated tile */
export async function storeTile(tile: StoredTile): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TILES_STORE, 'readwrite');
    tx.objectStore(TILES_STORE).put(tile);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Retrieve a tile, updating its lastAccessedAt for LRU tracking */
export async function getTile(
  assetId: string,
  level: number,
  x: number,
  y: number,
): Promise<StoredTile | null> {
  const id = `${assetId}/${level}/${x}_${y}`;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TILES_STORE, 'readwrite');
    const store = tx.objectStore(TILES_STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const tile = req.result as StoredTile | undefined;
      if (tile) {
        // Update LRU timestamp
        tile.lastAccessedAt = Date.now();
        store.put(tile);
        resolve(tile);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Delete all tiles for an asset */
export async function deleteTilesForAsset(assetId: string): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([TILES_STORE, MANIFESTS_STORE], 'readwrite');
    const tileStore = tx.objectStore(TILES_STORE);
    const index = tileStore.index('assetId');
    const manifestStore = tx.objectStore(MANIFESTS_STORE);

    let deleted = 0;
    const cursor = index.openCursor(assetId);
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) {
        c.delete();
        deleted++;
        c.continue();
      }
    };

    manifestStore.delete(assetId);
    tx.oncomplete = () => resolve(deleted);
    tx.onerror = () => reject(tx.error);
  });
}

/** Get total storage used by all tiles (in bytes) */
export async function getTotalStorageUsed(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TILES_STORE, 'readonly');
    const store = tx.objectStore(TILES_STORE);
    let total = 0;

    const cursor = store.openCursor();
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) {
        total += (c.value as StoredTile).size;
        c.continue();
      } else {
        resolve(total);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
}

/**
 * LRU eviction: remove least-recently-accessed tiles until storage
 * drops below the given budget (in bytes).
 */
export async function evictTiles(budgetBytes: number): Promise<number> {
  const currentUsage = await getTotalStorageUsed();
  if (currentUsage <= budgetBytes) return 0;

  const db = await openDB();
  const toEvict = currentUsage - budgetBytes;
  let evicted = 0;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(TILES_STORE, 'readwrite');
    const index = tx.objectStore(TILES_STORE).index('lastAccessedAt');

    // Walk from oldest accessed to newest
    const cursor = index.openCursor(null, 'next');
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c && evicted < toEvict) {
        evicted += (c.value as StoredTile).size;
        c.delete();
        c.continue();
      }
    };

    tx.oncomplete = () => resolve(evicted);
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------------------------------------------------------------------
// Tile Manifest (pyramid metadata per asset)
// ---------------------------------------------------------------------------

/** Save or update the tile manifest for an asset */
export async function saveTileManifest(manifest: TileManifest): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MANIFESTS_STORE, 'readwrite');
    tx.objectStore(MANIFESTS_STORE).put(manifest);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get the tile manifest for an asset */
export async function getTileManifest(assetId: string): Promise<TileManifest | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MANIFESTS_STORE, 'readonly');
    const req = tx.objectStore(MANIFESTS_STORE).get(assetId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

/** Get all tile manifests */
export async function getAllTileManifests(): Promise<TileManifest[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MANIFESTS_STORE, 'readonly');
    const req = tx.objectStore(MANIFESTS_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Tile Generation
// ---------------------------------------------------------------------------

/**
 * Plan tile generation for an image.
 * Returns the list of tile coordinates that need to be generated.
 */
export function planTileGeneration(
  assetId: string,
  width: number,
  height: number,
  config: TilePipelineConfig = DEFAULT_TILE_CONFIG,
): { coords: TileCoord[]; scaleFactors: number[]; manifest: TileManifest } {
  const maxDim = Math.max(width, height);

  // Skip images smaller than the threshold
  if (maxDim < config.minDimensionForTiling) {
    const manifest: TileManifest = {
      assetId,
      width,
      height,
      scaleFactors: [],
      tileSize: config.tileSize,
      format: config.format,
      totalTiles: 0,
      totalSize: 0,
      status: 'skipped',
    };
    return { coords: [], scaleFactors: [], manifest };
  }

  const scaleFactors = calculateScaleFactors(
    width,
    height,
    config.tileSize,
    config.maxScaleFactors,
  );

  const coords: TileCoord[] = [];
  for (const factor of scaleFactors) {
    const grid = calculateTileGrid(width, height, config.tileSize, factor);
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        coords.push({ level: Math.log2(factor), x, y });
      }
    }
  }

  // Enforce max tiles limit
  if (coords.length > config.maxTilesPerImage) {
    const manifest: TileManifest = {
      assetId,
      width,
      height,
      scaleFactors: [],
      tileSize: config.tileSize,
      format: config.format,
      totalTiles: 0,
      totalSize: 0,
      status: 'skipped',
    };
    return { coords: [], scaleFactors: [], manifest };
  }

  const manifest: TileManifest = {
    assetId,
    width,
    height,
    scaleFactors,
    tileSize: config.tileSize,
    format: config.format,
    totalTiles: coords.length,
    totalSize: 0,
    status: 'pending',
  };

  return { coords, scaleFactors, manifest };
}

/**
 * Generate a single tile from an ImageBitmap source.
 * Uses OffscreenCanvas to avoid blocking the main thread.
 *
 * Call this in a Web Worker or on the main thread for small batches.
 */
export async function generateTile(
  source: ImageBitmap,
  assetId: string,
  coord: TileCoord,
  imageWidth: number,
  imageHeight: number,
  config: TilePipelineConfig = DEFAULT_TILE_CONFIG,
): Promise<StoredTile> {
  const scaleFactor = Math.pow(2, coord.level);
  const tileSize = config.tileSize;

  // Source region in full-resolution pixel coordinates
  const srcX = coord.x * tileSize * scaleFactor;
  const srcY = coord.y * tileSize * scaleFactor;
  const srcW = Math.min(tileSize * scaleFactor, imageWidth - srcX);
  const srcH = Math.min(tileSize * scaleFactor, imageHeight - srcY);

  // Output tile dimensions
  const outW = Math.ceil(srcW / scaleFactor);
  const outH = Math.ceil(srcH / scaleFactor);

  const canvas = new OffscreenCanvas(outW, outH);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

  const mimeType =
    config.format === 'png'
      ? 'image/png'
      : config.format === 'webp'
        ? 'image/webp'
        : 'image/jpeg';

  const blob = await canvas.convertToBlob({
    type: mimeType,
    quality: config.quality / 100,
  });

  return {
    id: `${assetId}/${coord.level}/${coord.x}_${coord.y}`,
    assetId,
    level: coord.level,
    x: coord.x,
    y: coord.y,
    blob,
    size: blob.size,
    createdAt: Date.now(),
    lastAccessedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// info.json Generation
// ---------------------------------------------------------------------------

/**
 * Generate a IIIF Image API 3.0 info.json for an asset.
 * Used by the service worker to serve the info endpoint.
 */
export function generateInfoJson(
  baseUrl: string,
  assetId: string,
  manifest: TileManifest,
): ImageInfo {
  const sizes: ImageSize[] = manifest.scaleFactors
    .filter((f) => f > 1) // Skip full resolution (it's implicitly available)
    .map((factor) => ({
      width: Math.ceil(manifest.width / factor),
      height: Math.ceil(manifest.height / factor),
    }));

  const tiles: ImageTile[] =
    manifest.scaleFactors.length > 0
      ? [
          {
            width: manifest.tileSize,
            scaleFactors: manifest.scaleFactors,
          },
        ]
      : [];

  // Determine compliance level based on what the service worker supports
  const profile: ImageInfo['profile'] =
    manifest.status === 'complete' ? 'level1' : 'level0';

  return {
    '@context': 'http://iiif.io/api/image/3/context.json',
    id: `${baseUrl}/${assetId}`,
    type: 'ImageService3',
    protocol: 'http://iiif.io/api/image',
    profile,
    width: manifest.width,
    height: manifest.height,
    sizes: sizes.length > 0 ? sizes : undefined,
    tiles: tiles.length > 0 ? tiles : undefined,
    preferredFormats: [manifest.format === 'jpeg' ? 'jpg' : manifest.format],
    extraQualities: ['gray', 'bitonal'],
    extraFeatures: [
      'baseUriRedirect',
      'regionByPx',
      'sizeByW',
      'sizeByH',
      'sizeByWh',
    ],
  };
}

// ---------------------------------------------------------------------------
// Pipeline Coordination
// ---------------------------------------------------------------------------

/**
 * Callback for progress reporting during batch tile generation.
 */
export type ProgressCallback = (progress: TileGenerationProgress) => void;

/**
 * Generate all tiles for an asset with progress reporting.
 *
 * This is the main entry point for tile generation. It:
 * 1. Plans the tile grid
 * 2. Generates tiles in batches (respecting concurrency limits)
 * 3. Stores tiles in IndexedDB
 * 4. Updates the tile manifest
 * 5. Reports progress via callback
 *
 * Returns the completed tile manifest.
 */
export async function generateTilesForAsset(
  source: ImageBitmap,
  assetId: string,
  assetLabel: string,
  width: number,
  height: number,
  config: TilePipelineConfig = DEFAULT_TILE_CONFIG,
  onProgress?: ProgressCallback,
  abortSignal?: AbortSignal,
): Promise<TileManifest> {
  const { coords, manifest } = planTileGeneration(
    assetId,
    width,
    height,
    config,
  );

  if (manifest.status === 'skipped') {
    await saveTileManifest(manifest);
    return manifest;
  }

  manifest.status = 'generating';
  manifest.startedAt = Date.now();
  await saveTileManifest(manifest);

  const progress: TileGenerationProgress = {
    assetId,
    assetLabel,
    status: 'generating',
    tilesCompleted: 0,
    tilesTotal: coords.length,
    bytesWritten: 0,
  };

  onProgress?.(progress);

  // Process in batches for concurrency control
  const batchSize = config.maxConcurrentWorkers;

  try {
    for (let i = 0; i < coords.length; i += batchSize) {
      if (abortSignal?.aborted) {
        manifest.status = 'partial';
        await saveTileManifest(manifest);
        return manifest;
      }

      const batch = coords.slice(i, i + batchSize);
      const tiles = await Promise.all(
        batch.map((coord) =>
          generateTile(source, assetId, coord, width, height, config),
        ),
      );

      // Store all tiles in the batch
      for (const tile of tiles) {
        await storeTile(tile);
        progress.tilesCompleted++;
        progress.bytesWritten += tile.size;
        manifest.totalSize += tile.size;
      }

      progress.currentLevel = batch[batch.length - 1].level;
      onProgress?.({ ...progress });
    }

    manifest.status = 'complete';
    manifest.completedAt = Date.now();
    await saveTileManifest(manifest);

    progress.status = 'complete';
    onProgress?.(progress);

    return manifest;
  } catch (err) {
    manifest.status = 'failed';
    await saveTileManifest(manifest);

    progress.status = 'failed';
    progress.error = err instanceof Error ? err.message : String(err);
    onProgress?.(progress);

    throw err;
  }
}

/**
 * Check if an image should have tiles generated based on its dimensions
 * and the pipeline config.
 */
export function shouldGenerateTiles(
  width: number,
  height: number,
  config: TilePipelineConfig = DEFAULT_TILE_CONFIG,
): boolean {
  if (!config.autoGenerate) return false;
  const maxDim = Math.max(width, height);
  if (maxDim < config.minDimensionForTiling) return false;
  const totalTiles = estimateTotalTiles(width, height, config.tileSize, config.maxScaleFactors);
  return totalTiles <= config.maxTilesPerImage;
}
