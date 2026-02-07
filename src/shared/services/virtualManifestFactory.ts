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

import { IIIFAnnotation, IIIFCanvas, IIIFManifest, LanguageMap } from '@/src/shared/types';
import { IIIF_SPEC } from '@/src/shared/constants';
import {
  getExtension,
  getMimeType
} from '@/utils';

// Extension arrays - keep local to avoid conflicts with centralized utils naming
const LOCAL_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif', 'bmp', 'svg'];
const LOCAL_AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'weba'];
const LOCAL_VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogv', 'mov', 'avi', 'mkv'];
const LOCAL_PDF_EXTENSIONS = ['pdf'];

// Local MIME type mapping for extensions not fully covered by centralized utils
const LOCAL_MIME_TYPES: Record<string, string> = {
  // Additional document types
  pdf: 'application/pdf',
  // Additional video types
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska'
};

// ============================================================================
// Types
// ============================================================================

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
  /** Label for the manifest */
  label?: string | LanguageMap;
  /** Summary/description */
  summary?: string | LanguageMap;
  /** Rights statement */
  rights?: string;
  /** Required statement (attribution) */
  requiredStatement?: { label: LanguageMap; value: LanguageMap };
  /** Provider information */
  provider?: any[];
  /** Additional metadata */
  metadata?: Array<{ label: LanguageMap; value: LanguageMap }>;
  /** Language for default labels */
  language?: string;
}

// ============================================================================
// Virtual Manifest Factory
// ============================================================================

class VirtualManifestFactory {
  /**
   * Check if a URL points to a supported media type
   */
  isMediaUrl(url: string): boolean {
    const ext = this.getExtension(url);
    return (
      LOCAL_IMAGE_EXTENSIONS.includes(ext) ||
      LOCAL_AUDIO_EXTENSIONS.includes(ext) ||
      LOCAL_VIDEO_EXTENSIONS.includes(ext) ||
      LOCAL_PDF_EXTENSIONS.includes(ext)
    );
  }

  /**
   * Check if a URL points to an image
   */
  isImageUrl(url: string): boolean {
    return LOCAL_IMAGE_EXTENSIONS.includes(this.getExtension(url));
  }

  /**
   * Check if a URL points to audio
   */
  isAudioUrl(url: string): boolean {
    return LOCAL_AUDIO_EXTENSIONS.includes(this.getExtension(url));
  }

  /**
   * Check if a URL points to video
   */
  isVideoUrl(url: string): boolean {
    return LOCAL_VIDEO_EXTENSIONS.includes(this.getExtension(url));
  }

  /**
   * Get file extension from URL (delegates to centralized utility)
   */
  private getExtension(url: string): string {
    return getExtension(url);
  }

  /**
   * Get filename from URL
   */
  private getFilename(url: string): string {
    try {
      const urlObj = new URL(url);
      const {pathname} = urlObj;
      const parts = pathname.split('/');
      return decodeURIComponent(parts[parts.length - 1] || 'resource');
    } catch {
      const parts = url.split('/');
      return parts[parts.length - 1]?.split('?')[0] || 'resource';
    }
  }

  /**
   * Detect media type from URL
   */
  detectMediaType(url: string): MediaInfo['type'] {
    const ext = this.getExtension(url);
    if (LOCAL_IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (LOCAL_AUDIO_EXTENSIONS.includes(ext)) return 'audio';
    if (LOCAL_VIDEO_EXTENSIONS.includes(ext)) return 'video';
    if (LOCAL_PDF_EXTENSIONS.includes(ext)) return 'pdf';
    return 'unknown';
  }

  /**
   * Get MIME type from extension (uses centralized utility with local fallback)
   */
  getMimeType(url: string): string {
    // Try centralized utility first
    const mimeFromUtils = getMimeType(url);
    if (mimeFromUtils) return mimeFromUtils.format;

    // Fall back to local mapping for edge cases
    const ext = this.getExtension(url);
    return LOCAL_MIME_TYPES[ext] || 'application/octet-stream';
  }

  /**
   * Probe media to get dimensions/duration
   */
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
      console.warn('[VirtualManifestFactory] Media probe failed:', e);
      // Use defaults
      if (type === 'image') {
        info.width = 1000;
        info.height = 1000;
      } else if (type === 'video') {
        info.width = 1920;
        info.height = 1080;
        info.duration = 0;
      } else if (type === 'audio') {
        info.duration = 0;
      }
    }

