
const DB_NAME = 'biiif-archive-db';
const FILES_STORE = 'files';
const DERIVATIVES_STORE = 'derivatives';
const TILE_CACHE_NAME = 'iiif-tile-cache-v3';

// ============================================================================
// Failure Tracking & Exponential Backoff
// ============================================================================

// Track failed requests: key -> { count, lastAttempt, backoffUntil }
const failureTracker = new Map();

// 1x1 transparent PNG for graceful degradation (89 bytes)
const TRANSPARENT_PIXEL_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==';
let TRANSPARENT_PIXEL_BLOB = null;

function getTransparentPixel() {
  if (!TRANSPARENT_PIXEL_BLOB) {
    const binary = atob(TRANSPARENT_PIXEL_B64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    TRANSPARENT_PIXEL_BLOB = new Blob([bytes], { type: 'image/png' });
  }
  return TRANSPARENT_PIXEL_BLOB;
}

/**
 * Check if a request key is currently in backoff.
 * Returns false if OK to proceed, or the remaining backoff ms if still cooling down.
 */
function isInBackoff(key) {
  const entry = failureTracker.get(key);
  if (!entry) return false;
  const now = Date.now();
  if (now < entry.backoffUntil) {
    return entry.backoffUntil - now;
  }
  return false;
}

/**
 * Record a failure for a key. Calculates exponential backoff.
 * Backoff schedule: 1s, 2s, 4s, 8s, 16s, 30s, 30s, 30s... (capped at 30s)
 * After 10 consecutive failures, backoff jumps to 5 minutes.
 */
function recordFailure(key, errorMsg) {
  const entry = failureTracker.get(key) || { count: 0, lastAttempt: 0, backoffUntil: 0 };
  entry.count++;
  entry.lastAttempt = Date.now();
  entry.lastError = errorMsg;

  let backoffMs;
  if (entry.count >= 10) {
    // After 10 failures, this asset is probably permanently broken
    backoffMs = 5 * 60 * 1000; // 5 minutes
  } else {
    backoffMs = Math.min(Math.pow(2, entry.count - 1) * 1000, 30000);
  }
  entry.backoffUntil = Date.now() + backoffMs;

  failureTracker.set(key, entry);
  console.warn(`[SW] Failure #${entry.count} for ${key}: ${errorMsg}. Backoff ${backoffMs}ms`);
}

/**
 * Clear failure record on success (asset recovered).
 */
function clearFailure(key) {
  if (failureTracker.has(key)) {
    console.log(`[SW] Cleared failure record for ${key}`);
    failureTracker.delete(key);
  }
}

/**
 * Return a graceful degradation response (transparent pixel or error JSON).
 * Uses Cache-Control to tell the browser not to re-fetch immediately.
 */
function degradedImageResponse(failureEntry) {
  const retryAfter = Math.ceil((failureEntry?.backoffUntil - Date.now()) / 1000) || 5;
  return new Response(getTransparentPixel(), {
    status: 200, // 200 so the viewer renders blank tile, not retry on error
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': `max-age=${retryAfter}`,
      'X-SW-Degraded': 'true',
      'X-SW-Failure-Count': String(failureEntry?.count || 0),
      'Access-Control-Allow-Origin': self.location.origin
    }
  });
}

// Periodic cleanup: remove stale failure entries older than 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, entry] of failureTracker) {
    if (entry.lastAttempt < cutoff) {
      failureTracker.delete(key);
    }
  }
}, 60 * 1000);

// ============================================================================
// Tile URL Redirect (V5: tile pipeline removed, redirect to IIIF Image API)
// ============================================================================

// Legacy tile URL patterns — redirect to /iiif/image/{assetId}/...
const TILE_URL_PATTERN = /^\/tiles\/([^\/]+)\//;

// ============================================================================
// LRU Cache Configuration
// ============================================================================
const CACHE_LIMIT = 500 * 1024 * 1024; // 500MB in bytes
const CACHE_METADATA_KEY = 'iiif-cache-metadata';

// In-memory cache metadata (will be lost on SW restart, but that's OK)
// We'll rebuild from cache inspection when needed
let cacheMetadata = {
  entries: new Map(), // url -> { size, timestamp, accessCount }
  totalSize: 0
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys => Promise.all(
        keys.map(key => {
          if (key !== TILE_CACHE_NAME) return caches.delete(key);
        })
      )),
      // Initialize cache metadata from existing cache
      initializeCacheMetadata()
    ])
  );
});

