/**
 * Input validation molecules
 * Depends on: atoms/validation, atoms/regex
 */

import {
  InputValidationResult,
  ValidationOptions,
  DEFAULT_VALIDATION,
} from '../atoms/validation';
import {
  SCRIPT_PATTERN,
  EVENT_HANDLER_PATTERN,
  HTML_TAG_PATTERN,
  CONTROL_CHAR_PATTERN,
} from '../atoms/regex';

/**
 * Sanitize input by removing potentially dangerous content
 */
export function sanitizeInput(
  value: string,
  options?: ValidationOptions
): string {
  if (typeof value !== 'string') {
    return '';
  }

  let sanitized = value;

  // Remove script tags first (most dangerous)
  sanitized = sanitized.replace(SCRIPT_PATTERN, '');

  // Remove event handlers
  sanitized = sanitized.replace(EVENT_HANDLER_PATTERN, '');

  // Remove all HTML tags unless explicitly allowed
  if (!options?.allowHtml) {
    sanitized = sanitized.replace(HTML_TAG_PATTERN, '');
  }

  // Remove control characters
  if (!options?.allowControlChars) {
    sanitized = sanitized.replace(CONTROL_CHAR_PATTERN, '');
  }

  // Normalize Unicode to prevent homograph attacks
  if (options?.normalizeUnicode !== false) {
    sanitized = sanitized.normalize('NFC');
  }

  // Trim whitespace
  if (options?.trim !== false) {
    sanitized = sanitized.trim();
  }

  // Enforce max length
  const maxLength = options?.maxLength ?? DEFAULT_VALIDATION.maxLength;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate and sanitize text input
 */
export function validateTextInput(
  value: string,
  options?: ValidationOptions
): InputValidationResult {
  // Handle non-string inputs
  if (typeof value !== 'string') {
    return {
      isValid: false,
      value: '',
      error: 'Input must be a string',
      wasModified: true,
    };
  }

  const originalValue = value;
  const sanitized = sanitizeInput(value, options);
  const wasModified = sanitized !== originalValue;

  // Check min length
  const minLength = options?.minLength ?? DEFAULT_VALIDATION.minLength;
  if (sanitized.length < minLength) {
    return {
      isValid: false,
      value: sanitized,
      error: `Minimum length is ${minLength} characters`,
      wasModified,
    };
  }

  // Check pattern
  if (options?.pattern && !options.pattern.test(sanitized)) {
    return {
      isValid: false,
      value: sanitized,
      error: options.patternMessage || 'Input does not match required pattern',
      wasModified,
    };
  }

  return {
    isValid: true,
    value: sanitized,
    wasModified,
  };
}

/**
 * Predefined validators for common use cases
 */
export const INPUT_VALIDATORS = {
  /**
   * Validate required field
   */
  required: (value: string): InputValidationResult =>
    validateTextInput(value, { minLength: 1 }),

  /**
   * Validate email (basic pattern)
   */
  email: (value: string): InputValidationResult =>
    validateTextInput(value, {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: 'Please enter a valid email address',
    }),

  /**
   * Validate URL
   */
  url: (value: string): InputValidationResult =>
    validateTextInput(value, {
      pattern: /^https?:\/\/.+/,
      patternMessage: 'Please enter a valid URL (must start with http:// or https://)',
    }),

  /**
   * Validate no HTML allowed
   */
  plainText: (value: string): InputValidationResult =>
    validateTextInput(value, { allowHtml: false }),

  /**
   * Validate short text (titles, labels)
   */
  shortText: (value: string): InputValidationResult =>
    validateTextInput(value, { maxLength: 255 }),

  /**
   * Validate long text (descriptions)
   */
  longText: (value: string): InputValidationResult =>
    validateTextInput(value, { maxLength: 10000 }),
} as const;

/**
 * Alias for backwards compatibility
 */
export const sanitizeForInput = sanitizeInput;

/**
 * Check for dangerous content (alias)
 */
export function checkForDangerousContent(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const hasScript = SCRIPT_PATTERN.test(value);
  const hasEventHandlers = EVENT_HANDLER_PATTERN.test(value);

  return hasScript || hasEventHandlers;
}
