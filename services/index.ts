/**
 * Services Index
 *
 * Central export point for all services.
 * Services are organized into logical groups for easier discovery:
 *
 * - State: vault, actions, contentState
 * - Builders: iiifBuilder, specBridge, autoStructure
 * - IO: csvImporter, exportService, archivalPackageService
 * - Search: searchService, contentSearchService
 * - Validation: validator, fileIntegrity, viewerCompatibility
 * - Persistence: storage, activityStream, provenanceService
 * - Media: avService
 * - Auth: authService
 */

// ============================================================================
// Logging
// ============================================================================
export { logger, appLog, vaultLog, storageLog, networkLog, uiLog, workerLog } from './logger';
export type { LogLevel, LogGroup, LogEntry } from './logger';

// ============================================================================
// State Management
// ============================================================================
export { actions } from './actions';
export type { Action, ActionResult } from './actions';

export { contentStateService } from './contentState';
export type { ViewportState, SpecificResource, ContentStateTarget } from './contentState';

// Vault - Normalized state management for IIIF resources
export {
  Vault,
  getVault,
  resetVault,
  normalize,
  denormalize,
  createEmptyState,
  getEntity,
  getEntityType,
  getParentId,
  getChildIds,
  getEntitiesByType,
  getAncestors,
  getDescendants,
  updateEntity,
  addEntity,
  removeEntity,
  moveEntity,
  reorderChildren,
  // Collection membership (IIIF 3.0 non-hierarchical model)
  getCollectionsContaining,
  getCollectionMembers,
  isOrphanManifest,
  getOrphanManifests,
  addToCollection,
  removeFromCollection,
  // Phase 2: Trash/Restore System functions
  moveEntityToTrash,
  restoreEntityFromTrash,
  emptyTrash
} from './vault';
export type { NormalizedState, EntityType, VaultSnapshot, TrashedEntity } from './vault';

// ============================================================================
// Builders & Transformers
// ============================================================================
export { buildTree, ingestTree } from './iiifBuilder';

export { specBridge } from './specBridge';

export { autoStructureService } from './autoStructure';

// Ingest Analyzer - Two-pass folder analysis
export {
  analyzeForIngest,
  overrideNodeType,
  applyAnalysisToTree,
  getProposedManifests,
  getProposedCollections
} from './ingestAnalyzer';
export type {
  ProposedIIIFType,
  DetectionReason,
  IngestPreviewNode,
  FolderStats,
  IngestAnalysisResult,
  IngestConfig
} from './ingestAnalyzer';

// ============================================================================
// Import/Export
// ============================================================================
export { exportService } from './exportService';
export type { ExportOptions } from './exportService';

export { csvImporter } from './csvImporter';

export { archivalPackageService } from './archivalPackageService';

export { staticSiteExporter } from './staticSiteExporter';

// ============================================================================
// Search
// ============================================================================
export { searchService } from './searchService';
export type { SearchResult, AutocompleteResult } from './searchService';

export { contentSearchService } from './contentSearchService';

// ============================================================================
// Validation & Quality
// ============================================================================
export { validator, getValidationForField } from './validator';
export type { ValidationIssue, IssueCategory, FieldValidation } from './validator';

export { healIssue, healAllIssues, applyHealToTree, getFixDescription } from './validationHealer';
export type { HealResult } from './validationHealer';

export { fileIntegrity } from './fileIntegrity';
export type { IntegrityCheckResult } from './fileIntegrity';

export { viewerCompatibility } from './viewerCompatibility';
export type { CompatibilityReport, CompatibilityIssue } from './viewerCompatibility';

// ============================================================================
// Persistence & Storage
// ============================================================================
export { storage } from './storage';
export type { StorageWarning, TileManifest, TileStorage } from './storage';

export { activityStream } from './activityStream';
export type { Activity } from './activityStream';

export { provenanceService } from './provenanceService';
export type { ProvenanceEntry, ProvenanceAgent, ProvenanceAction } from './provenanceService';

// ============================================================================
// Media Processing
// ============================================================================
export { avService } from './avService';
export type { AVCanvas, PlaceholderCanvas, AccompanyingCanvas, TimeMode, TimeModeConfig, AVState, SyncPoint } from './avService';

// ============================================================================
// Image Pipeline
// ============================================================================
export {
  calculateTilePyramid,
  calculateMaxLevel,
  shouldGenerateTiles,
  getTileUrl,
  calculateTileRegion,
  calculateTileSize,
  getTileDimensions,
  estimatePyramidStorage,
  formatBytes,
  generateInfoJson,
} from './imagePipeline/tileCalculator';
export type {
  TilePyramidConfig,
  TilePyramidLevel,
  TilePyramidResult,
  TilePyramidDescriptor,
} from './imagePipeline/tileCalculator';

