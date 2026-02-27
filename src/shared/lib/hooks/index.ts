/**
 * Shared Hooks/Lib — Barrel export
 *
 * Pure computation functions and reactive classes.
 */

// Category 1: Pure Computation
export {
  getTerm, getTerms, getResourceTypeLabel, getTermDescription,
  formatCount, TERMINOLOGY_MAP, type TerminologyKey,
} from './terminology';
export { getAuthStatus, setAuthService, type AuthStatusResult } from './authStatus';
export {
  updateMetadataField, addMetadataField, removeMetadataField,
  getAvailableProperties, getAllowedProperties,
} from './metadataEditor';
export { detectConflicts, detectDuplicatesInBatch, type ConflictInfo } from './conflictDetection';
export {
  createDebouncedCallback, DebouncedValue,
  type DebouncedFn,
} from './debouncedCallback';
export {
  getAllCanvases, getAllItems, getChildItems, getAncestors,
} from './iiifTraversal';
export {
  calculateGridVirtualization,
  type GridVirtualizationConfig,
  type VirtualizationResult,
} from './gridVirtualization';

// Category 2: State Containers (classes)
export {
  LayerHistoryStore,
  type PlacedResource,
  type LayerState,
} from './layerHistory.svelte';
export {
  IngestProgressStore,
  type IngestOperation,
  type AggregateProgress,
  type OperationStatus,
  type LogEntry,
} from './ingestProgress.svelte';
export {
  StagingStateStore,
  type ArchiveNode,
  type ArchiveLayout,
} from './stagingState.svelte';

// Category 5: Persistent State (singletons)
export {
  CommandHistoryStore,
  commandHistory,
  type CommandHistoryEntry,
} from './commandHistory.svelte';
