
export const CONSTANTS = {
  APP_NAME: "IIIF Field Archive Studio",
  VERSION: "2.0.0",
  DEFAULT_LANGUAGE: "en",
  TOAST_DURATION: 3000,
};

export const MIME_TYPE_MAP: Record<string, { type: string; format: string; motivation: string }> = {
  'jpg': { type: 'Image', format: 'image/jpeg', motivation: 'painting' },
  'jpeg': { type: 'Image', format: 'image/jpeg', motivation: 'painting' },
  'png': { type: 'Image', format: 'image/png', motivation: 'painting' },
  'webp': { type: 'Image', format: 'image/webp', motivation: 'painting' },
  'gif': { type: 'Image', format: 'image/gif', motivation: 'painting' },
  'mp3': { type: 'Sound', format: 'audio/mpeg', motivation: 'painting' },
  'wav': { type: 'Sound', format: 'audio/wav', motivation: 'painting' },
  'mp4': { type: 'Video', format: 'video/mp4', motivation: 'painting' },
  'txt': { type: 'Text', format: 'text/plain', motivation: 'supplementing' },
  'json': { type: 'Dataset', format: 'application/json', motivation: 'supplementing' },
  'glb': { type: 'Model', format: 'model/gltf-binary', motivation: 'painting' },
};

export const DEFAULT_INGEST_PREFS = {
  defaultCanvasWidth: 2000,
  defaultCanvasHeight: 2000,
  defaultDuration: 100,
  thumbnailWidth: 250,
  thumbnailHeight: 250,
  maxFileSize: 100 * 1024 * 1024, // 100MB
};

export const DEFAULT_MAP_CONFIG = {
  tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; OpenStreetMap contributors',
  defaultZoom: 2,
  defaultCenter: [20, 0] as [number, number]
};

export const DEFAULT_ZOOM_CONFIG = {
  min: 0.1,
  max: 5,
  step: 0.1
};
