
const DB_NAME = 'biiif-archive-db';
const FILES_STORE = 'files';
const TILE_CACHE_NAME = 'iiif-tile-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clear old caches
      caches.keys().then(keys => Promise.all(
        keys.map(key => {
          if (key !== TILE_CACHE_NAME) return caches.delete(key);
        })
      ))
    ])
  );
});

// Helper to get file from IDB
function getFile(id) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(FILES_STORE, 'readonly');
      const store = tx.objectStore(FILES_STORE);
      const getReq = store.get(id);
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    };
  });
}

// IIIF Image API 3.0 Implementation
async function handleImageRequest(request) {
  const url = request.url;
  
  // 1. Cache First Strategy
  const cache = await caches.open(TILE_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/iiif/image/');
    if (pathParts.length < 2) return new Response('Invalid IIIF URL', { status: 400 });

    const params = pathParts[1].split('/');
    const identifier = decodeURIComponent(params[0]);

    const blob = await getFile(identifier);
    if (!blob) return new Response('Image not found', { status: 404 });

    // Handle info.json
    if (params[1] === 'info.json') {
      const bitmap = await createImageBitmap(blob);
      const info = {
        "@context": "http://iiif.io/api/image/3/context.json",
        "id": `https://archive.local/iiif/image/${identifier}`,
        "type": "ImageService3",
        "protocol": "http://iiif.io/api/image",
        "profile": "level2",
        "width": bitmap.width,
        "height": bitmap.height,
        "tiles": [{ "width": 512, "scaleFactors": [1, 2, 4, 8, 16] }],
        "sizes": [
            { "width": Math.floor(bitmap.width / 4), "height": Math.floor(bitmap.height / 4) },
            { "width": Math.floor(bitmap.width / 2), "height": Math.floor(bitmap.height / 2) },
            { "width": bitmap.width, "height": bitmap.height }
        ],
        "extraQualities": ["gray", "bitonal"],
        "extraFeatures": ["mirroring", "rotationBy90s"]
      };
      const response = new Response(JSON.stringify(info), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
      // Cache info.json too
      cache.put(request, response.clone());
      return response;
    }

    // Handle Image Request: /{region}/{size}/{rotation}/{quality}.{format}
    const region = params[1];
    const size = params[2];
    const rotationParam = params[3];
    const qualityFormat = params[4].split('.');
    const quality = qualityFormat[0];
    const format = qualityFormat[1];

    const bitmap = await createImageBitmap(blob);
    
    // 1. Region
    let rx = 0, ry = 0, rw = bitmap.width, rh = bitmap.height;
    if (region !== 'full') {
      if (region === 'square') {
        const min = Math.min(rw, rh);
        rx = (rw - min) / 2;
        ry = (rh - min) / 2;
        rw = min;
        rh = min;
      } else if (region.startsWith('pct:')) {
        const p = region.substring(4).split(',').map(Number);
        rx = (p[0] / 100) * bitmap.width;
        ry = (p[1] / 100) * bitmap.height;
        rw = (p[2] / 100) * bitmap.width;
        rh = (p[3] / 100) * bitmap.height;
      } else {
        const p = region.split(',').map(Number);
        rx = p[0]; ry = p[1]; rw = p[2]; rh = p[3];
      }
    }

    // 2. Size
    let sw = rw, sh = rh;
    if (size !== 'max' && size !== '^max' && size !== 'full') {
       if (size.startsWith('pct:')) {
         const pct = Number(size.substring(4)) / 100;
         sw = rw * pct;
         sh = rh * pct;
       } else if (size.includes(',')) {
         const p = size.split(',');
         if (p[0] === '') { // ,h
            sh = Number(p[1]);
            sw = (sh / rh) * rw;
         } else if (p[1] === '') { // w,
            sw = Number(p[0]);
            sh = (sw / rw) * rh;
         } else if (size.startsWith('!')) { // !w,h (best fit)
             sw = Number(p[0].substring(1));
             sh = Number(p[1]);
             // Calculate best fit logic if needed, simplied here
         } else {
            sw = Number(p[0]);
            sh = Number(p[1]);
         }
       }
    }

    // Ensure dimensions are valid
    sw = Math.max(1, Math.floor(sw));
    sh = Math.max(1, Math.floor(sh));

    const canvas = new OffscreenCanvas(sw, sh);
    const ctx = canvas.getContext('2d');
    
    // 3. Rotation & Mirroring
    let rotation = 0;
    let mirrored = false;
    if (rotationParam.startsWith('!')) {
        mirrored = true;
        rotation = Number(rotationParam.substring(1));
    } else {
        rotation = Number(rotationParam);
    }

    ctx.save();
    
    // Move to center
    ctx.translate(sw/2, sh/2);
    
    // Rotate
    if (rotation !== 0) {
        ctx.rotate(rotation * Math.PI / 180);
    }
    
    // Mirror
    if (mirrored) {
        ctx.scale(-1, 1);
    }
    
    // Move back
    ctx.translate(-sw/2, -sh/2);

    // 4. Quality (Grayscale / Bitonal filters)
    if (quality === 'gray') {
        ctx.filter = 'grayscale(100%)';
    } else if (quality === 'bitonal') {
        ctx.filter = 'grayscale(100%) contrast(1000%)'; // Simple bitonal approximation
    }

    // Draw
    ctx.drawImage(bitmap, rx, ry, rw, rh, 0, 0, sw, sh);
    ctx.restore();

    const blobOutput = await canvas.convertToBlob({
      type: format === 'png' ? 'image/png' : 'image/jpeg',
      quality: 0.85 
    });

    const response = new Response(blobOutput, {
      headers: { 'Content-Type': format === 'png' ? 'image/png' : 'image/jpeg', 'Access-Control-Allow-Origin': '*' }
    });

    // Cache the generated tile
    cache.put(request, response.clone());

    return response;

  } catch (err) {
    console.error(err);
    return new Response('Internal Server Error', { status: 500 });
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === location.origin && url.pathname.startsWith('/iiif/image/')) {
    event.respondWith(handleImageRequest(event.request));
  }
});
