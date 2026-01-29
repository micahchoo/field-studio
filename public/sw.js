
const DB_NAME = 'biiif-archive-db';
const FILES_STORE = 'files';
const DERIVATIVES_STORE = 'derivatives';
const TILE_CACHE_NAME = 'iiif-tile-cache-v3';

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
    const rotationParam = params[3];
    const qualityFormat = params[4] ? params[4].split('.') : ['default', 'jpg'];
    const quality = qualityFormat[0];
    const format = qualityFormat[1];

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

    if (region === 'full' && rotationParam === '0' && (quality === 'default' || quality === 'color')) {
        let sizeKey = null;
        const widthMatch = size.match(/^(\d+),$/);
        const width = widthMatch ? parseInt(widthMatch[1]) : null;

        // Flexible matching for derivative sizes
        // Matches standard presets defined in constants.ts
        if (width === 150 || size === 'pct:7.5') sizeKey = 'thumb';
        else if ((width && width <= 600) || size === 'pct:30') sizeKey = 'small';
        else if ((width && width <= 1200) || size === 'pct:60') sizeKey = 'medium';

        if (sizeKey) {
            const derivativeBlob = await getFromIDB(DERIVATIVES_STORE, `${identifier}_${sizeKey}`);
            if (derivativeBlob) {
                return new Response(derivativeBlob, { headers: { 'Content-Type': 'image/jpeg', 'Access-Control-Allow-Origin': '*' } });
            }
        }
    }

    const originalBlob = await getFromIDB(FILES_STORE, identifier);
    if (!originalBlob) return new Response('Not found', { status: 404 });
    
    const bitmap = await createImageBitmap(originalBlob);
    let rx = 0, ry = 0, rw = bitmap.width, rh = bitmap.height;
    
    if (region !== 'full') {
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

    let sw = rw, sh = rh;
    if (size !== 'max') {
        if (size.startsWith('pct:')) {
             const pct = Number(size.split(':')[1]);
             if (!isNaN(pct)) {
                 sw = Math.floor(rw * (pct/100));
                 sh = Math.floor(rh * (pct/100));
             }
        } else if (size.includes(',')) {
             const p = size.split(',');
             if (p[0] && p[1]) { 
                 sw = Number(p[0]); sh = Number(p[1]); 
             } else if (p[0]) { 
                 sw = Number(p[0]); sh = Math.floor((sw / rw) * rh); 
             } else if (p[1]) { 
                 sh = Number(p[1]); sw = Math.floor((sh / rh) * rw); 
             }
        }
    }

    const canvas = new OffscreenCanvas(Math.max(1, Math.floor(sw)), Math.max(1, Math.floor(sh)));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, rx, ry, rw, rh, 0, 0, sw, sh);

    const blobOutput = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    const res = new Response(blobOutput, { headers: { 'Content-Type': 'image/jpeg', 'Access-Control-Allow-Origin': '*' } });
    
    // Use LRU cache instead of simple cache.put
    await addToCache(request, res.clone());
    return res;

  } catch (err) {
    console.error('[SW] Error handling image request:', err);
    return new Response('Error', { status: 500 });
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
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
  }
});
