
const DB_NAME = 'biiif-archive-db';
const FILES_STORE = 'files';
const DERIVATIVES_STORE = 'derivatives';
const TILE_CACHE_NAME = 'iiif-tile-cache-v3';

// ============================================================================
// Tile Serving Configuration
// ============================================================================

// Tile URL pattern: /tiles/{assetId}/{level}/{x}_{y}.jpg
const TILE_URL_PATTERN = /^\/tiles\/([^\/]+)\/(\d+)\/(\d+)_(\d+)\.(jpg|png)$/;

// Tile info pattern: /tiles/{assetId}/info.json
const TILE_INFO_PATTERN = /^\/tiles\/([^\/]+)\/info\.json$/;

// Pending tile requests (for main thread communication)
const pendingTileRequests = new Map();

// ============================================================================
// Tile Request Handling
// ============================================================================

/**
 * Handle tile requests
 * Strategy: Cache API -> IndexedDB (via main thread) -> 404
 * @param {Request} request - The fetch request
 * @param {string} assetId - The asset ID
 * @param {number} level - The pyramid level
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {string} format - Image format (jpg or png)
 * @returns {Promise<Response>}
 */
async function handleTileRequest(request, assetId, level, x, y, format) {
  const cache = await caches.open(TILE_CACHE_NAME);
  const url = request.url;

  // 1. Try Cache API first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    touchEntry(url);
    // Return cached response with updated headers
    const headers = new Headers(cachedResponse.headers);
    headers.set('X-Cache', 'HIT');
    headers.set('X-Cache-Source', 'Cache-API');
    return new Response(cachedResponse.body, {
      status: 200,
      statusText: 'OK',
      headers
    });
  }

  // 2. Fall back to IndexedDB via main thread
  try {
    const tileBlob = await fetchTileFromIndexedDB(assetId, level, x, y, format);
    
    if (!tileBlob) {
      return new Response('Tile not found', {
        status: 404,
        statusText: 'Not Found',
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache'
        }
      });
    }

    // Create response with proper headers
    const contentType = format === 'png' ? 'image/png' : 'image/jpeg';
    const response = new Response(tileBlob, {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'max-age=31536000, immutable',
        'X-Cache': 'MISS',
        'X-Cache-Source': 'IndexedDB'
      }
    });

    // 3. Cache the tile for future requests
    await cacheTile(request, response.clone());

    return response;
  } catch (error) {
    console.error('[SW] Error fetching tile from IndexedDB:', error);
    return new Response('Error fetching tile', {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

/**
 * Fetch a tile from IndexedDB via main thread communication
 * Service Workers cannot directly access IndexedDB in the same context as the main thread,
 * so we use MessageChannel to request the tile from the main thread which has access to storage.tiles.getTile()
 * @param {string} assetId - The asset ID
 * @param {number} level - The pyramid level
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {string} format - Image format
 * @returns {Promise<Blob|null>}
 */
async function fetchTileFromIndexedDB(assetId, level, x, y, format) {
  return new Promise((resolve, reject) => {
    const requestId = `${assetId}_${level}_${x}_${y}_${Date.now()}`;
    
    // Create a timeout to prevent hanging
    const timeout = setTimeout(() => {
      pendingTileRequests.delete(requestId);
      reject(new Error('Tile request timeout'));
    }, 10000); // 10 second timeout

    // Store the pending request
    pendingTileRequests.set(requestId, {
      resolve: (blob) => {
        clearTimeout(timeout);
        pendingTileRequests.delete(requestId);
        resolve(blob);
      },
      reject: (error) => {
        clearTimeout(timeout);
        pendingTileRequests.delete(requestId);
        reject(error);
      }
    });

    // Broadcast to all clients (main thread)
    self.clients.matchAll().then(clients => {
      if (clients.length === 0) {
        pendingTileRequests.delete(requestId);
        clearTimeout(timeout);
        reject(new Error('No active clients available to fetch tile'));
        return;
      }

      // Send request to all clients (first one to respond wins)
      const message = {
        type: 'TILE_REQUEST',
        requestId,
        assetId,
        level,
        x,
        y,
        format
      };

      clients.forEach(client => {
        client.postMessage(message);
      });
    }).catch(error => {
      pendingTileRequests.delete(requestId);
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Cache a tile in the Cache API with long-term caching
 * @param {Request} request - The request to cache
 * @param {Response} response - The response to cache
 */
async function cacheTile(request, response) {
  try {
    const size = await getResponseSize(response);
    
    // Check if we need to evict to make room
    if (cacheMetadata.totalSize + size > CACHE_LIMIT) {
      await evictLRU(size);
    }

    const cache = await caches.open(TILE_CACHE_NAME);
    await cache.put(request, response.clone());

    // Update metadata
    cacheMetadata.entries.set(request.url, {
      size,
      timestamp: Date.now(),
      accessCount: 1
    });
    cacheMetadata.totalSize += size;

    console.log(`[SW] Cached tile: ${request.url} (${(size / 1024).toFixed(2)}KB)`);
  } catch (error) {
    console.error('[SW] Failed to cache tile:', error);
  }
}

/**
 * Handle tile info requests (IIIF Image API 3.0 info.json)
 * @param {string} assetId - The asset ID
 * @returns {Promise<Response>}
 */
async function handleTileInfoRequest(assetId) {
  try {
    // Fetch manifest from IndexedDB via main thread
    const manifest = await fetchTileManifestFromIndexedDB(assetId);
    
    if (!manifest) {
      return new Response('Tile manifest not found', {
        status: 404,
        statusText: 'Not Found',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    }

    // Build IIIF Image API 3.0 info.json response
    const scaleFactors = [];
    for (let i = 0; i < manifest.levels; i++) {
      scaleFactors.push(Math.pow(2, i));
    }

    const info = {
      '@context': 'http://iiif.io/api/image/3/context.json',
      'id': `${self.location.origin}/tiles/${assetId}`,
      'type': 'ImageService3',
      'protocol': 'http://iiif.io/api/image',
      'profile': 'level1',
      'width': manifest.width,
      'height': manifest.height,
      'tiles': [
        {
          'width': manifest.tileSize,
          'height': manifest.tileSize,
          'scaleFactors': scaleFactors
        }
      ],
      'preferredFormats': [manifest.format === 'png' ? 'png' : 'jpg'],
      'extraFeatures': ['regionByPx', 'sizeByW']
    };

    return new Response(JSON.stringify(info), {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=86400', // 24 hours for info.json
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('[SW] Error fetching tile info:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch tile info' }), {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

/**
 * Fetch tile manifest from IndexedDB via main thread
 * @param {string} assetId - The asset ID
 * @returns {Promise<Object|null>}
 */
async function fetchTileManifestFromIndexedDB(assetId) {
  return new Promise((resolve, reject) => {
    const requestId = `${assetId}_manifest_${Date.now()}`;
    
    const timeout = setTimeout(() => {
      pendingTileRequests.delete(requestId);
      reject(new Error('Manifest request timeout'));
    }, 5000);

    pendingTileRequests.set(requestId, {
      resolve: (manifest) => {
        clearTimeout(timeout);
        pendingTileRequests.delete(requestId);
        resolve(manifest);
      },
      reject: (error) => {
        clearTimeout(timeout);
        pendingTileRequests.delete(requestId);
        reject(error);
      }
    });

    self.clients.matchAll().then(clients => {
      if (clients.length === 0) {
        pendingTileRequests.delete(requestId);
        clearTimeout(timeout);
        reject(new Error('No active clients available'));
        return;
      }

      clients.forEach(client => {
        client.postMessage({
          type: 'TILE_MANIFEST_REQUEST',
          requestId,
          assetId
        });
      });
    }).catch(error => {
      pendingTileRequests.delete(requestId);
      clearTimeout(timeout);
      reject(error);
    });
  });
}

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
        const blob = await response.blob();
        const size = blob.size;
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
 * Get the size of a response in bytes
 */
async function getResponseSize(response) {
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
  const size = await getResponseSize(response);
  
  // Check if we need to evict
  if (cacheMetadata.totalSize + size > CACHE_LIMIT) {
    await evictLRU(size);
  }
  
  const cache = await caches.open(TILE_CACHE_NAME);
  await cache.put(request, response.clone());
  
  // Update metadata
  cacheMetadata.entries.set(request.url, {
    size,
    timestamp: Date.now(),
    accessCount: 1
  });
  cacheMetadata.totalSize += size;
  
  return response;
}

// IDB Helpers
function getFromIDB(storeName, key) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) { resolve(undefined); return; }
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const getReq = store.get(key);
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    };
  });
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

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/iiif/image/');
    if (pathParts.length < 2) return new Response('Invalid IIIF URL', { status: 400 });

    const params = pathParts[1].split('/');
    const identifier = decodeURIComponent(params[0]);
    const region = params[1];
    const size = params[2];
    const rotationParam = params[3] || '0';
    const qualityFormat = params[4] ? params[4].split('.') : ['default', 'jpg'];
    const quality = qualityFormat[0];
    const format = qualityFormat[1] || 'jpg';

    // Handle info.json request
    if (params[1] === 'info.json') {
      const blob = await getFromIDB(FILES_STORE, identifier);
      if (!blob) return new Response('Not found', { status: 404 });
      const bitmap = await createImageBitmap(blob);
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
      return new Response(JSON.stringify(info), {
          headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
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
                    'Access-Control-Allow-Origin': '*',
                    'X-IIIF-Derivative': sizeKey
                  }
                });
            }
        }
    }

    // Load original image
    const originalBlob = await getFromIDB(FILES_STORE, identifier);
    if (!originalBlob) return new Response('Not found', { status: 404 });

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
        'Access-Control-Allow-Origin': '*',
        'X-IIIF-Quality': quality,
        'X-IIIF-Rotation': rotationParam
      }
    });

    // Use LRU cache instead of simple cache.put
    await addToCache(request, res.clone());
    return res;

  } catch (err) {
    console.error('[SW] Error handling image request:', err);
    return new Response(JSON.stringify({
      error: 'Error processing image request',
      details: err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================================================
// Media (Audio/Video) Request Handling
// ============================================================================

// Media URL pattern: /media/{assetId}.{ext} or /iiif/media/{assetId}.{ext}
const MEDIA_URL_PATTERN = /\/(iiif\/)?media\/([^\/]+)\.(mp3|mp4|webm|ogg|wav|m4a|aac|flac)$/;

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
    'flac': 'audio/flac'
  };
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Handle media (audio/video) requests from IndexedDB
 */
async function handleMediaRequest(request, assetId, format) {
  console.log('[SW] Handling media request:', assetId, format);

  try {
    // Open IndexedDB to get the media file
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    // Get the blob from files store
    const transaction = db.transaction(FILES_STORE, 'readonly');
    const store = transaction.objectStore(FILES_STORE);

    const blob = await new Promise((resolve, reject) => {
      const request = store.get(assetId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    db.close();

    if (!blob) {
      console.warn('[SW] Media not found in IndexedDB:', assetId);
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
        const chunk = blob.slice(start, end + 1);

        return new Response(chunk, {
          status: 206,
          statusText: 'Partial Content',
          headers: {
            'Content-Type': mimeType,
            'Content-Length': chunk.size.toString(),
            'Content-Range': `bytes ${start}-${end}/${blob.size}`,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*'
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
        'Access-Control-Allow-Origin': '*',
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

  // Check if this is a tile request
  const tileMatch = url.pathname.match(TILE_URL_PATTERN);
  if (tileMatch) {
    const [, assetId, level, x, y, format] = tileMatch;
    event.respondWith(handleTileRequest(event.request, assetId, parseInt(level, 10), parseInt(x, 10), parseInt(y, 10), format));
    return;
  }

  // Check if this is a tile info request
  const tileInfoMatch = url.pathname.match(TILE_INFO_PATTERN);
  if (tileInfoMatch) {
    const [, assetId] = tileInfoMatch;
    event.respondWith(handleTileInfoRequest(assetId));
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
// Message Handler for Cache Management and Tile Requests
// ============================================================================

self.addEventListener('message', (event) => {
  const { action, type, requestId } = event.data;
  
  // Handle tile response from main thread
  if (type === 'TILE_RESPONSE' && requestId) {
    const pendingRequest = pendingTileRequests.get(requestId);
    if (pendingRequest) {
      if (event.data.error) {
        pendingRequest.reject(new Error(event.data.error));
      } else if (event.data.blob) {
        // Reconstruct Blob from array buffer
        const blob = new Blob([event.data.blob], {
          type: event.data.contentType || 'image/jpeg'
        });
        pendingRequest.resolve(blob);
      } else {
        pendingRequest.resolve(null);
      }
    }
    return;
  }
  
  // Handle tile manifest response from main thread
  if (type === 'TILE_MANIFEST_RESPONSE' && requestId) {
    const pendingRequest = pendingTileRequests.get(requestId);
    if (pendingRequest) {
      if (event.data.error) {
        pendingRequest.reject(new Error(event.data.error));
      } else {
        pendingRequest.resolve(event.data.manifest || null);
      }
    }
    return;
  }
  
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
  }
});
