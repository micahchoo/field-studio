/**
 * Field Registry Service - Unified Field Configuration
 *
 * Single source of truth for all field definitions in Field Studio.
 * Consolidates field metadata from constants.ts, csvImporter.ts, and search services.
 *
 * Based on WAX pattern: per-collection configurable search_fields with keep_only filtering.
 *
 * @see ARCHITECTURE_INSPIRATION.md - "WAX Case Study"
 */

import { MetadataComplexity } from '@/src/shared/constants';

// ============================================================================
// Types
// ============================================================================

/**
 * Complete field definition with all configuration options
 */
export interface FieldDefinition {
  /** Unique field key (e.g., 'label', 'metadata.title') */
  key: string;
  /** Human-readable display label */
  label: string;
  /** Field description for tooltips/help text */
  description: string;
  /** Minimum complexity level to show this field */
  minLevel: MetadataComplexity;
  /** Field category for grouping */
  category: FieldCategory;
  /** Whether this field should be indexed for search */
  indexable: boolean;
  /** Search weight/boost (higher = more important in search results) */
  searchWeight: number;
  /** Whether this field can be exported to CSV */
  exportable: boolean;
  /** Display priority (lower = shown first) */
  displayPriority: number;
  /** Dublin Core mapping if applicable */
  dublinCoreMapping?: string;
  /** Whether this field supports multiple values */
  multiValue?: boolean;
  /** Data type hint */
  dataType?: 'string' | 'date' | 'uri' | 'number' | 'boolean';
}

export type FieldCategory =
  | 'core'           // IIIF core fields (label, summary, thumbnail)
  | 'descriptive'    // Descriptive metadata (metadata, rights, provider)
  | 'technical'      // Technical fields (behavior, viewingDirection, services)
  | 'structural'     // Structural fields (partOf, start, structures)
  | 'dublin-core';   // Dublin Core metadata fields

/**
 * Search index configuration
 */
export interface SearchIndexConfig {
  /** Fields to include in the search index */
  fields: string[];
  /** Field-specific boost values */
  boosts: Record<string, number>;
  /** Whether to normalize diacritics (WAX pattern) */
  normalizeDiacritics: boolean;
}

/**
 * Export configuration for CSV/static site
 */
export interface ExportFieldConfig {
  /** Fields to include in export */
  fields: string[];
  /** Whether to include internal ID */
  includeId: boolean;
  /** Whether to include item type */
  includeType: boolean;
}

// ============================================================================
// Field Definitions
// ============================================================================

/**
 * Complete field registry - single source of truth
 */
