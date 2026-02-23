/**
 * Vault Trash Management (Organism Layer)
 *
 * Soft delete functionality for entities. Instead of permanently deleting,
 * entities are moved to trash with metadata for potential restoration.
 */

import type { EmptyTrashResult, EntityType, IIIFItem, NormalizedState, TrashedEntity } from '@/src/shared/types';
import { vaultLog } from '@/src/shared/lib/logger';
import { getDescendants, getEntity } from './queries';

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

  // Remove from references — only filter affected parents, not all entries
  const newReferences = { ...state.references };
  const affectedParents = new Set<string>();
  for (const rid of toTrash) {
    delete newReferences[rid];
    const parent = state.reverseRefs[rid];
    if (parent && !toTrash.has(parent)) affectedParents.add(parent);
  }
  for (const pid of affectedParents) {
    newReferences[pid] = state.references[pid].filter(cid => !toTrash.has(cid));
  }

  // Remove from reverse refs
  const newReverseRefs = { ...state.reverseRefs };
  for (const rid of toTrash) {
    delete newReverseRefs[rid];
  }

  // Remove from collection membership — only filter affected entries
  const newCollectionMembers = { ...state.collectionMembers };
  const affectedCollections = new Set<string>();
  for (const rid of toTrash) {
    if (newCollectionMembers[rid]) delete newCollectionMembers[rid];
    const collections = state.memberOfCollections[rid];
    if (collections) {
      for (const collId of collections) {
        if (!toTrash.has(collId)) affectedCollections.add(collId);
      }
    }
  }
  for (const collId of affectedCollections) {
    newCollectionMembers[collId] = state.collectionMembers[collId].filter(mid => !toTrash.has(mid));
  }

  const newMemberOfCollections = { ...state.memberOfCollections };
  const affectedMembers = new Set<string>();
  for (const rid of toTrash) {
    if (newMemberOfCollections[rid]) delete newMemberOfCollections[rid];
    const members = state.collectionMembers[rid];
    if (members) {
      for (const mid of members) {
        if (!toTrash.has(mid)) affectedMembers.add(mid);
      }
    }
  }
  for (const mid of affectedMembers) {
    newMemberOfCollections[mid] = state.memberOfCollections[mid].filter(cid => !toTrash.has(cid));
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
    parentId?: string;
    index?: number;
  }
): NormalizedState {
  const trashed = state.trashedEntities[id];
  if (!trashed) {
    vaultLog.warn(`Entity ${id} not found in trash`);
    return state;
  }

  const { entity } = trashed;
  const type = entity.type as EntityType;
  const parentId = options?.parentId ?? trashed.originalParentId;

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
 */
export function emptyTrash(state: NormalizedState): EmptyTrashResult {
  const errors: string[] = [];
  let deletedCount = 0;

  const trashedIds = Object.keys(state.trashedEntities);

  if (trashedIds.length === 0) {
    return { state, deletedCount: 0, errors: [] };
  }

  const newTrashedEntities = { ...state.trashedEntities };
  for (const id of trashedIds) {
    try {
      delete newTrashedEntities[id];
      deletedCount++;
    } catch (e) {
      errors.push(`Failed to delete ${id}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // Also clean up any extensions that may remain for trashed entities
  const newExtensions = { ...state.extensions };
  for (const id of trashedIds) {
    delete newExtensions[id];
  }

  return {
    state: { ...state, trashedEntities: newTrashedEntities, extensions: newExtensions },
    deletedCount,
    errors,
  };
}
