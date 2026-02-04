/**
 * Media Type Utilities
 *
 * Centralized MIME type mapping, file extension detection, and content type classification.
 * Consolidates duplicate logic from:
 * - constants.ts (MIME_TYPE_MAP)
 * - services/virtualManifestFactory.ts (MIME_TYPES, IMAGE_EXTENSIONS, etc.)
 * - services/ingestAnalyzer.ts (isImageFile, isVideoFile, isAudioFile)
 * - components/views/Viewer.tsx (image format detection)
 */

// ============================================================================
// MIME Type Mappings
// ============================================================================

export interface MimeTypeInfo {
  type: 'Image' | 'Video' | 'Sound' | 'Text' | 'Dataset' | 'Model';
  format: string;
  motivation: 'painting' | 'supplementing';
}

/**
 * Complete MIME type mapping for supported file types
 * Consolidates and extends constants.ts MIME_TYPE_MAP
 */
export const MIME_TYPE_MAP: Record<string, MimeTypeInfo> = {
  // Images
  'jpg': { type: 'Image', format: 'image/jpeg', motivation: 'painting' },
  'jpeg': { type: 'Image', format: 'image/jpeg', motivation: 'painting' },
  'png': { type: 'Image', format: 'image/png', motivation: 'painting' },
  'webp': { type: 'Image', format: 'image/webp', motivation: 'painting' },
  'gif': { type: 'Image', format: 'image/gif', motivation: 'painting' },
  'tiff': { type: 'Image', format: 'image/tiff', motivation: 'painting' },
  'tif': { type: 'Image', format: 'image/tiff', motivation: 'painting' },
  'bmp': { type: 'Image', format: 'image/bmp', motivation: 'painting' },
  'svg': { type: 'Image', format: 'image/svg+xml', motivation: 'painting' },
  'avif': { type: 'Image', format: 'image/avif', motivation: 'painting' },
  'heic': { type: 'Image', format: 'image/heic', motivation: 'painting' },
  'heif': { type: 'Image', format: 'image/heif', motivation: 'painting' },
  
  // Video
  'mp4': { type: 'Video', format: 'video/mp4', motivation: 'painting' },
  'webm': { type: 'Video', format: 'video/webm', motivation: 'painting' },
  'ogv': { type: 'Video', format: 'video/ogg', motivation: 'painting' },
  'mov': { type: 'Video', format: 'video/quicktime', motivation: 'painting' },
  'avi': { type: 'Video', format: 'video/x-msvideo', motivation: 'painting' },
  'mkv': { type: 'Video', format: 'video/x-matroska', motivation: 'painting' },
  'm4v': { type: 'Video', format: 'video/x-m4v', motivation: 'painting' },
  
  // Audio
  'mp3': { type: 'Sound', format: 'audio/mpeg', motivation: 'painting' },
  'wav': { type: 'Sound', format: 'audio/wav', motivation: 'painting' },
  'ogg': { type: 'Sound', format: 'audio/ogg', motivation: 'painting' },
  'flac': { type: 'Sound', format: 'audio/flac', motivation: 'painting' },
  'aac': { type: 'Sound', format: 'audio/aac', motivation: 'painting' },
  'm4a': { type: 'Sound', format: 'audio/mp4', motivation: 'painting' },
  'weba': { type: 'Sound', format: 'audio/webm', motivation: 'painting' },
  
  // Text/Documents
  'txt': { type: 'Text', format: 'text/plain', motivation: 'supplementing' },
  'html': { type: 'Text', format: 'text/html', motivation: 'supplementing' },
  'htm': { type: 'Text', format: 'text/html', motivation: 'supplementing' },
  'md': { type: 'Text', format: 'text/markdown', motivation: 'supplementing' },
  'csv': { type: 'Text', format: 'text/csv', motivation: 'supplementing' },
  'vtt': { type: 'Text', format: 'text/vtt', motivation: 'supplementing' },
  'srt': { type: 'Text', format: 'text/srt', motivation: 'supplementing' },
  'pdf': { type: 'Text', format: 'application/pdf', motivation: 'painting' },
  
  // Data
  'json': { type: 'Dataset', format: 'application/json', motivation: 'supplementing' },
  'jsonld': { type: 'Dataset', format: 'application/ld+json', motivation: 'supplementing' },
  'xml': { type: 'Dataset', format: 'application/xml', motivation: 'supplementing' },
  'rdf': { type: 'Dataset', format: 'application/rdf+xml', motivation: 'supplementing' },
  
  // 3D Models
  'glb': { type: 'Model', format: 'model/gltf-binary', motivation: 'painting' },
  'gltf': { type: 'Model', format: 'model/gltf+json', motivation: 'painting' },
  'obj': { type: 'Model', format: 'model/obj', motivation: 'painting' },
  'stl': { type: 'Model', format: 'model/stl', motivation: 'painting' },
};

