
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
  metadataComplexity: import('./constants').MetadataComplexity; // Field visibility level
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