export { CanvasTilePipeline, createCanvasTilePipeline } from './imagePipeline/canvasPipeline';
export type {
  TileGenerationProgress,
  CanvasTilePipelineOptions,
  TilePyramidGenerationResult,
} from './imagePipeline/canvasPipeline';

// ============================================================================
// Tile Worker & Pyramid Generation
// ============================================================================
export {
  TileWorker,
  TileWorkerPool,
  getTileWorker,
  resetTileWorker,
  getTileWorkerPool,
  generateDerivativeAsync,
  generateTilePyramidAsync,
  cancelTilePyramidGeneration,
  hasTilePyramid,
  // Phase 1 Memory Leak Fix: Worker blob URL cleanup
  cleanupWorkerBlobUrl,
} from './tileWorker';
export type {
  GeneratePyramidMessage,
  PyramidProgressMessage,
  PyramidCompleteMessage,
  PyramidErrorMessage,
  PyramidWorkerMessage,
  TileWorkerRequest,
  TileWorkerProgress,
  TileWorkerResult,
  TileWorkerError,
  TileWorkerMessage,
} from './tileWorker';

// ============================================================================
// Authentication
// ============================================================================
export { authService } from './authService';
export type { AuthService, AuthState, TokenResponse, TokenError } from './authService';

// ============================================================================
// Remote Loading
// ============================================================================
export { fetchRemoteManifest, fetchRemoteResource, requiresAuth } from './remoteLoader';
export type { RemoteResource, FetchResult, AuthRequiredResult, ExtendedFetchResult, FetchOptions } from './remoteLoader';

// ============================================================================
// Virtual Manifest Factory
// ============================================================================
export { virtualManifestFactory } from './virtualManifestFactory';

// ============================================================================
// Staging / Ingest Workbench
// ============================================================================
export {
  buildSourceManifests,
  createInitialArchiveLayout,
  createCollection,
  addManifestsToCollection,
  removeManifestsFromCollection,
  updateCanvasOrder,
  renameCollection,
  deleteCollection,
  moveCollection,
  getAllCollections,
  findManifest,
  getTotalFileCount,
  getManifestStats
} from './stagingService';

export {
  exportMetadataTemplate,
  previewMetadataTemplate,
  getVocabularyOptions,
  downloadMetadataTemplate
} from './metadataTemplateService';
export type { VocabularyOption, MetadataTemplateOptions, MetadataTemplateExport } from './metadataTemplateService';

// ============================================================================
// P2P Synchronization (CRDT)
// ============================================================================
export { VaultCrdtAdapter, createCrdtAdapter } from './sync/crdtAdapter';
export type {
  CrdtAdapterOptions,
  PresenceInfo,
  NormalizedEntity
} from './sync/crdtAdapter';

export { SyncProvider, createSyncProvider } from './sync/syncProvider';
export type { SyncProviderOptions } from './sync/syncProvider';

export type { SyncStatus, SyncState } from './sync/types';

// ============================================================================
// Phase 1: Memory Leak Fixes - File Lifecycle Management
// ============================================================================
export {
  FileLifecycleManager,
  getFileLifecycleManager,
  resetFileLifecycleManager,
  configureFileLifecycleManager,
  extractFileRefIds,
  syncWithVaultState,
  cleanupFileRef,
} from './fileLifecycle';
export type { FileLifecycleStats } from './fileLifecycle';

// ============================================================================
// Phase 1: Memory Leak Fixes - Image Source Resolver
// ============================================================================
export {
  resolveImageSource,
  resolveBodySource,
  buildIIIFImageUrl,
  cleanupImageSource,
  createSourceCleanup,
  getPaintingBody,
  getImageService,
  getThumbnailUrl,
  isSourceCleaned,
} from './imageSourceResolver';
export type {
  ImageSourceType,
  ResolvedImageSource,
  ImageSourceResolverOptions,
} from './imageSourceResolver';

// ============================================================================
// Phase 2: Trash/Restore System (P0 - Data Safety)
// ============================================================================
export {
  trashService,
  moveToTrash,
  restoreFromTrash,
  emptyTrashService,
  getTrashStats,
  isTrashed,
} from './trashService';
export type {
  TrashOptions,
  RestoreOptions,
  TrashStats,
  TrashOperationResult,
  BatchTrashResult,
  TrashConfig,
} from './trashService';

// ============================================================================
// Phase 4: Worker Migration (P1 - Performance)
// ============================================================================
export {
  IngestWorkerPool,
  getIngestWorkerPool,
  resetIngestWorkerPool,
  ingestFilesWithWorkers,
  ingestTreeWithWorkers,
  cancelIngestOperation,
  getIngestPoolStats,
} from './ingestWorkerPool';
export type {
  PoolStats,
} from './ingestWorkerPool';
