/**
 * Media type constants and mappings
 * Zero dependencies
 */

export type ContentResourceType =
  | 'Image'
  | 'Video'
  | 'Sound'
  | 'Text'
  | 'Dataset'
  | 'Model';

export interface MimeTypeInfo {
  type: ContentResourceType;
  format: string;
  motivation: 'painting' | 'supplementing';
}

/**
 * Complete MIME type mapping for supported file types
 */
export const MIME_TYPE_MAP: Record<string, MimeTypeInfo> = {
  // Images
  jpg: { type: 'Image', format: 'image/jpeg', motivation: 'painting' },
  jpeg: { type: 'Image', format: 'image/jpeg', motivation: 'painting' },
  png: { type: 'Image', format: 'image/png', motivation: 'painting' },
  webp: { type: 'Image', format: 'image/webp', motivation: 'painting' },
  gif: { type: 'Image', format: 'image/gif', motivation: 'painting' },
  tiff: { type: 'Image', format: 'image/tiff', motivation: 'painting' },
  tif: { type: 'Image', format: 'image/tiff', motivation: 'painting' },
  bmp: { type: 'Image', format: 'image/bmp', motivation: 'painting' },
  svg: { type: 'Image', format: 'image/svg+xml', motivation: 'painting' },
  avif: { type: 'Image', format: 'image/avif', motivation: 'painting' },
  heic: { type: 'Image', format: 'image/heic', motivation: 'painting' },
  heif: { type: 'Image', format: 'image/heif', motivation: 'painting' },

  // Video
  mp4: { type: 'Video', format: 'video/mp4', motivation: 'painting' },
  webm: { type: 'Video', format: 'video/webm', motivation: 'painting' },
  ogv: { type: 'Video', format: 'video/ogg', motivation: 'painting' },
  mov: { type: 'Video', format: 'video/quicktime', motivation: 'painting' },
  avi: { type: 'Video', format: 'video/x-msvideo', motivation: 'painting' },
  mkv: { type: 'Video', format: 'video/x-matroska', motivation: 'painting' },
  m4v: { type: 'Video', format: 'video/x-m4v', motivation: 'painting' },

  // Audio
  mp3: { type: 'Sound', format: 'audio/mpeg', motivation: 'painting' },
  wav: { type: 'Sound', format: 'audio/wav', motivation: 'painting' },
  ogg: { type: 'Sound', format: 'audio/ogg', motivation: 'painting' },
  flac: { type: 'Sound', format: 'audio/flac', motivation: 'painting' },
  aac: { type: 'Sound', format: 'audio/aac', motivation: 'painting' },
  m4a: { type: 'Sound', format: 'audio/mp4', motivation: 'painting' },
  weba: { type: 'Sound', format: 'audio/webm', motivation: 'painting' },

  // Text/Documents
  txt: { type: 'Text', format: 'text/plain', motivation: 'supplementing' },
  html: { type: 'Text', format: 'text/html', motivation: 'supplementing' },
  htm: { type: 'Text', format: 'text/html', motivation: 'supplementing' },
  md: { type: 'Text', format: 'text/markdown', motivation: 'supplementing' },
  csv: { type: 'Text', format: 'text/csv', motivation: 'supplementing' },
  vtt: { type: 'Text', format: 'text/vtt', motivation: 'supplementing' },
  srt: { type: 'Text', format: 'text/srt', motivation: 'supplementing' },
  pdf: { type: 'Text', format: 'application/pdf', motivation: 'painting' },

  // Data
  json: { type: 'Dataset', format: 'application/json', motivation: 'supplementing' },
  jsonld: { type: 'Dataset', format: 'application/ld+json', motivation: 'supplementing' },
  xml: { type: 'Dataset', format: 'application/xml', motivation: 'supplementing' },
  rdf: { type: 'Dataset', format: 'application/rdf+xml', motivation: 'supplementing' },

  // 3D Models
  glb: { type: 'Model', format: 'model/gltf-binary', motivation: 'painting' },
  gltf: { type: 'Model', format: 'model/gltf+json', motivation: 'painting' },
  obj: { type: 'Model', format: 'model/obj', motivation: 'painting' },
  stl: { type: 'Model', format: 'model/stl', motivation: 'painting' },
} as const;

/**
 * Extension arrays derived from MIME_TYPE_MAP
 */
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
