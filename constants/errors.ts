/**
 * Error Handling Constants
 * 
 * Error messages, retry configuration, and error patterns.
 */

// ============================================================================
// Error Messages by Category
// ============================================================================

export const ERROR_MESSAGES = {
  /** Generic errors */
  generic: 'An unexpected error occurred. Please try again.',
  /** Network errors */
  network: 'Connection failed. Please check your internet connection.',
  /** Validation errors */
  validation: 'Please check your input and try again.',
  /** Not found errors */
  notFound: 'The requested item could not be found.',
  /** Permission errors */
  permission: 'You do not have permission to perform this action.',
  /** Timeout errors */
  timeout: 'The operation timed out. Please try again.',
  /** Parse errors */
  parse: 'Could not process the file. It may be corrupted or in an unexpected format.'
} as const;

// ============================================================================
// Retry Configuration
// ============================================================================

export const RETRY_CONFIG = {
  /** Number of retry attempts */
  maxAttempts: 3,
  /** Delay between retries in ms */
  delayMs: 1000,
  /** Exponential backoff multiplier */
  backoffMultiplier: 2
} as const;

// ============================================================================
// Error Boundary Fallback Config
// ============================================================================

export const ERROR_BOUNDARY_CONFIG = {
  title: 'Something went wrong',
  description: 'We apologize for the inconvenience. The error has been logged.',
  actionLabel: 'Reload Application'
} as const;

// ============================================================================
// Toast Durations by Type
// ============================================================================

export const TOAST_DURATIONS = {
  success: 3000,
  info: 4000,
  warning: 5000,
  error: 6000
} as const;