// ============================================================================
// LRU Cache Management
// ============================================================================

/**
 * Initialize cache metadata by inspecting existing cache entries
 */
async function initializeCacheMetadata() {
  try {
    const cache = await caches.open(TILE_CACHE_NAME);
    const requests = await cache.keys();

    cacheMetadata.totalSize = 0;
    cacheMetadata.entries.clear();

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        // Prefer Content-Length header (O(1)) over blob read
        const cl = response.headers.get('Content-Length');
        let size;
        if (cl) {
          size = parseInt(cl, 10);
          if (isNaN(size)) {
            const blob = await response.blob();
            size = blob.size;
          }
        } else {
          const blob = await response.blob();
          size = blob.size;
        }
        cacheMetadata.entries.set(request.url, {
          size,
          timestamp: Date.now(),
          accessCount: 0
        });
        cacheMetadata.totalSize += size;
      }
    }

    console.log(`[SW] Cache initialized: ${cacheMetadata.entries.size} entries, ${(cacheMetadata.totalSize / 1024 / 1024).toFixed(2)}MB`);
  } catch (err) {
    console.error('[SW] Failed to initialize cache metadata:', err);
  }
}

/**
 * Get the size of a response in bytes.
 * Reads Content-Length header first (O(1)), falls back to blob measurement.
 */
async function getResponseSize(response) {
  const cl = response.headers.get('Content-Length');
  if (cl) {
    const n = parseInt(cl, 10);
    if (!isNaN(n)) return n;
  }
  const clone = response.clone();
  const blob = await clone.blob();
  return blob.size;
}

/**
 * Update access metadata for a cache entry
 */
function touchEntry(url) {
  const entry = cacheMetadata.entries.get(url);
  if (entry) {
    entry.timestamp = Date.now();
    entry.accessCount++;
  }
}

/**
 * Evict oldest entries to make room for required space
 * Uses LRU (Least Recently Used) algorithm
 */
async function evictLRU(requiredSpace) {
  const cache = await caches.open(TILE_CACHE_NAME);
  
  // Sort entries by timestamp (oldest first)
  const sortedEntries = Array.from(cacheMetadata.entries.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp);
  
  let freedSpace = 0;
  const entriesToDelete = [];
  
  for (const [url, metadata] of sortedEntries) {
    if (cacheMetadata.totalSize - freedSpace + requiredSpace <= CACHE_LIMIT) {
      break;
    }
    
    entriesToDelete.push(url);
    freedSpace += metadata.size;
  }
  
  // Delete entries from cache
  for (const url of entriesToDelete) {
    await cache.delete(url);
    cacheMetadata.entries.delete(url);
    console.log(`[SW] Evicted from cache: ${url}`);
  }
  
  cacheMetadata.totalSize -= freedSpace;
  
  if (entriesToDelete.length > 0) {
    console.log(`[SW] Evicted ${entriesToDelete.length} entries, freed ${(freedSpace / 1024 / 1024).toFixed(2)}MB`);
  }
  
  return freedSpace;
}

/**
 * Add a response to the cache with LRU eviction
 */
async function addToCache(request, response) {
  // Read body once as blob — avoids extra clone() calls
  const blob = await response.blob();
  const size = blob.size;

  // Check if we need to evict
  if (cacheMetadata.totalSize + size > CACHE_LIMIT) {
    await evictLRU(size);
  }

  const cache = await caches.open(TILE_CACHE_NAME);
  await cache.put(request, new Response(blob, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  }));

  // Update metadata
  cacheMetadata.entries.set(request.url, {
    size,
    timestamp: Date.now(),
    accessCount: 1
  });
  cacheMetadata.totalSize += size;
}

// IDB Helpers — pooled connection to avoid ~50-100ms open() overhead per request
let _cachedDb = null;

function getIDB() {
  if (_cachedDb) return Promise.resolve(_cachedDb);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      _cachedDb = req.result;
      // If the DB is closed externally (e.g. version change), clear the cache
      _cachedDb.onclose = () => { _cachedDb = null; };
      _cachedDb.onversionchange = () => { _cachedDb.close(); _cachedDb = null; };
      resolve(_cachedDb);
    };
  });
}

