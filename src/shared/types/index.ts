
export type AppMode = 'archive' | 'collections' | 'structure' | 'boards' | 'search' | 'viewer' | 'metadata' | 'trash' | 'admin-deps';
export type ViewType = 'files' | 'iiif';
export type IIIFMotivation = 'painting' | 'supplementing' | 'commenting' | 'tagging' | 'linking' | 'identifying' | 'describing' | 'contentState' | string;
export type ConnectionType = 'depicts' | 'transcribes' | 'relatesTo' | 'contradicts' | 'precedes';
export type AbstractionLevel = 'simple' | 'standard' | 'advanced';
export type ResourceState = 'cached' | 'stub' | 'local-only' | 'stale' | 'conflict' | 'trashed' | 'deleted';

// ============================================================================
// Progressive Disclosure - UX Simplification (Phase 3)
// ============================================================================

/**
 * UI Abstraction Configuration
 * Controls progressive disclosure of UI complexity based on user expertise
 */
export interface UIAbstractionConfig {
  level: AbstractionLevel;
  showTechnicalIds: boolean;
  showRawIIIF: boolean;
  showAdvancedActions: boolean;
  simplifiedLabels: boolean;
}

/**
 * Consolidated View Modes (Phase 3)
 * Reduces 6 legacy modes to 3 core modes with progressive disclosure
 */
export type CoreViewMode = 'workspace' | 'detail' | 'preview';

/**
 * Legacy View Modes (for backward compatibility)
 * @deprecated Use CoreViewMode with abstraction levels instead
 */
export type LegacyViewMode = 'archive' | 'collections' | 'board' | 'map' | 'spreadsheet' | 'timeline';

/**
 * View mode mapping configuration
 */
export interface ViewModeConfig {
  coreMode: CoreViewMode;
  abstractionLevel: AbstractionLevel;
  sidebarVisible: boolean;
  inspectorVisible: boolean;
  toolbarMode: 'minimal' | 'standard' | 'full';
}

export interface AppSettings {
  defaultBaseUrl: string;
  language: string;
  theme: 'light' | 'dark';
  fieldMode: boolean;
  abstractionLevel: AbstractionLevel;
  mapConfig: typeof import('@/src/shared/constants').DEFAULT_MAP_CONFIG;
  zoomConfig: typeof import('@/src/shared/constants').DEFAULT_ZOOM_CONFIG;
  height: number;
  ingestPreferences: typeof import('@/src/shared/constants').DEFAULT_INGEST_PREFS;
  autoSaveInterval: number; // in seconds
  showTechnicalIds: boolean;
  metadataTemplate: string[]; // List of suggested property labels
  metadataComplexity: import('@/src/shared/constants').MetadataComplexity; // Field visibility level
}

export interface IngestReport {
  manifestsCreated: number;
  collectionsCreated: number;
  canvasesCreated: number;
  filesProcessed: number;
  warnings: string[];
  /** Number of duplicate files detected during ingest */
  duplicatesSkipped?: number;
  /** Progress summary for enhanced progress tracking */
  progressSummary?: IngestProgressSummary;
}

export interface IngestResult {
  root: IIIFItem | null;
  report: IngestReport;
}

// ============================================================================
// Phase 3: Enhanced Progress Indicators (P1 - UX)
// ============================================================================

/**
 * Processing stage for ingest operations
 */
export type IngestStage =
  | 'scanning'      // Initial file scan and analysis
  | 'processing'    // Main file processing (hashing, metadata extraction)
  | 'saving'        // Persisting to storage
  | 'derivatives'   // Generating thumbnails and tiles
  | 'complete'      // Finished
  | 'cancelled'     // User cancelled
  | 'error';        // Error occurred

/**
 * Status of an individual file in the ingest process
 */
export type FileStatus = 'pending' | 'processing' | 'completed' | 'error' | 'skipped';

/**
 * Information about a single file being processed
 */
export interface IngestFileInfo {
  /** Unique identifier for this file */
  id: string;
  /** File name */
  name: string;
  /** Full path in the file tree */
  path: string;
  /** Current processing status */
  status: FileStatus;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Processing start timestamp */
  startedAt?: number;
  /** Processing completion timestamp */
  completedAt?: number;
  /** Error message if status is 'error' */
  error?: string;
  /** Processing progress (0-100) for this file */
  progress: number;
}

