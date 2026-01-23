
export const CONSTANTS = {
  APP_NAME: "IIIF Field Archive Studio",
  VERSION: "3.0.0",
  DEFAULT_LANGUAGE: "en",
  TOAST_DURATION: 3000,
};

export const METADATA_TEMPLATES = {
  RESEARCHER: ["Location", "Site Phase", "Artifact Type", "Material", "Findings"],
  ARCHIVIST: ["Title", "Creator", "Date", "Format", "Rights", "Identifier", "Language", "Source", "Description"],
  DEVELOPER: ["Identifier", "Technical Note", "Linked Data URI", "Image Service Profile"]
};

export const DUBLIN_CORE_MAP: Record<string, string> = {
  'title': 'dc:title',
  'creator': 'dc:creator',
  'subject': 'dc:subject',
  'description': 'dc:description',
  'publisher': 'dc:publisher',
  'contributor': 'dc:contributor',
  'date': 'dc:date',
  'type': 'dc:type',
  'format': 'dc:format',
  'identifier': 'dc:identifier',
  'source': 'dc:source',
  'language': 'dc:language',
  'relation': 'dc:relation',
  'coverage': 'dc:coverage',
  'rights': 'dc:rights',
  'location': 'dc:coverage', // Common mapping for field work
  'gps': 'dc:coverage'
};

export const RIGHTS_OPTIONS = [
  { label: "No Rights Reserved (CC0)", value: "https://creativecommons.org/publicdomain/zero/1.0/" },
  { label: "Attribution (CC BY 4.0)", value: "https://creativecommons.org/licenses/by/4.0/" },
  { label: "Attribution-NonCommercial (CC BY-NC 4.0)", value: "https://creativecommons.org/licenses/by-nc/4.0/" },
  { label: "In Copyright", value: "http://rightsstatements.org/vocab/InC/1.0/" },
  { label: "Copyright Not Evaluated", value: "http://rightsstatements.org/vocab/CNE/1.0/" },
  { label: "No Known Copyright", value: "http://rightsstatements.org/vocab/NKC/1.0/" }
];

export const VIEWING_DIRECTIONS = [
  "left-to-right",
  "right-to-left",
  "top-to-bottom",
  "bottom-to-top"
];

export const BEHAVIOR_OPTIONS = {
  'Collection': ['multi-part', 'together', 'auto-advance', 'no-auto-advance', 'repeat', 'no-repeat', 'unordered', 'individuals', 'continuous', 'paged'],
  'Manifest': ['auto-advance', 'no-auto-advance', 'repeat', 'no-repeat', 'unordered', 'individuals', 'continuous', 'paged'],
  'Canvas': ['auto-advance', 'no-auto-advance', 'facing-pages', 'non-paged'],
  'Range': ['auto-advance', 'no-auto-advance', 'unordered', 'individuals', 'continuous', 'paged', 'sequence', 'thumbnail-nav', 'no-nav'],
  'Content': []
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

export const RESOURCE_TYPE_CONFIG: Record<string, { icon: string; colorClass: string; bgClass: string; borderClass: string; label: string; metaphor: string }> = {
  'Collection': { 
    icon: 'folder', 
    colorClass: 'text-amber-600', 
    bgClass: 'bg-amber-100', 
    borderClass: 'border-amber-200', 
    label: 'Collection',
    metaphor: 'Box / Folder'
  },
  'Manifest': { 
    icon: 'menu_book', 
    colorClass: 'text-emerald-600', 
    bgClass: 'bg-emerald-100', 
    borderClass: 'border-emerald-200', 
    label: 'Manifest',
    metaphor: 'Bound Volume'
  },
  'Canvas': { 
    icon: 'crop_original', 
    colorClass: 'text-blue-500', 
    bgClass: 'bg-blue-100', 
    borderClass: 'border-blue-200', 
    label: 'Canvas',
    metaphor: 'Page / Screen'
  },
  'Range': { 
    icon: 'segment', 
    colorClass: 'text-indigo-500', 
    bgClass: 'bg-indigo-100', 
    borderClass: 'border-indigo-200', 
    label: 'Range',
    metaphor: 'Section'
  },
  'AnnotationPage': { 
    icon: 'layers', 
    colorClass: 'text-purple-500', 
    bgClass: 'bg-purple-100', 
    borderClass: 'border-purple-200', 
    label: 'Annotation Page',
    metaphor: 'Layer'
  },
  'Annotation': { 
    icon: 'chat_bubble', 
    colorClass: 'text-teal-500', 
    bgClass: 'bg-teal-100', 
    borderClass: 'border-teal-200', 
    label: 'Annotation',
    metaphor: 'Note / Mark'
  },
  'Content': { 
    icon: 'image', 
    colorClass: 'text-slate-500', 
    bgClass: 'bg-slate-100', 
    borderClass: 'border-slate-200', 
    label: 'Content',
    metaphor: 'File'
  },
  'AnnotationCollection': {
    icon: 'collections_bookmark',
    colorClass: 'text-pink-500',
    bgClass: 'bg-pink-100',
    borderClass: 'border-pink-200',
    label: 'Annotation Collection',
    metaphor: 'Set of Layers'
  }
};
