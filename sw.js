
const DB_NAME = 'biiif-archive-db';
const FILES_STORE = 'files';
const DERIVATIVES_STORE = 'derivatives';
const TILE_CACHE_NAME = 'iiif-tile-cache-v3';

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
      ))
    ])
  );
});

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
  if (cachedResponse) return cachedResponse;

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
        if (size === '150,' || size === 'pct:7.5') sizeKey = 'thumb';
        else if (size === '600,' || size === 'pct:30') sizeKey = 'small';
        else if (size === '1200,' || size === 'pct:60') sizeKey = 'medium';

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
    cache.put(request, res.clone());
    return res;

  } catch (err) {
    return new Response('Error', { status: 500 });
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Match archive.local (legacy) OR current origin WITH /iiif/ path
  if (url.host === 'archive.local' || url.pathname.includes('/iiif/image/')) {
    event.respondWith(handleImageRequest(event.request));
  }
});