export const FIELD_REGISTRY: FieldDefinition[] = [
  // ============================================================================
  // Core IIIF Fields (always visible)
  // ============================================================================
  {
    key: 'label',
    label: 'Label',
    description: 'Human-readable name for the resource',
    minLevel: 'simple',
    category: 'core',
    indexable: true,
    searchWeight: 10,  // Highest priority in search
    exportable: true,
    displayPriority: 1,
    dataType: 'string'
  },
  {
    key: 'summary',
    label: 'Summary',
    description: 'Brief description of the resource',
    minLevel: 'simple',
    category: 'core',
    indexable: true,
    searchWeight: 5,
    exportable: true,
    displayPriority: 2,
    dataType: 'string'
  },
  {
    key: 'thumbnail',
    label: 'Thumbnail',
    description: 'Preview image for the resource',
    minLevel: 'simple',
    category: 'core',
    indexable: false,
    searchWeight: 0,
    exportable: false,
    displayPriority: 3,
    dataType: 'uri'
  },

  // ============================================================================
  // Standard Descriptive Fields
  // ============================================================================
  {
    key: 'metadata',
    label: 'Metadata',
    description: 'Descriptive key-value pairs',
    minLevel: 'standard',
    category: 'descriptive',
    indexable: false,  // Individual metadata.* fields are indexed
    searchWeight: 0,
    exportable: false,
    displayPriority: 10,
    multiValue: true
  },
  {
    key: 'rights',
    label: 'Rights',
    description: 'License or rights statement URL',
    minLevel: 'standard',
    category: 'descriptive',
    indexable: false,
    searchWeight: 0,
    exportable: true,
    displayPriority: 11,
    dataType: 'uri'
  },
  {
    key: 'requiredStatement',
    label: 'Attribution',
    description: 'Required attribution text',
    minLevel: 'standard',
    category: 'descriptive',
    indexable: false,
    searchWeight: 0,
    exportable: true,
    displayPriority: 12
  },
  {
    key: 'navDate',
    label: 'Navigation Date',
    description: 'Date for timeline navigation',
    minLevel: 'standard',
    category: 'descriptive',
    indexable: true,
    searchWeight: 2,
    exportable: true,
    displayPriority: 13,
    dataType: 'date'
  },
  {
    key: 'provider',
    label: 'Provider',
    description: 'Institution or person providing resource',
    minLevel: 'standard',
    category: 'descriptive',
    indexable: true,
    searchWeight: 2,
    exportable: true,
    displayPriority: 14
  },

  // ============================================================================
  // Advanced Technical Fields
  // ============================================================================
  {
    key: 'behavior',
    label: 'Behavior',
    description: 'Presentation hints for viewers',
    minLevel: 'advanced',
    category: 'technical',
    indexable: false,
    searchWeight: 0,
    exportable: false,
    displayPriority: 20,
    multiValue: true
  },
  {
    key: 'viewingDirection',
    label: 'Viewing Direction',
    description: 'Reading order (LTR, RTL, etc.)',
    minLevel: 'advanced',
    category: 'technical',
    indexable: false,
    searchWeight: 0,
    exportable: false,
    displayPriority: 21
  },
  {
    key: 'services',
    label: 'Services',
    description: 'Linked API services',
    minLevel: 'advanced',
    category: 'technical',
    indexable: false,
    searchWeight: 0,
    exportable: false,
    displayPriority: 22,
    multiValue: true
  },
  {
    key: 'seeAlso',
    label: 'See Also',
    description: 'Related external resources',
    minLevel: 'advanced',
    category: 'technical',
    indexable: false,
    searchWeight: 0,
    exportable: false,
    displayPriority: 23,
    multiValue: true,
    dataType: 'uri'
  },
  {
    key: 'rendering',
    label: 'Rendering',
    description: 'Alternate representations (PDF, etc.)',
    minLevel: 'advanced',
    category: 'technical',
    indexable: false,
    searchWeight: 0,
    exportable: false,
    displayPriority: 24,
    multiValue: true
  },

  // ============================================================================
  // Advanced Structural Fields
  // ============================================================================
  {
    key: 'partOf',
    label: 'Part Of',
    description: 'Parent collection reference',
    minLevel: 'advanced',
    category: 'structural',
    indexable: false,
    searchWeight: 0,
    exportable: false,
    displayPriority: 30,
    dataType: 'uri'
  },
  {
    key: 'start',
    label: 'Start Canvas',
    description: 'Initial canvas to display',
    minLevel: 'advanced',
    category: 'structural',
    indexable: false,
    searchWeight: 0,
    exportable: false,
    displayPriority: 31,
    dataType: 'uri'
  },
  {
    key: 'structures',
    label: 'Structures',
    description: 'Table of contents (Ranges)',
    minLevel: 'advanced',
    category: 'structural',
    indexable: false,
    searchWeight: 0,
    exportable: false,
    displayPriority: 32,
    multiValue: true
  },

  // ============================================================================
  // Dublin Core Metadata Fields
  // ============================================================================
  {
    key: 'metadata.title',
    label: 'Title',
    description: 'Dublin Core title field',
    minLevel: 'standard',
    category: 'dublin-core',
    indexable: true,
    searchWeight: 8,
    exportable: true,
    displayPriority: 40,
    dublinCoreMapping: 'dc:title',
    dataType: 'string'
  },
  {
    key: 'metadata.creator',
    label: 'Creator',
    description: 'Dublin Core creator/author field',
    minLevel: 'standard',
    category: 'dublin-core',
    indexable: true,
    searchWeight: 6,
    exportable: true,
    displayPriority: 41,
    dublinCoreMapping: 'dc:creator',
    dataType: 'string'
  },
  {
    key: 'metadata.date',
    label: 'Date',
    description: 'Dublin Core date field',
    minLevel: 'standard',
    category: 'dublin-core',
    indexable: true,
    searchWeight: 4,
    exportable: true,
    displayPriority: 42,
    dublinCoreMapping: 'dc:date',
    dataType: 'date'
  },
  {
    key: 'metadata.description',
    label: 'Description',
    description: 'Dublin Core description field',
    minLevel: 'standard',
    category: 'dublin-core',
    indexable: true,
    searchWeight: 4,
    exportable: true,
    displayPriority: 43,
    dublinCoreMapping: 'dc:description',
    dataType: 'string'
  },
  {
    key: 'metadata.subject',
    label: 'Subject',
    description: 'Dublin Core subject/keywords field',
    minLevel: 'standard',
    category: 'dublin-core',
    indexable: true,
    searchWeight: 5,
    exportable: true,
    displayPriority: 44,
    dublinCoreMapping: 'dc:subject',
    dataType: 'string',
    multiValue: true
  },
  {
    key: 'metadata.rights',
    label: 'Rights',
    description: 'Dublin Core rights field',
    minLevel: 'standard',
    category: 'dublin-core',
    indexable: false,
    searchWeight: 0,
    exportable: true,
    displayPriority: 45,
    dublinCoreMapping: 'dc:rights',
    dataType: 'string'
  },
  {
    key: 'metadata.source',
    label: 'Source',
    description: 'Dublin Core source field',
    minLevel: 'standard',
    category: 'dublin-core',
    indexable: true,
    searchWeight: 2,
    exportable: true,
    displayPriority: 46,
    dublinCoreMapping: 'dc:source',
    dataType: 'string'
  },
  {
    key: 'metadata.type',
    label: 'Type',
    description: 'Dublin Core type field',
    minLevel: 'standard',
    category: 'dublin-core',
    indexable: true,
    searchWeight: 3,
    exportable: true,
    displayPriority: 47,
    dublinCoreMapping: 'dc:type',
    dataType: 'string'
  },
  {
    key: 'metadata.format',
    label: 'Format',
    description: 'Dublin Core format field',
    minLevel: 'standard',
    category: 'dublin-core',
    indexable: false,
    searchWeight: 0,
    exportable: true,
    displayPriority: 48,
    dublinCoreMapping: 'dc:format',
    dataType: 'string'
  },
  {
    key: 'metadata.identifier',
    label: 'Identifier',
    description: 'Dublin Core identifier field',
    minLevel: 'standard',
    category: 'dublin-core',
    indexable: true,
    searchWeight: 3,
    exportable: true,
    displayPriority: 49,
    dublinCoreMapping: 'dc:identifier',
    dataType: 'string'
  },
  {
    key: 'metadata.language',
    label: 'Language',
    description: 'Dublin Core language field',
    minLevel: 'standard',
    category: 'dublin-core',
    indexable: false,
    searchWeight: 0,
    exportable: true,
    displayPriority: 50,
    dublinCoreMapping: 'dc:language',
    dataType: 'string'
  },
  {
    key: 'metadata.coverage',
    label: 'Coverage',
    description: 'Dublin Core coverage/location field',
    minLevel: 'standard',
    category: 'dublin-core',
    indexable: true,
    searchWeight: 3,
    exportable: true,
    displayPriority: 51,
    dublinCoreMapping: 'dc:coverage',
    dataType: 'string'
  },
  {
    key: 'metadata.publisher',
    label: 'Publisher',
    description: 'Dublin Core publisher field',
    minLevel: 'standard',
    category: 'dublin-core',
    indexable: true,
    searchWeight: 2,
    exportable: true,
    displayPriority: 52,
    dublinCoreMapping: 'dc:publisher',
    dataType: 'string'
  },

  // ============================================================================
  // Attribution Fields
  // ============================================================================
  {
    key: 'requiredStatement.label',
    label: 'Attribution Label',
    description: 'Label for required attribution',
    minLevel: 'standard',
    category: 'descriptive',
    indexable: false,
    searchWeight: 0,
    exportable: true,
    displayPriority: 60,
    dataType: 'string'
  },
  {
    key: 'requiredStatement.value',
    label: 'Attribution Value',
    description: 'Value for required attribution',
    minLevel: 'standard',
    category: 'descriptive',
    indexable: false,
    searchWeight: 0,
    exportable: true,
    displayPriority: 61,
    dataType: 'string'
  }
];

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default search fields (WAX-compatible)
 */