function getFromIDB(storeName, key) {
  return getIDB().then(db => {
    if (!db.objectStoreNames.contains(storeName)) return undefined;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const getReq = store.get(key);
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    });
  });
}

/**
 * Try OPFS first, then fall back to IndexedDB for files store lookups.
 * Used for large files that may be stored in OPFS instead of IDB.
 */
async function getFileBlob(key) {
  const opfsFile = await getFromOPFS(key);
  if (opfsFile) return opfsFile;
  return getFromIDB(FILES_STORE, key);
}

// ============================================================================
// IIIF Image API 3.0 Enhanced Implementation
// ============================================================================

/**
 * Apply quality transformations to image data
 * @param {OffscreenCanvas} canvas - The canvas with the image
 * @param {string} quality - Quality parameter (default, color, gray, bitonal)
 */
function applyQuality(canvas, quality) {
  if (quality === 'default' || quality === 'color') return;

  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  if (quality === 'gray') {
    // Convert to grayscale using luminance formula
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = gray;     // R
      data[i + 1] = gray; // G
      data[i + 2] = gray; // B
    }
  } else if (quality === 'bitonal') {
    // Convert to black and white using threshold
    const threshold = 128;
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const value = gray >= threshold ? 255 : 0;
      data[i] = value;     // R
      data[i + 1] = value; // G
      data[i + 2] = value; // B
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Parse rotation parameter
 * @param {string} rotationParam - Rotation string (e.g., "90", "!180", "270")
 * @returns {{ degrees: number, mirror: boolean }}
 */
function parseRotation(rotationParam) {
  const mirror = rotationParam.startsWith('!');
  const degreesStr = mirror ? rotationParam.substring(1) : rotationParam;
  const degrees = parseFloat(degreesStr) || 0;
  return { degrees: degrees % 360, mirror };
}

/**
 * Apply rotation and mirroring to canvas
 * @param {OffscreenCanvas} sourceCanvas - Source canvas
 * @param {number} degrees - Rotation degrees (0, 90, 180, 270)
 * @param {boolean} mirror - Whether to mirror horizontally
 * @returns {OffscreenCanvas} - Rotated canvas
 */
function applyRotation(sourceCanvas, degrees, mirror) {
  // Normalize degrees to 0, 90, 180, or 270
  const normalizedDegrees = Math.round(degrees / 90) * 90 % 360;

  // If no transformation needed, return source
  if (normalizedDegrees === 0 && !mirror) {
    return sourceCanvas;
  }

  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;

  // Calculate output dimensions
  const swapped = normalizedDegrees === 90 || normalizedDegrees === 270;
  const outWidth = swapped ? sh : sw;
  const outHeight = swapped ? sw : sh;

  const outputCanvas = new OffscreenCanvas(outWidth, outHeight);
  const ctx = outputCanvas.getContext('2d');

  // Move to center for rotation
  ctx.translate(outWidth / 2, outHeight / 2);

  // Apply mirroring (horizontal flip)
  if (mirror) {
    ctx.scale(-1, 1);
  }

  // Apply rotation
  ctx.rotate((normalizedDegrees * Math.PI) / 180);

  // Draw image centered
  ctx.drawImage(sourceCanvas, -sw / 2, -sh / 2);

  return outputCanvas;
}

/**
 * Calculate square region from image dimensions
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
function calculateSquareRegion(width, height) {
  const size = Math.min(width, height);
  const x = Math.floor((width - size) / 2);
  const y = Math.floor((height - size) / 2);
  return { x, y, w: size, h: size };
}

/**
 * Calculate confined size (best fit within bounds)
 * @param {number} regionWidth - Region width
 * @param {number} regionHeight - Region height
 * @param {number} maxWidth - Maximum width constraint
 * @param {number} maxHeight - Maximum height constraint
 * @returns {{ width: number, height: number }}
 */
function calculateConfinedSize(regionWidth, regionHeight, maxWidth, maxHeight) {
  const scaleW = maxWidth / regionWidth;
  const scaleH = maxHeight / regionHeight;
  const scale = Math.min(scaleW, scaleH, 1); // Don't upscale unless ^ prefix
  return {
    width: Math.round(regionWidth * scale),
    height: Math.round(regionHeight * scale)
  };
}

/**
 * Get MIME type and blob options for format
 * @param {string} format - Format string (jpg, png, webp, gif)
 * @param {string} quality - Quality string (affects compression)
 * @returns {{ mimeType: string, options: object }}
 */
function getFormatOptions(format, quality) {
  const formatMap = {
    'jpg': { mimeType: 'image/jpeg', options: { quality: 0.85 } },
    'jpeg': { mimeType: 'image/jpeg', options: { quality: 0.85 } },
    'png': { mimeType: 'image/png', options: {} },
    'webp': { mimeType: 'image/webp', options: { quality: 0.85 } },
    'gif': { mimeType: 'image/gif', options: {} }
  };

  // For bitonal, prefer PNG for lossless
  if (quality === 'bitonal' && format === 'jpg') {
    return formatMap['png'];
  }

  return formatMap[format] || formatMap['jpg'];
}

async function handleImageRequest(request) {
  const url = request.url;
  const cache = await caches.open(TILE_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    // Update LRU timestamp on cache hit
    touchEntry(url);
    return cachedResponse;
  }

  // Extract identifier early for backoff tracking
  const urlObj = new URL(url);
  // Handle both /iiif/image/ and /image/ prefixes (IIIF_CONFIG generates /image/ URLs)
  let pathParts = urlObj.pathname.split('/iiif/image/');
  if (pathParts.length < 2) {
    pathParts = urlObj.pathname.split('/image/');
  }
  if (pathParts.length < 2) return new Response('Invalid IIIF URL', { status: 400 });

  const params = pathParts[1].split('/');
  const identifier = decodeURIComponent(params[0]);
  // Validate identifier: reject path traversal and unsafe characters
  if (!identifier || /[\/\\]|\.\./.test(identifier)) {
    return new Response('Invalid identifier', { status: 400 });
  }
  const backoffKey = `image:${identifier}`;

  // Check if this asset is in backoff from previous failures
  const backoffRemaining = isInBackoff(backoffKey);
  if (backoffRemaining) {
    return degradedImageResponse(failureTracker.get(backoffKey));
  }

  try {
    const region = params[1];
    const size = params[2];
    const rotationParam = params[3] || '0';
    const qualityFormat = params[4] ? params[4].split('.') : ['default', 'jpg'];
    const quality = qualityFormat[0];
    const format = qualityFormat[1] || 'jpg';

    // Handle info.json request
    if (params[1] === 'info.json') {
      const blob = await getFileBlob(identifier);
      if (!blob) return new Response('Not found', { status: 404 });

      // SVGs can't be reliably measured via createImageBitmap in all browsers
      if (blob.type === 'image/svg+xml' || identifier.endsWith('.svg')) {
        const info = {
          "@context": "http://iiif.io/api/image/3/context.json",
          "id": `${urlObj.origin}${urlObj.pathname.replace('/info.json', '')}`,
          "type": "ImageService3",
          "protocol": "http://iiif.io/api/image",
          "profile": "level0",
          "width": 1000,
          "height": 1000,
          "preferredFormats": ["svg"]
        };
        return new Response(JSON.stringify(info), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': self.location.origin,
            'Cache-Control': 'max-age=86400'
          }
        });
      }

      let bitmap;
      try {
        bitmap = await createImageBitmap(blob);
      } catch (bitmapErr) {
        // Some PNGs or images may be malformed — return minimal info
        console.warn(`[SW] createImageBitmap failed for info.json of ${identifier}:`, bitmapErr.message);
        recordFailure(backoffKey, `info.json bitmap: ${bitmapErr.message}`);
        return new Response(JSON.stringify({
          "@context": "http://iiif.io/api/image/3/context.json",
          "id": `${urlObj.origin}${urlObj.pathname.replace('/info.json', '')}`,
          "type": "ImageService3",
          "protocol": "http://iiif.io/api/image",
          "profile": "level0",
          "width": 1,
          "height": 1
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': self.location.origin,
            'Cache-Control': 'max-age=30'
          }
        });
      }
      const info = {
        "@context": "http://iiif.io/api/image/3/context.json",
        "id": `${urlObj.origin}${urlObj.pathname.replace('/info.json', '')}`,
        "type": "ImageService3",
        "protocol": "http://iiif.io/api/image",
        "profile": "level2",
        "width": bitmap.width,
        "height": bitmap.height,
        "tiles": [{ "width": 512, "scaleFactors": [1, 2, 4, 8, 16] }],
        "sizes": [
            { "width": 150, "height": Math.floor(150 * (bitmap.height/bitmap.width)) },
            { "width": 600, "height": Math.floor(600 * (bitmap.height/bitmap.width)) },
            { "width": 1200, "height": Math.floor(1200 * (bitmap.height/bitmap.width)) }
        ],
        "extraQualities": ["gray", "bitonal"],
        "extraFormats": ["png", "webp"],
        "extraFeatures": [
          "mirroring",
          "regionByPct",
          "regionByPx",
          "regionSquare",
          "rotationBy90s",
          "sizeByConfinedWh",
          "sizeByH",
          "sizeByPct",
          "sizeByW",
          "sizeByWh"
        ]
      };
      bitmap.close(); // Release GPU/CPU memory
      return new Response(JSON.stringify(info), {
          headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': self.location.origin,
              'Cache-Control': 'no-cache'
          }
      });
    }

    // Check for pre-computed derivatives (fast path)
    if (region === 'full' && rotationParam === '0' && (quality === 'default' || quality === 'color')) {
        let sizeKey = null;
        const widthMatch = size.match(/^(\d+),$/);
        const width = widthMatch ? parseInt(widthMatch[1]) : null;

        // Flexible matching for derivative sizes
        if (width === 150 || size === 'pct:7.5') sizeKey = 'thumb';
        else if ((width && width <= 600) || size === 'pct:30') sizeKey = 'small';
        else if ((width && width <= 1200) || size === 'pct:60') sizeKey = 'medium';

        if (sizeKey) {
            const derivativeBlob = await getFromIDB(DERIVATIVES_STORE, `${identifier}_${sizeKey}`);
            if (derivativeBlob) {
                const { mimeType } = getFormatOptions(format, quality);
                return new Response(derivativeBlob, {
                  headers: {
                    'Content-Type': mimeType,
                    'Access-Control-Allow-Origin': self.location.origin,
                    'X-IIIF-Derivative': sizeKey
                  }
                });
            }
        }
    }

    // Load original image
    const originalBlob = await getFileBlob(identifier);
    if (!originalBlob) return new Response('Not found', { status: 404 });

    // SVG safety net: serve raw SVG instead of trying to rasterize
    if (originalBlob.type === 'image/svg+xml' || identifier.endsWith('.svg')) {
      return new Response(originalBlob, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Access-Control-Allow-Origin': self.location.origin,
          'Cache-Control': 'max-age=31536000, immutable'
        }
      });
    }

    const bitmap = await createImageBitmap(originalBlob);
    let rx = 0, ry = 0, rw = bitmap.width, rh = bitmap.height;

    // Parse region parameter
    if (region === 'square') {
      // Square region - centered square
      const sq = calculateSquareRegion(bitmap.width, bitmap.height);
      rx = sq.x; ry = sq.y; rw = sq.w; rh = sq.h;
    } else if (region !== 'full') {
        if (region.startsWith('pct:')) {
             const p = region.replace('pct:', '').split(',').map(Number);
             if (p.length === 4) {
                 rx = Math.floor(bitmap.width * (p[0]/100));
                 ry = Math.floor(bitmap.height * (p[1]/100));
                 rw = Math.floor(bitmap.width * (p[2]/100));
                 rh = Math.floor(bitmap.height * (p[3]/100));
             }
        } else {
             const p = region.split(',').map(Number);
             if (p.length === 4) { rx=p[0]; ry=p[1]; rw=p[2]; rh=p[3]; }
        }
    }

    // Clamp region to image bounds
    rx = Math.max(0, Math.min(rx, bitmap.width - 1));
    ry = Math.max(0, Math.min(ry, bitmap.height - 1));
    rw = Math.max(1, Math.min(rw, bitmap.width - rx));
    rh = Math.max(1, Math.min(rh, bitmap.height - ry));

    // Parse size parameter
    let sw = rw, sh = rh;
    const hasUpscale = size.startsWith('^');
    const sizeWithoutPrefix = hasUpscale ? size.substring(1) : size;

    if (sizeWithoutPrefix !== 'max') {
        // Confined size (!w,h) - fit within bounds maintaining aspect ratio
        const confinedMatch = sizeWithoutPrefix.match(/^!(\d+),(\d+)$/);
        if (confinedMatch) {
            const confined = calculateConfinedSize(rw, rh, parseInt(confinedMatch[1]), parseInt(confinedMatch[2]));
            sw = confined.width;
            sh = confined.height;
        } else if (sizeWithoutPrefix.startsWith('pct:')) {
             const pct = Number(sizeWithoutPrefix.split(':')[1]);
             if (!isNaN(pct)) {
                 sw = Math.floor(rw * (pct/100));
                 sh = Math.floor(rh * (pct/100));
             }
        } else if (sizeWithoutPrefix.includes(',')) {
             const p = sizeWithoutPrefix.split(',');
             if (p[0] && p[1]) {
                 sw = Number(p[0]); sh = Number(p[1]);
             } else if (p[0]) {
                 sw = Number(p[0]); sh = Math.floor((sw / rw) * rh);
             } else if (p[1]) {
                 sh = Number(p[1]); sw = Math.floor((sh / rh) * rw);
             }
        }
    }

    // Ensure minimum size
    sw = Math.max(1, Math.floor(sw));
    sh = Math.max(1, Math.floor(sh));

    // Create canvas and draw region at target size
    let canvas = new OffscreenCanvas(sw, sh);
    let ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, rx, ry, rw, rh, 0, 0, sw, sh);
    bitmap.close(); // Release GPU/CPU memory — data is on canvas now

    // Apply quality transformation (grayscale, bitonal)
    if (quality !== 'default' && quality !== 'color') {
      applyQuality(canvas, quality);
    }

    // Apply rotation and mirroring
    const { degrees, mirror } = parseRotation(rotationParam);
    if (degrees !== 0 || mirror) {
      canvas = applyRotation(canvas, degrees, mirror);
    }

    // Get format options and create output blob
    const { mimeType, options } = getFormatOptions(format, quality);
    const blobOutput = await canvas.convertToBlob({ type: mimeType, ...options });

    const res = new Response(blobOutput, {
      headers: {
        'Content-Type': mimeType,
        'Access-Control-Allow-Origin': self.location.origin,
        'X-IIIF-Quality': quality,
        'X-IIIF-Rotation': rotationParam
      }
    });

    // Use LRU cache instead of simple cache.put
    await addToCache(request, res.clone());

    // Success — clear any previous failure record for this asset
    clearFailure(backoffKey);
    return res;

  } catch (err) {
    console.error('[SW] Error handling image request:', err);

    // Record failure with exponential backoff
    recordFailure(backoffKey, err.message);

    // Return transparent pixel so the viewer renders a blank tile
    // instead of retrying the request in a tight loop
    return degradedImageResponse(failureTracker.get(backoffKey));
  }
}

