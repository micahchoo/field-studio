/**
 * IIIF Schema Utilities — Stub
 * Full schema validation deferred to shared services migration.
 */

import type { IIIFItem } from '@/src/shared/types';

/** Property metadata for IIIF spec compliance */
export interface PropertyRequirement {
  required: boolean;
  recommended: boolean;
  type: string;
  description?: string;
}

/** Schema validation error */
export interface SchemaError {
  path: string;
  message: string;
  level: 'error' | 'warning';
}

/** IIIF Schema (subset needed by entities) */
export const IIIF_SCHEMA = {
  MANIFEST_REQUIRED: ['id', 'type', 'label'],
  CANVAS_REQUIRED: ['id', 'type', 'label', 'width', 'height'],
  COLLECTION_REQUIRED: ['id', 'type', 'label'],
};

/** Get properties allowed for an entity type */
export function getAllowedProperties(type: string): string[] {
  const common = ['id', 'type', 'label', 'summary', 'metadata', 'requiredStatement',
    'rights', 'navDate', 'provider', 'thumbnail', 'homepage', 'logo',
    'rendering', 'seeAlso', 'service', 'services', 'behavior',
    'partOf', 'supplementary', 'annotations'];

  const typeSpecific: Record<string, string[]> = {
    Manifest: [...common, 'items', 'structures', 'start', 'viewingDirection', 'accompanyingCanvas', 'placeholderCanvas'],
    Canvas: [...common, 'items', 'width', 'height', 'duration', 'accompanyingCanvas', 'placeholderCanvas'],
    Collection: [...common, 'items', 'viewingDirection'],
    Range: [...common, 'items', 'start', 'viewingDirection', 'supplementary'],
    AnnotationPage: ['id', 'type', 'label', 'items'],
    Annotation: ['id', 'type', 'label', 'motivation', 'body', 'target', 'created', 'modified', 'creator'],
  };

  return typeSpecific[type] || common;
}

/** Get recommended properties for an entity type */
export function getRecommendedProperties(type: string): string[] {
  const recommended: Record<string, string[]> = {
    Manifest: ['label', 'summary', 'metadata', 'rights', 'requiredStatement', 'provider', 'thumbnail'],
    Canvas: ['label', 'thumbnail'],
    Collection: ['label', 'summary', 'thumbnail'],
    Range: ['label'],
  };
  return recommended[type] || ['label'];
}

/** Check if a behavior is allowed for a given type */
export function isBehaviorAllowed(behavior: string, type: string): boolean {
  const allowed: Record<string, string[]> = {
    Manifest: ['auto-advance', 'no-auto-advance', 'continuous', 'paged', 'individuals', 'unordered', 'multi-part', 'together', 'sequence', 'thumbnail-nav', 'no-nav'],
    Canvas: ['auto-advance', 'no-auto-advance', 'facing-pages', 'non-paged'],
    Collection: ['auto-advance', 'no-auto-advance', 'continuous', 'individuals', 'multi-part', 'together', 'unordered'],
    Range: ['auto-advance', 'no-auto-advance', 'no-nav', 'thumbnail-nav'],
  };
  return (allowed[type] || []).includes(behavior);
}

/** Validate a resource against the IIIF schema */
export function validateResource(item: IIIFItem): SchemaError[] {
  const errors: SchemaError[] = [];

  if (!item.id) errors.push({ path: 'id', message: 'Missing required property: id', level: 'error' });
  if (!item.type) errors.push({ path: 'type', message: 'Missing required property: type', level: 'error' });
  if (!item.label) errors.push({ path: 'label', message: 'Missing required property: label', level: 'warning' });

  return errors;
}

/** Get minimum template for a type */
export function getMinimumTemplate(type: string): Partial<IIIFItem> {
  const base = { type: type as IIIFItem['type'], label: { none: ['Untitled'] } };
  if (type === 'Canvas') return { ...base, width: 1000, height: 1000 } as Partial<IIIFItem>;
  return base;
}

/** Get property requirement info */
export function getPropertyRequirement(type: string, property: string): PropertyRequirement {
  const required = ['id', 'type'].includes(property);
  const recommended = getRecommendedProperties(type).includes(property);
  return { required, recommended, type: 'string' };
}

/** Get valid item types for a parent type */
export function getValidItemTypes(parentType: string): string[] {
  const valid: Record<string, string[]> = {
    Manifest: ['Canvas'],
    Collection: ['Manifest', 'Collection'],
    Range: ['Canvas', 'Range'],
    Canvas: ['AnnotationPage'],
    AnnotationPage: ['Annotation'],
  };
  return valid[parentType] || [];
}

/** Check if viewing direction is valid */
export function isValidViewingDirection(dir: string): boolean {
  return ['left-to-right', 'right-to-left', 'top-to-bottom', 'bottom-to-top'].includes(dir);
}

/** Common rights URIs */
export const COMMON_RIGHTS_URIS = [
  'http://creativecommons.org/licenses/by/4.0/',
  'http://creativecommons.org/licenses/by-sa/4.0/',
  'http://creativecommons.org/licenses/by-nc/4.0/',
  'http://creativecommons.org/publicdomain/zero/1.0/',
  'http://rightsstatements.org/vocab/InC/1.0/',
  'http://rightsstatements.org/vocab/NoC-US/1.0/',
];

/** Viewing directions list */
export const VIEWING_DIRECTIONS = ['left-to-right', 'right-to-left', 'top-to-bottom', 'bottom-to-top'] as const;
