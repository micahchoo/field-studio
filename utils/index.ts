/**
 * Utilities - Atomic Design Structure
 *
 * Organized by granularity:
 * - atoms: Primitive utilities (zero dependencies)
 * - molecules: Composed utilities (depends on atoms)
 * - organisms: Domain logic (depends on atoms, molecules)
 */

// ============================================================================
// Atoms - Primitive Utilities
// ============================================================================

export {
  // Text
  escapeHTML,
  stripTags,
  normalizeWhitespace,
  truncate,
  toKebabCase,
  toCamelCase,
  // Regex patterns
  HTML_TAG_PATTERN,
  SCRIPT_PATTERN,
  EVENT_HANDLER_PATTERN,
  CONTROL_CHAR_PATTERN,
  HTTP_URI_PATTERN,
  UUID_PATTERN,
  EXTENSION_PATTERN,
  INVALID_FILENAME_CHARS,
  ISO_8601_PATTERN,
  // ID/URI
  generateUUID,
  removeTrailingSlash,
  normalizeUri,
  getUriLastSegment,
  convertToHttpUri,
  generateValidUri,
  // URL
  isValidHttpUri,
  hasFragmentIdentifier,
  hasDangerousProtocol,
  isRelativeUrl,
  isHashAnchor,
  isValidUrlFormat,
  // Files
  MAX_FILENAME_LENGTH,
  getExtension,
  removeExtension,
  getBaseName,
  parseFilePath,
  sanitizeFilename,
  extractSequenceNumber,
  generateSafeFilename,
  // Validation types
  DEFAULT_VALIDATION,
  // Colors
  STATUS_COLORS,
  BACKGROUNDS,
  TEXT_COLORS,
  BORDER_COLORS,
  BUTTON_STYLES,
  // Media types
  MIME_TYPE_MAP,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  AUDIO_EXTENSIONS,
  TEXT_EXTENSIONS,
  MODEL_EXTENSIONS,
} from './atoms';

export type {
  // Validation types
  InputValidationResult,
  IIIFValidationResult,
  ValidationRequirement,
  ValidationOptions,
  // Media types
  ContentResourceType,
  MimeTypeInfo,
} from './atoms';

// ============================================================================
// Molecules - Composed Utilities
// ============================================================================

export {
  // Sanitizers
  sanitizeHTML,
  sanitizeURL,
  sanitizePlainText,
  containsDangerousContent,
  sanitizeSVG,
  sanitizeAttribute,
  // Validators
  validateTextInput,
  sanitizeInput,
  INPUT_VALIDATORS,
  sanitizeForInput,
  checkForDangerousContent,
  // Search
  fuzzyMatch,
  fuzzyMatchSimple,
  fuzzyScore,
  fuzzySearch,
  fuzzyFilter,
  fuzzySort,
  highlightMatches,
  // Media detection
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
  // Themes
  createThemeClasses,
  getStatusColorForScore,
  getStatusColorForLevel,
  // Files
  detectFileSequence,
  findSimilarFiles,
} from './molecules';

export type {
  // Sanitizers
  SanitizeConfig,
  // Search
  FuzzyMatchResult,
  // Themes
  ThemeClasses,
  // Files
  SequenceResult,
  SimilarityMatch,
} from './molecules';

// ============================================================================
// Organisms - Domain Logic
// ============================================================================

