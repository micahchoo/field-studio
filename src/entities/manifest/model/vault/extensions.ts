/**
 * Vault Extension Preservation (Molecule Layer)
 *
 * Handles preservation of unknown/vendor-specific properties
 * for round-tripping IIIF resources. Ensures properties like
 * Mirador configs, Tify settings survive import/export.
 *
 * ADAPTATION NOTE: Inlines getAllowedProperties() instead of importing
 * from @/utils/iiifSchema. The property lists are derived from the
 * IIIF Presentation API 3.0 PROPERTY_MATRIX.
 */

import type { EntityType } from '@/src/shared/types';
import { cloneAsRecord } from './cloning';

/**
 * Inline stub for getAllowedProperties.
 * Returns all IIIF 3.0 properties that are NOT "NOT_ALLOWED" for a given type.
 * Derived from the PROPERTY_MATRIX in utils/iiifSchema.ts.
 */
function getAllowedProperties(type: string): string[] {
  // Properties that apply to nearly all resource types
  const common = [
    'label', 'metadata', 'summary', 'requiredStatement', 'rights',
    'provider', 'thumbnail', 'navDate', 'placeholderCanvas', 'accompanyingCanvas',
    'id', 'type', 'homepage', 'rendering', 'service', 'seeAlso', 'partOf',
  ];

  switch (type) {
    case 'Collection':
      return [...common, 'viewingDirection', 'behavior', 'items', 'structures', 'annotations', 'services', 'logo'];
    case 'Manifest':
      return [...common, 'viewingDirection', 'behavior', 'items', 'structures', 'annotations', 'services', 'start', 'logo'];
    case 'Canvas':
      return [...common, 'height', 'width', 'duration', 'behavior', 'items', 'annotations'];
    case 'Range':
      return [...common, 'viewingDirection', 'behavior', 'items', 'annotations', 'start', 'supplementary'];
    case 'AnnotationPage':
      return ['id', 'type', 'label', 'items', 'partOf'];
    case 'Annotation':
      return ['id', 'type', 'label', 'motivation', 'body', 'target', 'created',
              'rights', 'body', 'bodyValue', 'source', 'selector', 'purpose',
              'thumbnail', 'partOf', 'service', 'homepage', 'rendering', 'seeAlso'];
    default:
      return common;
  }
}

/**
 * Known IIIF Presentation API 3.0 properties by entity type
 * Properties not in this list are preserved as extensions
 */
const KNOWN_IIIF_PROPERTIES: Record<EntityType | 'common', Set<string>> = {
  common: new Set([
    // Core JSON-LD / Internal
    '@context', 'id', 'type',
    // Internal properties (prefixed with _)
    '_blobUrl', '_parentId', '_state', '_filename'
  ]),
  Collection: new Set(getAllowedProperties('Collection')),
  Manifest: new Set(getAllowedProperties('Manifest')),
  Canvas: new Set(getAllowedProperties('Canvas')),
  Range: new Set(getAllowedProperties('Range')),
  AnnotationPage: new Set(getAllowedProperties('AnnotationPage')),
  Annotation: new Set([...getAllowedProperties('Annotation'), 'bodyValue'])
};

/**
 * Extract unknown properties from an entity for extension preservation
 */
export function extractExtensions(
  item: Record<string, unknown>,
  type: EntityType
): Record<string, unknown> {
  const extensions: Record<string, unknown> = {};
  const knownCommon = KNOWN_IIIF_PROPERTIES.common;
  const knownForType = KNOWN_IIIF_PROPERTIES[type];

  for (const [key, value] of Object.entries(item)) {
    // Skip known properties
    if (knownCommon.has(key) || knownForType.has(key)) continue;
    // Skip undefined/null values
    if (value === undefined || value === null) continue;
    // Preserve unknown property
    extensions[key] = value;
  }

  return extensions;
}

/**
 * Apply preserved extensions back to an entity during denormalization
 */
export function applyExtensions(
  item: Record<string, unknown>,
  extensions: Record<string, unknown> | undefined
): void {
  if (!extensions) return;
  for (const [key, value] of Object.entries(extensions)) {
    item[key] = value;
  }
}

/**
 * Check if an entity has any unknown properties without cloning.
 * Returns true on the first unknown key found (early exit).
 */
export function hasUnknownProperties(item: object, type: EntityType): boolean {
  const knownCommon = KNOWN_IIIF_PROPERTIES.common;
  const knownForType = KNOWN_IIIF_PROPERTIES[type];
  for (const key of Object.keys(item)) {
    if (!knownCommon.has(key) && !knownForType.has(key)) {
      const val = (item as Record<string, unknown>)[key];
      if (val !== undefined && val !== null) return true;
    }
  }
  return false;
}

/**
 * Helper to extract extensions from a typed entity
 */
export function extractExtensionsFromEntity<T extends object>(
  entity: T,
  type: EntityType
): Record<string, unknown> {
  return extractExtensions(cloneAsRecord(entity), type);
}