/**
 * Granular progress information for ingest operations
 */
export interface IngestProgress {
  /** Overall operation ID */
  operationId: string;
  /** Current processing stage */
  stage: IngestStage;
  /** Stage-specific progress (0-100) */
  stageProgress: number;
  /** Total number of files to process */
  filesTotal: number;
  /** Number of files completed */
  filesCompleted: number;
  /** Number of files currently being processed */
  filesProcessing: number;
  /** Number of files with errors */
  filesError: number;
  /** Current file being processed (if any) */
  currentFile?: IngestFileInfo;
  /** All files in the operation */
  files: IngestFileInfo[];
  /** Processing speed in files per second */
  speed: number;
  /** Estimated time remaining in seconds */
  etaSeconds: number;
  /** Timestamp when operation started */
  startedAt: number;
  /** Timestamp of last update */
  updatedAt: number;
  /** Whether the operation is paused */
  isPaused: boolean;
  /** Whether the operation was cancelled */
  isCancelled: boolean;
  /** Activity log entries */
  activityLog: IngestActivityLogEntry[];
  /** Aggregated percentage (0-100) */
  overallProgress: number;
}

/**
 * Activity log entry for ingest operations
 */
export interface IngestActivityLogEntry {
  /** Timestamp */
  timestamp: number;
  /** Log level */
  level: 'info' | 'warning' | 'error' | 'success';
  /** Message */
  message: string;
  /** Associated file ID (if applicable) */
  fileId?: string;
}

/**
 * Summary of progress for completed operations
 */
export interface IngestProgressSummary {
  /** Total files processed */
  filesTotal: number;
  /** Files successfully completed */
  filesCompleted: number;
  /** Files with errors */
  filesError: number;
  /** Files skipped (duplicates) */
  filesSkipped: number;
  /** Total processing time in seconds */
  durationSeconds: number;
  /** Average processing speed in files per second */
  averageSpeed: number;
  /** Whether operation was cancelled */
  wasCancelled: boolean;
}

/**
 * Options for enhanced progress callbacks
 */
export interface IngestProgressOptions {
  /** Callback for progress updates */
  onProgress?: (progress: IngestProgress) => void;
  /** AbortSignal for cancellation support */
  signal?: AbortSignal;
  /** Whether to pause processing */
  paused?: boolean;
}

/**
 * Legacy progress callback signature (for backward compatibility)
 * @deprecated Use IngestProgressOptions with onProgress
 */
export type LegacyProgressCallback = (msg: string, percent: number) => void;

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

/**
 * IIIF Collection - A curated list of references to Manifests and other Collections
 *
 * IMPORTANT: In IIIF 3.0, Collections are "cheap overlays" - they reference
 * resources by ID, not contain them. The same Manifest can appear in multiple
 * Collections without duplication. Collections are organizational views, not
 * ownership containers.
 *
 * @see https://iiif.io/api/presentation/3.0/#51-collection
 */
export interface IIIFCollection extends IIIFItem {
  type: "Collection";
  /**
   * Items can be full IIIFItems (when denormalized) or IIIFReference stubs.
   * When normalized, these are just ID references.
   */
  items: IIIFItem[];
}

/**
 * A reference to a IIIF resource (used in Collections and Ranges)
 * This is how Collections "point to" Manifests without embedding them.
 */