// IIIF Domain
export {
  // Types
  isValidLanguageMap,
  isValidMetadataEntry,
  isValidAgent,
  isValidReference,
  isValidExternalResource,
  isValidContentResource,
  createLanguageMap,
  getLanguageValue,
  createMetadataEntry,
  IIIF_MOTIVATIONS,
  isValidMotivation,
  isPaintingMotivation,
  isValidNavDate,
  formatNavDate,
  isValidDimension,
  isValidDuration,
  isKnownRightsUri,
  isValidRightsUri,
  // Schema
  CONTENT_RESOURCE_LIST,
  VIEWING_DIRECTIONS,
  DEFAULT_VIEWING_DIRECTION,
  isValidViewingDirection,
  canHaveViewingDirection,
  TIME_MODES,
  DEFAULT_TIME_MODE,
  isValidTimeMode,
  PROPERTY_MATRIX,
  getPropertyRequirement,
  isPropertyAllowed,
  getAllowedProperties,
  getRequiredProperties,
  getRecommendedProperties,
  validateResource,
  validateResourceFull,
  ITEMS_CONTAINMENT,
  getValidItemTypes,
  isValidItemType,
  // Behaviors
  BEHAVIOR_VALIDITY_MATRIX,
  DISJOINT_SETS,
  INHERITANCE_RULES,
  BEHAVIOR_DESCRIPTIONS,
  isBehaviorValidForType,
  getValidBehaviorsForType,
  getDisjointSetForBehavior,
  findBehaviorConflicts,
  getDefaultBehavior,
  doesInheritBehavior,
  getInheritedBehaviors,
  resolveEffectiveBehaviors,
  validateBehaviors,
  getBehaviorDescription,
  getBehaviorsByCategory,
  suggestBehaviors,
  // Hierarchy
  getRelationshipType,
  canHaveMultipleParents,
  isStandaloneType,
  getCollectionManifests,
  getNestedCollections,
  collectionContainsManifest,
  addManifestToCollection,
  removeManifestFromCollection,
  getManifestCanvases,
  manifestContainsCanvas,
  addCanvasToManifest,
  removeCanvasFromManifest,
  reorderManifestCanvases,
  findAllOfTypeSimple,
  buildReferenceMap,
  getReferencingCollections,
  createRange,
  createNestedRange,
  addRangeToManifest,
  getManifestRanges,
  flattenRangeCanvasIds,
  countResourcesByType,
  getTreeDepth,
  // Traversal
  getChildren,
  traverse,
  safeTraverse,
  findNodeById,
  findAllOfType,
  findParent,
  getPathToNode,
  getAllCanvases,
  getAllManifests,
  getAllCollections,
  getAllLeafNodes,
  buildTreeIndex,
  getTreeDepthStats,
  findDuplicateIds,
  hasDuplicateIds,
  flattenTree,
  // Validation
  generateResourceId,
  validateResourceId,
  isValidIIIFType,
  validateResourceBase,
  // Image API
  FORMAT_MIME_TYPES,
  MIME_TO_FORMAT,
  COMPLIANCE_LEVELS,
  FEATURE_DESCRIPTIONS,
  IMAGE_API_CONTEXT,
  IMAGE_API_PROTOCOL,
  VALIDATION_PATTERNS,
  validateRegion,
  validateSize,
  validateRotation,
  validateQuality,
  validateFormat,
  formatRegion,
  formatSize,
  formatRotation,
  buildImageUri,
  buildInfoUri,
  calculateTileRequest,
  calculateTileCount,
  buildTileUri,
  generateInfoJson,
  generateStandardSizes,
  generateStandardTiles,
  getImageMimeType,
  getFormatFromMime,
  calculateResultingSize,
  encodeIdentifier,
  decodeIdentifier,
  createImageServiceReference,
  isImageService3,
  // Metadata
  generateThumbnailMetadata,
  getStackedThumbnails,
  generateSummary,
  enrichIIIFMetadata,
  enrichTreeMetadata,
  batchEnrichMetadata,
  // Image Resolver
  resolveImageSource,
  resolveThumbUrl,
  resolvePreviewUrl,
  resolveHierarchicalThumbs,
  resolveHierarchicalThumb,
  hasDeepZoomCapability,
  getImageServiceInfo,
  resolveLeafCanvases,
  isCanvasImage,
  isCanvasVisual,
  getCanvasMimeType,
} from './organisms';

// UI Domain
export {
  TERMINOLOGY_MAP,
  getTerm,
  getTerms,
  getResourceTypeLabel,
  getTermDescription,
  formatCountWithTerm,
  getAllTerms,
  hasTerm,
} from './organisms';

export type {
  // IIIF Types
  LanguageMap,
  MetadataEntry,
  Agent,
  Reference,
  ExternalResource,
  ContentResource,
  IIIFResourceType,
  ViewingDirection,
  TimeMode,
  IIIFBehavior,
  IIIFMotivation,
  // Behaviors
  DisjointSet,
  InheritanceRule,
  BehaviorDescription,
  BehaviorCategory,
  BehaviorValidationResult,
  // Hierarchy
  IIIFRelationshipType,
  // Traversal
  TraversalOptions,
  TraversalContext,
  TraversalResult,
  TreeIndex,
  TreeStats,
  DuplicateIdResult,
  // Validation
  IdValidationResult,
  // Image API
  ImageApiProfile,
  ImageQuality,
  ImageFormat,
  ImageApiFeature,
  ComplianceLevel,
  RegionParams,
  SizeParams,
  RotationParams,
  ImageRequestParams,
  SizeInfo,
  TileInfo,
  ImageServiceInfo,
  TileRequest,
  ImageApiValidationResult,
  // Metadata
  ThumbnailSpec,
  EnrichmentResult,
  // Image Resolver
  IIIFCanvasLike,
  IIIFItemLike,
  ImageSourceResult,
  ResolveImageOptions,
  // UI
  AbstractionLevel,
  TerminologyKey,
} from './organisms';

// ============================================================================
// Backwards Compatibility Aliases
// ============================================================================

// ValidationResult - use explicitly named versions
export type {
  InputValidationResult as ValidationResult,
} from './atoms';

// Note: findAllOfType is already exported from organisms above
// Note: CONTENT_RESOURCE_LIST is already exported from organisms above
// Note: generateValidUri, normalizeUri, removeTrailingSlash, getUriLastSegment 
//       are already exported from atoms above
