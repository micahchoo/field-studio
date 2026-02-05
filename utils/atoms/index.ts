/**
 * Atoms - Primitive utilities with zero dependencies
 *
 * These are the building blocks that can be imported by any layer.
 * No atom should import from another file in the codebase.
 */

// Text manipulation
export {
  escapeHTML,
  stripTags,
  normalizeWhitespace,
  truncate,
  toKebabCase,
  toCamelCase,
} from './text';

// Regular expression patterns
export {
  HTML_TAG_PATTERN,
  SCRIPT_PATTERN,
  EVENT_HANDLER_PATTERN,
  CONTROL_CHAR_PATTERN,
  HTTP_URI_PATTERN,
  UUID_PATTERN,
  EXTENSION_PATTERN,
  INVALID_FILENAME_CHARS,
  ISO_8601_PATTERN,
} from './regex';

// ID and URI generation
export {
  generateUUID,
  removeTrailingSlash,
  normalizeUri,
  getUriLastSegment,
  convertToHttpUri,
  generateValidUri,
} from './id';

// URL validation
export {
  isValidHttpUri,
  hasFragmentIdentifier,
  hasDangerousProtocol,
  isRelativeUrl,
  isHashAnchor,
  isValidUrlFormat,
} from './url';

// File path operations
export {
  MAX_FILENAME_LENGTH,
  getExtension,
  removeExtension,
  getBaseName,
  parseFilePath,
  sanitizeFilename,
  extractSequenceNumber,
  generateSafeFilename,
} from './files';

// Validation types
export type {
  InputValidationResult,
  IIIFValidationResult,
  ValidationRequirement,
  ValidationOptions,
} from './validation';
export { DEFAULT_VALIDATION } from './validation';

// Colors and themes
export {
  STATUS_COLORS,
  BACKGROUNDS,
  TEXT_COLORS,
  BORDER_COLORS,
  BUTTON_STYLES,
} from './colors';

// Media types
export type { ContentResourceType, MimeTypeInfo } from './media-types';
export {
  MIME_TYPE_MAP,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  AUDIO_EXTENSIONS,
  TEXT_EXTENSIONS,
  MODEL_EXTENSIONS,
} from './media-types';
