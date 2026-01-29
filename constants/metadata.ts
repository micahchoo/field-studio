/**
 * Metadata Constants
 * 
 * Templates, field definitions, and metadata-related constants.
 */

import type { AbstractionLevel } from '../types';

export type MetadataComplexity = 'simple' | 'standard' | 'advanced';

export interface FieldDefinition {
  key: string;
  label: string;
  description: string;
  minLevel: MetadataComplexity;
  category: 'core' | 'descriptive' | 'technical' | 'structural';
}

export const METADATA_TEMPLATES = {
  RESEARCHER: ["Location", "Site Phase", "Artifact Type", "Material", "Findings"],
  ARCHIVIST: ["Title", "Creator", "Date", "Format", "Rights", "Identifier", "Language", "Source", "Description"],
  DEVELOPER: ["Identifier", "Technical Note", "Linked Data URI", "Image Service Profile"]
} as const;

/**
 * Metadata Field Complexity Levels
 * Defines which IIIF resource properties are visible at each complexity level.
 */
export const METADATA_FIELD_DEFINITIONS: FieldDefinition[] = [
  // Core fields (always visible)
  { key: 'label', label: 'Label', description: 'Human-readable name', minLevel: 'simple', category: 'core' },
  { key: 'summary', label: 'Summary', description: 'Brief description', minLevel: 'simple', category: 'core' },
  { key: 'thumbnail', label: 'Thumbnail', description: 'Preview image', minLevel: 'simple', category: 'core' },

  // Standard fields (standard and above)
  { key: 'metadata', label: 'Metadata', description: 'Descriptive key-value pairs', minLevel: 'standard', category: 'descriptive' },
  { key: 'rights', label: 'Rights', description: 'License or rights statement URL', minLevel: 'standard', category: 'descriptive' },
  { key: 'requiredStatement', label: 'Attribution', description: 'Required attribution text', minLevel: 'standard', category: 'descriptive' },
  { key: 'navDate', label: 'Navigation Date', description: 'Date for timeline navigation', minLevel: 'standard', category: 'descriptive' },
  { key: 'provider', label: 'Provider', description: 'Institution or person providing resource', minLevel: 'standard', category: 'descriptive' },

  // Advanced fields (advanced only)
  { key: 'behavior', label: 'Behavior', description: 'Presentation hints for viewers', minLevel: 'advanced', category: 'technical' },
  { key: 'viewingDirection', label: 'Viewing Direction', description: 'Reading order (LTR, RTL, etc.)', minLevel: 'advanced', category: 'technical' },
  { key: 'services', label: 'Services', description: 'Linked API services', minLevel: 'advanced', category: 'technical' },
  { key: 'seeAlso', label: 'See Also', description: 'Related external resources', minLevel: 'advanced', category: 'technical' },
  { key: 'rendering', label: 'Rendering', description: 'Alternate representations (PDF, etc.)', minLevel: 'advanced', category: 'technical' },
  { key: 'partOf', label: 'Part Of', description: 'Parent collection reference', minLevel: 'advanced', category: 'structural' },
  { key: 'start', label: 'Start Canvas', description: 'Initial canvas to display', minLevel: 'advanced', category: 'structural' },
  { key: 'structures', label: 'Structures', description: 'Table of contents (Ranges)', minLevel: 'advanced', category: 'structural' },
] as const;

/**
 * Get visible fields for a given complexity level
 */
export function getVisibleFields(level: MetadataComplexity): FieldDefinition[] {
  const levelOrder: MetadataComplexity[] = ['simple', 'standard', 'advanced'];
  const levelIndex = levelOrder.indexOf(level);

  return METADATA_FIELD_DEFINITIONS.filter(field => {
    const fieldLevelIndex = levelOrder.indexOf(field.minLevel);
    return fieldLevelIndex <= levelIndex;
  });
}

/**
 * Check if a field should be visible at a given complexity level
 */
export function isFieldVisible(fieldKey: string, level: MetadataComplexity): boolean {
  const field = METADATA_FIELD_DEFINITIONS.find(f => f.key === fieldKey);
  if (!field) return true; // Unknown fields are always visible

  const levelOrder: MetadataComplexity[] = ['simple', 'standard', 'advanced'];
  const levelIndex = levelOrder.indexOf(level);
  const fieldLevelIndex = levelOrder.indexOf(field.minLevel);

  return fieldLevelIndex <= levelIndex;
}

/**
 * Get fields grouped by category for a given complexity level
 */
export function getFieldsByCategory(level: MetadataComplexity): Record<string, FieldDefinition[]> {
  const visible = getVisibleFields(level);
  return visible.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, FieldDefinition[]>);
}

/**
 * Dublin Core property mappings
 */
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
  'location': 'dc:coverage',
  'gps': 'dc:coverage'
} as const;

/**
 * Rights statement options
 */
export const RIGHTS_OPTIONS = [
  { label: "No Rights Reserved (CC0)", value: "https://creativecommons.org/publicdomain/zero/1.0/" },
  { label: "Attribution (CC BY 4.0)", value: "https://creativecommons.org/licenses/by/4.0/" },
  { label: "Attribution-NonCommercial (CC BY-NC 4.0)", value: "https://creativecommons.org/licenses/by-nc/4.0/" },
  { label: "In Copyright", value: "http://rightsstatements.org/vocab/InC/1.0/" },
  { label: "Copyright Not Evaluated", value: "http://rightsstatements.org/vocab/CNE/1.0/" },
  { label: "No Known Copyright", value: "http://rightsstatements.org/vocab/NKC/1.0/" }
] as const;
