/**
 * Core Application Constants
 * 
 * Fundamental application configuration and constants.
 */

export const CONSTANTS = {
  APP_NAME: "IIIF Field Archive Studio",
  VERSION: "3.0.0",
  DEFAULT_LANGUAGE: "en",
  TOAST_DURATION: 3000,
} as const;

/**
 * IIIF Configuration
 * Central source for IIIF-specific configuration values
 */
export const IIIF_CONFIG = {
  /**
   * Base URL configuration
   * Note: Runtime base URL is determined by window.location if not specified
   */
  BASE_URL: {
    DEFAULT: 'http://localhost/iiif',
    LEGACY_DOMAINS: ['archive.local', 'example.org'],
    PATH_SEGMENT: 'iiif'
  },
  
  /**
   * ID Generation Patterns
   */
  ID_PATTERNS: {
    MANIFEST: (baseUrl: string, uuid: string) => `${baseUrl}/manifest/${uuid}`,
    COLLECTION: (baseUrl: string, uuid: string) => `${baseUrl}/collection/${uuid}`,
    CANVAS: (manifestId: string, index: number) => `${manifestId}/canvas/${index}`,
    RANGE: (baseUrl: string, uuid: string) => `${baseUrl}/range/${uuid}`,
    ANNOTATION_PAGE: (parentId: string, type: string) => `${parentId}/page/${type}`,
    ANNOTATION: (parentId: string, id: string) => `${parentId}/annotation/${id}`,
    SEARCH_SERVICE: (baseUrl: string, resourceId: string) => `${baseUrl}/search/${resourceId}`,
    IMAGE_SERVICE: (baseUrl: string, assetId: string) => `${baseUrl}/image/${assetId}`
  },

  /**
   * Ingest Conventions
   */
  INGEST: {
    COLLECTION_PREFIX: '_',
    ROOT_NAME: 'root',
    ROOT_DISPLAY_NAME: 'My Archive',
    LOOSE_FILES_Dir_NAME: 'Files',
    META_FILE: 'info.yml'
  }
} as const;

/**
 * Default application settings
 */
export const DEFAULTS = {
  INGEST_PREFS: {
    defaultCanvasWidth: 2000,
    defaultCanvasHeight: 2000,
    defaultDuration: 100,
    thumbnailWidth: 250,
    thumbnailHeight: 250,
    maxFileSize: 100 * 1024 * 1024, // 100MB
  },
  
  MAP_CONFIG: {
    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    defaultZoom: 2,
    defaultCenter: [20, 0] as [number, number]
  },
  
  ZOOM_CONFIG: {
    min: 0.1,
    max: 5,
    step: 0.1
  }
} as const;
