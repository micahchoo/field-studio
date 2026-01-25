
import { searchService } from './searchService';
import {
  generateInfoJson,
  generateStandardTiles,
  validateRegion,
  validateSize,
  validateRotation,
  validateQuality,
  validateFormat,
  getImageMimeType,
  IMAGE_API_CONTEXT,
  COMPLIANCE_LEVELS,
  ImageApiProfile,
  ImageFormat,
  ImageQuality
} from '../utils';

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
        
        if (urlObj.pathname.includes('/iiif/search/')) {
            const query = urlObj.searchParams.get('q') || '';
            const results = searchService.search(query);
            
            const items = results.map(res => ({
                "id": `${url}&match=${res.id}`,
                "type": "Annotation",
                "motivation": "supplementing",
                "body": {
                    "type": "TextualBody",
                    "value": res.match,
                    "format": "text/plain"
                },
                "target": res.id
            }));

            return {
                json: {
                    "@context": "http://iiif.io/api/search/2/context.json",
                    "id": url,
                    "type": "AnnotationPage",
                    "items": items
                }
            };
        }

        // Support flexible base URLs by splitting on the last occurrence of /image/
        const pathParts = urlObj.pathname.split('/image/');
        if (pathParts.length < 2) return { error: "Invalid IIIF URL" };

        const params = pathParts[pathParts.length - 1].split('/');

        const identifier = decodeURIComponent(params[0]);

        const file = this.images.get(identifier);
        if (!file) return { error: "Image not found or not loaded" };

        if (params[1] === 'info.json') {
            const info = await this.generateImageInfoJson(identifier, file);
            return { json: info };
        }

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

  private async generateImageInfoJson(id: string, file: File | Blob): Promise<any> {
      const bitmap = await createImageBitmap(file);
      const baseId = `${window.location.origin}/iiif/image/${id}`;

      // Use centralized info.json generation with level2 profile
      return generateInfoJson(
          baseId,
          bitmap.width,
          bitmap.height,
          'level2',
          {
              tiles: generateStandardTiles(512, [1, 2, 4, 8]),
              extraFeatures: ['regionByPx', 'regionByPct', 'sizeByW', 'sizeByH', 'sizeByWh', 'rotationBy90s']
          }
      );
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

      // Validate parameters using centralized validation
      const regionResult = validateRegion(region, bitmap.width, bitmap.height);
      if (!regionResult.valid) {
          throw new Error(regionResult.error);
      }

      const sizeResult = validateSize(size, bitmap.width, bitmap.height, true);
      if (!sizeResult.valid) {
          throw new Error(sizeResult.error);
      }

      const rotationResult = validateRotation(rotation, true, true);
      if (!rotationResult.valid) {
          throw new Error(rotationResult.error);
      }

      const qualityResult = validateQuality(quality, ['default', 'color', 'gray', 'bitonal']);
      if (!qualityResult.valid) {
          throw new Error(qualityResult.error);
      }

      const formatResult = validateFormat(format, ['jpg', 'png', 'webp', 'gif']);
      if (!formatResult.valid) {
          throw new Error(formatResult.error);
      }

      // Process region
      let rx = 0, ry = 0, rw = bitmap.width, rh = bitmap.height;
      if (regionResult.parsed) {
          const rp = regionResult.parsed;
          if (rp.type === 'pixels') {
              rx = rp.x!; ry = rp.y!; rw = rp.w!; rh = rp.h!;
          } else if (rp.type === 'percent') {
              rx = Math.floor(bitmap.width * rp.x! / 100);
              ry = Math.floor(bitmap.height * rp.y! / 100);
              rw = Math.floor(bitmap.width * rp.w! / 100);
              rh = Math.floor(bitmap.height * rp.h! / 100);
          } else if (rp.type === 'square') {
              const minDim = Math.min(bitmap.width, bitmap.height);
              rx = Math.floor((bitmap.width - minDim) / 2);
              ry = Math.floor((bitmap.height - minDim) / 2);
              rw = rh = minDim;
          }
      }

      // Clamp region to image bounds
      rw = Math.min(rw, bitmap.width - rx);
      rh = Math.min(rh, bitmap.height - ry);

      // Process size
      let sw = rw, sh = rh;
      if (sizeResult.parsed) {
          const sp = sizeResult.parsed;
          if (sp.type === 'width') {
              sw = sp.width!;
              sh = Math.round((sw / rw) * rh);
          } else if (sp.type === 'height') {
              sh = sp.height!;
              sw = Math.round((sh / rh) * rw);
          } else if (sp.type === 'widthHeight') {
              sw = sp.width!;
              sh = sp.height!;
          } else if (sp.type === 'percent') {
              sw = Math.round(rw * sp.percent! / 100);
              sh = Math.round(rh * sp.percent! / 100);
          } else if (sp.type === 'confined') {
              const scaleW = sp.width! / rw;
              const scaleH = sp.height! / rh;
              const scale = Math.min(scaleW, scaleH);
              sw = Math.round(rw * scale);
              sh = Math.round(rh * scale);
          }
      }

      canvas.width = sw;
      canvas.height = sh;

      // Handle rotation
      if (rotationResult.parsed && (rotationResult.parsed.degrees !== 0 || rotationResult.parsed.mirror)) {
          const degrees = rotationResult.parsed.degrees;
          const mirror = rotationResult.parsed.mirror;

          // For 90/270 degree rotations, swap canvas dimensions
          if (degrees === 90 || degrees === 270) {
              canvas.width = sh;
              canvas.height = sw;
          }

          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);

          if (mirror) {
              ctx.scale(-1, 1);
          }

          ctx.rotate((degrees * Math.PI) / 180);

          if (degrees === 90 || degrees === 270) {
              ctx.drawImage(bitmap, rx, ry, rw, rh, -sh / 2, -sw / 2, sh, sw);
          } else {
              ctx.drawImage(bitmap, rx, ry, rw, rh, -sw / 2, -sh / 2, sw, sh);
          }

          ctx.restore();
      } else {
          ctx.drawImage(bitmap, rx, ry, rw, rh, 0, 0, sw, sh);
      }

      // Handle quality (grayscale/bitonal)
      if (quality === 'gray' || quality === 'bitonal') {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
              const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              if (quality === 'bitonal') {
                  const bw = gray > 128 ? 255 : 0;
                  data[i] = data[i + 1] = data[i + 2] = bw;
              } else {
                  data[i] = data[i + 1] = data[i + 2] = gray;
              }
          }
          ctx.putImageData(imageData, 0, 0);
      }

      // Get MIME type using centralized utility
      const mime = getImageMimeType(format as ImageFormat);

      return new Promise((resolve) => {
          canvas.toBlob(blob => {
              if (blob) resolve(URL.createObjectURL(blob));
              else resolve('');
          }, mime);
      });
  }
}