export const DEFAULT_SEARCH_FIELDS: string[] = [
  'label',
  'summary',
  'metadata.title',
  'metadata.creator',
  'metadata.date',
  'metadata.description',
  'metadata.subject'
];

/**
 * Default search index configuration
 */
export const DEFAULT_SEARCH_CONFIG: SearchIndexConfig = {
  fields: DEFAULT_SEARCH_FIELDS,
  boosts: {
    'label': 10,
    'metadata.title': 8,
    'metadata.creator': 6,
    'summary': 5,
    'metadata.subject': 5,
    'metadata.description': 4,
    'metadata.date': 4
  },
  normalizeDiacritics: true
};

/**
 * Default export field configuration
 */
export const DEFAULT_EXPORT_CONFIG: ExportFieldConfig = {
  fields: FIELD_REGISTRY.filter(f => f.exportable).map(f => f.key),
  includeId: true,
  includeType: true
};

// ============================================================================
// Field Registry Service
// ============================================================================

class FieldRegistryService {
  private fields: Map<string, FieldDefinition> = new Map();

  constructor() {
    // Build lookup map
    for (const field of FIELD_REGISTRY) {
      this.fields.set(field.key, field);
    }
  }

  /**
   * Get a field definition by key
   */
  getField(key: string): FieldDefinition | undefined {
    return this.fields.get(key);
  }

