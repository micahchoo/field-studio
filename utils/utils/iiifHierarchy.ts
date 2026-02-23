/**
 * IIIF Hierarchy Utilities — Stub
 * Defines containment rules for IIIF resource types.
 */

/** Get the relationship type between parent and child */
export function getRelationshipType(parentType: string, childType: string): string {
  const relationships: Record<string, Record<string, string>> = {
    Collection: { Manifest: 'items', Collection: 'items' },
    Manifest: { Canvas: 'items', Range: 'structures' },
    Canvas: { AnnotationPage: 'items' },
    AnnotationPage: { Annotation: 'items' },
    Range: { Canvas: 'items', Range: 'items' },
  };
  return relationships[parentType]?.[childType] || 'unknown';
}

/** Get valid child types for a parent type */
export function getValidChildTypes(parentType: string): string[] {
  const valid: Record<string, string[]> = {
    Collection: ['Manifest', 'Collection'],
    Manifest: ['Canvas'],
    Canvas: ['AnnotationPage'],
    AnnotationPage: ['Annotation'],
    Range: ['Canvas', 'Range'],
  };
  return valid[parentType] || [];
}

/** Check if a child type is valid for a parent type */
export function isValidChildType(parentType: string, childType: string): boolean {
  return getValidChildTypes(parentType).includes(childType);
}

/** Generate a short unique ID with an optional prefix */
export function generateId(prefix: string = ''): string {
  return `${prefix}${crypto.randomUUID().slice(0, 8)}`;
}

/** Check if a type is a standalone top-level type */
export function isStandaloneType(type: string): boolean {
  return ['Manifest', 'Collection'].includes(type);
}
