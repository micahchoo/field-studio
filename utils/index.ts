/**
 * Utilities Index
 *
 * Central export point for all utility functions.
 */

// ============================================================================
// Theme Utilities
// ============================================================================
export {
  createThemeClasses,
  getStatusColorForScore,
  getStatusColorForLevel,
} from './themeClasses';
export type { ThemeClasses } from './themeClasses';

// ============================================================================
// IIIF Hierarchy Utilities
// ============================================================================
export {
  // Relationship types
  getRelationshipType,
  canHaveMultipleParents,
  isStandaloneType,
  // Collection operations
  getCollectionManifests,
  getNestedCollections,
  collectionContainsManifest,
  addManifestToCollection,
  removeManifestFromCollection,
  // Manifest operations
  getManifestCanvases,
  manifestContainsCanvas,
  addCanvasToManifest,
  removeCanvasFromManifest,
  reorderManifestCanvases,
  // Tree traversal
  findAllOfType,
  findCollectionsContaining,
  findCanvasParent,
  findNodeById,
  getPathToNode,
  // Validation
  isValidChildType,
  getValidChildTypes,
  // Statistics
  countResourcesByType,
  getTreeDepth,
} from './iiifHierarchy';
export type { IIIFRelationshipType } from './iiifHierarchy';

// ============================================================================
// IIIF Schema Utilities (Property Requirements)
// ============================================================================
export {
  // Complete property matrix
  PROPERTY_MATRIX,
  ITEMS_CONTAINMENT,
  // Legacy schema (backwards compatibility)
  IIIF_SCHEMA,
  // Property validation
  getPropertyRequirement,
  isPropertyAllowed,
  getAllowedProperties,
  getRequiredProperties,
  getRecommendedProperties,
  // Behavior validation
  isBehaviorAllowed,
  getAllowedBehaviors,
  getNotAllowedBehaviors,
  // Viewing direction
  VIEWING_DIRECTIONS,
  DEFAULT_VIEWING_DIRECTION,
  isValidViewingDirection,
  canHaveViewingDirection,
  // Time mode
  TIME_MODES,
  DEFAULT_TIME_MODE,
  isValidTimeMode,
  // Items containment
  getValidItemTypes,
  isValidItemType,
  // Conditional requirements
  CONDITIONAL_REQUIREMENTS,
  checkConditionalRequirements,
  // Complete validation
  validateResource,
  validateResourceFull,
  // Templates
  getMinimumTemplate,
} from './iiifSchema';
export type {
  PropertyRequirement,
  ResourceSchema,
  IIIFResourceType,
  ContentResourceType,
  ViewingDirection,
  TimeMode,
  ConditionalRequirement,
  ValidationResult,
  MinimumResourceTemplate,
} from './iiifSchema';

// ============================================================================
// IIIF Behavior Utilities
// ============================================================================
export {
  // Validity matrix
  BEHAVIOR_VALIDITY_MATRIX,
  // Disjoint sets
  DISJOINT_SETS,
  // Inheritance rules
  INHERITANCE_RULES,
  // Behavior descriptions
  BEHAVIOR_DESCRIPTIONS,
  // Validation functions
  isBehaviorValidForType,
  getValidBehaviorsForType,
  findBehaviorConflicts,
  getDisjointSetForBehavior,
  getDefaultBehavior,
  // Inheritance
  doesInheritBehavior,
  getInheritedBehaviors,
  resolveEffectiveBehaviors,
  // Complete validation
  validateBehaviors,
  // Helpers
  getBehaviorDescription,
  getBehaviorsByCategory,
  suggestBehaviors,
} from './iiifBehaviors';
export type {
  IIIFBehavior,
  BehaviorCategory,
  DisjointSet,
  InheritanceRule,
  BehaviorDescription,
  BehaviorValidationResult,
  ContentCharacteristics,
} from './iiifBehaviors';

// ============================================================================
// IIIF Value Types and MIME Mapping
// ============================================================================
export {
  // Content resource types
  CONTENT_RESOURCE_TYPES,
  // MIME type mapping
  MIME_TYPE_MAP,
  getMimeType,
  getExtensionForMime,
  getContentTypeFromMime,
  getContentTypeFromFilename,
  isImageMime,
  isVideoMime,
  isAudioMime,
  isTimeBasedMime,
  isVisualMime,
  // LanguageMap validation
  isValidLanguageMap,
  createLanguageMap,
  getLanguageValue,
  // MetadataEntry validation
  isValidMetadataEntry,
  createMetadataEntry,
  // Agent validation
  isValidAgent,
  // Reference validation
  isValidReference,
  // ExternalResource validation
  isValidExternalResource,
  // ContentResource validation
  isValidContentResource,
  // URI validation
  isValidHttpUri,
  hasFragmentIdentifier,
  isValidId,
  // DateTime validation
  isValidNavDate,
  formatNavDate,
  // Rights validation
  isKnownRightsUri,
  isValidRightsUri,
  // Dimension validation
  isValidDimension,
  isValidDuration,
  // Service types
  LEGACY_SERVICE_TYPES,
  isKnownServiceType,
  // Motivation validation
  IIIF_MOTIVATIONS,
  isValidMotivation,
  isPaintingMotivation,
} from './iiifTypes';
export type {
  LanguageMap,
  MetadataEntry,
  Agent,
  Reference,
  ExternalResource,
  ContentResource,
  IIIFMotivation,
} from './iiifTypes';

// ============================================================================
// IIIF Image API 3.0 Utilities
// ============================================================================
export {
  // Constants
  IMAGE_API_CONTEXT,
  IMAGE_API_PROTOCOL,
  COMPLIANCE_LEVELS,
  FORMAT_MIME_TYPES,
  MIME_TO_FORMAT,
  FEATURE_DESCRIPTIONS,
  VALIDATION_PATTERNS,
  // Parameter validation
  validateRegion,
  validateSize,
  validateRotation,
  validateQuality,
  validateFormat,
  validateImageRequest,
  // URI building
  buildImageUri,
  buildInfoUri,
  formatRegion,
  formatSize,
  formatRotation,
  parseImageUri,
  // Info.json validation and generation
  validateInfoJson,
  generateInfoJson,
  generateStandardSizes,
  generateStandardTiles,
  // Tile calculation
  calculateTileRequest,
  calculateTileCount,
  buildTileUri,
  getAllTileUris,
  // Compliance checking
  checkComplianceLevel,
  getFeaturesForProfile,
  getFormatsForProfile,
  getQualitiesForProfile,
  // Service references
  createImageServiceReference,
  isImageService3,
  // Utility functions
  getImageMimeType,
  getFormatFromMime,
  calculateResultingSize,
  encodeIdentifier,
  decodeIdentifier,
} from './iiifImageApi';
export type {
  ImageApiProfile,
  ImageQuality,
  ImageFormat,
  RegionType,
  SizeType,
  RegionParams,
  SizeParams,
  RotationParams,
  ImageRequestParams,
  SizeInfo,
  TileInfo,
  ImageServiceInfo,
  ImageApiFeature,
  TileRequest,
  ImageApiValidationResult,
} from './iiifImageApi';
