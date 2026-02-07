/**
 * Vault Trash Management (Organism Layer)
 *
 * Soft delete functionality for entities. Instead of permanently deleting,
 * entities are moved to trash with metadata for potential restoration.
 */

import { produce } from 'immer';
import type { EmptyTrashResult, EntityType, IIIFItem, NormalizedState, TrashedEntity } from '@/src/shared/types';
import { USE_IMMER_CLONING } from '@/src/shared/constants';
import { getDescendants, getEntity } from './queries';
import { removeEntity } from './updates';

/**
 * Move an entity and its descendants to trash (soft delete)
 * Preserves all data and relationships for potential restoration
 */
export function moveEntityToTrash(
  state: NormalizedState,
  id: string
): NormalizedState {
  const type = state.typeIndex[id];
  if (!type) return state;

  // Get all IDs being moved to trash
  const toTrash = new Set([id, ...getDescendants(state, id)]);

  // Capture snapshot of the entity and all descendants
  const entityToTrash = getEntity(state, id);
  if (!entityToTrash) return state;

  const trashedEntity: TrashedEntity = {
    entity: entityToTrash,
    originalParentId: state.reverseRefs[id] || null,
    trashedAt: Date.now(),
    memberOfCollections: [...(state.memberOfCollections[id] || [])],
    childIds: [...(state.references[id] || [])]
  };

  if (USE_IMMER_CLONING) {
    return produce(state, draft => {
      // Add to trashed entities
      draft.trashedEntities[id] = trashedEntity;

      // Mark all entities as trashed
      for (const eid of toTrash) {
        const eType = draft.typeIndex[eid];
        if (eType && draft.entities[eType][eid]) {
          (draft.entities[eType][eid] as { _state?: string })._state = 'trashed';
        }
      }

      // Remove from active entities (keep in trashedEntities)
      for (const entityType of Object.keys(draft.entities) as EntityType[]) {
        const store = draft.entities[entityType];
        for (const eid of Object.keys(store)) {
          if (toTrash.has(eid)) {
            delete store[eid];
          }
        }
      }

      // Remove from type index
      for (const eid of Object.keys(draft.typeIndex)) {
        if (toTrash.has(eid)) {
          delete draft.typeIndex[eid];
        }
      }

      // Remove from references
      for (const pid of Object.keys(draft.references)) {
        if (toTrash.has(pid)) {
          delete draft.references[pid];
        } else {
          draft.references[pid] = draft.references[pid].filter(cid => !toTrash.has(cid));
        }
      }

      // Remove from reverse refs
      for (const cid of Object.keys(draft.reverseRefs)) {
        if (toTrash.has(cid)) {
          delete draft.reverseRefs[cid];
        }
      }

      // Remove from collection membership
      for (const collId of Object.keys(draft.collectionMembers)) {
        if (toTrash.has(collId)) {
          delete draft.collectionMembers[collId];
        } else {
          draft.collectionMembers[collId] = draft.collectionMembers[collId].filter(mid => !toTrash.has(mid));
        }
      }

      for (const resId of Object.keys(draft.memberOfCollections)) {
        if (toTrash.has(resId)) {
          delete draft.memberOfCollections[resId];
        } else {
          draft.memberOfCollections[resId] = draft.memberOfCollections[resId].filter(cid => !toTrash.has(cid));
        }
      }

      // Update root if needed
      if (toTrash.has(draft.rootId!)) {
        draft.rootId = null;
      }
    });
  }

  // Create new trashed entities map
  const newTrashedEntities = {
    ...state.trashedEntities,
    [id]: trashedEntity
  };

  // Mark entities as trashed in a copy before removal
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
      if (!toTrash.has(eid)) {
        newEntities[entityType][eid] = entity;
      }
    }
  }

  // Remove from type index
  const newTypeIndex: Record<string, EntityType> = {};
  for (const [eid, etype] of Object.entries(state.typeIndex)) {
    if (!toTrash.has(eid)) {
      newTypeIndex[eid] = etype;
    }
  }

  // Remove from references
  const newReferences: Record<string, string[]> = {};
  for (const [pid, children] of Object.entries(state.references)) {
    if (!toTrash.has(pid)) {
      newReferences[pid] = children.filter(cid => !toTrash.has(cid));
    }
  }

  // Remove from reverse refs
  const newReverseRefs: Record<string, string> = {};
  for (const [cid, pid] of Object.entries(state.reverseRefs)) {
    if (!toTrash.has(cid)) {
      newReverseRefs[cid] = pid;
    }
  }

  // Remove from collection membership
  const newCollectionMembers: Record<string, string[]> = {};
  for (const [collId, members] of Object.entries(state.collectionMembers)) {
    if (!toTrash.has(collId)) {
      newCollectionMembers[collId] = members.filter(mid => !toTrash.has(mid));
    }
  }

  const newMemberOfCollections: Record<string, string[]> = {};
  for (const [resId, collections] of Object.entries(state.memberOfCollections)) {
    if (!toTrash.has(resId)) {
      newMemberOfCollections[resId] = collections.filter(cid => !toTrash.has(cid));
    }
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
    rootId: toTrash.has(state.rootId!) ? null : state.rootId
  };
}