// ============================================================================
// Media (Audio/Video) Request Handling
// ============================================================================

// Media URL pattern: /media/{assetId}.{ext} or /iiif/media/{assetId}.{ext}
const MEDIA_URL_PATTERN = /\/(iiif\/)?media\/([^\/]+)\.(mp3|mp4|webm|ogg|wav|m4a|aac|flac|svg)$/;

/**
 * Get MIME type from file extension
 */
function getMediaMimeType(ext) {
  const mimeTypes = {
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogg': 'audio/ogg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    'svg': 'image/svg+xml'
  };
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Try to get a file from OPFS /originals/{id}
 * Returns null if OPFS is unavailable or file not found.
 * Uses a timeout to prevent hanging in SW contexts where OPFS may not resolve.
 */
async function getFromOPFS(id) {
  try {
    if (!navigator.storage?.getDirectory) return null;

    // Race against a timeout - OPFS may hang in some browser SW contexts
    const result = await Promise.race([
      (async () => {
        const root = await navigator.storage.getDirectory();
        const originals = await root.getDirectoryHandle('originals');
        const fileHandle = await originals.getFileHandle(id);
        return await fileHandle.getFile();
      })(),
      new Promise(resolve => setTimeout(() => resolve(null), 1000))
    ]);

    return result;
  } catch {
    return null;
  }
}

/**
 * Handle media (audio/video) requests from OPFS or IndexedDB
 */
async function handleMediaRequest(request, assetId, format) {
  console.log('[SW] Handling media request:', assetId, format);

  try {
    // Try OPFS first (large files are stored here)
    let blob = await getFromOPFS(assetId);

    // Fall back to IndexedDB (uses pooled connection)
    if (!blob) {
      blob = await getFromIDB(FILES_STORE, assetId);
    }

    if (!blob) {
      console.warn('[SW] Media not found in OPFS or IndexedDB:', assetId);
      return new Response('Media not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const mimeType = getMediaMimeType(format);

    // Handle range requests for streaming
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : blob.size - 1;
        // Validate range bounds
        if (start < 0 || end >= blob.size || start > end) {
          return new Response('Range Not Satisfiable', {
            status: 416,
            headers: { 'Content-Range': `bytes */${blob.size}` }
          });
        }
        const chunk = blob.slice(start, end + 1);

        return new Response(chunk, {
          status: 206,
          statusText: 'Partial Content',
          headers: {
            'Content-Type': mimeType,
            'Content-Length': chunk.size.toString(),
            'Content-Range': `bytes ${start}-${end}/${blob.size}`,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': self.location.origin
          }
        });
      }
    }

    // Return full media file
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': blob.size.toString(),
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': self.location.origin,
        'Cache-Control': 'max-age=31536000, immutable'
      }
    });

  } catch (error) {
    console.error('[SW] Error handling media request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Redirect legacy /tiles/{assetId}/... to /iiif/image/{assetId}/...
  const tileMatch = url.pathname.match(TILE_URL_PATTERN);
  if (tileMatch) {
    const [, assetId] = tileMatch;
    const redirectUrl = new URL(`/iiif/image/${assetId}/full/max/0/default.jpg`, url.origin);
    event.respondWith(Response.redirect(redirectUrl.href, 301));
    return;
  }

  // Check if this is a media (audio/video) request
  const mediaMatch = url.pathname.match(MEDIA_URL_PATTERN);
  if (mediaMatch) {
    const [, , assetId, format] = mediaMatch;
    event.respondWith(handleMediaRequest(event.request, assetId, format));
    return;
  }

  // Flexible matching: any path containing /iiif/image/ or /image/ followed by IIIF patterns
  const isIIIFImage = /\/(iiif\/)?image\/[^\/]+\/(info\.json|.+?\/default\.(jpg|jpeg|png|webp|gif))$/.test(url.pathname);

  if (isIIIFImage) {
    event.respondWith(handleImageRequest(event.request));
  }
});

