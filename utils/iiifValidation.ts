/**
 * IIIF Validation Utilities
 *
 * Centralized ID validation, URI checking, and duplicate detection.
 * Consolidates duplicate validation logic from:
 * - services/validator.ts (duplicate ID detection, HTTP URI validation)
 * - services/specBridge.ts (ID format validation)
 * - services/validationHealer.ts (URI generation)
 */

import { IIIFItem } from '@/src/shared/types';

// ============================================================================
// ID Validation
// ============================================================================

/**
 * Check if a string is a valid HTTP(S) URI
 * Centralized from services/validator.ts and services/specBridge.ts
 */
export function isValidHttpUri(uri: string): boolean {
  if (!uri || typeof uri !== 'string') return false;
  return uri.startsWith('http://') || uri.startsWith('https://');
}

/**
 * Check if a URI contains a fragment identifier
 * Fragment identifiers are not allowed in Canvas IDs per IIIF spec
 */
export function hasFragmentIdentifier(uri: string): boolean {
  return uri.includes('#');
}

/**
 * Validate an ID for a specific resource type
 * Returns validation result with optional error message
 */
export function isValidId(id: string, resourceType: string): { valid: boolean; error?: string } {
  if (!id) {
    return { valid: false, error: 'ID is required' };
  }

  if (!isValidHttpUri(id)) {
    return { valid: false, error: 'ID must be a valid HTTP(S) URI' };
  }

  // Canvas-specific: must not contain fragment identifier
  if (resourceType === 'Canvas' && hasFragmentIdentifier(id)) {
    return { valid: false, error: 'Canvas ID must not contain a fragment identifier' };
  }

  return { valid: true };
}

/**
 * Generate a valid HTTP URI for a resource
 * Centralized from services/validationHealer.ts
 */
export function generateValidUri(resourceType: string, suffix?: string): string {
  try {
    const base = `http://archive.local/iiif/${(resourceType || 'Resource').toLowerCase()}`;
    const id = suffix || crypto.randomUUID();
    return `${base}/${id}`;
  } catch (e) {
    // Fallback if crypto.randomUUID fails
    const fallbackId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return `http://archive.local/iiif/resource/${fallbackId}`;
  }
}

/**
 * Convert a non-HTTP ID to a valid HTTP URI
 * Preserves the original identifier as a path segment
 */
export function convertToHttpUri(id: string, resourceType: string): string {
  if (isValidHttpUri(id)) {
    return id;
  }
  
  // Use the existing ID as a suffix if it's not already a URI
  const suffix = encodeURIComponent(id || 'item');
  return generateValidUri(resourceType, suffix);
}

// ============================================================================
// Duplicate Detection
// ============================================================================

export interface DuplicateIdResult {
  /** IDs that appear more than once */
  duplicates: string[];
  /** All IDs found and their occurrence count */
  idCounts: Map<string, number>;
  /** Total unique IDs found */
  uniqueCount: number;
  /** Total items with IDs */
  totalItems: number;
}

/**
 * Find all duplicate IDs in an array of items or tree
 * Centralized from services/validator.ts traverse logic
 */
export function findDuplicateIds(items: IIIFItem[] | IIIFItem): DuplicateIdResult {
  const idCounts = new Map<string, number>();
  const duplicates: string[] = [];
  
  // Handle single item (tree) or array
  const itemArray = Array.isArray(items) ? items : [items];
  
  function countIds(item: IIIFItem) {
    if (item.id) {
      const count = (idCounts.get(item.id) || 0) + 1;
      idCounts.set(item.id, count);
      if (count === 2) {
        duplicates.push(item.id);
      }
    }
    
    // Recurse into children
    const children = (item as any).items || (item as any).annotations || (item as any).structures || [];
    children.forEach((child: IIIFItem) => {
      if (child && typeof child === 'object') {
        countIds(child);
      }
    });
  }
  
  itemArray.forEach(countIds);
  
  return {
    duplicates: [...new Set(duplicates)],
    idCounts,
    uniqueCount: idCounts.size,
    totalItems: Array.from(idCounts.values()).reduce((sum, count) => sum + count, 0)
  };
}

/**
 * Check if an array of items has any duplicate IDs
 * Quick check function for validation
 */
export function hasDuplicateIds(items: IIIFItem[]): boolean {
  const seen = new Set<string>();
  
  function check(item: IIIFItem): boolean {
    if (item.id) {
      if (seen.has(item.id)) return true;
      seen.add(item.id);
    }
    
    const children = (item as any).items || (item as any).annotations || [];
    return children.some((child: IIIFItem) => child && typeof child === 'object' && check(child));
  }
  
  return items.some(check);
}

// ============================================================================
// UUID Generation
// ============================================================================

/**
 * Generate a UUID v4
 * Falls back to Math.random if crypto.randomUUID is not available
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a unique ID for a resource type
 * Creates a deterministic but unique ID based on type and timestamp
 */
export function generateResourceId(resourceType: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `urn:uuid:${resourceType.toLowerCase()}-${timestamp}-${random}`;
}

// ============================================================================
// URI Normalization
// ============================================================================

/**
 * Normalize a URI by removing trailing slashes and standardizing format
 */
export function normalizeUri(uri: string): string {
  if (!uri) return uri;
  
  // Remove trailing slash
  let normalized = uri.replace(/\/$/, '');
  
  // Ensure HTTP(S) protocol is lowercase
  normalized = normalized.replace(/^HTTP:\/\//i, 'http://');
  normalized = normalized.replace(/^HTTPS:\/\//i, 'https://');
  
  return normalized;
}

/**
 * Ensure a URI has no trailing slash
 * Important for IIIF IDs which should not have trailing slashes
 */
export function removeTrailingSlash(uri: string): string {
  return uri.replace(/\/$/, '');
}

/**
 * Extract the last segment from a URI path
 * Useful for generating labels from IDs
 */
export function getUriLastSegment(uri: string): string {
  if (!uri) return '';

  // Handle URN schemes (e.g., urn:uuid:12345 → 12345)
  if (uri.startsWith('urn:')) {
    const parts = uri.split(':');
    return parts[parts.length - 1] || '';
  }

  try {
    const url = new URL(uri);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    // Fallback for non-URL strings
    const parts = uri.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  }
}

// ============================================================================
// Export default object
// ============================================================================

export default {
  isValidHttpUri,
  hasFragmentIdentifier,
  isValidId,
  generateValidUri,
  convertToHttpUri,
  findDuplicateIds,
  hasDuplicateIds,
  generateUUID,
  generateResourceId,
  normalizeUri,
  removeTrailingSlash,
  getUriLastSegment
};