  /**
   * Get all field definitions
   */
  getAllFields(): FieldDefinition[] {
    return [...FIELD_REGISTRY];
  }

  /**
   * Get fields visible at a given complexity level
   */
  getVisibleFields(level: MetadataComplexity): FieldDefinition[] {
    const levelOrder: MetadataComplexity[] = ['simple', 'standard', 'advanced'];
    const levelIndex = levelOrder.indexOf(level);

    return FIELD_REGISTRY.filter(field => {
      const fieldLevelIndex = levelOrder.indexOf(field.minLevel);
      return fieldLevelIndex <= levelIndex;
    });
  }

  /**
   * Get fields by category
   */
  getFieldsByCategory(category: FieldCategory): FieldDefinition[] {
    return FIELD_REGISTRY.filter(f => f.category === category);
  }

  /**
   * Get all indexable fields for search
   */
  getIndexableFields(): FieldDefinition[] {
    return FIELD_REGISTRY.filter(f => f.indexable);
  }

  /**
   * Get all exportable fields for CSV export
   */
  getExportableFields(): FieldDefinition[] {
    return FIELD_REGISTRY.filter(f => f.exportable);
  }

  /**
   * Get fields grouped by category
   */
  getFieldsGroupedByCategory(): Record<FieldCategory, FieldDefinition[]> {
    const groups: Record<string, FieldDefinition[]> = {};

    for (const field of FIELD_REGISTRY) {
      if (!groups[field.category]) {
        groups[field.category] = [];
      }
      groups[field.category].push(field);
    }

    // Sort each group by displayPriority
    for (const category of Object.keys(groups)) {
      groups[category].sort((a, b) => a.displayPriority - b.displayPriority);
    }

    return groups as Record<FieldCategory, FieldDefinition[]>;
  }

  /**
   * Build search index configuration from selected fields
   */
  buildSearchConfig(fieldKeys: string[]): SearchIndexConfig {
    const boosts: Record<string, number> = {};

    for (const key of fieldKeys) {
      const field = this.fields.get(key);
      if (field && field.indexable) {
        boosts[key] = field.searchWeight;
      }
    }

    return {
      fields: fieldKeys.filter(k => this.fields.get(k)?.indexable),
      boosts,
      normalizeDiacritics: true
    };
  }

  /**
   * Build export configuration from selected fields
   */
  buildExportConfig(fieldKeys: string[], includeId = true, includeType = true): ExportFieldConfig {
    return {
      fields: fieldKeys.filter(k => this.fields.get(k)?.exportable),
      includeId,
      includeType
    };
  }

  /**
   * Check if a field should be visible at a given complexity level
   */
  isFieldVisible(fieldKey: string, level: MetadataComplexity): boolean {
    const field = this.fields.get(fieldKey);
    if (!field) return true; // Unknown fields are always visible

    const levelOrder: MetadataComplexity[] = ['simple', 'standard', 'advanced'];
    const levelIndex = levelOrder.indexOf(level);
    const fieldLevelIndex = levelOrder.indexOf(field.minLevel);

    return fieldLevelIndex <= levelIndex;
  }

  /**
   * Get Dublin Core mapping for a field
   */
  getDublinCoreMapping(fieldKey: string): string | undefined {
    return this.fields.get(fieldKey)?.dublinCoreMapping;
  }

  /**
   * Get all Dublin Core fields
   */
  getDublinCoreFields(): FieldDefinition[] {
    return FIELD_REGISTRY.filter(f => f.dublinCoreMapping !== undefined);
  }

  /**
   * Normalize text for search (WAX pattern - diacritic removal)
   */
  normalizeForSearch(text: string): string {
    if (!text) return '';

    // Diacritic replacement map (WAX pattern)
    const diacritics = 'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿ';
    const replacements = 'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOOooooooUUUUuuuuYyy';

    let normalized = text;
    for (let i = 0; i < diacritics.length; i++) {
      normalized = normalized.replace(new RegExp(diacritics[i], 'g'), replacements[i]);
    }

    return normalized
      .toLowerCase()
      .replace(/<[^>]+>/g, '')      // Remove HTML tags
      .replace(/[^\w\s]/g, ' ')     // Replace non-word chars with spaces
      .replace(/\s+/g, ' ')         // Collapse whitespace
      .trim();
  }

  /**
   * Generate a stable PID from a string (WAX pattern)
   */
  generatePid(str: string): string {
    if (!str) return 'item';

    return this.normalizeForSearch(str)
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'item';
  }
}

// Export singleton instance
export const fieldRegistry = new FieldRegistryService();

// Re-export for convenience
export type { MetadataComplexity };