export interface IIIFReference {
  id: string;
  type: "Collection" | "Manifest" | "Canvas" | "Range";
  label?: Record<string, string[]>;
  /** When true, this is a stub reference, not a full resource */
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

// ============================================================================
// Type Guards - Safe type narrowing for IIIF resources
// ============================================================================

/**
 * Type guard for Canvas resources
 */
export function isCanvas(item: IIIFItem | null | undefined): item is IIIFCanvas {
  return item?.type === 'Canvas';
}

/**
 * Type guard for Manifest resources
 */
export function isManifest(item: IIIFItem | null | undefined): item is IIIFManifest {
  return item?.type === 'Manifest';
}

/**
 * Type guard for Collection resources
 */
export function isCollection(item: IIIFItem | null | undefined): item is IIIFCollection {
  return item?.type === 'Collection';
}

/**
 * Type guard for Range resources
 */
export function isRange(item: IIIFItem | null | undefined): item is IIIFRange {
  return item?.type === 'Range';
}

/**
 * Type guard for Annotation resources
 */
export function isAnnotation(item: any): item is IIIFAnnotation {
  return item?.type === 'Annotation';
}

/**
 * Type guard for AnnotationPage resources
 */
export function isAnnotationPage(item: any): item is IIIFAnnotationPage {
  return item?.type === 'AnnotationPage';
}

/**
 * Type guard for TextualBody annotation bodies
 */
export function isTextualBody(body: IIIFAnnotationBody): body is IIIFTextualBody {
  return body?.type === 'TextualBody';
}

/**
 * Type guard for ExternalWebResource annotation bodies
 */
export function isExternalWebResource(body: IIIFAnnotationBody): body is IIIFExternalWebResource {
  return body?.type !== 'TextualBody' && 'id' in body;
}

/**
 * Type guard for SpecificResource targets
 */
export function isSpecificResource(target: any): target is IIIFSpecificResource {
  return target?.type === 'SpecificResource';
}

// ============================================================================
// LanguageString - Immutable wrapper for IIIF Language Maps
// ============================================================================

export type LanguageMap = Record<string, string[]>;

/**
 * LanguageString - Immutable utility class for IIIF language maps
 *
 * Provides consistent locale handling with fallback chains,
 * immutable updates, and simplified component code.
 *
 * @example
 * const label = new LanguageString(manifest.label);
 * const text = label.get('en'); // Falls back through chain if 'en' not found
 * const updated = label.set('en', 'New Title'); // Returns new instance
 */
// =============================================================================
// SOURCE MANIFESTS - Preserved structure from uploaded folder
// =============================================================================

/**
 * A manifest derived from a directory node with direct file children.
 * Represents files grouped by their deepest containing directory.
 */
export interface SourceManifest {
  id: string;                    // UUID for referencing
  name: string;                  // Breadcrumb path: "Site A / Trench 1 / Layer 3"
  breadcrumbs: string[];         // ["Site A", "Trench 1", "Layer 3"]
  files: File[];                 // Direct file children
  canvasOrder: string[];         // Reorderable file names (auto-sorted by filenameUtils)
  detectedPattern?: string;      // Pattern name from filenameUtils (e.g., "Padded numerical sequence")
}

/**
 * All source manifests from an import session.
 * Created once at import, preserved as uploaded.
 */
export interface SourceManifests {
  id: string;                              // UUID for the import session
  rootPath: string;                        // Original folder name
  manifests: SourceManifest[];             // Flat list of all manifest-eligible nodes
  createdAt: string;                       // ISO timestamp
}

// =============================================================================
// ARCHIVE LAYOUT - User's curated collection structure for publishing
// =============================================================================

/**
 * A collection in the archive being organized.
 * References source manifests by ID (many-to-many relationship).
 */
export interface ArchiveCollection {
  id: string;
  name: string;
  manifestRefs: string[];                  // References to SourceManifest IDs
  children: ArchiveCollection[];           // Nested sub-collections
  metadata?: Partial<IIIFItem>;            // Early metadata assignment
}

/**
 * The archive layout - the user's organizational structure for publishing.
 * Can be modified freely; manifests can appear in multiple collections.
 */
export interface ArchiveLayout {
  id: string;
  root: ArchiveCollection;                 // Root collection
  unassignedManifests: string[];           // Manifest IDs not in any collection yet
}

// =============================================================================
// STAGING STATE - Combines both structures for the workbench UI
// =============================================================================

export interface StagingState {
  sourceManifests: SourceManifests;        // What was uploaded (preserved)
  archiveLayout: ArchiveLayout;            // How user is organizing it (mutable)
  selectedIds: Set<string>;                // Multi-selection in UI
  focusedPane: 'source' | 'archive';       // Which pane has focus
}

// =============================================================================
// LanguageString - Immutable wrapper for IIIF Language Maps
// =============================================================================

export class LanguageString {
  private readonly map: LanguageMap;

