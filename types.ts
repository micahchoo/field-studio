
export type AppMode = 'archive' | 'collections' | 'boards' | 'search' | 'viewer';
export type ViewType = 'files' | 'iiif';
export type IIIFMotivation = 'painting' | 'supplementing' | 'commenting' | 'tagging' | 'linking' | 'identifying' | 'describing' | string;
export type ConnectionType = 'depicts' | 'transcribes' | 'relatesTo' | 'contradicts' | 'precedes';
export type AbstractionLevel = 'simple' | 'standard' | 'advanced';

export interface AIConfig {
  provider: 'none' | 'gemini' | 'ollama';
  ollamaEndpoint?: string;
  ollamaModel?: string;
}

export interface AppSettings {
  defaultBaseUrl: string;
  language: string;
  aiConfig: AIConfig;
  theme: 'light' | 'dark';
  fieldMode: boolean; 
  abstractionLevel: AbstractionLevel;
  mapConfig: typeof import('./constants').DEFAULT_MAP_CONFIG;
  zoomConfig: typeof import('./constants').DEFAULT_ZOOM_CONFIG;
  ingestPreferences: typeof import('./constants').DEFAULT_INGEST_PREFS;
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
}

// IIIF Core Types
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
  items?: IIIFItem[]; 
  annotations?: IIIFAnnotationPage[];
  behavior?: string[];
  
  // v3.0 Optional Properties
  provider?: Array<{ id: string; type: "Agent"; label: Record<string, string[]>; homepage?: any[]; logo?: any[] }>;
  homepage?: Array<{ id: string; type: "Text"; label: Record<string, string[]>; format?: string }>;
  seeAlso?: Array<{ id: string; type: "Dataset" | string; format?: string; profile?: string }>;
  rendering?: Array<{ id: string; type: "Text" | string; label: Record<string, string[]>; format?: string }>;
  service?: any[];
  
  // Canvas Specific
  placeholderCanvas?: IIIFCanvas;
  accompanyingCanvas?: IIIFCanvas;

  // Internal Helpers
  _fileRef?: File; // Reference to original file if applicable
  _blobUrl?: string;
  _parentId?: string;
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

export interface IIIFCanvas extends IIIFItem {
  type: "Canvas";
  width?: number;
  height?: number;
  duration?: number;
  items: IIIFAnnotationPage[]; // Painting annotations
}

export interface IIIFRange extends IIIFItem {
  type: "Range";
  items: Array<{ id: string; type: "Canvas" | "Range" } | IIIFCanvas>;
}

export interface IIIFAnnotationPage {
  id: string;
  type: "AnnotationPage";
  items: IIIFAnnotation[];
}

export interface IIIFAnnotation {
  id: string;
  type: "Annotation";
  motivation: IIIFMotivation | IIIFMotivation[];
  body: IIIFAnnotationBody | IIIFAnnotationBody[];
  target: string | IIIFSpecificResource | Array<string | IIIFSpecificResource>;
  created?: string;
  // UI helpers
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
  source: string;
  selector?: Selector | Selector[];
}

export type Selector = 
  | { type: "FragmentSelector"; value: string } 
  | { type: "SvgSelector"; value: string } 
  | { type: "PointSelector"; t?: number; x?: number; y?: number };
