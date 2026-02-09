/**
 * Vault Update Functions (Organism Layer)
 *
 * Immutable update operations for the normalized state.
 * All functions return a new state object without mutating the original.
 */

import type { EntityType, IIIFItem, NormalizedState } from '@/src/shared/types';
import { vaultLog } from '@/src/shared/services/logger';
import { getDescendants } from './queries';
import { moveEntityToTrash } from './trash';

/**
 * Update an entity by ID - O(1) time, O(1) memory
 * Returns new state without full tree clone
 */
export function updateEntity(
  state: NormalizedState,
  id: string,
  updates: Partial<IIIFItem>
): NormalizedState {
  const type = state.typeIndex[id];
  if (!type) {
    // If ID not found in normalized type index, try a direct search in entities (fallback for stale index)
    let foundType: EntityType | null = null;
    for (const t of Object.keys(state.entities) as EntityType[]) {
      if (state.entities[t][id]) {
        foundType = t;
        break;
      }
    }

    if (!foundType) {
      vaultLog.warn(`Entity not found in vault: ${id}. Update aborted.`);
      return state;
    }

    // Auto-fix stale type index
    state.typeIndex[id] = foundType;
    vaultLog.info(`Fixed stale type index for ${id} (${foundType})`);
  }

  const actualType = type || state.typeIndex[id];
  const store = state.entities[actualType] as Record<string, IIIFItem>;
  const existing = store[id];
  if (!existing) return state;

  // Strip `id` from updates — changing an entity's ID via updateEntity creates
  // inconsistent state (store keyed by old ID but entity.id is new).
  // Use renameEntity logic for ID changes instead.
  if (updates.id && updates.id !== id) {
    const { id: _stripId, ...safeUpdates } = updates;
    updates = safeUpdates;
  }

  // Create new entity with updates
  const updated = { ...existing, ...updates };

  // Return new state with only the affected store changed
  const newEntities = { ...state.entities };
  (newEntities as Record<string, Record<string, IIIFItem>>)[actualType] = { ...store, [id]: updated };
  return { ...state, entities: newEntities };
}

/**
 * Add a new entity
 */
export function addEntity(
  state: NormalizedState,
  entity: IIIFItem,
  parentId: string
): NormalizedState {
  const type = entity.type as EntityType;
  const { id } = entity;

  const store = state.entities[type] as Record<string, IIIFItem>;

  // Add to entity store
  const newEntities = {
    ...state.entities,
    [type]: {
      ...store,
      [id]: entity
    }
  };

  // Update type index
  const newTypeIndex = {
    ...state.typeIndex,
    [id]: type
  };

  // Update references
  const newReferences = {
    ...state.references,
    [parentId]: [...(state.references[parentId] || []), id]
  };

  // Update reverse refs
  const newReverseRefs = {
    ...state.reverseRefs,
    [id]: parentId
  };

  return {
    ...state,
    entities: newEntities,
    typeIndex: newTypeIndex,
    references: newReferences,
    reverseRefs: newReverseRefs
  };
}

/**
 * Remove an entity and all its descendants
 *
 * @param state - Current normalized state
 * @param id - Entity ID to remove
 * @param options - Removal options
 * @param options.permanent - If true, permanently delete; if false, move to trash (soft delete)
 * @returns Updated state
 */
export function removeEntity(
  state: NormalizedState,
  id: string,
  options: { permanent?: boolean } = {}
): NormalizedState {
  const { permanent = false } = options;
  const type = state.typeIndex[id];
  if (!type) return state;

  // Get all IDs to remove (entity + descendants)
  const toRemove = new Set([id, ...getDescendants(state, id)]);

  // If not permanent deletion, move to trash first
  if (!permanent) {
    return moveEntityToTrash(state, id);
  }

  // Create new stores with entities removed
  const newEntities: NormalizedState['entities'] = {
    Collection: {},
    Manifest: {},
    Canvas: {},
    Range: {},
    AnnotationPage: {},
    Annotation: {}
  };
  for (const entityType of Object.keys(state.entities) as EntityType[]) {
    const store = state.entities[entityType];
    for (const [eid, entity] of Object.entries(store)) {
      if (!toRemove.has(eid)) {
        newEntities[entityType][eid] = entity;
      }
    }
  }

  // Remove from type index
  const newTypeIndex: Record<string, EntityType> = {};
  for (const [eid, etype] of Object.entries(state.typeIndex)) {
    if (!toRemove.has(eid)) {
      newTypeIndex[eid] = etype;
    }
  }

  // Remove from references — only filter affected parents, not all entries
  const newReferences = { ...state.references };
  const affectedParents = new Set<string>();
  for (const rid of toRemove) {
    delete newReferences[rid];
    const parent = state.reverseRefs[rid];
    if (parent && !toRemove.has(parent)) affectedParents.add(parent);
  }
  for (const pid of affectedParents) {
    newReferences[pid] = state.references[pid].filter(cid => !toRemove.has(cid));
  }

  // Remove from reverse refs
  const newReverseRefs = { ...state.reverseRefs };
  for (const rid of toRemove) {
    delete newReverseRefs[rid];
  }

  // Remove from collection membership — only filter affected entries
  const newCollectionMembers = { ...state.collectionMembers };
  const affectedCollections = new Set<string>();
  for (const rid of toRemove) {
    if (newCollectionMembers[rid]) delete newCollectionMembers[rid];
    const collections = state.memberOfCollections[rid];
    if (collections) {
      for (const collId of collections) {
        if (!toRemove.has(collId)) affectedCollections.add(collId);
      }
    }
  }
  for (const collId of affectedCollections) {
    newCollectionMembers[collId] = state.collectionMembers[collId].filter(mid => !toRemove.has(mid));
  }

  const newMemberOfCollections = { ...state.memberOfCollections };
  const affectedMembers = new Set<string>();
  for (const rid of toRemove) {
    if (newMemberOfCollections[rid]) delete newMemberOfCollections[rid];
    const members = state.collectionMembers[rid];
    if (members) {
      for (const mid of members) {
        if (!toRemove.has(mid)) affectedMembers.add(mid);
      }
    }
  }
  for (const mid of affectedMembers) {
    newMemberOfCollections[mid] = state.memberOfCollections[mid].filter(cid => !toRemove.has(cid));
  }

  // Remove from trashedEntities if present
  const newTrashedEntities = { ...state.trashedEntities };
  for (const eid of toRemove) {
    delete newTrashedEntities[eid];
  }

  return {
    ...state,
    entities: newEntities,
    typeIndex: newTypeIndex,
    references: newReferences,
    reverseRefs: newReverseRefs,
    collectionMembers: newCollectionMembers,
    memberOfCollections: newMemberOfCollections,
    trashedEntities: newTrashedEntities,
    rootId: toRemove.has(state.rootId!) ? null : state.rootId
  };
}