/**
 * Restore an entity from trash back to active state
 */
export function restoreEntityFromTrash(
  state: NormalizedState,
  id: string,
  options?: {
    /** Optional new parent ID; if not provided, uses original parent */
    parentId?: string;
    /** Optional index for positioning in parent */
    index?: number;
  }
): NormalizedState {
  const trashed = state.trashedEntities[id];
  if (!trashed) {
    console.warn(`Entity ${id} not found in trash`);
    return state;
  }

  const { entity } = trashed;
  const type = entity.type as EntityType;
  const parentId = options?.parentId ?? trashed.originalParentId;

  if (USE_IMMER_CLONING) {
    return produce(state, draft => {
      // Restore entity to active entities
      (draft.entities[type] as Record<string, IIIFItem>)[id] = {
        ...entity,
        _state: undefined // Clear trashed state
      } as IIIFItem;

      // Restore type index
      draft.typeIndex[id] = type;

      // Restore parent relationship if parent exists
      if (parentId && draft.entities[draft.typeIndex[parentId] as EntityType]?.[parentId]) {
        if (!draft.references[parentId]) {
          draft.references[parentId] = [];
        }

        // Handle index positioning
        if (typeof options?.index === 'number') {
          draft.references[parentId].splice(options.index, 0, id);
        } else {
          draft.references[parentId].push(id);
        }

        draft.reverseRefs[id] = parentId;
      }

      // Restore collection memberships
      for (const collId of trashed.memberOfCollections) {
        if (draft.entities.Collection[collId]) {
          if (!draft.collectionMembers[collId]) {
            draft.collectionMembers[collId] = [];
          }
          if (!draft.collectionMembers[collId].includes(id)) {
            draft.collectionMembers[collId].push(id);
          }

          if (!draft.memberOfCollections[id]) {
            draft.memberOfCollections[id] = [];
          }
          if (!draft.memberOfCollections[id].includes(collId)) {
            draft.memberOfCollections[id].push(collId);
          }
        }
      }

      // Remove from trash
      delete draft.trashedEntities[id];
    });
  }

  // Create new state with restored entity
  const newEntities = {
    ...state.entities,
    [type]: {
      ...state.entities[type],
      [id]: {
        ...entity,
        _state: undefined
      } as IIIFItem
    }
  };

  const newTypeIndex = {
    ...state.typeIndex,
    [id]: type
  };

  let newReferences = { ...state.references };
  let newReverseRefs = { ...state.reverseRefs };

  // Restore parent relationship
  if (parentId && state.typeIndex[parentId]) {
    const currentChildren = state.references[parentId] || [];
    if (typeof options?.index === 'number') {
      const newChildren = [...currentChildren];
      newChildren.splice(options.index, 0, id);
      newReferences = {
        ...newReferences,
        [parentId]: newChildren
      };
    } else {
      newReferences = {
        ...newReferences,
        [parentId]: [...currentChildren, id]
      };
    }
    newReverseRefs = {
      ...newReverseRefs,
      [id]: parentId
    };
  }

  // Restore collection memberships
  let newCollectionMembers = { ...state.collectionMembers };
  let newMemberOfCollections = { ...state.memberOfCollections };

  for (const collId of trashed.memberOfCollections) {
    if (state.entities.Collection[collId]) {
      newCollectionMembers = {
        ...newCollectionMembers,
        [collId]: [...(newCollectionMembers[collId] || []), id]
      };
      newMemberOfCollections = {
        ...newMemberOfCollections,
        [id]: [...(newMemberOfCollections[id] || []), collId]
      };
    }
  }

  // Remove from trash
  const newTrashedEntities = { ...state.trashedEntities };
  delete newTrashedEntities[id];

  return {
    ...state,
    entities: newEntities,
    typeIndex: newTypeIndex,
    references: newReferences,
    reverseRefs: newReverseRefs,
    collectionMembers: newCollectionMembers,
    memberOfCollections: newMemberOfCollections,
    trashedEntities: newTrashedEntities
  };
}

/**
 * Permanently delete all entities in trash
 * @returns Object with deleted count and any errors
 */
export function emptyTrash(state: NormalizedState): EmptyTrashResult {
  const errors: string[] = [];
  let currentState = state;
  let deletedCount = 0;

  // Get all trashed entity IDs
  const trashedIds = Object.keys(state.trashedEntities);

  for (const id of trashedIds) {
    try {
      // Permanently remove each trashed entity
      currentState = removeEntity(currentState, id, { permanent: true });
      deletedCount++;
    } catch (e) {
      errors.push(`Failed to delete ${id}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  return { state: currentState, deletedCount, errors };
}
