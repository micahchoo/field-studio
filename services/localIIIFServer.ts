
import { searchService } from './searchService';

export class LocalIIIFServer {
  private static instance: LocalIIIFServer;
  private images: Map<string, File | Blob> = new Map();

  static getInstance(): LocalIIIFServer {
    if (!LocalIIIFServer.instance) {
      LocalIIIFServer.instance = new LocalIIIFServer();
    }
    return LocalIIIFServer.instance;
  }

  register(id: string, file: File | Blob) {
    this.images.set(id, file);
  }

  async handleRequest(url: string): Promise<{ blobUrl?: string; json?: any; error?: string }> {
    try {
        const urlObj = new URL(url);
        
        // Handle Content Search API 2.0
        // Pattern: .../iiif/search/{id}?q={query}
        if (urlObj.pathname.includes('/iiif/search/')) {
            const query = urlObj.searchParams.get('q') || '';
            const results = searchService.search(query);
            
            // Transform FlexSearch results to IIIF Content Search API 2.0 AnnotationPage
            const items = results.map(res => ({
                "id": `${url}&match=${res.id}`,
                "type": "Annotation",
                "motivation": "supplementing", // Standard for text search results usually, or 'highlighting'
                "body": {
                    "type": "TextualBody",
                    "value": res.match, // This is the snippet or full text
                    "format": "text/plain"
                },
                "target": res.id // The Canvas ID or Annotation ID
            }));

            return {
                json: {
                    "@context": "http://iiif.io/api/search/2/context.json",
                    "id": url,
                    "type": "AnnotationPage",
                    "items": items
                    // 'annotations' property would go here for Hit highlighting if we had coordinate data
                }
            };
        }

        // Handle Image API
        const pathParts = urlObj.pathname.split('/iiif/image/');
        if (pathParts.length < 2) return { error: "Invalid IIIF URL" };

        const params = pathParts[1].split('/');
        const identifier = decodeURIComponent(params[0]);

        const file = this.images.get(identifier);
        if (!file) return { error: "Image not found or not loaded" };

        if (params[1] === 'info.json') {
            const info = await this.generateInfoJson(identifier, file);
            return { json: info };
        }

        // Simplistic Image API implementation for preview
        // Supports: full/max/0/default.jpg and basic region/size/rotation
        const region = params[1];
        const size = params[2];
        const rotation = params[3];
        const qualityFormat = params[4].split('.');
        const quality = qualityFormat[0];
        const format = qualityFormat[1];

        const blobUrl = await this.processImage(file, region, size, rotation, quality, format);
        return { blobUrl };

    } catch (e: any) {
        return { error: e.message };
    }
  }

  private async generateInfoJson(id: string, file: File | Blob): Promise<any> {
      const bitmap = await createImageBitmap(file);
      return {
          "@context": "http://iiif.io/api/image/3/context.json",
          "id": `https://archive.local/iiif/image/${id}`,
          "type": "ImageService3",
          "protocol": "http://iiif.io/api/image",
          "profile": "level2",
          "width": bitmap.width,
          "height": bitmap.height,
          "tiles": [{ "width": 512, "scaleFactors": [1, 2, 4, 8] }],
      };
  }

  private async processImage(
      file: File | Blob, 
      region: string, 
      size: string, 
      rotation: string, 
      quality: string, 
      format: string
  ): Promise<string> {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context failed");

      // 1. Region (Simplified: only full or x,y,w,h)
      let rx = 0, ry = 0, rw = bitmap.width, rh = bitmap.height;
      if (region !== 'full' && region !== 'square' && !region.startsWith('pct:')) {
          const p = region.split(',').map(Number);
          if (p.length === 4) { rx=p[0]; ry=p[1]; rw=p[2]; rh=p[3]; }
      }

      // 2. Size (Simplified: max or w,h)
      let sw = rw, sh = rh;
      if (size !== 'max' && !size.startsWith('pct:') && size.indexOf(',') > -1) {
         const p = size.split(',');
         if (p[0] && p[1]) { sw = Number(p[0]); sh = Number(p[1]); }
         else if (p[0]) { sw = Number(p[0]); sh = (sw / rw) * rh; }
      }

      canvas.width = sw;
      canvas.height = sh;
      
      // 3. Draw & Rotate
      // Basic rotation (0 only for MVP performance fallback)
      ctx.drawImage(bitmap, rx, ry, rw, rh, 0, 0, sw, sh);

      // 4. Output
      let mime = 'image/jpeg';
      if (format === 'png') mime = 'image/png';
      if (format === 'webp') mime = 'image/webp';

      return new Promise((resolve) => {
          canvas.toBlob(blob => {
              if (blob) resolve(URL.createObjectURL(blob));
              else resolve('');
          }, mime);
      });
  }
}
