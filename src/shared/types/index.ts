/**
 * IIIF Types - Subset needed by the Vault system
 *
 * Extracted from the React codebase's shared types.
 * Only includes types referenced by vault modules.
 */

export type IIIFMotivation = 'painting' | 'supplementing' | 'commenting' | 'tagging' | 'linking' | 'identifying' | 'describing' | 'contentState' | string;

export type ResourceState = 'cached' | 'stub' | 'local-only' | 'stale' | 'conflict' | 'trashed' | 'deleted';

export type AbstractionLevel = 'simple' | 'standard' | 'advanced';

// ============================================================================
// Service Descriptors — IIIF 3.0 §7.2 polymorphic services
// ============================================================================

export interface IIIFImageService {
  type: 'ImageService2' | 'ImageService3';
  id: string;
  profile?: string | string[];
  width?: number;
  height?: number;
  sizes?: Array<{ width: number; height: number }>;
  '@id'?: string;
  '@type'?: string;
}

export interface IIIFAuthService {
  type: string;
  id: string;
  label?: LanguageMap;
  profile?: string;
  service?: ServiceDescriptor[];
}

export interface IIIFSearchService {
  type: 'SearchService2' | string;
  id: string;
  service?: ServiceDescriptor[];
}

export interface IIIFGenericService {
  type: string;
  id?: string;
  '@id'?: string;
  '@type'?: string;
  [key: string]: unknown;
}

export type ServiceDescriptor =
  | IIIFImageService
  | IIIFAuthService
  | IIIFSearchService
  | IIIFGenericService;

export function isImageService(s: ServiceDescriptor): s is IIIFImageService {
  return s.type === 'ImageService2' || s.type === 'ImageService3' || s.type?.includes?.('ImageService');
}

export function isAuthService(s: ServiceDescriptor): s is IIIFAuthService {
  const t = s.type;
  return !!t && (t.includes('AuthProbeService') || t.includes('AuthAccessService') || t.includes('AuthAccessTokenService') || t.includes('AuthLogoutService'));
}

export function isSearchService(s: ServiceDescriptor): s is IIIFSearchService {
  return s.type === 'SearchService2' || s.type?.includes?.('SearchService');
}

// ============================================================================
// GeoJSON / NavPlace — IIIF navPlace extension
// ============================================================================

export interface NavPlace {
  id?: string;
  type: 'Feature' | 'FeatureCollection';
  features?: GeoFeature[];
  geometry?: GeoGeometry;
  properties?: GeoProperties;
}

export interface GeoFeature {
  id?: string;
  type: 'Feature';
  geometry: GeoGeometry;
  properties?: GeoProperties;
}

export type GeoGeometry =
  | PointGeometry
  | LineStringGeometry
  | PolygonGeometry
  | MultiPointGeometry
  | MultiLineStringGeometry
  | MultiPolygonGeometry
  | GeometryCollection;

