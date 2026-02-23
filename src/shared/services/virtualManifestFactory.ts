// Pure TypeScript — no Svelte-specific conversion

/**
 * Virtual Manifest Factory
 *
 * Creates IIIF Presentation 3.0 Manifests from raw resources like:
 * - Single images (jpg, png, gif, webp, tiff)
 * - Audio files (mp3, wav, ogg, flac)
 * - Video files (mp4, webm, ogv)
 * - PDF files
 *
 * This enables Field Studio to work with any media URL, not just IIIF resources.
 */

import { networkLog } from './logger';

// Extension arrays
const LOCAL_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif', 'bmp', 'svg'];
const LOCAL_AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'weba'];
const LOCAL_VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogv', 'mov', 'avi', 'mkv'];
const LOCAL_PDF_EXTENSIONS = ['pdf'];

// Local MIME type mapping
const LOCAL_MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  aac: 'audio/aac',
  m4a: 'audio/mp4',
  weba: 'audio/webm',
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  pdf: 'application/pdf',
};

const IIIF_CONTEXT = 'http://iiif.io/api/presentation/3/context.json';

// ============================================================================
// Types
// ============================================================================

export type LanguageMap = Record<string, string[]>;

export interface MediaInfo {
  url: string;
  type: 'image' | 'audio' | 'video' | 'pdf' | 'unknown';
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  filename?: string;
}

export interface VirtualManifestOptions {
  label?: string | LanguageMap;
  summary?: string | LanguageMap;
  rights?: string;
  requiredStatement?: { label: LanguageMap; value: LanguageMap };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider?: any[];
  metadata?: Array<{ label: LanguageMap; value: LanguageMap }>;
  language?: string;
}

// ============================================================================
// Virtual Manifest Factory
// ============================================================================

class VirtualManifestFactory {
  isMediaUrl(url: string): boolean {
    const ext = this.getExtension(url);
    return (
      LOCAL_IMAGE_EXTENSIONS.includes(ext) ||
      LOCAL_AUDIO_EXTENSIONS.includes(ext) ||
      LOCAL_VIDEO_EXTENSIONS.includes(ext) ||
      LOCAL_PDF_EXTENSIONS.includes(ext)
    );
  }

  isImageUrl(url: string): boolean {
    return LOCAL_IMAGE_EXTENSIONS.includes(this.getExtension(url));
  }

  isAudioUrl(url: string): boolean {
    return LOCAL_AUDIO_EXTENSIONS.includes(this.getExtension(url));
  }

  isVideoUrl(url: string): boolean {
    return LOCAL_VIDEO_EXTENSIONS.includes(this.getExtension(url));
  }

