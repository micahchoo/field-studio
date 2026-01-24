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
// State Management
// ============================================================================
export { actions } from './actions';
export type { Action, ActionResult } from './actions';

export { contentStateService } from './contentState';
export type { ViewportState, SpecificResource, ContentStateTarget } from './contentState';

// ============================================================================
// Builders & Transformers
// ============================================================================
export { buildTree, ingestTree } from './iiifBuilder';

export { specBridge } from './specBridge';

export { autoStructureService } from './autoStructure';

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
export { validator } from './validator';
export type { ValidationIssue } from './validator';

export { fileIntegrity } from './fileIntegrity';
export type { IntegrityCheckResult } from './fileIntegrity';

export { viewerCompatibility } from './viewerCompatibility';
export type { CompatibilityReport, CompatibilityIssue } from './viewerCompatibility';

// ============================================================================
// Persistence & Storage
// ============================================================================
export { storage } from './storage';
export type { StorageWarning } from './storage';

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
