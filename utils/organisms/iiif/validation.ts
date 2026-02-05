/**
 * IIIF Resource Validation
 * Organism - depends on atoms
 */

import {
  generateUUID,
  normalizeUri,
  removeTrailingSlash,
  getUriLastSegment,
} from '../../atoms/id';
import type { DuplicateIdResult } from './traversal';
import { findDuplicateIds } from './traversal';
import type { IIIFItem } from '../../../types';

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a resource ID with base URI
 */
export function generateResourceId(
  baseUri: string,
  type: string
): string {
  const normalized = normalizeUri(baseUri);
  const id = generateUUID();
  return `${normalized}/${type.toLowerCase()}/${id}`;
}

/**
 * Generate a valid IIIF URI
 */
export function generateValidUri(baseUri: string): string {
  const normalized = normalizeUri(baseUri);
  const id = generateUUID();
  return `${normalized}/${id}`;
}

// ============================================================================
// URI Normalization
// ============================================================================

/**
 * Normalize a URI for comparison
 */
export { normalizeUri, removeTrailingSlash, getUriLastSegment };

// ============================================================================
// Duplicate Detection
// ============================================================================

export type { DuplicateIdResult };
export { findDuplicateIds };

/**
 * Check if tree has duplicate IDs
 */
export function hasDuplicateIds(root: IIIFItem): boolean {
  return findDuplicateIds(root).length > 0;
}

// ============================================================================
// Resource ID Validation
// ============================================================================

export interface IdValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Validate a resource ID
 */
export function validateResourceId(
  id: string,
  resourceType?: string
): IdValidationResult {
  if (!id) {
    return { valid: false, error: 'ID is required' };
  }

  if (!id.startsWith('http://') && !id.startsWith('https://')) {
    return { valid: false, error: 'ID must be a valid HTTP(S) URI' };
  }

  if (resourceType === 'Canvas' && id.includes('#')) {
    return {
      valid: false,
      error: 'Canvas ID must not contain a fragment identifier',
    };
  }

  return {
    valid: true,
    normalized: normalizeUri(id),
  };
}

// ============================================================================
// Type Validation
// ============================================================================

const VALID_IIIF_TYPES = [
  'Collection',
  'Manifest',
  'Canvas',
  'Range',
  'AnnotationPage',
  'AnnotationCollection',
  'Annotation',
  'ContentResource',
  'Agent',
  'SpecificResource',
  'Choice',
  'TextualBody',
];

/**
 * Check if type is a valid IIIF resource type
 */
export function isValidIIIFType(type: string): boolean {
  return VALID_IIIF_TYPES.includes(type);
}

/**
 * Validate resource has required type and id
 */
export function validateResourceBase(
  resource: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!resource.type) {
    errors.push('Resource must have a type');
  } else if (!isValidIIIFType(resource.type as string)) {
    errors.push(`Invalid resource type: ${resource.type}`);
  }

  if (!resource.id) {
    errors.push('Resource must have an id');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