// ============================================================================
// Extension Arrays (derived from MIME_TYPE_MAP)
// ============================================================================

export const IMAGE_EXTENSIONS = Object.entries(MIME_TYPE_MAP)
  .filter(([, info]) => info.type === 'Image')
  .map(([ext]) => ext);

export const VIDEO_EXTENSIONS = Object.entries(MIME_TYPE_MAP)
  .filter(([, info]) => info.type === 'Video')
  .map(([ext]) => ext);

export const AUDIO_EXTENSIONS = Object.entries(MIME_TYPE_MAP)
  .filter(([, info]) => info.type === 'Sound')
  .map(([ext]) => ext);

export const TEXT_EXTENSIONS = Object.entries(MIME_TYPE_MAP)
  .filter(([, info]) => info.type === 'Text')
  .map(([ext]) => ext);

export const MODEL_EXTENSIONS = Object.entries(MIME_TYPE_MAP)
  .filter(([, info]) => info.type === 'Model')
  .map(([ext]) => ext);

// ============================================================================
// MIME Type Functions
// ============================================================================

/**
 * Get file extension from filename
 * Handles URLs with query parameters and fragments
 */
export function getExtension(filename: string): string {
  if (!filename) return '';
  
  try {
    // Try to parse as URL first
    const url = new URL(filename);
    const {pathname} = url;
    const lastDot = pathname.lastIndexOf('.');
    if (lastDot === -1) return '';
    return pathname.substring(lastDot + 1).toLowerCase().split('?')[0];
  } catch {
    // Handle as plain filename
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot + 1).toLowerCase().split('?')[0].split('#')[0];
  }
}

/**
 * Get MIME type info from filename
 * Returns null if extension is not recognized
 */
export function getMimeType(filename: string): MimeTypeInfo | null {
  const ext = getExtension(filename);
  return MIME_TYPE_MAP[ext] || null;
}

/**
 * Get MIME type string from filename
 * Returns 'application/octet-stream' as fallback
 */
export function getMimeTypeString(filename: string): string {
  const info = getMimeType(filename);
  return info?.format || 'application/octet-stream';
}

// ============================================================================
// File Type Detection
// ============================================================================

/**
 * Check if a filename is a media file (image, video, audio, or model)
 * Consolidated from services/ingestAnalyzer.ts
 */
export function isMediaFile(filename: string): boolean {
  const ext = getExtension(filename);
  return !!MIME_TYPE_MAP[ext];
}

/**
 * Check if a filename is an image
 * Consolidated from services/ingestAnalyzer.ts
 */
export function isImageFile(filename: string): boolean {
  const ext = getExtension(filename);
  return MIME_TYPE_MAP[ext]?.type === 'Image';
}

/**
 * Check if a filename is a video
 * Consolidated from services/ingestAnalyzer.ts
 */
export function isVideoFile(filename: string): boolean {
  const ext = getExtension(filename);
  return MIME_TYPE_MAP[ext]?.type === 'Video';
}

/**
 * Check if a filename is audio
 * Consolidated from services/ingestAnalyzer.ts
 */
export function isAudioFile(filename: string): boolean {
  const ext = getExtension(filename);
  return MIME_TYPE_MAP[ext]?.type === 'Sound';
}

/**
 * Check if a filename is a text document
 */
export function isTextFile(filename: string): boolean {
  const ext = getExtension(filename);
  return MIME_TYPE_MAP[ext]?.type === 'Text';
}

