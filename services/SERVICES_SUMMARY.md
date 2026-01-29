# Field Studio Services - Summary

This document provides a summary of all service files in the `/services/` directory.

## Core Services

### activityStream.ts
**Purpose:** Implements IIIF Change Discovery API 1.0 for tracking create/update/delete events on IIIF resources using Activity Streams 2.0 format.

**Key Exports:**
- `activityStream` - Singleton service instance
- `Activity` - Activity stream event type
- `ActivityType` - Union type: 'Create' | 'Update' | 'Delete' | 'Move' | 'Add' | 'Remove'
- `ActivityObject`, `ActivityActor`, `OrderedCollection`, `OrderedCollectionPage` - AS2.0 types
- `MAX_ACTIVITY_ENTRIES` - Rotation threshold constant (10,000)
- Methods: `recordCreate()`, `recordUpdate()`, `recordDelete()`, `recordMove()`, `recordAdd()`, `recordRemove()`, `exportAsChangeDiscovery()`, `importActivities()`

### archivalPackageService.ts
**Purpose:** Implements digital preservation export formats (OCFL and BagIt) for long-term archival.

**Key Exports:**
- `archivalPackageService` - Singleton service instance
- `OCFLObject`, `OCFLInventory`, `OCFLVersion`, `OCFLFile` - OCFL types
- `BagItBag`, `BagItFile`, `BagItManifest` - BagIt types
- `ArchivalPackageOptions`, `ArchivalPackageResult` - Configuration and result types
- Methods: `exportOCFL()`, `exportBagIt()`, `validateBagIt()`, `downloadAsZip()`

### authService.ts
**Purpose:** Implements IIIF Authorization Flow API 2.0 with "Probe-First" authentication pattern.

**Key Exports:**
- `authService` - Singleton service instance
- `AuthService`, `AuthServiceType`, `AuthProfile` - Auth service types
- `ProbeResponse`, `TokenResponse`, `TokenError` - API response types
- `AuthState` - Authentication state tracking
- Methods: `probe()`, `openLoginWindow()`, `requestToken()`, `authenticateResource()`, `extractAuthServices()`

### autoStructure.ts
**Purpose:** Automatically groups canvases into Ranges based on filename numeric patterns.

**Key Exports:**
- `autoStructureService` - Service object with `generateRangesFromPatterns()` method
- Automatically detects sequence breaks and creates section ranges

### avService.ts
**Purpose:** Advanced Audio/Video support for IIIF Presentation API 3.0 features.

**Key Exports:**
- `avService` - Singleton service instance
- `AVCanvas`, `PlaceholderCanvas`, `AccompanyingCanvas` - AV-specific canvas types
- `TimeMode`, `TimeModeConfig`, `AVState` - Time-based media types
- `SyncPoint` - Synchronization point for transcripts
- Methods: `createPlaceholderCanvas()`, `createAccompanyingCanvas()`, `parseVTTToAnnotations()`, `generateThumbnailAtTime()`, `applyTimeMode()`

### contentSearchService.ts
**Purpose:** IIIF Content Search API 2.0 implementation for searching within manifests (OCR, transcriptions).

**Key Exports:**
- `contentSearchService` - Singleton service instance
- `SearchService`, `SearchResponse`, `SearchAnnotation`, `SearchResult` - Search types
- `TextQuoteSelector`, `FragmentSelector` - Selector types
- `AutocompleteResponse`, `AutocompleteTerm` - Autocomplete types
- Methods: `search()`, `autocomplete()`, `parseResults()`, `resultsToOverlayAnnotations()`, `createLocalSearchService()`

### contentState.ts
**Purpose:** IIIF Content State API 1.0 implementation for sharing exact views via URLs.

**Key Exports:**
- `contentStateService` - Service object with static methods
- `ContentState`, `ViewportState` - Core state types
- `SpecificResource`, `Selector`, `PointSelector`, `FragmentSelector`, `ImageApiSelector` - Selector types
- Methods: `encode()`, `decode()`, `createContentState()`, `parseContentState()`, `generateLink()`, `updateUrl()`, `copyLink()`, `generateEmbedCode()`

### fieldRegistry.ts
**Purpose:** Unified field configuration - single source of truth for all field definitions in Field Studio.

**Key Exports:**
- `fieldRegistry` - Singleton service instance
- `FIELD_REGISTRY` - Complete field definition array
- `FieldDefinition`, `FieldCategory` - Field metadata types
- `SearchIndexConfig`, `ExportFieldConfig` - Configuration types
- `DEFAULT_SEARCH_FIELDS`, `DEFAULT_SEARCH_CONFIG`, `DEFAULT_EXPORT_CONFIG` - Default configurations
- Methods: `getField()`, `getVisibleFields()`, `getIndexableFields()`, `getExportableFields()`, `buildSearchConfig()`, `normalizeForSearch()`, `generatePid()`

