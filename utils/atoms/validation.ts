/**
 * Base validation types and interfaces
 * Zero dependencies
 */

/**
 * Input validation result for form fields
 * Used by: inputValidation.ts
 */
export interface InputValidationResult {
  /** Whether the input is valid */
  isValid: boolean;
  /** Sanitized value */
  value: string;
  /** Error message if invalid */
  error?: string;
  /** Whether the value was modified during sanitization */
  wasModified: boolean;
}

/**
 * IIIF resource validation result
 * Used by: iiifSchema.ts
 */
export interface IIIFValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validation requirement levels
 */
export type ValidationRequirement =
  | 'REQUIRED'
  | 'RECOMMENDED'
  | 'OPTIONAL'
  | 'NOT_ALLOWED'
  | 'CONDITIONAL';

/**
 * Default validation options
 */
export interface ValidationOptions {
  /** Maximum allowed length for the input */
  maxLength?: number;
  /** Minimum required length */
  minLength?: number;
  /** Whether to allow HTML tags (default: false) */
  allowHtml?: boolean;
  /** Whether to trim whitespace (default: true) */
  trim?: boolean;
  /** Custom regex pattern to validate against */
  pattern?: RegExp;
  /** Custom error message for pattern validation */
  patternMessage?: string;
  /** Whether to allow control characters (default: false) */
  allowControlChars?: boolean;
  /** Whether to normalize Unicode (default: true) */
  normalizeUnicode?: boolean;
}

/**
 * Default validation constants
 */
export const DEFAULT_VALIDATION = {
  maxLength: 10000,
  minLength: 0,
  allowHtml: false,
  trim: true,
  allowControlChars: false,
  normalizeUnicode: true,
} as const;