  private getExtension(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const ext = pathname.split('.').pop()?.toLowerCase() || '';
      return ext.split('?')[0];
    } catch {
      return url.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
    }
  }

  private getFilename(url: string): string {
    try {
      const urlObj = new URL(url);
      const { pathname } = urlObj;
      const parts = pathname.split('/');
      return decodeURIComponent(parts[parts.length - 1] || 'resource');
    } catch {
      const parts = url.split('/');
      return parts[parts.length - 1]?.split('?')[0] || 'resource';
    }
  }

  detectMediaType(url: string): MediaInfo['type'] {
    const ext = this.getExtension(url);
    if (LOCAL_IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (LOCAL_AUDIO_EXTENSIONS.includes(ext)) return 'audio';
    if (LOCAL_VIDEO_EXTENSIONS.includes(ext)) return 'video';
    if (LOCAL_PDF_EXTENSIONS.includes(ext)) return 'pdf';
    return 'unknown';
  }

  getMimeType(url: string): string {
    const ext = this.getExtension(url);
    return LOCAL_MIME_TYPES[ext] || 'application/octet-stream';
  }

  async probeMedia(url: string): Promise<MediaInfo> {
    const type = this.detectMediaType(url);
    const mimeType = this.getMimeType(url);
    const filename = this.getFilename(url);
    const info: MediaInfo = { url, type, mimeType, filename };

    try {
      if (type === 'image') {
        const dimensions = await this.probeImageDimensions(url);
        info.width = dimensions.width;
        info.height = dimensions.height;
      } else if (type === 'video') {
        const videoInfo = await this.probeVideoDimensions(url);
        info.width = videoInfo.width;
        info.height = videoInfo.height;
        info.duration = videoInfo.duration;
      } else if (type === 'audio') {
        const audioInfo = await this.probeAudioDuration(url);
        info.duration = audioInfo.duration;
      }
    } catch (e) {
      networkLog.warn('[VirtualManifestFactory] Media probe failed', e);
      if (type === 'image') { info.width = 1000; info.height = 1000; }
      else if (type === 'video') { info.width = 1920; info.height = 1080; info.duration = 0; }
      else if (type === 'audio') { info.duration = 0; }
    }

    return info;
  }

  private probeImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
      setTimeout(() => reject(new Error('Image load timeout')), 10000);
    });
  }

  private probeVideoDimensions(url: string): Promise<{ width: number; height: number; duration: number }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration });
        video.src = '';
      };
      video.onerror = () => reject(new Error('Failed to load video metadata'));
      video.src = url;
      setTimeout(() => reject(new Error('Video metadata load timeout')), 15000);
    });
  }

  private probeAudioDuration(url: string): Promise<{ duration: number }> {
    return new Promise((resolve, reject) => {
      const audio = document.createElement('audio');
      audio.crossOrigin = 'anonymous';
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => { resolve({ duration: audio.duration }); audio.src = ''; };
      audio.onerror = () => reject(new Error('Failed to load audio metadata'));
      audio.src = url;
      setTimeout(() => reject(new Error('Audio metadata load timeout')), 15000);
    });
  }

  private toLanguageMap(value: string | LanguageMap, lang = 'none'): LanguageMap {
    if (typeof value === 'string') return { [lang]: [value] };
    return value;
  }

  private generateId(): string {
    return `urn:uuid:${crypto.randomUUID()}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createManifest(url: string, options: VirtualManifestOptions = {}): Promise<any> {
    const mediaInfo = await this.probeMedia(url);
    const lang = options.language || 'none';
    const manifestId = this.generateId();
    const canvasId = `${manifestId}/canvas/1`;

    const defaultLabel = mediaInfo.filename?.replace(/\.[^/.]+$/, '') || 'Untitled';
    const label = this.toLanguageMap(options.label || defaultLabel, lang);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const manifest: any = {
      '@context': IIIF_CONTEXT,
      id: manifestId,
      type: 'Manifest',
      label,
      items: []
    };

    if (options.summary) manifest.summary = this.toLanguageMap(options.summary, lang);
    if (options.rights) manifest.rights = options.rights;
    if (options.requiredStatement) manifest.requiredStatement = options.requiredStatement;
    if (options.provider) manifest.provider = options.provider;
    if (options.metadata) manifest.metadata = options.metadata;

    manifest.items = [this.createCanvas(canvasId, mediaInfo, label)];
    return manifest;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createCanvas(canvasId: string, mediaInfo: MediaInfo, label: LanguageMap): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvas: any = {
      id: canvasId,
      type: 'Canvas',
      label,
      width: mediaInfo.width || 1000,
      height: mediaInfo.height || 1000,
      items: []
    };

    if (mediaInfo.duration !== undefined && mediaInfo.duration > 0) {
      canvas.duration = mediaInfo.duration;
    }

    const annoPageId = `${canvasId}/page/1`;
    const annoId = `${canvasId}/annotation/1`;

    canvas.items = [{
      id: annoPageId,
      type: 'AnnotationPage',
      items: [{
        id: annoId,
        type: 'Annotation',
        motivation: 'painting',
        body: this.createBody(mediaInfo),
        target: canvasId
      }]
    }];

    return canvas;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createBody(mediaInfo: MediaInfo): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
      id: mediaInfo.url,
      type: this.getBodyType(mediaInfo.type),
      format: mediaInfo.mimeType
    };
    if (mediaInfo.width) body.width = mediaInfo.width;
    if (mediaInfo.height) body.height = mediaInfo.height;
    if (mediaInfo.duration) body.duration = mediaInfo.duration;
    return body;
  }

  private getBodyType(mediaType: MediaInfo['type']): string {
    switch (mediaType) {
      case 'image': return 'Image';
      case 'audio': return 'Sound';
      case 'video': return 'Video';
      default: return 'Dataset';
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createManifestFromMultiple(urls: string[], options: VirtualManifestOptions = {}): Promise<any> {
    const lang = options.language || 'none';
    const manifestId = this.generateId();
    const label = this.toLanguageMap(options.label || `Collection of ${urls.length} items`, lang);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const manifest: any = {
      '@context': IIIF_CONTEXT,
      id: manifestId,
      type: 'Manifest',
      label,
      items: []
    };

    if (options.summary) manifest.summary = this.toLanguageMap(options.summary, lang);
    if (options.metadata) manifest.metadata = options.metadata;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvases: any[] = [];
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const mediaInfo = await this.probeMedia(url);
      const canvasId = `${manifestId}/canvas/${i + 1}`;
      const canvasLabel = this.toLanguageMap(mediaInfo.filename || `Item ${i + 1}`, lang);
      canvases.push(this.createCanvas(canvasId, mediaInfo, canvasLabel));
    }

    manifest.items = canvases;
    return manifest;
  }

  async createManifestFromFile(file: File, options: VirtualManifestOptions = {}): Promise<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manifest: any;
    blobUrl: string;
  }> {
    const blobUrl = URL.createObjectURL(file);
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

    let type: MediaInfo['type'] = 'unknown';
    if (LOCAL_IMAGE_EXTENSIONS.includes(fileExt) || file.type.startsWith('image/')) type = 'image';
    else if (LOCAL_AUDIO_EXTENSIONS.includes(fileExt) || file.type.startsWith('audio/')) type = 'audio';
    else if (LOCAL_VIDEO_EXTENSIONS.includes(fileExt) || file.type.startsWith('video/')) type = 'video';
    else if (fileExt === 'pdf' || file.type === 'application/pdf') type = 'pdf';

    const mediaInfo: MediaInfo = { url: blobUrl, type, mimeType: file.type, filename: file.name };

    try {
      if (type === 'image') {
        const dims = await this.probeImageDimensions(blobUrl);
        mediaInfo.width = dims.width;
        mediaInfo.height = dims.height;
      } else if (type === 'video') {
        const info = await this.probeVideoDimensions(blobUrl);
        mediaInfo.width = info.width;
        mediaInfo.height = info.height;
        mediaInfo.duration = info.duration;
      } else if (type === 'audio') {
        const info = await this.probeAudioDuration(blobUrl);
        mediaInfo.duration = info.duration;
      }
    } catch (e) {
      networkLog.warn('[VirtualManifestFactory] File probe failed', e);
      if (type === 'image') { mediaInfo.width = 1000; mediaInfo.height = 1000; }
    }

    const manifest = await this.createManifest(blobUrl, {
      ...options,
      label: options.label || file.name.replace(/\.[^/.]+$/, '')
    });

    if (manifest.items?.[0]) {
      manifest.items[0]._fileRef = file;
      manifest.items[0]._blobUrl = blobUrl;
    }

    return { manifest, blobUrl };
  }
}

export const virtualManifestFactory = new VirtualManifestFactory();
export default virtualManifestFactory;
