
export type AppMode = 'archive' | 'collections' | 'boards' | 'search' | 'viewer' | 'metadata';
export type ViewType = 'files' | 'iiif';
export type IIIFMotivation = 'painting' | 'supplementing' | 'commenting' | 'tagging' | 'linking' | 'identifying' | 'describing' | 'contentState' | string;
export type ConnectionType = 'depicts' | 'transcribes' | 'relatesTo' | 'contradicts' | 'precedes';
export type AbstractionLevel = 'simple' | 'standard' | 'advanced';
export type ResourceState = 'cached' | 'stub' | 'local-only' | 'stale' | 'conflict';

export interface AppSettings {
  defaultBaseUrl: string;
  language: string;
  theme: 'light' | 'dark';
  fieldMode: boolean; 
  abstractionLevel: AbstractionLevel;
  mapConfig: typeof import('./constants').DEFAULT_MAP_CONFIG;
  zoomConfig: typeof import('./constants').DEFAULT_ZOOM_CONFIG;
  height: number;
  ingestPreferences: typeof import('./constants').DEFAULT_INGEST_PREFS;
  autoSaveInterval: number; // in seconds
  showTechnicalIds: boolean;
  metadataTemplate: string[]; // List of suggested property labels
}

export interface IngestReport {
  manifestsCreated: number;
  collectionsCreated: number;
  canvasesCreated: number;
  filesProcessed: number;
  warnings: string[];
}

export interface IngestResult {
  root: IIIFItem | null;
  report: IngestReport;
}

export interface FileTree {
  name: string;
  path: string;
  files: Map<string, File>;
  directories: Map<string, FileTree>;
  iiifIntent?: 'Collection' | 'Manifest' | 'Range' | 'Canvas';
  iiifBehavior?: string[];
  viewingDirection?: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';
  iiifBaseUrl?: string; 
}

export interface IIIFItem {
  "@context"?: string | string[];
  id: string;
  type: "Collection" | "Manifest" | "Canvas" | "Range" | "AnnotationPage" | "Annotation" | "AnnotationCollection" | "Agent" | "Text" | "Dataset" | "Image" | "Video" | "Sound";
  label?: Record<string, string[]>;
  summary?: Record<string, string[]>;
  metadata?: Array<{ label: Record<string, string[]>; value: Record<string, string[]> }>;
  requiredStatement?: { label: Record<string, string[]>; value: Record<string, string[]> };
  rights?: string;
  navDate?: string;
  thumbnail?: IIIFExternalWebResource[];
  items?: any[]; 
  annotations?: IIIFAnnotationPage[];
  behavior?: string[];
  
  provider?: Array<{ id: string; type: "Agent"; label: Record<string, string[]>; homepage?: any[]; logo?: any[] }>;
  homepage?: Array<{ id: string; type: "Text"; label: Record<string, string[]>; format?: string; language?: string[] }>;
  seeAlso?: Array<{ id: string; type: "Dataset" | string; format?: string; profile?: string; label?: Record<string, string[]> }>;
  rendering?: Array<{ id: string; type: "Text" | string; label: Record<string, string[]>; format?: string }>;
  service?: any[];
  viewingDirection?: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';
  start?: { id: string; type: "Canvas" | "SpecificResource"; source?: string; selector?: any };
  supplementary?: { id: string; type: "AnnotationCollection" };
  partOf?: Array<{ id: string; type: string; label?: Record<string, string[]> }>;
  
  placeholderCanvas?: IIIFCanvas;
  accompanyingCanvas?: IIIFCanvas;

  _fileRef?: File; 
  _blobUrl?: string;
  _parentId?: string;
  _state?: ResourceState; 
  _filename?: string;
}

export interface IIIFCanvas extends IIIFItem {
  type: "Canvas";
  width: number;
  height: number;
  duration?: number;
  items: IIIFAnnotationPage[];
}

export interface IIIFCollection extends IIIFItem {
  type: "Collection";
  items: IIIFItem[];
}

export interface IIIFManifest extends IIIFItem {
  type: "Manifest";
  items: IIIFCanvas[];
  viewingDirection?: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';
  structures?: IIIFRange[]; 
}

export interface IIIFRange extends IIIFItem {
  type: "Range";
  items: Array<IIIFRangeReference | IIIFSpecificResource | IIIFRange>;
}

export interface IIIFRangeReference {
    id: string;
    type: "Canvas" | "Range";
}

export interface IIIFAnnotationPage {
  id: string;
  type: "AnnotationPage";
  label?: Record<string, string[]>;
  items: IIIFAnnotation[];
}

export interface IIIFAnnotation {
  id: string;
  type: "Annotation";
  label?: Record<string, string[]>;
  motivation: IIIFMotivation | IIIFMotivation[];
  body: IIIFAnnotationBody | IIIFAnnotationBody[];
  target: string | IIIFSpecificResource | Array<string | IIIFSpecificResource>;
  created?: string;
  _layout?: { x: number; y: number; w: number; h: number }; 
}

export type IIIFAnnotationBody = IIIFTextualBody | IIIFExternalWebResource;

export interface IIIFTextualBody {
  type: "TextualBody";
  value: string;
  format: string;
  language?: string;
}

export interface IIIFExternalWebResource {
  id: string;
  type: "Image" | "Video" | "Sound" | "Text" | "Dataset" | "Model";
  format: string;
  width?: number;
  height?: number;
  duration?: number;
  label?: Record<string, string[]>;
  service?: any[];
}

export interface IIIFSpecificResource {
  type: "SpecificResource";
  id?: string;
  source: string | IIIFItem;
  selector?: Selector | Selector[];
  purpose?: IIIFMotivation;
}

export type Selector = 
  | { type: "FragmentSelector"; value: string; conformsTo?: string } 
  | { type: "SvgSelector"; value: string } 
  | { type: "PointSelector"; t?: number; x?: number; y?: number };

export function getIIIFValue(map?: Record<string, string[]>, preferredLang: string = 'en'): string {
  if (!map || typeof map !== 'object') return '';
  const values = map[preferredLang] || map['en'] || map['none'] || map['@none'] || Object.values(map)[0];
  return Array.isArray(values) ? values[0] || '' : '';
}