### fileIntegrity.ts
**Purpose:** Content-addressable storage with SHA-256 hashing (Tropy pattern) for file integrity and deduplication.

**Key Exports:**
- `fileIntegrity` - Singleton service instance
- `FileFingerprint`, `HashLookupResult`, `IntegrityCheckResult` - Core types
- `calculateHash()`, `calculateHashWithProgress()` - Hashing functions
- Methods: `registerFile()`, `verifyFile()`, `checkDuplicate()`, `getFingerprint()`, `getStats()`, `export()`

### guidanceService.ts
**Purpose:** Tracks which help tips, tooltips, and hints the user has seen for contextual help.

**Key Exports:**
- `guidance` - Singleton service instance
- `GuidanceTopic` - Topic type union including intro, concept, feature, validation topics
- Methods: `hasSeen()`, `markSeen()`, `reset()`, `resetTooltips()`, `hasCompletedSetup()`, `completeSetup()`

### imageSourceResolver.ts
**Purpose:** Unified strategy for resolving image URLs across all viewer components with fallback chain.

**Key Exports:**
- `resolveImageSource()` - Main resolver function
- `resolveBodySource()` - Resolve from annotation body
- `buildIIIFImageUrl()` - Build IIIF Image API URLs
- `cleanupImageSource()`, `createSourceCleanup()` - Cleanup utilities
- `ImageSourceType` - Union type: 'blob' | 'iiif-level2' | 'iiif-level1' | 'iiif-level0' | 'static' | 'thumbnail' | 'placeholder'
- `ResolvedImageSource`, `ImageSourceResolverOptions` - Configuration types
- `getPaintingBody()`, `getImageService()`, `getThumbnailUrl()` - Helper functions

### ingestAnalyzer.ts
**Purpose:** Two-pass folder analysis for IIIF conversion - scans folders and proposes IIIF structure.

**Key Exports:**
- `analyzeForIngest()` - Main analysis function
- `overrideNodeType()` - User override function
- `applyAnalysisToTree()`, `getProposedManifests()`, `getProposedCollections()` - Helper functions
- `ProposedIIIFType` - Union type: 'Collection' | 'Manifest' | 'Excluded'
- `IngestPreviewNode`, `FolderStats`, `IngestAnalysisResult`, `IngestConfig` - Analysis types
- `DetectionReason` - Detection reasoning type

### ingestState.ts
**Purpose:** Checkpoint system for resumable imports with persistence for long-running operations.

**Key Exports:**
- `createCheckpoint()`, `saveCheckpoint()`, `loadCheckpoint()` - Checkpoint CRUD
- `listCheckpoints()`, `listCheckpointsForSource()`, `getActiveCheckpoint()` - Listing functions
- `resumeFromCheckpoint()`, `deleteCheckpoint()`, `clearAllCheckpoints()` - Management functions
- `markFileProcessed()`, `updateCheckpointProgress()`, `completeCheckpoint()`, `failCheckpoint()` - Progress functions
- `calculateFileHash()`, `formatCheckpointAge()`, `getCheckpointStatusText()`, `getCheckpointStatusColor()` - Utilities
- `IngestCheckpoint`, `CheckpointFile`, `CreateCheckpointOptions` - Core types

### logger.ts
**Purpose:** Centralized logging service with configurable levels, groups, and buffering.

**Key Exports:**
- `logger` - Singleton service instance
- `appLog`, `vaultLog`, `storageLog`, `networkLog`, `uiLog`, `workerLog` - Scoped loggers
- `LogLevel`, `LogGroup`, `LogEntry` - Core types
- `LoggerConfig` - Configuration type
- Class `LoggerService` with methods: `debug()`, `info()`, `warn()`, `error()`, `configure()`, `subscribe()`, `getRecentLogs()`
- Class `ScopedLogger` for group-specific logging

### metadataHarvester.ts
**Purpose:** Extracts EXIF metadata from image files for automatic metadata population.

**Key Exports:**
- `extractMetadata()` - Main extraction function
- Extracts: Date Created, Camera Info (Make/Model), GPS Location, Technical Details (Exposure, Aperture, ISO)

### metadataTemplateService.ts
**Purpose:** Generates CSV metadata templates for batch metadata editing.