// ============================================================================
// Message Handler for Cache Management
// ============================================================================

self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') return;
  const { action } = event.data;

  switch (action) {
    case 'getCacheStats':
      event.ports[0]?.postMessage({
        totalSize: cacheMetadata.totalSize,
        entryCount: cacheMetadata.entries.size,
        limit: CACHE_LIMIT,
        usagePercent: (cacheMetadata.totalSize / CACHE_LIMIT * 100).toFixed(2)
      });
      break;
      
    case 'clearCache':
      caches.delete(TILE_CACHE_NAME).then(() => {
        cacheMetadata.entries.clear();
        cacheMetadata.totalSize = 0;
        event.ports[0]?.postMessage({ success: true });
      });
      break;
      
    case 'evictCache':
      evictLRU(event.data.requiredSpace || 0).then((freed) => {
        event.ports[0]?.postMessage({ freed });
      });
      break;

    case 'clearFailures':
      // Reset all failure tracking (e.g., after re-ingest)
      {
        const count = failureTracker.size;
        failureTracker.clear();
        console.log(`[SW] Cleared ${count} failure records`);
        event.ports[0]?.postMessage({ cleared: count });
      }
      break;

    case 'getFailureStats':
      // Diagnostics: report current failure state
      {
        const stats = [];
        for (const [key, entry] of failureTracker) {
          stats.push({
            key,
            count: entry.count,
            lastError: entry.lastError,
            backoffRemaining: Math.max(0, entry.backoffUntil - Date.now())
          });
        }
        event.ports[0]?.postMessage({ failures: stats });
      }
      break;
  }
});
