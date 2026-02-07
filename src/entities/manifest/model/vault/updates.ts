/**
 * Vault Update Functions (Organism Layer)
 *
 * Immutable update operations for the normalized state.
 * All functions return a new state object without mutating the original.
 */

import { produce } from 'immer';
import type { EntityType, IIIFItem, NormalizedState } from '@/src/shared/types';
import { USE_IMMER_CLONING } from '@/src/shared/constants';
import { getDescendants } from './queries';

/**
 * Update an entity by ID - O(1) time, O(1) memory
 * Returns new state without full tree clone
 * Uses Immer for immutable updates when USE_IMMER_CLONING is enabled
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
      console.warn(`Entity not found in vault: ${id}. Update aborted.`);
      return state;
    }

    // Auto-fix stale type index
    state.typeIndex[id] = foundType;
    console.info(`Fixed stale type index for ${id} (${foundType})`);
  }

  const actualType = type || state.typeIndex[id];
  const store = state.entities[actualType] as Record<string, IIIFItem>;
  const existing = store[id];
  if (!existing) return state;

  // Special handling: if ID itself is being updated, we need a more complex update
  if (updates.id && updates.id !== id) {
    console.warn('Direct ID update through updateEntity is discouraged. Use renameEntity logic.');
  }

  if (USE_IMMER_CLONING) {
    // Use Immer for efficient immutable updates
    return produce(state, draft => {
      (draft.entities[actualType] as Record<string, IIIFItem>)[id] = {
        ...existing,
        ...updates
      } as IIIFItem;
    });
  }

  // Create new entity with updates
  const updated = { ...existing, ...updates };

  // Return new state with only the affected store changed
  return {
    ...state,
    entities: {
      ...state.entities,
      [actualType]: {
        ...store,
        [id]: updated
      }
    }
  };
}

/**
 * Add a new entity
 * Uses Immer for immutable updates when USE_IMMER_CLONING is enabled
 */
export function addEntity(
  state: NormalizedState,
  entity: IIIFItem,
  parentId: string
): NormalizedState {
  const type = entity.type as EntityType;
  const { id } = entity;

  if (USE_IMMER_CLONING) {
    return produce(state, draft => {
      (draft.entities[type] as Record<string, IIIFItem>)[id] = entity;
      draft.typeIndex[id] = type;
      if (!draft.references[parentId]) {
        draft.references[parentId] = [];
      }
      draft.references[parentId].push(id);
      draft.reverseRefs[id] = parentId;
    });
  }

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
 * Uses Immer for immutable updates when USE_IMMER_CLONING is enabled
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
    // Import dynamically to avoid circular dependency
    const { moveEntityToTrash } = require('./trash');
    return moveEntityToTrash(state, id);
  }

  if (USE_IMMER_CLONING) {
    return produce(state, draft => {
      // Remove entities
      for (const entityType of Object.keys(draft.entities) as EntityType[]) {
        const store = draft.entities[entityType];
        for (const eid of Object.keys(store)) {
          if (toRemove.has(eid)) {
            delete store[eid];
          }
        }
      }

      // Remove from type index
      for (const eid of Object.keys(draft.typeIndex)) {
        if (toRemove.has(eid)) {
          delete draft.typeIndex[eid];
        }
      }

      // Remove from references
      for (const pid of Object.keys(draft.references)) {
        if (toRemove.has(pid)) {
          delete draft.references[pid];
        } else {
          draft.references[pid] = draft.references[pid].filter(cid => !toRemove.has(cid));
        }
      }

      // Remove from reverse refs
      for (const cid of Object.keys(draft.reverseRefs)) {
        if (toRemove.has(cid)) {
          delete draft.reverseRefs[cid];
        }
      }

      // Remove from collection membership
      for (const collId of Object.keys(draft.collectionMembers)) {
        if (toRemove.has(collId)) {
          delete draft.collectionMembers[collId];
        } else {
          draft.collectionMembers[collId] = draft.collectionMembers[collId].filter(mid => !toRemove.has(mid));
        }
      }

      for (const resId of Object.keys(draft.memberOfCollections)) {
        if (toRemove.has(resId)) {
          delete draft.memberOfCollections[resId];
        } else {
          draft.memberOfCollections[resId] = draft.memberOfCollections[resId].filter(cid => !toRemove.has(cid));
        }
      }

      // Also remove from trashedEntities if present
      for (const eid of toRemove) {
        if (draft.trashedEntities[eid]) {
          delete draft.trashedEntities[eid];
        }
      }

      // Update root if needed
      if (toRemove.has(draft.rootId!)) {
        draft.rootId = null;
      }
    });
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

  // Remove from references
  const newReferences: Record<string, string[]> = {};
  for (const [pid, children] of Object.entries(state.references)) {
    if (!toRemove.has(pid)) {
      newReferences[pid] = children.filter(cid => !toRemove.has(cid));
    }
  }

  // Remove from reverse refs
  const newReverseRefs: Record<string, string> = {};
  for (const [cid, pid] of Object.entries(state.reverseRefs)) {
    if (!toRemove.has(cid)) {
      newReverseRefs[cid] = pid;
    }
  }

  // Remove from collection membership (non-hierarchical references)
  const newCollectionMembers: Record<string, string[]> = {};
  for (const [collId, members] of Object.entries(state.collectionMembers)) {
    if (!toRemove.has(collId)) {
      newCollectionMembers[collId] = members.filter(mid => !toRemove.has(mid));
    }
  }

  const newMemberOfCollections: Record<string, string[]> = {};
  for (const [resId, collections] of Object.entries(state.memberOfCollections)) {
    if (!toRemove.has(resId)) {
      newMemberOfCollections[resId] = collections.filter(cid => !toRemove.has(cid));
    }
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
