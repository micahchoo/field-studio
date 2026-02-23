/**
 * Vault Module - Re-exports all vault functionality
 */

// ============================================================================
// Atoms (Types)
// ============================================================================
export type {
  EntityType,
  NormalizedState,
  TrashedEntity,
  VaultSnapshot,
  RemoveOptions,
  RestoreOptions,
  EmptyTrashResult
} from './types';

// ============================================================================
// Molecules (Utilities)
// ============================================================================
export {
  cloneAsRecord,
  deepCloneState,
  recordAs,
  hasType
} from './cloning';

export {
  extractExtensions,
  applyExtensions,
  extractExtensionsFromEntity,
  hasUnknownProperties
} from './extensions';

// ============================================================================
// Organisms (Core Functions)
// ============================================================================
export {
  normalize,
  createEmptyState,
  normalizeItem,
  normalizeAnnotationPage
} from './normalization';

export {
  denormalize,
  denormalizeItem,
  denormalizeCanvas,
  denormalizeAnnotationPage
} from './denormalization';

export {
  getEntity,
  getEntityType,
  getParentId,
  getChildIds,
  getEntitiesByType,
  getAncestors,
  getDescendants,
  hasEntity,
  getRootId,
  getAllEntityIds,
  getEntityCount,
  getTotalEntityCount
} from './queries';

export {
  getCollectionsContaining,
  getCollectionMembers,
  isOrphanManifest,
  getOrphanManifests,
  addToCollection,
  removeFromCollection
} from './collections';

export {
  updateEntity,
  addEntity,
  removeEntity
} from './updates';

export {
  moveEntityToTrash,
  restoreEntityFromTrash,
  emptyTrash
} from './trash';

export {
  moveEntity,
  reorderChildren,
  insertChildAt,
  removeChild
} from './movement';

// ============================================================================
// Widgets (Stateful Components)
// ============================================================================
export {
  Vault,
  getVault,
  resetVault
} from './vault';

// ============================================================================
// Test API Aliases (Backward Compatibility)
// ============================================================================
export {
  createEmptyState as createEmptyVault,
  normalize as normalizeIIIF
} from './normalization';

export {
  denormalize as denormalizeIIIF
} from './denormalization';

export {
  getChildIds as getChildren,
  getParentId as getParent
} from './queries';
