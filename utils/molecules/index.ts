/**
 * Molecules - Composed utilities depending only on atoms
 *
 * These utilities combine atoms into useful operations
 * but remain domain-agnostic.
 */

// Sanitization
export {
  sanitizeHTML,
  sanitizeURL,
  sanitizePlainText,
  containsDangerousContent,
  sanitizeSVG,
  sanitizeAttribute,
  type SanitizeConfig,
} from './sanitizers';

// Validation
export {
  validateTextInput,
  sanitizeInput,
  INPUT_VALIDATORS,
  sanitizeForInput,
  checkForDangerousContent,
} from './validators';

// Search
export {
  fuzzyMatch,
  fuzzyMatchSimple,
  fuzzyScore,
  fuzzySearch,
  fuzzyFilter,
  fuzzySort,
  highlightMatches,
  type FuzzyMatchResult,
} from './search';

// Media type detection
export {
  getMimeType,
  getMimeTypeString,
  isImageFile,
  isVideoFile,
  isAudioFile,
  isTextFile,
  isModelFile,
  isPdfFile,
  isImageMimeType,
  isVideoMimeType,
  isAudioMimeType,
  isTimeBasedMimeType,
  isVisualMimeType,
  getContentTypeFromMime,
  getContentTypeFromFilename,
  detectMediaType,
  getFilenameFromUrl,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  AUDIO_EXTENSIONS,
  TEXT_EXTENSIONS,
  MODEL_EXTENSIONS,
} from './media-detection';

// Themes
export {
  createThemeClasses,
  getStatusColorForScore,
  getStatusColorForLevel,
  type ThemeClasses,
} from './themes';

// File operations
export {
  detectFileSequence,
  findSimilarFiles,
  sanitizeFilename,
  getBaseName,
  getExtension,
  type SequenceResult,
  type SimilarityMatch,
} from './files';