**Key Exports:**
- `exportMetadataTemplate()` - Main export function
- `previewMetadataTemplate()` - Preview function
- `downloadMetadataTemplate()` - Download helper
- `getVocabularyOptions()` - Get available vocabularies
- `VocabularyOption` - Union type: 'iiif' | 'dublin-core' | 'both'
- `MetadataTemplateOptions`, `MetadataTemplateExport` - Configuration types

### navPlaceService.ts
**Purpose:** Implements IIIF navPlace extension for geospatial metadata and Leaflet integration.

**Key Exports:**
- `navPlaceService` - Singleton service instance
- `NavPlace`, `GeoFeature`, `GeoGeometry` - GeoJSON/IIIF types
- `PointGeometry`, `LineStringGeometry`, `PolygonGeometry`, etc. - Geometry types
- `LatLng`, `LatLngBounds`, `GeocodedLocation` - Location types
- Methods: `createNavPlace()`, `createFeatureCollection()`, `createPointFeature()`, `toGeoJSON()`, `fromGeoJSON()`, `geocode()`, `reverseGeocode()`, `calculateDistance()`

### provenanceService.ts
**Purpose:** Tracks chain of custody and modification history for all resources with PREMIS export.

**Key Exports:**
- `provenanceService` - Singleton service instance
- `useProvenance()` - React hook for accessing provenance
- `ProvenanceAction`, `ProvenanceAgent`, `PropertyChange`, `IngestSource` - Core types
- `ProvenanceEntry`, `ResourceProvenance` - Entry types
- Methods: `recordCreate()`, `recordIngest()`, `recordUpdate()`, `recordBatchUpdate()`, `recordExport()`, `getProvenance()`, `getHistory()`, `exportPREMIS()`, `exportMultiplePREMIS()`, `exportAllJSON()`

### remoteLoader.ts
**Purpose:** Fetches remote IIIF resources with auth handling, CORS fallback, and virtual manifest creation.

**Key Exports:**
- `fetchRemoteManifest()` - Simple fetch function
- `fetchRemoteResource()` - Extended fetch with metadata
- `requiresAuth()` - Type guard for auth-required results
- `RemoteResource`, `FetchResult`, `AuthRequiredResult`, `ExtendedFetchResult`, `FetchOptions` - Core types

### selectors.ts
**Purpose:** IIIF Selector abstraction for parsing/serializing URI fragments and selector objects.

**Key Exports:**
- `parseTarget()`, `parseFragment()`, `parseXYWH()`, `parseT()`, `parseNPT()`, `parseSelector()` - Parsing functions
- `serializeXYWH()`, `serializeT()`, `serializeSelector()`, `serializeTarget()` - Serialization functions
- `toIIIFSelector()`, `createSpecificResource()` - IIIF conversion functions
- `hasSpatialSelector()`, `hasTemporalSelector()`, `getSourceId()`, `getSpatialRegion()`, `getTemporalRegion()` - Query functions
- `updateSpatialRegion()`, `updateTemporalRegion()`, `createSpatialTarget()`, `createTemporalTarget()` - Update functions
- `formatTime()`, `isPointInRegion()`, `isTimeInRegion()` - Utilities
- `SpatialRegion`, `TemporalRegion`, `PointRegion`, `ParsedSelector`, `SelectorTarget` - Core types

### specBridge.ts
**Purpose:** IIIF Spec Bridge for V2 to V3 conversion with automatic upgrade.

**Key Exports:**
- `specBridge` - Service object with methods
- `detectVersion()`, `needsUpgrade()`, `upgradeToV3()` - Version detection and upgrade
- `importManifest()`, `getVersionInfo()` - Import functions
- `IIIFVersion` - Union type: '2.0' | '2.1' | '3.0' | 'unknown'

### stagingService.ts
**Purpose:** Manages archive layout and manifest organization during staging/ingest.

**Key Exports:**
- `buildSourceManifests()` - Build manifests from file array
- `createInitialArchiveLayout()` - Create initial layout
- `createCollection()`, `addManifestsToCollection()`, `removeManifestsFromCollection()` - Collection management
- `updateCanvasOrder()` - Reorder canvases
- `renameCollection()`, `deleteCollection()`, `moveCollection()` - Collection operations
- `getAllCollections()`, `findManifest()`, `getTotalFileCount()`, `getManifestStats()` - Query functions

### staticSiteExporter.ts
**Purpose:** Wax-compatible static exhibition generator for deployment to GitHub Pages, S3, Netlify.

**Key Exports:**
- `staticSiteExporter` - Singleton service instance
- `StaticSiteConfig`, `StaticSiteExportResult`, `StaticFile` - Core types
- Class `StaticSiteExporter` with method `exportSite()`

### tileWorker.ts
**Purpose:** Web Worker for background tile and derivative generation with backpressure management.

