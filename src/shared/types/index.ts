/**
 * IIIF Types - Subset needed by the Vault system
 *
 * Extracted from the React codebase's shared types.
 * Only includes types referenced by vault modules.
 */

export type IIIFMotivation = 'painting' | 'supplementing' | 'commenting' | 'tagging' | 'linking' | 'identifying' | 'describing' | 'contentState' | string;

export type ResourceState = 'cached' | 'stub' | 'local-only' | 'stale' | 'conflict' | 'trashed' | 'deleted';

export type AbstractionLevel = 'simple' | 'standard' | 'advanced';

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

export interface IIIFReference {
  id: string;
  type: "Collection" | "Manifest" | "Canvas" | "Range";
  label?: Record<string, string[]>;
  _isReference?: boolean;
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

export interface IIIFChoice {
  type: "Choice";
  items: (IIIFExternalWebResource | IIIFTextualBody)[];
}

export type IIIFAnnotationBody = IIIFTextualBody | IIIFExternalWebResource | IIIFChoice;

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

export type LanguageMap = Record<string, string[]>;

export function getIIIFValue(map?: Record<string, string[]>, preferredLang: string = 'en'): string {
  if (!map || typeof map !== 'object') return '';
  const values = map[preferredLang] || map['en'] || map['none'] || map['@none'] || Object.values(map)[0];
  return Array.isArray(values) ? values[0] || '' : '';
}

// ============================================================================
// Vault Types (inlined here to respect FSD: shared cannot import entities)
// These are the canonical definitions; entities/vault/types.ts re-exports them.
// ============================================================================

/**
 * Entity types supported by the vault
 */
export type EntityType = 'Collection' | 'Manifest' | 'Canvas' | 'Range' | 'AnnotationPage' | 'Annotation';

/**
 * Trashed entity metadata for recovery
 */
export interface TrashedEntity {
  entity: IIIFItem;
  originalParentId: string | null;
  trashedAt: number;
  memberOfCollections: string[];
  childIds: string[];
}

/**
 * Core normalized state structure — flat storage of IIIF entities for O(1) lookups
 */
export interface NormalizedState {
  entities: {
    Collection: Record<string, IIIFCollection>;
    Manifest: Record<string, IIIFManifest>;
    Canvas: Record<string, IIIFCanvas>;
    Range: Record<string, IIIFRange>;
    AnnotationPage: Record<string, IIIFAnnotationPage>;
    Annotation: Record<string, IIIFAnnotation>;
  };
  references: Record<string, string[]>;
  reverseRefs: Record<string, string>;
  collectionMembers: Record<string, string[]>;
  memberOfCollections: Record<string, string[]>;
  rootId: string | null;
  typeIndex: Record<string, EntityType>;
  extensions: Record<string, Record<string, unknown>>;
  trashedEntities: Record<string, TrashedEntity>;
}

/**
 * Snapshot of vault state for undo/redo
 */
export interface VaultSnapshot {
  state: NormalizedState;
  timestamp: number;
}

/**
 * Options for entity removal
 */
export interface RemoveOptions {
  permanent?: boolean;
}

/**
 * Options for restoring from trash
 */
export interface RestoreOptions {
  parentId?: string;
  index?: number;
}

/**
 * Result of emptying trash
 */
export interface EmptyTrashResult {
  state: NormalizedState;
  deletedCount: number;
  errors: string[];
}

// ============================================================================
// FileTree — recursive directory/file tree from file import
// ============================================================================

export interface FileTree {
  name: string;
  path: string;
  files: Map<string, File>;
  directories: Map<string, FileTree>;
  iiifIntent?: 'Collection' | 'Manifest' | 'Range' | 'Canvas';
  iiifBehavior?: string[];
  viewingDirection?: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';
  iiifBaseUrl?: string;
  rights?: string;
  navDate?: string;
  /** File name within this directory that should be the start canvas */
  startCanvasName?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isCanvas(item: IIIFItem | null | undefined): item is IIIFCanvas {
  return item?.type === 'Canvas';
}

export function isManifest(item: IIIFItem | null | undefined): item is IIIFManifest {
  return item?.type === 'Manifest';
}

export function isCollection(item: IIIFItem | null | undefined): item is IIIFCollection {
  return item?.type === 'Collection';
}

/** Column mapping for CSV import */
export interface CSVColumnMapping {
  csvColumn: string;
  iiifProperty: string;
  language?: string;
}

// ============================================================================
// Ingest Progress Types (used by iiifBuilder)
// ============================================================================

export type FileStatus = 'pending' | 'processing' | 'completed' | 'complete' | 'error' | 'skipped';
export type IngestStage = 'scanning' | 'analyzing' | 'processing' | 'building' | 'finalizing' | 'complete' | 'error' | 'cancelled';

export interface IngestFileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  status: FileStatus;
  progress: number;
  error?: string;
  entityId?: string;
}

export interface IngestActivityLogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  fileId?: string;
  fileInfo?: { name: string; size: number };
}

export interface IngestProgress {
  operationId: string;
  stage: IngestStage;
  stageProgress: number;
  filesTotal: number;
  filesCompleted: number;
  filesProcessing: number;
  filesError: number;
  files: IngestFileInfo[];
  speed: number;
  etaSeconds: number;
  startedAt: number;
  updatedAt: number;
  isPaused: boolean;
  isCancelled: boolean;
  activityLog: IngestActivityLogEntry[];
  overallProgress: number;
  currentFile?: IngestFileInfo;
  endTime?: number;
  error?: string;
}

export interface IngestProgressOptions {
  onProgress?: (progress: IngestProgress) => void;
  signal?: AbortSignal;
  generateThumbnails?: boolean;
}

export interface IngestProgressSummary {
  filesTotal: number;
  filesCompleted: number;
  filesError: number;
  filesSkipped: number;
  durationSeconds: number;
  averageSpeed: number;
  wasCancelled: boolean;
}

export interface IngestReport {
  summary: IngestProgressSummary;
  errors: Array<{ file: string; error: string }>;
  warnings: Array<{ file: string; message: string }>;
  manifestsCreated?: number;
  collectionsCreated?: number;
  canvasesCreated?: number;
  filesProcessed?: number;
}

export interface IngestResult {
  success: boolean;
  root?: IIIFItem;
  report?: IngestReport;
  error?: string;
}

export type LegacyProgressCallback = (message: string, progress: number) => void;

// FileWithBlob -- used by iiifBuilder.buildManifestFromFiles
export interface FileWithBlob {
  file?: File;
  blob?: Blob;
  name: string;
  type: string;
  size: number;
}
