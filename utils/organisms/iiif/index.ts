/**
 * IIIF Organisms - IIIF-specific domain logic
 */

// Types
export type {
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
} from './types';

export {
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
  isValidHttpUri,
  hasFragmentIdentifier,
  isValidId,
  isKnownRightsUri,
  isValidRightsUri,
} from './types';

// Schema
export type { ValidationRequirement } from './schema';
export {
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
} from './schema';

// Behaviors
export type {
  DisjointSet,
  InheritanceRule,
  BehaviorDescription,
  BehaviorCategory,
  BehaviorValidationResult,
} from './behaviors';
export {
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
} from './behaviors';

// Hierarchy
export type { IIIFRelationshipType } from './hierarchy';
export {
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
  findNodeById,
  getPathToNode,
  findCollectionsContaining,
  findCanvasParent,
  isValidChildType,
  getValidChildTypes,
} from './hierarchy';

// Traversal
export type {
  TraversalOptions,
  TraversalContext,
  TraversalResult,
  TreeIndex,
  TreeStats,
  DuplicateIdResult,
} from './traversal';
export {
  getChildren,
  traverse,
  safeTraverse,
  findAllOfType,
  findParent,
  getAllCanvases,
  getAllManifests,
  getAllCollections,
  getAllLeafNodes,
  buildTreeIndex,
  getTreeDepthStats,
  flattenTree,
} from './traversal';

// Validation
export type { IdValidationResult, DuplicateIdResult as DuplicateResult } from './validation';
export {
  generateResourceId,
  generateValidUri,
  normalizeUri,
  removeTrailingSlash,
  getUriLastSegment,
  findDuplicateIds,
  hasDuplicateIds,
  validateResourceId,
  isValidIIIFType,
  validateResourceBase,
} from './validation';

// Image API Constants
export type {
  ImageApiProfile,
  ImageQuality,
  ImageFormat,
  ImageApiFeature,
  ComplianceLevel,
} from './image-api-constants';
export {
  FORMAT_MIME_TYPES,
  MIME_TO_FORMAT,
  COMPLIANCE_LEVELS,
  FEATURE_DESCRIPTIONS,
  IMAGE_API_CONTEXT,
  IMAGE_API_PROTOCOL,
  VALIDATION_PATTERNS,
} from './image-api-constants';

// Image API
export type {
  RegionParams,
  SizeParams,
  RotationParams,
  ImageRequestParams,
  SizeInfo,
  TileInfo,
  ImageServiceInfo,
  TileRequest,
  ImageApiValidationResult,
} from './image-api';
export {
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
} from './image-api';

// Metadata
export type { ThumbnailSpec, EnrichmentResult } from './metadata';
export {
  generateThumbnailMetadata,
  getStackedThumbnails,
  generateSummary,
  enrichIIIFMetadata,
  enrichTreeMetadata,
  batchEnrichMetadata,
} from './metadata';

// Image Resolver
export type {
  IIIFCanvasLike,
  IIIFItemLike,
  ImageSourceResult,
  ResolveImageOptions,
} from './image-resolver';
export {
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
} from './image-resolver';
