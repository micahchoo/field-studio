/**
 * Input Validation Utilities
 *
 * Provides text input sanitization and validation for security and accessibility.
 * Prevents XSS, injection attacks, and ensures data integrity.
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

export interface ValidationResult {
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
 * Default validation options
 */
const DEFAULT_OPTIONS: Required<Omit<ValidationOptions, 'pattern' | 'patternMessage'>> = {
  maxLength: 10000,
  minLength: 0,
  allowHtml: false,
  trim: true,
  allowControlChars: false,
  normalizeUnicode: true,
};

/**
 * HTML tag regex pattern
 * Matches common HTML tags including script, style, and event handlers
 */
const HTML_TAG_PATTERN = /<[^>]*>/gi;

/**
 * Script tag pattern (more aggressive)
 */
const SCRIPT_PATTERN = /<script[^>]*>[\s\S]*?<\/script>|<script[^>]*\/>/gi;

/**
 * Event handler pattern (onerror, onclick, etc.)
 */
const EVENT_HANDLER_PATTERN = /\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi;

/**
 * Control character pattern (except common whitespace)
 */
const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

/**
 * Sanitizes input by removing potentially dangerous content
 *
 * @param value - Raw input value
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeInput(value: string, options?: ValidationOptions): string {
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
  const maxLength = options?.maxLength ?? DEFAULT_OPTIONS.maxLength;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validates and sanitizes text input
 *
 * @param value - Raw input value
 * @param options - Validation options
 * @returns Validation result with sanitized value
 *
 * @example
 * ```typescript
 * const result = validateTextInput(userInput, {
 *   maxLength: 255,
 *   minLength: 1,
 *   allowHtml: false
 * });
 *
 * if (result.isValid) {
 *   saveToDatabase(result.value);
 * } else {
 *   showError(result.error);
 * }
 * ```
 */
export function validateTextInput(
  value: string,
  options?: ValidationOptions
): ValidationResult {
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

  // Check min length after trimming
  const minLength = options?.minLength ?? DEFAULT_OPTIONS.minLength;
  if (sanitized.length < minLength) {
    return {
      isValid: false,
      value: sanitized,
      error: `Input must be at least ${minLength} characters`,
      wasModified,
    };
  }

  // Check max length
  const maxLength = options?.maxLength ?? DEFAULT_OPTIONS.maxLength;
  if (originalValue.length > maxLength) {
    return {
      isValid: false,
      value: sanitized,
      error: `Input must not exceed ${maxLength} characters`,
      wasModified: true,
    };
  }

  // Check custom pattern
  if (options?.pattern && !options.pattern.test(sanitized)) {
    return {
      isValid: false,
      value: sanitized,
      error: options.patternMessage || 'Input format is invalid',
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
 * Quick validation for common input types
 */
export const INPUT_VALIDATORS = {
  /**
   * Validates a label/title input
   * - Max 255 characters
   * - No HTML
   * - Required (min 1 char)
   */
  label: (value: string): ValidationResult =>
    validateTextInput(value, {
      maxLength: 255,
      minLength: 1,
      allowHtml: false,
    }),

  /**
   * Validates a description/summary input
   * - Max 2000 characters
   * - No HTML
   * - Optional (min 0 chars)
   */
  description: (value: string): ValidationResult =>
    validateTextInput(value, {
      maxLength: 2000,
      minLength: 0,
      allowHtml: false,
    }),

  /**
   * Validates a search/filter input
   * - Max 500 characters
   * - No HTML
   * - Optional
   */
  search: (value: string): ValidationResult =>
    validateTextInput(value, {
      maxLength: 500,
      minLength: 0,
      allowHtml: false,
    }),

  /**
   * Validates a URL input
   * - Max 2048 characters
   * - Must match URL pattern
   */
  url: (value: string): ValidationResult =>
    validateTextInput(value, {
      maxLength: 2048,
      minLength: 0,
      allowHtml: false,
      pattern: /^https?:\/\/[^\s<>"{}|\\^`[\]]+$/i,
      patternMessage: 'Please enter a valid HTTP or HTTPS URL',
    }),

  /**
   * Validates an identifier input
   * - Max 100 characters
   * - Alphanumeric, hyphens, underscores only
   */
  identifier: (value: string): ValidationResult =>
    validateTextInput(value, {
      maxLength: 100,
      minLength: 0,
      allowHtml: false,
      pattern: /^[a-zA-Z0-9_-]*$/,
      patternMessage: 'Only letters, numbers, hyphens, and underscores allowed',
    }),
};

/**
 * Hook-compatible validator that returns only the sanitized value
 * Useful for onChange handlers
 *
 * @param value - Raw input value
 * @param options - Validation options
 * @returns Sanitized string (always safe to use)
 */
export function sanitizeForInput(value: string, options?: ValidationOptions): string {
  return sanitizeInput(value, options);
}

// Non-global patterns for .test() — avoids lastIndex state issues
const _SCRIPT_TEST = /<script[^>]*>[\s\S]*?<\/script>|<script[^>]*\/>/i;
const _HTML_TAG_TEST = /<[^>]*>/i;
const _EVENT_HANDLER_TEST = /\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/i;
const _CONTROL_CHAR_TEST = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/;

/**
 * Checks if a string contains potentially dangerous content
 *
 * @param value - String to check
 * @returns Object with flags indicating what was found
 */
export function checkForDangerousContent(value: string): {
  hasHtml: boolean;
  hasScript: boolean;
  hasEventHandlers: boolean;
  hasControlChars: boolean;
  isSafe: boolean;
} {
  // Use non-global patterns — no lastIndex reset needed
  const hasScript = _SCRIPT_TEST.test(value);
  const hasHtml = _HTML_TAG_TEST.test(value);
  const hasEventHandlers = _EVENT_HANDLER_TEST.test(value);
  const hasControlChars = _CONTROL_CHAR_TEST.test(value);

  return {
    hasHtml,
    hasScript,
    hasEventHandlers,
    hasControlChars,
    isSafe: !hasScript && !hasHtml && !hasEventHandlers && !hasControlChars,
  };
}