/**
 * Check if a filename is a 3D model
 */
export function isModelFile(filename: string): boolean {
  const ext = getExtension(filename);
  return MIME_TYPE_MAP[ext]?.type === 'Model';
}

/**
 * Check if a filename is a PDF
 */
export function isPdfFile(filename: string): boolean {
  return getExtension(filename) === 'pdf';
}

// ============================================================================
// URL-based Detection (for virtual manifest factory)
// ============================================================================

/**
 * Check if a URL points to an image
 * Consolidated from services/virtualManifestFactory.ts
 */
export function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.includes(getExtension(url));
}

/**
 * Check if a URL points to a video
 * Consolidated from services/virtualManifestFactory.ts
 */
export function isVideoUrl(url: string): boolean {
  return VIDEO_EXTENSIONS.includes(getExtension(url));
}

/**
 * Check if a URL points to audio
 * Consolidated from services/virtualManifestFactory.ts
 */
export function isAudioUrl(url: string): boolean {
  return AUDIO_EXTENSIONS.includes(getExtension(url));
}

/**
 * Check if a URL points to a supported media type (image, video, audio, or model)
 * Consolidated from services/virtualManifestFactory.ts
 */
export function isMediaUrl(url: string): boolean {
  const info = getMimeType(url);
  if (!info) return false;
  return info.type === 'Image' || info.type === 'Video' || info.type === 'Sound' || info.type === 'Model';
}

/**
 * Detect media type from URL or filename
 * Returns the IIIF content resource type
 */
export function detectMediaType(url: string): MimeTypeInfo['type'] | 'unknown' {
  const info = getMimeType(url);
  return info?.type || 'unknown';
}

// ============================================================================
// MIME Type Classification
// ============================================================================

/**
 * Check if a MIME type is an image type
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Check if a MIME type is a video type
 */
export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * Check if a MIME type is an audio type
 */
export function isAudioMimeType(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

/**
 * Check if a MIME type is time-based (video or audio)
 */
export function isTimeBasedMimeType(mimeType: string): boolean {
  return isVideoMimeType(mimeType) || isAudioMimeType(mimeType);
}

/**
 * Check if a MIME type is visual (image or video)
 */
export function isVisualMimeType(mimeType: string): boolean {
  return isImageMimeType(mimeType) || isVideoMimeType(mimeType);
}

/**
 * Get content type from MIME type string
 * Inverse of the extension mapping
 */
export function getContentTypeFromMime(mimeType: string): MimeTypeInfo['type'] | 'unknown' {
  const type = mimeType.split('/')[0];
  
  switch (type) {
    case 'image': return 'Image';
    case 'video': return 'Video';
    case 'audio': return 'Sound';
    case 'text': return 'Text';
    case 'model': return 'Model';
    default:
      if (mimeType === 'application/pdf') return 'Text';
      if (mimeType.includes('json') || mimeType.includes('xml')) return 'Dataset';
      return 'unknown';
  }
}

// ============================================================================
// Filename Utilities
// ============================================================================

/**
 * Get filename from URL
 * Removes query parameters and decodes URI components
 */
export function getFilenameFromUrl(url: string): string {
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
 * Remove extension from filename
 */
export function removeExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return filename;
  return filename.substring(0, lastDot);
}

// ============================================================================
// Export default object
// ============================================================================

export default {
  MIME_TYPE_MAP,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  AUDIO_EXTENSIONS,
  TEXT_EXTENSIONS,
  MODEL_EXTENSIONS,
  getExtension,
  getMimeType,
  getMimeTypeString,
  isMediaFile,
  isImageFile,
  isVideoFile,
  isAudioFile,
  isTextFile,
  isModelFile,
  isPdfFile,
  isImageUrl,
  isVideoUrl,
  isAudioUrl,
  isMediaUrl,
  detectMediaType,
  isImageMimeType,
  isVideoMimeType,
  isAudioMimeType,
  isTimeBasedMimeType,
  isVisualMimeType,
  getContentTypeFromMime,
  getFilenameFromUrl,
  removeExtension
};
