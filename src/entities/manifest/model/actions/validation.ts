/**
 * Validation functions for action parameters.
 */

import type { LanguageMap } from '@/src/shared/types';
import {
  validateBehaviors as centralizedValidateBehaviors,
  findBehaviorConflicts,
} from '@/utils/iiifBehaviors';

/**
 * Validate a language map structure
 */
export function validateLanguageMap(label: LanguageMap | undefined, fieldName: string): string | null {
  if (!label) return null; // undefined is OK for optional fields

  if (typeof label !== 'object') {
    return `${fieldName} must be an object`;
  }

  for (const [locale, values] of Object.entries(label)) {
    if (!Array.isArray(values)) {
      return `${fieldName}["${locale}"] must be an array`;
    }
    for (const value of values) {
      if (typeof value !== 'string') {
        return `${fieldName}["${locale}"] must contain only strings`;
      }
    }
  }

  return null;
}

/**
 * IIIF 3.0 Behavior Validation
 *
 * Uses centralized behavior validation from utils/iiifBehaviors.ts
 * which implements the complete IIIF Presentation API 3.0 specification.
 */
export function validateBehavior(behavior: string[], entityType: string): string | null {
  // Use centralized behavior validation
  const validationResult = centralizedValidateBehaviors(entityType, behavior);

  // Return first error if any
  if (validationResult.errors.length > 0) {
    return validationResult.errors[0];
  }

  // Check for disjoint set conflicts using centralized utility
  const conflicts = findBehaviorConflicts(behavior);
  if (conflicts.length > 0) {
    return conflicts[0];
  }

  return null;
}

/**
 * Validate canvas dimensions
 */
export function validateCanvasDimensions(width: number, height: number): string | null {
  if (typeof width !== 'number' || width <= 0) {
    return 'Canvas width must be a positive number';
  }
  if (typeof height !== 'number' || height <= 0) {
    return 'Canvas height must be a positive number';
  }
  return null;
}