  constructor(input?: LanguageMap | string | null) {
    if (!input) {
      this.map = {};
    } else if (typeof input === 'string') {
      this.map = { none: [input] };
    } else {
      // Deep clone to ensure immutability
      this.map = Object.fromEntries(
        Object.entries(input).map(([k, v]) => [k, [...v]])
      );
    }
  }

  /**
   * Get the first value for a locale with fallback chain
   * Fallback order: locale → 'none' → '@none' → 'en' → first available
   */
  get(locale: string = 'none'): string {
    const fallbacks = [locale, 'none', '@none', 'en'];

    for (const loc of fallbacks) {
      const values = this.map[loc];
      if (values && values.length > 0 && values[0]) {
        return values[0];
      }
    }

    // Last resort: first non-empty value from any locale
    for (const values of Object.values(this.map)) {
      if (values && values.length > 0 && values[0]) {
        return values[0];
      }
    }

    return '';
  }

  /**
   * Get all values for a specific locale
   */
  getAll(locale: string): string[] {
    return this.map[locale] ? [...this.map[locale]] : [];
  }

  /**
   * Get all locale-value pairs
   */
  entries(): Array<{ locale: string; values: string[] }> {
    return Object.entries(this.map).map(([locale, values]) => ({
      locale,
      values: [...values]
    }));
  }

  /**
   * Set/replace the value for a locale (returns new instance)
   */
  set(locale: string, value: string): LanguageString {
    return new LanguageString({
      ...this.map,
      [locale]: [value]
    });
  }

  /**
   * Set multiple values for a locale (returns new instance)
   */
  setAll(locale: string, values: string[]): LanguageString {
    return new LanguageString({
      ...this.map,
      [locale]: [...values]
    });
  }

  /**
   * Append a value to a locale's array (returns new instance)
   */
  append(locale: string, value: string): LanguageString {
    return new LanguageString({
      ...this.map,
      [locale]: [...(this.map[locale] || []), value]
    });
  }

  /**
   * Remove a locale entirely (returns new instance)
   */
  remove(locale: string): LanguageString {
    const newMap = { ...this.map };
    delete newMap[locale];
    return new LanguageString(newMap);
  }

  /**
   * Merge with another LanguageString (returns new instance)
   * Other's values override this's values for matching locales
   */
  merge(other: LanguageString): LanguageString {
    return new LanguageString({
      ...this.map,
      ...other.toJSON()
    });
  }

  /**
   * Check if any locale has content
   */
  isEmpty(): boolean {
    return Object.values(this.map).every(
      arr => !arr || arr.length === 0 || arr.every(s => !s || !s.trim())
    );
  }

  /**
   * Check if a specific locale has content
   */
  hasLocale(locale: string): boolean {
    const values = this.map[locale];
    return !!(values && values.length > 0 && values.some(v => v && v.trim()));
  }

  /**
   * Get list of available locales with content
   */
  get locales(): string[] {
    return Object.keys(this.map).filter(k => this.hasLocale(k));
  }

  /**
   * Get the primary locale (first non-empty)
   */
  get primaryLocale(): string | null {
    return this.locales[0] || null;
  }

  /**
   * Export as IIIF-compliant language map
   */
  toJSON(): LanguageMap {
    // Return copy to maintain immutability
    return Object.fromEntries(
      Object.entries(this.map).map(([k, v]) => [k, [...v]])
    );
  }

  /**
   * Create from static value with default locale
   */
  static of(value: string, locale: string = 'none'): LanguageString {
    return new LanguageString({ [locale]: [value] });
  }

  /**
   * Create empty LanguageString
   */
  static empty(): LanguageString {
    return new LanguageString();
  }

  /**
   * Check equality with another LanguageString
   */
  equals(other: LanguageString): boolean {
    const thisKeys = Object.keys(this.map).sort();
    const otherKeys = Object.keys(other.map).sort();

    if (thisKeys.length !== otherKeys.length) return false;
    if (thisKeys.join(',') !== otherKeys.join(',')) return false;

    return thisKeys.every(key => {
      const thisVals = this.map[key];
      const otherVals = other.map[key];
      if (thisVals.length !== otherVals.length) return false;
      return thisVals.every((v, i) => v === otherVals[i]);
    });
  }

  /**
   * String representation for debugging
   */
  toString(): string {
    return this.get() || '[empty]';
  }
}
