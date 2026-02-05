/**
 * Media type detection molecules
 * Depends on: atoms/media-types, atoms/files
 */

import {
  MIME_TYPE_MAP,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  AUDIO_EXTENSIONS,
  TEXT_EXTENSIONS,
  MODEL_EXTENSIONS,
  type ContentResourceType,
  type MimeTypeInfo,
} from '../atoms/media-types';
import { getExtension } from '../atoms/files';

// Re-export file utilities used by consumers
export { getExtension };

/**
 * Get MIME type info from filename
 */
export function getMimeType(filename: string): MimeTypeInfo | null {
  const ext = getExtension(filename);
  return MIME_TYPE_MAP[ext] || null;
}

/**
 * Get MIME type string from filename
 */
export function getMimeTypeString(filename: string): string {
  const info = getMimeType(filename);
  return info?.format || 'application/octet-stream';
}

/**
 * Check if file is an image
 */
export function isImageFile(filename: string): boolean {
  const info = getMimeType(filename);
  return info?.type === 'Image';
}

/**
 * Check if file is a video
 */
export function isVideoFile(filename: string): boolean {
  const info = getMimeType(filename);
  return info?.type === 'Video';
}

/**
 * Check if file is audio
 */
export function isAudioFile(filename: string): boolean {
  const info = getMimeType(filename);
  return info?.type === 'Sound';
}

/**
 * Check if file is text
 */
export function isTextFile(filename: string): boolean {
  const info = getMimeType(filename);
  return info?.type === 'Text';
}

/**
 * Check if file is a 3D model
 */
export function isModelFile(filename: string): boolean {
  const info = getMimeType(filename);
  return info?.type === 'Model';
}

/**
 * Check if file is PDF
 */
export function isPdfFile(filename: string): boolean {
  return getExtension(filename) === 'pdf';
}

/**
 * Check if MIME type is an image
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Check if MIME type is video
 */
export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * Check if MIME type is audio
 */
export function isAudioMimeType(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

/**
 * Check if MIME type is time-based (video or audio)
 */
export function isTimeBasedMimeType(mimeType: string): boolean {
  return isVideoMimeType(mimeType) || isAudioMimeType(mimeType);
}

/**
 * Check if MIME type is visual (image or video)
 */
export function isVisualMimeType(mimeType: string): boolean {
  return isImageMimeType(mimeType) || isVideoMimeType(mimeType);
}

/**
 * Determine content resource type from MIME type
 */
export function getContentTypeFromMime(mimeType: string): ContentResourceType {
  const type = mimeType.split('/')[0];

  switch (type) {
    case 'image':
      return 'Image';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Sound';
    case 'text':
      return 'Text';
    case 'model':
      return 'Model';
    default:
      if (mimeType === 'application/pdf') return 'Text';
      if (mimeType.includes('json') || mimeType.includes('xml')) return 'Dataset';
      return 'Dataset';
  }
}

/**
 * Get content resource type from filename
 */
export function getContentTypeFromFilename(filename: string): ContentResourceType {
  const info = getMimeType(filename);
  return info?.type || 'Dataset';
}

/**
 * Detect media type from URL
 */
export function detectMediaType(url: string): {
  type: ContentResourceType | null;
  format: string | null;
} {
  const info = getMimeType(url);
  if (info) {
    return { type: info.type, format: info.format };
  }
  return { type: null, format: null };
}

/**
 * Get filename from URL
 */
export function getFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/');
    return parts[parts.length - 1] || '';
  } catch {
    // If not a valid URL, return as-is
    return url;
  }
}

// Re-export extension arrays for convenience
export {
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  AUDIO_EXTENSIONS,
  TEXT_EXTENSIONS,
  MODEL_EXTENSIONS,
};