export interface PointGeometry { type: 'Point'; coordinates: [number, number] | [number, number, number]; }
export interface LineStringGeometry { type: 'LineString'; coordinates: Array<[number, number]>; }
export interface PolygonGeometry { type: 'Polygon'; coordinates: Array<Array<[number, number]>>; }
export interface MultiPointGeometry { type: 'MultiPoint'; coordinates: Array<[number, number]>; }
export interface MultiLineStringGeometry { type: 'MultiLineString'; coordinates: Array<Array<[number, number]>>; }
export interface MultiPolygonGeometry { type: 'MultiPolygon'; coordinates: Array<Array<Array<[number, number]>>>; }
export interface GeometryCollection { type: 'GeometryCollection'; geometries: GeoGeometry[]; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface GeoProperties { label?: string | Record<string, string[]>; summary?: string | Record<string, string[]>; [key: string]: any; }

// ============================================================================
// Provider types — IIIF 3.0 §7 linking properties
// ============================================================================

export interface ProviderHomepage {
  id: string;
  type: 'Text';
  label?: LanguageMap;
  format?: string;
  language?: string[];
}

export type ProviderLogo = IIIFExternalWebResource;

export interface IIIFProvider {
  id: string;
  type: 'Agent';
  label: LanguageMap;
  homepage?: ProviderHomepage[];
  logo?: ProviderLogo[];
}

// ============================================================================
// Validation types — discriminated union (V6)
// ============================================================================

export type IssueSeverity = 'error' | 'warning' | 'info';
export type IssueCategory = 'Identity' | 'Structure' | 'Metadata' | 'Content';

interface ValidationIssueBase {
  id: string;
  severity: IssueSeverity;
  category?: IssueCategory;
}

export interface TreeValidationIssue extends ValidationIssueBase {
  kind: 'tree';
  itemId: string;
  itemLabel: string;
  message: string;
  fixable: boolean;
}

export interface FieldValidationIssue extends ValidationIssueBase {
  kind: 'field';
  field?: string;
  title: string;
  description: string;
  autoFixable: boolean;
  fixSuggestion?: string;
  currentValue?: unknown;
}

export type ValidationIssue = TreeValidationIssue | FieldValidationIssue;

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
  // Phase 1.5: unknown[] because subtypes (IIIFCanvas, IIIFManifest, IIIFRange, IIIFCollection)
  // each override with a narrower definition. Callers must narrow via type guards
  // (isManifest, isCanvas, isCollection, isRange) or getChildEntities() before accessing elements.
  items?: unknown[];
  annotations?: IIIFAnnotationPage[];
  behavior?: string[];

  provider?: IIIFProvider[];
  homepage?: ProviderHomepage[];
  seeAlso?: Array<{ id: string; type: "Dataset" | string; format?: string; profile?: string; label?: Record<string, string[]> }>;
  rendering?: Array<{ id: string; type: "Text" | string; label: Record<string, string[]>; format?: string }>;
  service?: ServiceDescriptor[];
  viewingDirection?: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';
  start?: { id: string; type: "Canvas" | "SpecificResource"; source?: string; selector?: Selector | Selector[] };
  supplementary?: { id: string; type: "AnnotationCollection" };
  partOf?: Array<{ id: string; type: string; label?: Record<string, string[]> }>;

  navPlace?: NavPlace;
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
  service?: ServiceDescriptor[];
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

export function isRange(item: IIIFItem | null | undefined): item is IIIFRange {
  return item?.type === 'Range';
}

export function isAnnotationPage(item: { type?: string } | null | undefined): item is IIIFAnnotationPage {
  return item?.type === 'AnnotationPage';
}

/**
 * Get child IIIFItems for tree traversal.
 * Narrows items based on the resource's type:
 * - Manifest → IIIFCanvas[]
 * - Collection → IIIFItem[]
 * - Range → nested IIIFRange[] (filters out canvas/specific-resource references)
 * - Canvas/other → [] (annotation pages are not IIIFItems)
 */
export function getChildEntities(item: IIIFItem): IIIFItem[] {
  if (isManifest(item)) return item.items ?? [];
  if (isCollection(item)) return item.items ?? [];
  if (isRange(item)) return (item.items ?? []).filter((r): r is IIIFRange => 'type' in r && (r as { type: string }).type === 'Range');
  return [];
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

// ============================================================================
// Result<T, E> — explicit success/failure type (replaces throwing or as any)
// ============================================================================

/**
 * Discriminated union for typed success/failure.
 * Use instead of throwing or returning undefined:
 *   function parse(s: string): Result<number>
 *   const r = parse(s);
 *   if (r.ok) { use(r.value); } else { log(r.error); }
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ViewBus protocol (§0.1)
export type { ViewId, ViewSnapshot, ViewFilters, ViewStateProvider } from './viewProtocol';
export { appModeToViewId } from './viewProtocol';