    return info;
  }

  /**
   * Probe image dimensions
   */
  private probeImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = url;

      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Image load timeout')), 10000);
    });
  }

  /**
   * Probe video dimensions and duration
   */
  private probeVideoDimensions(url: string): Promise<{ width: number; height: number; duration: number }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration
        });
        video.src = '';
      };

      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
      };

      video.src = url;

      setTimeout(() => reject(new Error('Video metadata load timeout')), 15000);
    });
  }

  /**
   * Probe audio duration
   */
  private probeAudioDuration(url: string): Promise<{ duration: number }> {
    return new Promise((resolve, reject) => {
      const audio = document.createElement('audio');
      audio.crossOrigin = 'anonymous';
      audio.preload = 'metadata';

      audio.onloadedmetadata = () => {
        resolve({ duration: audio.duration });
        audio.src = '';
      };

      audio.onerror = () => {
        reject(new Error('Failed to load audio metadata'));
      };

      audio.src = url;

      setTimeout(() => reject(new Error('Audio metadata load timeout')), 15000);
    });
  }

  /**
   * Create a language map from a string or return existing LanguageMap
   */
  private toLanguageMap(value: string | LanguageMap, lang: string = 'none'): LanguageMap {
    if (typeof value === 'string') {
      return { [lang]: [value] };
    }
    return value;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `urn:uuid:${crypto.randomUUID()}`;
  }

  /**
   * Create a virtual IIIF Manifest from a media URL
   */
  async createManifest(url: string, options: VirtualManifestOptions = {}): Promise<IIIFManifest> {
    const mediaInfo = await this.probeMedia(url);
    const lang = options.language || 'none';
    const manifestId = this.generateId();
    const canvasId = `${manifestId}/canvas/1`;

    // Default label from filename
    const defaultLabel = mediaInfo.filename?.replace(/\.[^/.]+$/, '') || 'Untitled';
    const label = this.toLanguageMap(options.label || defaultLabel, lang);

    // Build the manifest
    const manifest: IIIFManifest = {
      '@context': IIIF_SPEC.PRESENTATION_3.CONTEXT,
      id: manifestId,
      type: 'Manifest',
      label,
      items: []
    };

    // Add optional properties
    if (options.summary) {
      (manifest as any).summary = this.toLanguageMap(options.summary, lang);
    }
    if (options.rights) {
      (manifest as any).rights = options.rights;
    }
    if (options.requiredStatement) {
      (manifest as any).requiredStatement = options.requiredStatement;
    }
    if (options.provider) {
      (manifest as any).provider = options.provider;
    }
    if (options.metadata) {
      manifest.metadata = options.metadata;
    }

    // Create canvas
    const canvas = this.createCanvas(canvasId, mediaInfo, label);
    manifest.items = [canvas];

    return manifest;
  }

  /**
   * Create a canvas for a media resource
   */
  private createCanvas(canvasId: string, mediaInfo: MediaInfo, label: LanguageMap): IIIFCanvas {
    const canvas: IIIFCanvas = {
      id: canvasId,
      type: 'Canvas',
      label,
      width: mediaInfo.width || 1000,
      height: mediaInfo.height || 1000,
      items: []
    };

    // Add duration for time-based media
    if (mediaInfo.duration !== undefined && mediaInfo.duration > 0) {
      (canvas as any).duration = mediaInfo.duration;
    }

    // Create annotation page and painting annotation
    const annoPageId = `${canvasId}/page/1`;
    const annoId = `${canvasId}/annotation/1`;

    const annotation: IIIFAnnotation = {
      id: annoId,
      type: 'Annotation',
      motivation: 'painting',
      body: this.createBody(mediaInfo),
      target: canvasId
    };

    canvas.items = [{
      id: annoPageId,
      type: 'AnnotationPage',
      items: [annotation]
    }];

    return canvas;
  }

  /**
   * Create annotation body for media
   */
  private createBody(mediaInfo: MediaInfo): any {
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

  /**
   * Get IIIF body type from media type
   */
  private getBodyType(mediaType: MediaInfo['type']): string {
    switch (mediaType) {
      case 'image': return 'Image';
      case 'audio': return 'Sound';
      case 'video': return 'Video';
      default: return 'Dataset';
    }
  }

  /**
   * Create a manifest from multiple media URLs
   */
  async createManifestFromMultiple(
    urls: string[],
    options: VirtualManifestOptions = {}
  ): Promise<IIIFManifest> {
    const lang = options.language || 'none';
    const manifestId = this.generateId();

    const label = this.toLanguageMap(
      options.label || `Collection of ${urls.length} items`,
      lang
    );

    const manifest: IIIFManifest = {
      '@context': IIIF_SPEC.PRESENTATION_3.CONTEXT,
      id: manifestId,
      type: 'Manifest',
      label,
      items: []
    };

    // Add optional properties
    if (options.summary) {
      (manifest as any).summary = this.toLanguageMap(options.summary, lang);
    }
    if (options.metadata) {
      manifest.metadata = options.metadata;
    }

    // Create canvases for each URL
    const canvases: IIIFCanvas[] = [];
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const mediaInfo = await this.probeMedia(url);
      const canvasId = `${manifestId}/canvas/${i + 1}`;
      const canvasLabel = this.toLanguageMap(mediaInfo.filename || `Item ${i + 1}`, lang);
      const canvas = this.createCanvas(canvasId, mediaInfo, canvasLabel);
      canvases.push(canvas);
    }

    manifest.items = canvases;
    return manifest;
  }

  /**
   * Wrap a File object in a virtual manifest
   */
  async createManifestFromFile(file: File, options: VirtualManifestOptions = {}): Promise<{
    manifest: IIIFManifest;
    blobUrl: string;
  }> {
    const blobUrl = URL.createObjectURL(file);

    // Determine media type from file
    let type: MediaInfo['type'] = 'unknown';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('audio/')) type = 'audio';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type === 'application/pdf') type = 'pdf';

    const mediaInfo: MediaInfo = {
      url: blobUrl,
      type,
      mimeType: file.type,
      filename: file.name
    };

    // Probe dimensions/duration
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
      console.warn('[VirtualManifestFactory] File probe failed:', e);
      if (type === 'image') {
        mediaInfo.width = 1000;
        mediaInfo.height = 1000;
      }
    }

    const manifest = await this.createManifest(blobUrl, {
      ...options,
      label: options.label || file.name.replace(/\.[^/.]+$/, '')
    });

    // Store file reference on canvas for export
    if (manifest.items?.[0]) {
      (manifest.items[0] as any)._fileRef = file;
      (manifest.items[0] as any)._blobUrl = blobUrl;
    }

    return { manifest, blobUrl };
  }
}

export const virtualManifestFactory = new VirtualManifestFactory();

export default virtualManifestFactory;
