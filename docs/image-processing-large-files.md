# Large Image File Processing in Browser: Implementation Guide

## Overview

This guide provides specific implementations for handling large image files in IIIF (International Image Interoperability Framework) and similar image processing applications.

## Table of Contents
1. [Image Tiling and Pyramid Generation](#1-image-tiling-and-pyramid-generation)
2. [Progressive Image Loading](#2-progressive-image-loading)
3. [IIIF Image API Integration](#3-iiif-image-api-integration)
4. [Web Worker Image Processing](#4-web-worker-image-processing)
5. [Memory-Efficient Canvas Operations](#5-memory-efficient-canvas-operations)

---

## 1. Image Tiling and Pyramid Generation

### Deep Zoom Image Tiler

```typescript
interface Tile {
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  url?: string;
  blob?: Blob;
}

interface PyramidLevel {
  level: number;
  width: number;
  height: number;
  tileSize: number;
  tiles: Tile[];
}

/**
 * Generate deep zoom pyramid for large images
 * Creates tiles at multiple resolutions for efficient viewing
 */
class DeepZoomTiler {
  private tileSize: number;
  private overlap: number;
  private format: string;
  private quality: number;

  constructor(options: {
    tileSize?: number;
    overlap?: number;
    format?: string;
    quality?: number;
  } = {}) {
    this.tileSize = options.tileSize || 512;
    this.overlap = options.overlap || 0;
    this.format = options.format || 'jpg';
    this.quality = options.quality || 0.9;
  }

  /**
   * Generate pyramid levels for an image
   */
  async generatePyramid(
    imageFile: File,
    onProgress?: (progress: { level: number; tile: number; totalTiles: number }) => void
  ): Promise<PyramidLevel[]> {
    const img = await this.loadImage(imageFile);
    const levels: PyramidLevel[] = [];

    // Calculate number of levels needed
    const maxDimension = Math.max(img.width, img.height);
    const maxLevel = Math.ceil(Math.log2(maxDimension / this.tileSize)) + 1;

    for (let level = maxLevel; level >= 0; level--) {
      const scale = Math.pow(2, maxLevel - level);
      const levelWidth = Math.ceil(img.width / scale);
      const levelHeight = Math.ceil(img.height / scale);

      const pyramidLevel: PyramidLevel = {
        level,
        width: levelWidth,
        height: levelHeight,
        tileSize: this.tileSize,
        tiles: []
      };

      // Generate tiles for this level
      const tilesX = Math.ceil(levelWidth / this.tileSize);
      const tilesY = Math.ceil(levelHeight / this.tileSize);
      const totalTiles = tilesX * tilesY;
      let tileCount = 0;

      for (let y = 0; y < tilesY; y++) {
        for (let x = 0; x < tilesX; x++) {
          const tile: Tile = {
            x,
            y,
            width: Math.min(this.tileSize, levelWidth - x * this.tileSize),
            height: Math.min(this.tileSize, levelHeight - y * this.tileSize),
            level
          };

          // Generate tile image
          tile.blob = await this.generateTile(img, tile, scale);
          pyramidLevel.tiles.push(tile);
          tileCount++;

          if (onProgress) {
            onProgress({ level, tile: tileCount, totalTiles });
          }

          // Yield to event loop every 10 tiles to prevent blocking
          if (tileCount % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      }

      levels.push(pyramidLevel);
    }

    return levels;
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }

  private async generateTile(
    sourceImg: HTMLImageElement,
    tile: Tile,
    scale: number
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = tile.width;
    canvas.height = tile.height;

    const ctx = canvas.getContext('2d')!;
    
    // Enable high-quality image scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Calculate source coordinates
    const sourceX = tile.x * this.tileSize * scale;
    const sourceY = tile.y * this.tileSize * scale;
    const sourceWidth = tile.width * scale;
    const sourceHeight = tile.height * scale;

    // Draw tile from source image
    ctx.drawImage(
      sourceImg,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, tile.width, tile.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
        `image/${this.format}`,
        this.quality
      );
    });
  }
}

// Usage
const tiler = new DeepZoomTiler({
  tileSize: 512,
  format: 'webp', // Better compression
  quality: 0.85
});

const pyramid = await tiler.generatePyramid(
  largeImageFile,
  (progress) => {
    console.log(`Level ${progress.level}: Tile ${progress.tile}/${progress.totalTiles}`);
  }
);
```

### Store Tiles in OPFS

```typescript
class TileStorage {
  private root: FileSystemDirectoryHandle | null = null;

  async init() {
    this.root = await navigator.storage.getDirectory();
  }

  async storePyramid(imageId: string, pyramid: PyramidLevel[]) {
    const imageDir = await this.root!.getDirectoryHandle(imageId, { create: true });

    for (const level of pyramid) {
      const levelDir = await imageDir.getDirectoryHandle(
        `level_${level.level}`,
        { create: true }
      );

      for (const tile of level.tiles) {
        const fileName = `${tile.x}_${tile.y}.${tile.blob!.type.split('/')[1]}`;
        const fileHandle = await levelDir.getFileHandle(fileName, { create: true });
        
        const writable = await fileHandle.createWritable();
        await writable.write(tile.blob!);
        await writable.close();
      }
    }

    // Store metadata
    const metaHandle = await imageDir.getFileHandle('metadata.json', { create: true });
    const metaWritable = await metaHandle.createWritable();
    await metaWritable.write(JSON.stringify({
      levels: pyramid.map(l => ({
        level: l.level,
        width: l.width,
        height: l.height,
        tileSize: l.tileSize,
        tileCount: l.tiles.length
      }))
    }));
    await metaWritable.close();
  }

  async getTile(imageId: string, level: number, x: number, y: number): Promise<Blob | null> {
    try {
      const imageDir = await this.root!.getDirectoryHandle(imageId);
      const levelDir = await imageDir.getDirectoryHandle(`level_${level}`);
      
      // Try multiple formats
      const extensions = ['webp', 'jpg', 'png'];
      for (const ext of extensions) {
        try {
          const fileHandle = await levelDir.getFileHandle(`${x}_${y}.${ext}`);
          return await fileHandle.getFile();
        } catch {
          continue;
        }
      }
      return null;
    } catch {
      return null;
    }
  }
}
```

---

## 2. Progressive Image Loading

### Progressive JPEG/PNG Loader

```typescript
interface ProgressiveLoadOptions {
  placeholderUrl?: string;
  lowResUrl?: string;
  fullResUrl: string;
  tileSize?: number;
}

/**
 * Load large images progressively from low to high resolution
 */
class ProgressiveImageLoader {
  private abortController: AbortController | null = null;

  async loadProgressive(
    container: HTMLElement,
    options: ProgressiveLoadOptions
  ): Promise<void> {
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    // 1. Show placeholder or low-res version immediately
    if (options.placeholderUrl) {
      await this.loadImage(container, options.placeholderUrl, 'placeholder');
    }

    if (signal.aborted) return;

    // 2. Load low-res preview
    if (options.lowResUrl) {
      await this.loadImage(container, options.lowResUrl, 'low-res');
    }

    if (signal.aborted) return;

    // 3. Stream and progressively decode full resolution
    await this.streamFullRes(container, options.fullResUrl, signal);
  }

  private async loadImage(
    container: HTMLElement,
    url: string,
    className: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.className = className;
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
      
      // Replace existing images of same class
      const existing = container.querySelector(`.${className}`);
      if (existing) existing.remove();
      
      container.appendChild(img);
    });
  }

  private async streamFullRes(
    container: HTMLElement,
    url: string,
    signal: AbortSignal
  ): Promise<void> {
    const response = await fetch(url, { signal });
    const reader = response.body!.getReader();
    
    const chunks: Uint8Array[] = [];
    const img = document.createElement('img');
    img.className = 'full-res';
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s';

    // Use a blob builder for progressive decoding
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      
      // Try to decode partial image every 100KB
      const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
      if (totalSize % (100 * 1024) < value.length) {
        try {
          const blob = new Blob(chunks, { type: 'image/jpeg' });
          const objectUrl = URL.createObjectURL(blob);
          
          // Update image src progressively
          img.src = objectUrl;
          
          if (!img.parentElement) {
            container.appendChild(img);
          }
          
          // Fade in on first successful decode
          if (img.style.opacity === '0') {
            requestAnimationFrame(() => {
              img.style.opacity = '1';
            });
          }
        } catch {
          // Ignore decode errors for partial data
        }
      }
    }

    // Final decode with all data
    const finalBlob = new Blob(chunks, { type: 'image/jpeg' });
    img.src = URL.createObjectURL(finalBlob);
  }

  abort() {
    this.abortController?.abort();
  }
}
```

### Interlaced PNG-style Loading

```typescript
/**
 * Simulate interlaced loading by fetching scanlines
 */
async function* loadInterlaced(url: string, scanlines: number = 8) {
  // Get image dimensions first
  const headResponse = await fetch(url, { method: 'HEAD' });
  const fileSize = parseInt(headResponse.headers.get('content-length')!);
  
  const scanlineSize = Math.ceil(fileSize / scanlines);
  
  for (let i = 0; i < scanlines; i++) {
    const start = i * scanlineSize;
    const end = Math.min((i + 1) * scanlineSize - 1, fileSize - 1);
    
    const response = await fetch(url, {
      headers: { 'Range': `bytes=${start}-${end}` }
    });
    
    const data = await response.arrayBuffer();
    yield {
      scanline: i,
      data: new Uint8Array(data),
      totalScanlines: scanlines
    };
  }
}
```

---

## 3. IIIF Image API Integration

### IIIF Image API Client

```typescript
interface IIIFImageInfo {
  '@context': string;
  '@id': string;
  protocol: string;
  width: number;
  height: number;
  sizes?: { width: number; height: number }[];
  tiles?: {
    width: number;
    height?: number;
    scaleFactors: number[];
  }[];
  profile: string[];
}

interface IIIFRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * IIIF Image API client for fetching tiles and images
 */
class IIIFClient {
  private baseUrl: string;
  private info: IIIFImageInfo | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async loadInfo(): Promise<IIIFImageInfo> {
    const response = await fetch(`${this.baseUrl}/info.json`);
    this.info = await response.json();
    return this.info;
  }

  /**
   * Build IIIF Image API URL
   * Format: {base}/{region}/{size}/{rotation}/{quality}.{format}
   */
  buildUrl(
    region: IIIFRegion | 'full' | 'square',
    size: { width: number; height?: number } | 'full' | 'max',
    options: {
      rotation?: number;
      quality?: 'default' | 'color' | 'gray' | 'bitonal';
      format?: 'jpg' | 'png' | 'webp' | 'tif';
    } = {}
  ): string {
    const { rotation = 0, quality = 'default', format = 'jpg' } = options;

    // Build region
    let regionStr: string;
    if (region === 'full') {
      regionStr = 'full';
    } else if (region === 'square') {
      regionStr = 'square';
    } else {
      regionStr = `${region.x},${region.y},${region.width},${region.height}`;
    }

    // Build size
    let sizeStr: string;
    if (size === 'full' || size === 'max') {
      sizeStr = size;
    } else if (size.height) {
      sizeStr = `${size.width},${size.height}`;
    } else {
      sizeStr = `${size.width},`;
    }

    return `${this.baseUrl}/${regionStr}/${sizeStr}/${rotation}/${quality}.${format}`;
  }

  /**
   * Get tile URL for a specific zoom level and position
   */
  getTileUrl(
    level: number,
    x: number,
    y: number,
    tileSize: number = 512
  ): string {
    if (!this.info) throw new Error('Info not loaded');

    const scaleFactor = Math.pow(2, level);
    const regionX = x * tileSize * scaleFactor;
    const regionY = y * tileSize * scaleFactor;
    const regionWidth = Math.min(
      tileSize * scaleFactor,
      this.info.width - regionX
    );
    const regionHeight = Math.min(
      tileSize * scaleFactor,
      this.info.height - regionY
    );

    return this.buildUrl(
      { x: regionX, y: regionY, width: regionWidth, height: regionHeight },
      { width: tileSize }
    );
  }

  /**
   * Get all tile URLs for a given region at a specific zoom level
   */
  getRegionTiles(
    region: IIIFRegion,
    level: number,
    tileSize: number = 512
  ): { x: number; y: number; url: string }[] {
    const scaleFactor = Math.pow(2, level);
    const scaledTileSize = tileSize * scaleFactor;

    const startTileX = Math.floor(region.x / scaledTileSize);
    const startTileY = Math.floor(region.y / scaledTileSize);
    const endTileX = Math.ceil((region.x + region.width) / scaledTileSize);
    const endTileY = Math.ceil((region.y + region.height) / scaledTileSize);

    const tiles: { x: number; y: number; url: string }[] = [];

    for (let y = startTileY; y < endTileY; y++) {
      for (let x = startTileX; x < endTileX; x++) {
        tiles.push({
          x,
          y,
          url: this.getTileUrl(level, x, y, tileSize)
        });
      }
    }

    return tiles;
  }

  /**
   * Preload tiles for a region
   */
  async preloadTiles(
    tiles: { x: number; y: number; url: string }[],
    onProgress?: (loaded: number, total: number) => void
  ): Promise<Map<string, Blob>> {
    const cache = new Map<string, Blob>();
    let loaded = 0;

    // Use limited concurrency
    const concurrency = 6;
    const queue = [...tiles];

    const workers = Array(concurrency).fill().map(async () => {
      while (queue.length > 0) {
        const tile = queue.shift()!;
        
        try {
          const response = await fetch(tile.url);
          const blob = await response.blob();
          cache.set(`${tile.x},${tile.y}`, blob);
        } catch (error) {
          console.error(`Failed to load tile ${tile.x},${tile.y}:`, error);
        }

        loaded++;
        onProgress?.(loaded, tiles.length);
      }
    });

    await Promise.all(workers);
    return cache;
  }
}

// Usage
const iiif = new IIIFClient('https://example.com/iiif/image1');

// Load image info
const info = await iiif.loadInfo();
console.log(`Image: ${info.width}x${info.height}`);

// Get tiles for a specific region
const tiles = iiif.getRegionTiles(
  { x: 0, y: 0, width: 2000, height: 2000 },
  2 // zoom level
);

// Preload tiles
const tileCache = await iiif.preloadTiles(tiles, (loaded, total) => {
  console.log(`Loaded ${loaded}/${total} tiles`);
});
```

---

## 4. Web Worker Image Processing

### Image Processing Worker

```typescript
// image-worker.ts
interface ProcessMessage {
  type: 'process';
  imageData: ImageData;
  operations: ImageOperation[];
  id: string;
}

interface ImageOperation {
  type: 'resize' | 'rotate' | 'filter' | 'compress';
  params: Record<string, any>;
}

// Worker code
self.onmessage = async (e: MessageEvent<ProcessMessage>) => {
  const { imageData, operations, id } = e.data;

  try {
    let result = imageData;

    for (const op of operations) {
      switch (op.type) {
        case 'resize':
          result = await resizeImage(result, op.params);
          break;
        case 'rotate':
          result = await rotateImage(result, op.params);
          break;
        case 'filter':
          result = await applyFilter(result, op.params);
          break;
        case 'compress':
          result = await compressImage(result, op.params);
          break;
      }
    }

    self.postMessage({ id, result, success: true }, [result.data.buffer]);
  } catch (error) {
    self.postMessage({ id, error: error.message, success: false });
  }
};

function resizeImage(
  imageData: ImageData,
  params: { width: number; height: number }
): ImageData {
  const { width, height } = params;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  
  // Create temporary canvas for source
  const srcCanvas = new OffscreenCanvas(imageData.width, imageData.height);
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.putImageData(imageData, 0, 0);
  
  // Draw resized
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(srcCanvas, 0, 0, width, height);
  
  return ctx.getImageData(0, 0, width, height);
}

function rotateImage(
  imageData: ImageData,
  params: { angle: number }
): ImageData {
  const { angle } = params;
  const radians = (angle * Math.PI) / 180;
  
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  
  const newWidth = imageData.width * cos + imageData.height * sin;
  const newHeight = imageData.width * sin + imageData.height * cos;
  
  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext('2d')!;
  
  ctx.translate(newWidth / 2, newHeight / 2);
  ctx.rotate(radians);
  ctx.translate(-imageData.width / 2, -imageData.height / 2);
  
  const srcCanvas = new OffscreenCanvas(imageData.width, imageData.height);
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.putImageData(imageData, 0, 0);
  
  ctx.drawImage(srcCanvas, 0, 0);
  
  return ctx.getImageData(0, 0, newWidth, newHeight);
}

function applyFilter(
  imageData: ImageData,
  params: { type: 'grayscale' | 'sepia' | 'brightness'; value?: number }
): ImageData {
  const { data } = imageData;
  const { type, value = 1 } = params;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    switch (type) {
      case 'grayscale':
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = data[i + 1] = data[i + 2] = gray;
        break;
      case 'sepia':
        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        break;
      case 'brightness':
        data[i] = Math.min(255, r * value);
        data[i + 1] = Math.min(255, g * value);
        data[i + 2] = Math.min(255, b * value);
        break;
    }
  }
  
  return imageData;
}

async function compressImage(
  imageData: ImageData,
  params: { quality: number; format: string }
): Promise<ImageData> {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  
  // Return blob for compression
  const blob = await canvas.convertToBlob({
    type: `image/${params.format}`,
    quality: params.quality
  });
  
  // For now, return original (in real impl, would decompress and return)
  return imageData;
}
```

### Worker Pool Manager

```typescript
class WorkerPool {
  private workers: Worker[] = [];
  private queue: { task: any; resolve: Function; reject: Function }[] = [];
  private available: Set<number> = new Set();

  constructor(workerScript: string, poolSize: number = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript);
      worker.onmessage = (e) => this.handleMessage(i, e);
      this.workers.push(worker);
      this.available.add(i);
    }
  }

  private handleMessage(workerIndex: number, e: MessageEvent) {
    const { id, result, error, success } = e.data;
    const pending = this.queue.find(q => q.task.id === id);
    
    if (pending) {
      this.queue = this.queue.filter(q => q !== pending);
      
      if (success) {
        pending.resolve(result);
      } else {
        pending.reject(new Error(error));
      }
    }
    
    this.available.add(workerIndex);
    this.processQueue();
  }

  private processQueue() {
    while (this.queue.length > 0 && this.available.size > 0) {
      const pending = this.queue[0];
      if (!pending) break;
      
      const workerIndex = this.available.values().next().value;
      this.available.delete(workerIndex);
      
      this.workers[workerIndex].postMessage(
        pending.task,
        [pending.task.imageData.data.buffer]
      );
    }
  }

  async execute(task: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  terminate() {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.queue = [];
    this.available.clear();
  }
}

// Usage
const pool = new WorkerPool('./image-worker.js', 4);

const result = await pool.execute({
  id: crypto.randomUUID(),
  imageData: ctx.getImageData(0, 0, width, height),
  operations: [
    { type: 'resize', params: { width: 1000, height: 800 } },
    { type: 'filter', params: { type: 'grayscale' } }
  ]
});
```

---

## 5. Memory-Efficient Canvas Operations

### Tile-Based Canvas Renderer

```typescript
interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

class TiledCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tileCache: Map<string, HTMLImageElement> = new Map();
  private tileSize: number = 512;
  private maxCacheSize: number = 50;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  /**
   * Render visible tiles for current viewport
   */
  async render(viewport: Viewport, getTileUrl: (x: number, y: number, level: number) => string) {
    const level = Math.floor(Math.log2(1 / viewport.scale));
    const scaledTileSize = this.tileSize * Math.pow(2, level);

    // Calculate visible tile range
    const startX = Math.floor(viewport.x / scaledTileSize);
    const startY = Math.floor(viewport.y / scaledTileSize);
    const endX = Math.ceil((viewport.x + viewport.width) / scaledTileSize);
    const endY = Math.ceil((viewport.y + viewport.height) / scaledTileSize);

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Load and render visible tiles
    const loadPromises: Promise<void>[] = [];

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const cacheKey = `${level}/${x}/${y}`;
        const tileUrl = getTileUrl(x, y, level);

        if (this.tileCache.has(cacheKey)) {
          this.drawTile(x, y, level, viewport, this.tileCache.get(cacheKey)!);
        } else {
          loadPromises.push(this.loadAndDrawTile(x, y, level, tileUrl, viewport, cacheKey));
        }
      }
    }

    await Promise.all(loadPromises);
  }

  private drawTile(
    tileX: number,
    tileY: number,
    level: number,
    viewport: Viewport,
    img: HTMLImageElement
  ) {
    const scaledTileSize = this.tileSize * Math.pow(2, level);
    
    const screenX = tileX * scaledTileSize * viewport.scale - viewport.x * viewport.scale;
    const screenY = tileY * scaledTileSize * viewport.scale - viewport.y * viewport.scale;
    const screenSize = scaledTileSize * viewport.scale;

    this.ctx.drawImage(img, screenX, screenY, screenSize, screenSize);
  }

  private async loadAndDrawTile(
    x: number,
    y: number,
    level: number,
    url: string,
    viewport: Viewport,
    cacheKey: string
  ): Promise<void> {
    const img = await this.loadImage(url);
    
    // Manage cache size
    if (this.tileCache.size >= this.maxCacheSize) {
      const firstKey = this.tileCache.keys().next().value;
      this.tileCache.delete(firstKey);
    }
    
    this.tileCache.set(cacheKey, img);
    this.drawTile(x, y, level, viewport, img);
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  clearCache() {
    this.tileCache.clear();
  }
}
```

### Canvas Pool for Frequent Operations

```typescript
class CanvasPool {
  private pool: OffscreenCanvas[] = [];
  private inUse: Set<OffscreenCanvas> = new Set();
  private maxSize: number;

  constructor(maxSize: number = 5, width: number = 4096, height: number = 4096) {
    this.maxSize = maxSize;
    
    // Pre-allocate canvases
    for (let i = 0; i < maxSize; i++) {
      this.pool.push(new OffscreenCanvas(width, height));
    }
  }

  acquire(): OffscreenCanvas {
    if (this.pool.length > 0) {
      const canvas = this.pool.pop()!;
      this.inUse.add(canvas);
      return canvas;
    }
    throw new Error('No available canvases in pool');
  }

  release(canvas: OffscreenCanvas) {
    if (this.inUse.has(canvas)) {
      this.inUse.delete(canvas);
      
      // Clear canvas
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      this.pool.push(canvas);
    }
  }

  releaseAll() {
    this.inUse.forEach(canvas => this.pool.push(canvas));
    this.inUse.clear();
  }
}

// Usage for batch processing
const pool = new CanvasPool(4, 2048, 2048);

async function processBatch(images: ImageData[]) {
  const results: ImageData[] = [];
  
  for (const imageData of images) {
    const canvas = pool.acquire();
    try {
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(imageData, 0, 0);
      
      // Process...
      const processed = ctx.getImageData(0, 0, imageData.width, imageData.height);
      results.push(processed);
    } finally {
      pool.release(canvas);
    }
  }
  
  return results;
}
```

---

## Summary

These implementations provide concrete solutions for handling large images in browser applications:

1. **Tiling**: Break large images into manageable tiles for viewing
2. **Progressive Loading**: Show low-res quickly, then improve quality
3. **IIIF Integration**: Standard way to access image servers
4. **Web Workers**: Offload processing to prevent UI blocking
5. **Canvas Pooling**: Reuse resources to minimize GC pressure

Combine these strategies based on your specific use case and performance requirements.