**Key Exports:**
- `TileWorker` - Main worker class for pyramid generation
- `TileWorkerPool` - Worker pool for derivative generation (legacy)
- `getTileWorker()`, `resetTileWorker()` - Singleton accessors
- `getTileWorkerPool()` - Pool singleton accessor
- `generateDerivativeAsync()` - Convenience function for single derivatives
- `generateTilePyramidAsync()` - Convenience function for pyramid generation
- `cancelTilePyramidGeneration()` - Cancel ongoing generation
- Message types: `TileWorkerRequest`, `TileWorkerProgress`, `TileWorkerResult`, `TileWorkerError`
- Pyramid message types: `GeneratePyramidMessage`, `PyramidProgressMessage`, `PyramidCompleteMessage`, `PyramidErrorMessage`

### viewerCompatibility.ts
**Purpose:** Validates IIIF exports against known viewer requirements (Mirador, Universal Viewer, Annona, Clover).

**Key Exports:**
- `viewerCompatibility` - Singleton service instance
- `checkCompatibility()`, `checkForViewer()`, `getViewerRecommendations()` - Check functions
- `generateTestManifest()`, `formatReportMarkdown()` - Testing utilities
- `ViewerName` - Union type: 'mirador' | 'universalviewer' | 'annona' | 'clover'
- `CompatibilityIssue`, `CompatibilityReport`, `ViewerRequirement` - Report types

### virtualManifestFactory.ts
**Purpose:** Creates IIIF Manifests from raw media resources (images, audio, video, PDFs).

**Key Exports:**
- `virtualManifestFactory` - Singleton service instance
- `MediaInfo`, `VirtualManifestOptions` - Core types
- Methods: `isMediaUrl()`, `isImageUrl()`, `isAudioUrl()`, `isVideoUrl()`, `probeMedia()`, `createManifest()`, `createManifestFromMultiple()`, `createManifestFromFile()`

## Sync Services (sync/)

### sync/types.ts
**Purpose:** Type definitions for P2P collaboration and synchronization.

**Key Exports:**
- `SyncStatus` - Union type: 'disconnected' | 'connecting' | 'connected' | 'error'
- `SyncState` - State interface with status, peerCount, roomId, error, lastSyncedAt

### sync/crdtAdapter.ts
**Purpose:** Bridges vault state with Yjs CRDT documents for P2P collaboration.

**Key Exports:**
- `VaultCrdtAdapter` - Main adapter class
- `createCrdtAdapter()` - Factory function
- `CrdtAdapterOptions`, `PresenceInfo`, `NormalizedEntity` - Core types
- Methods: `initialize()`, `connect()`, `disconnect()`, `applyLocalChange()`, `onRemoteChange()`, `updatePresence()`, `onPresenceChange()`

### sync/syncProvider.ts
**Purpose:** Integrates CRDT adapter with vault state management for bidirectional sync.

**Key Exports:**
- `SyncProvider` - Main provider class
- `createSyncProvider()` - Factory function
- `SyncProviderOptions` - Configuration type
- Methods: `connect()`, `disconnect()`, `getState()`, `isConnected()`, `getPeers()`, `updatePresence()`

## Image Pipeline (imagePipeline/)

### imagePipeline/canvasPipeline.ts
**Purpose:** Pipeline for generating IIIF tile pyramids using Canvas API.

**Key Exports:**
- `CanvasTilePipeline` - Main pipeline class
- `createCanvasTilePipeline()` - Factory function
- `TileGenerationProgress`, `CanvasTilePipelineOptions`, `TilePyramidGenerationResult` - Core types
- Methods: `generateTilePyramid()`, `shouldSkipGeneration()`

### imagePipeline/tileCalculator.ts
**Purpose:** Utility for calculating IIIF Image API 3.0 compliant tile pyramid configurations.

**Key Exports:**
- `calculateTilePyramid()` - Main calculation function
- `calculateMaxLevel()`, `shouldGenerateTiles()` - Helper functions
- `getTileUrl()`, `calculateTileRegion()`, `calculateTileSize()`, `getTileDimensions()` - Tile utilities
- `estimatePyramidStorage()`, `formatBytes()` - Storage utilities
- `generateInfoJson()` - IIIF info.json generation
- `TilePyramidConfig`, `TilePyramidLevel`, `TilePyramidDescriptor`, `TilePyramidResult` - Core types

## Summary Statistics

Total Services: 32 files
- Core Services: 29 files
- Sync Services: 3 files (in sync/ subdirectory)
- Image Pipeline: 2 files (in imagePipeline/ subdirectory)

All services follow the singleton pattern where appropriate and export TypeScript interfaces for type safety.
