/**
 * Vault - Normalized State Management for IIIF Resources
 *
 * Implements the Digirati Manifest Editor pattern of flat, normalized storage
 * for O(1) entity lookups and efficient updates without full-tree cloning.
 *
 * Key concepts:
 * - Entities are stored flat by type and ID
 * - References maintain parent-child relationships
 * - Updates only touch affected entities
 * - Tree structure reconstructed on demand (export)
 *
 * @see ARCHITECTURE_INSPIRATION.md for pattern documentation
 */

import {
  IIIFItem,
  IIIFCollection,
  IIIFManifest,
  IIIFCanvas,
  IIIFRange,
  IIIFAnnotation,
  IIIFAnnotationPage,
  LanguageString
} from '../types';
import { getAllowedProperties } from '../utils/iiifSchema';
import { sanitizeAnnotationBody } from '../utils/sanitization';
import { produce, enableMapSet, setAutoFreeze } from 'immer';
import { USE_IMMER_CLONING } from '../constants';

// Enable Immer Map/Set support for better performance
enableMapSet();
// Disable auto-freeze for better performance (we don't need immutability checks in production)
setAutoFreeze(false);

// ============================================================================
// Types
// ============================================================================

export type EntityType = 'Collection' | 'Manifest' | 'Canvas' | 'Range' | 'AnnotationPage' | 'Annotation';

/**
 * Trashed entity metadata for recovery
 */
export interface TrashedEntity {
  /** The entity data at time of deletion */
  entity: IIIFItem;
  /** Original parent ID for restoration */
  originalParentId: string | null;
  /** Timestamp when moved to trash */
  trashedAt: number;
  /** Collection memberships at time of deletion */
  memberOfCollections: string[];
  /** Hierarchical references at time of deletion */
  childIds: string[];
}

export interface NormalizedState {
  /** Flat storage of all entities by type and ID */
  entities: {
    Collection: Record<string, IIIFCollection>;
    Manifest: Record<string, IIIFManifest>;
    Canvas: Record<string, IIIFCanvas>;
    Range: Record<string, IIIFRange>;
    AnnotationPage: Record<string, IIIFAnnotationPage>;
    Annotation: Record<string, IIIFAnnotation>;
  };

  /** Parent → child ID references (for hierarchical ownership: Manifest→Canvas, Canvas→AnnotationPage) */
  references: Record<string, string[]>;

  /** Child → parent ID reverse lookup (for hierarchical ownership only) */
  reverseRefs: Record<string, string>;

  /**
   * Collection membership - tracks which Collections reference which resources
   * This is separate from hierarchical ownership because:
   * - Collections REFERENCE Manifests (many-to-many)
   * - Manifests OWN Canvases (one-to-many, hierarchical)
   *
   * Key: Collection ID, Value: Array of referenced resource IDs (Manifests or nested Collections)
   */
  collectionMembers: Record<string, string[]>;

  /**
   * Reverse lookup: which Collections contain this resource?
   * Key: resource ID (Manifest or Collection), Value: Array of Collection IDs that reference it
   * A Manifest can be in multiple Collections (non-hierarchical, many-to-many)
   */
  memberOfCollections: Record<string, string[]>;

  /** Root entity ID (usually a top-level Collection) */
  rootId: string | null;

  /** Entity type index for O(1) type lookup */
  typeIndex: Record<string, EntityType>;

  /**
   * Extension preservation for round-tripping
   * Stores unknown/vendor-specific properties by entity ID
   * Ensures properties like Mirador configs, Tify settings survive import/export
   */
  extensions: Record<string, Record<string, unknown>>;

  /**
   * Trashed entities storage - soft-deleted items awaiting permanent deletion or restoration
   * Key: entity ID, Value: trashed entity metadata with recovery information
   */
  trashedEntities: Record<string, TrashedEntity>;
}

/**
 * Known IIIF Presentation API 3.0 properties by entity type
 * Properties not in this list are preserved as extensions
 */
const KNOWN_IIIF_PROPERTIES: Record<EntityType | 'common', Set<string>> = {
  common: new Set([
    // Core JSON-LD / Internal
    '@context', 'id', 'type', 
    // Internal properties (prefixed with _)
    '_fileRef', '_blobUrl', '_parentId', '_state', '_filename'
  ]),
  Collection: new Set(getAllowedProperties('Collection')),
  Manifest: new Set(getAllowedProperties('Manifest')),
  Canvas: new Set(getAllowedProperties('Canvas')),
  Range: new Set(getAllowedProperties('Range')),
  AnnotationPage: new Set(getAllowedProperties('AnnotationPage')),
  Annotation: new Set([...getAllowedProperties('Annotation'), 'bodyValue'])
};

// ============================================================================
// Type Safety Helpers
// ============================================================================

/**
 * Deep clone an entity using structuredClone (with JSON fallback)
 * Uses Immer's produce when USE_IMMER_CLONING flag is enabled
 * This is the standard pattern for working with entities during denormalization
 */
function cloneAsRecord<T extends object>(entity: T): Record<string, unknown> {
  if (USE_IMMER_CLONING) {
    // Use Immer for immutable cloning and updates
    return produce(entity, draft => draft) as unknown as Record<string, unknown>;
  }

  // Use native structuredClone if available (faster, handles more types)
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(entity) as Record<string, unknown>;
    } catch (e) {
      // Fallback for objects that can't be cloned (e.g., with functions)
    }
  }

  // Legacy fallback for older browsers
  return JSON.parse(JSON.stringify(entity)) as Record<string, unknown>;
}

/**
 * Create a deep clone of the entire state using structuredClone
 * with Immer fallback when enabled
 */
function deepCloneState(state: NormalizedState): NormalizedState {
  if (USE_IMMER_CLONING) {
    return produce(state, draft => draft);
  }

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(state);
    } catch (e) {
      // Fallback
    }
  }

  return JSON.parse(JSON.stringify(state));
}

/**
 * Convert a manipulated record back to its typed form
 * Used after applyExtensions adds dynamic properties
 */
function recordAs<T>(record: Record<string, unknown>): T {
  return record as T;
}

/**
 * Type guard for checking if an item has a 'type' property
 */
function hasType(item: unknown): item is { type: string } {
  return typeof item === 'object' && item !== null && 'type' in item;
}

/**
 * Extract unknown properties from an entity for extension preservation
 */
function extractExtensions(item: Record<string, unknown>, type: EntityType): Record<string, unknown> {
  const extensions: Record<string, unknown> = {};
  const knownCommon = KNOWN_IIIF_PROPERTIES.common;
  const knownForType = KNOWN_IIIF_PROPERTIES[type];

  for (const [key, value] of Object.entries(item)) {
    // Skip known properties
    if (knownCommon.has(key) || knownForType.has(key)) continue;
    // Skip undefined/null values
    if (value === undefined || value === null) continue;
    // Preserve unknown property
    extensions[key] = value;
  }

  return extensions;
}

/**
 * Apply preserved extensions back to an entity during denormalization
 */
function applyExtensions(
  item: Record<string, unknown>,
  extensions: Record<string, unknown> | undefined
): void {
  if (!extensions) return;
  for (const [key, value] of Object.entries(extensions)) {
    item[key] = value;
  }
}

export interface VaultSnapshot {
  state: NormalizedState;
  timestamp: number;
}

// ============================================================================
// Normalization Functions
// ============================================================================

/**
 * Create empty normalized state
 */
export function createEmptyState(): NormalizedState {
  return {
    entities: {
      Collection: {},
      Manifest: {},
      Canvas: {},
      Range: {},
      AnnotationPage: {},
      Annotation: {}
    },
    references: {},
    reverseRefs: {},
    collectionMembers: {},
    memberOfCollections: {},
    rootId: null,
    typeIndex: {},
    extensions: {},
    trashedEntities: {}
  };
}

/**
 * Normalize a nested IIIF tree into flat state
 */
export function normalize(root: IIIFItem): NormalizedState {
  const state = createEmptyState();
  state.rootId = root.id;

  normalizeItem(root, state, null);

  return state;
}

/**
 * Recursively normalize an item and its children
 */
function normalizeItem(
  item: IIIFItem,
  state: NormalizedState,
  parentId: string | null
): void {
  const type = item.type as EntityType;
  const id = item.id;

  // Store in type index
  state.typeIndex[id] = type;

  // Set up parent reference
  if (parentId) {
    state.reverseRefs[id] = parentId;
    if (!state.references[parentId]) {
      state.references[parentId] = [];
    }
    state.references[parentId].push(id);
  }

  // Extract and store extensions for round-tripping
  const extensions = extractExtensions(cloneAsRecord(item), type);
  if (Object.keys(extensions).length > 0) {
    state.extensions[id] = extensions;
  }

  // Process based on type
  switch (type) {
    case 'Collection': {
      const collection = item as IIIFCollection;
      const memberIds: string[] = [];

      // Store without nested items
      state.entities.Collection[id] = {
        ...collection,
        items: [] // Will be reconstructed on denormalize
      };

      // Process Collection members (referenced resources, not owned)
      // Collections reference Manifests/Collections - this is many-to-many, not hierarchical
      if (collection.items) {
        for (const child of collection.items) {
          memberIds.push(child.id);

          // Track membership (Collection → resources)
          if (!state.memberOfCollections[child.id]) {
            state.memberOfCollections[child.id] = [];
          }
          state.memberOfCollections[child.id].push(id);

          // Normalize the child (but don't set reverseRefs for Collection members)
          normalizeItem(child, state, null); // null parentId - not hierarchical ownership
        }
      }

      // Store collection membership
      state.collectionMembers[id] = memberIds;
      break;
    }

    case 'Manifest': {
      const manifest = item as IIIFManifest;
      const childIds: string[] = [];

      // Store without nested items
      state.entities.Manifest[id] = {
        ...manifest,
        items: [], // Will be reconstructed on denormalize
        structures: [] // Ranges handled separately
      };

      // Normalize canvases
      if (manifest.items) {
        for (const canvas of manifest.items) {
          childIds.push(canvas.id);
          normalizeItem(canvas as IIIFItem, state, id);
        }
      }

      // Normalize ranges (structures)
      if (manifest.structures) {
        for (const range of manifest.structures) {
          normalizeItem(range as IIIFItem, state, id);
        }
      }

      state.references[id] = childIds;
      break;
    }

    case 'Canvas': {
      const canvas = item as IIIFCanvas;
      const childIds: string[] = [];

      // Store without nested annotation pages
      state.entities.Canvas[id] = {
        ...canvas,
        items: [],
        annotations: []
      };

      // Normalize painting annotation pages
      if (canvas.items) {
        for (const page of canvas.items) {
          childIds.push(page.id);
          normalizeAnnotationPage(page, state, id);
        }
      }

      // Normalize supplementing annotation pages
      if (canvas.annotations) {
        for (const page of canvas.annotations) {
          normalizeAnnotationPage(page, state, id);
        }
      }

      state.references[id] = childIds;
      break;
    }

    case 'Range': {
      const range = item as IIIFRange;

      // Store range (items are references, not full objects)
      state.entities.Range[id] = {
        ...range
      };

      // Recursively normalize nested ranges
      if (range.items) {
        for (const rangeItem of range.items) {
          if (hasType(rangeItem) && rangeItem.type === 'Range') {
            normalizeItem(rangeItem as IIIFItem, state, id);
          }
        }
      }
      break;
    }

    default:
      console.warn(`Unknown entity type: ${type}`);
  }
}

/**
 * Normalize an annotation page and its annotations
 */
function normalizeAnnotationPage(
  page: IIIFAnnotationPage,
  state: NormalizedState,
  parentId: string
): void {
  const id = page.id;

  state.typeIndex[id] = 'AnnotationPage';
  state.reverseRefs[id] = parentId;

  if (!state.references[parentId]) {
    state.references[parentId] = [];
  }
  state.references[parentId].push(id);

  // Extract extensions from annotation page
  const pageExtensions = extractExtensions(cloneAsRecord(page), 'AnnotationPage');
  if (Object.keys(pageExtensions).length > 0) {
    state.extensions[id] = pageExtensions;
  }

  // Store page without nested annotations
  state.entities.AnnotationPage[id] = {
    ...page,
    items: []
  };

  // Normalize annotations with XSS sanitization
  const annotationIds: string[] = [];
  if (page.items) {
    for (const anno of page.items) {
      annotationIds.push(anno.id);
      state.typeIndex[anno.id] = 'Annotation';
      state.reverseRefs[anno.id] = id;

      // Sanitize annotation body content to prevent XSS
      const sanitizedAnno = { ...anno };
      if (sanitizedAnno.body) {
        if (typeof sanitizedAnno.body === 'object' && sanitizedAnno.body !== null) {
          // Handle TextualBody with value property
          const bodyObj = sanitizedAnno.body as unknown as Record<string, unknown>;
          if ('value' in bodyObj && typeof bodyObj.value === 'string') {
            bodyObj.value = sanitizeAnnotationBody(bodyObj.value);
          }
          // Handle body as string directly
          if ('format' in bodyObj && bodyObj.format === 'text/html' && 'value' in bodyObj) {
            bodyObj.value = sanitizeAnnotationBody(bodyObj.value);
          }
        }
      }
      // Also sanitize bodyValue if present (IIIF Annotation body shorthand)
      if ((sanitizedAnno as Record<string, unknown>).bodyValue) {
        (sanitizedAnno as Record<string, unknown>).bodyValue = sanitizeAnnotationBody(
          (sanitizedAnno as Record<string, unknown>).bodyValue
        );
      }

      state.entities.Annotation[anno.id] = sanitizedAnno;

      // Extract extensions from annotation
      const annoExtensions = extractExtensions(cloneAsRecord(sanitizedAnno), 'Annotation');
      if (Object.keys(annoExtensions).length > 0) {
        state.extensions[anno.id] = annoExtensions;
      }
    }
  }

  state.references[id] = annotationIds;
}

// ============================================================================
// Denormalization Functions
// ============================================================================

/**
 * Reconstruct nested IIIF tree from normalized state
 */
export function denormalize(state: NormalizedState): IIIFItem | null {
  if (!state.rootId) return null;

  return denormalizeItem(state, state.rootId);
}

/**
 * Recursively denormalize an item
 */
function denormalizeItem(state: NormalizedState, id: string): IIIFItem {
  const type = state.typeIndex[id];

  switch (type) {
    case 'Collection': {
      const collection = cloneAsRecord(state.entities.Collection[id]);
      // Use collectionMembers for Collection items (not hierarchical references)
      const memberIds = state.collectionMembers[id] || [];

      collection.items = memberIds
        .map(memberId => denormalizeItem(state, memberId))
        .filter(Boolean);

      // Apply preserved extensions
      applyExtensions(collection, state.extensions[id]);

      return recordAs<IIIFCollection>(collection);
    }

    case 'Manifest': {
      const manifest = cloneAsRecord(state.entities.Manifest[id]);
      const childIds = state.references[id] || [];

      // Reconstruct canvases
      manifest.items = childIds
        .filter(childId => state.typeIndex[childId] === 'Canvas')
        .map(childId => denormalizeCanvas(state, childId));

      // Reconstruct structures (ranges)
      const rangeIds = Object.keys(state.entities.Range)
        .filter(rid => state.reverseRefs[rid] === id);

      if (rangeIds.length > 0) {
        manifest.structures = rangeIds.map(rid => {
          const range = cloneAsRecord(state.entities.Range[rid]);
          applyExtensions(range, state.extensions[rid]);
          return range;
        });
      }

      // Apply preserved extensions
      applyExtensions(manifest, state.extensions[id]);

      return recordAs<IIIFManifest>(manifest);
    }

    case 'Canvas':
      return denormalizeCanvas(state, id);

    case 'Range': {
      const range = cloneAsRecord(state.entities.Range[id]);
      applyExtensions(range, state.extensions[id]);
      return recordAs<IIIFRange>(range);
    }

    default:
      throw new Error(`Cannot denormalize type: ${type}`);
  }
}

/**
 * Denormalize a canvas with its annotation pages
 */
function denormalizeCanvas(state: NormalizedState, id: string): IIIFCanvas {
  const canvas = cloneAsRecord(state.entities.Canvas[id]);
  const pageIds = state.references[id] || [];

  // Reconstruct painting annotation pages
  canvas.items = pageIds
    .filter(pid => state.typeIndex[pid] === 'AnnotationPage')
    .map(pid => denormalizeAnnotationPage(state, pid));

  // Apply preserved extensions
  applyExtensions(canvas, state.extensions[id]);

  return recordAs<IIIFCanvas>(canvas);
}

/**
 * Denormalize an annotation page with its annotations
 */
function denormalizeAnnotationPage(state: NormalizedState, id: string): IIIFAnnotationPage {
  const page = cloneAsRecord(state.entities.AnnotationPage[id]);
  const annoIds = state.references[id] || [];

  page.items = annoIds
    .filter(aid => state.typeIndex[aid] === 'Annotation')
    .map(aid => {
      const anno = cloneAsRecord(state.entities.Annotation[aid]);
      applyExtensions(anno, state.extensions[aid]);
      return recordAs<IIIFAnnotation>(anno);
    });

  // Apply preserved extensions
  applyExtensions(page, state.extensions[id]);

  return recordAs<IIIFAnnotationPage>(page);
}

// ============================================================================
// Query Functions (O(1) lookups)
// ============================================================================

/**
 * Get an entity by ID - O(1)
 */
export function getEntity(state: NormalizedState, id: string): IIIFItem | null {
  const type = state.typeIndex[id];
  if (!type) return null;

  const store = state.entities[type] as Record<string, IIIFItem>;
  return store[id] || null;
}

/**
 * Get entity type by ID - O(1)
 */
export function getEntityType(state: NormalizedState, id: string): EntityType | null {
  return state.typeIndex[id] || null;
}

/**
 * Get parent ID - O(1)
 */
export function getParentId(state: NormalizedState, id: string): string | null {
  return state.reverseRefs[id] || null;
}

/**
 * Get child IDs - O(1)
 */
export function getChildIds(state: NormalizedState, id: string): string[] {
  return state.references[id] || [];
}

/**
 * Get all entities of a type
 */
export function getEntitiesByType<T extends IIIFItem>(
  state: NormalizedState,
  type: EntityType
): T[] {
  const store = state.entities[type] as Record<string, T>;
  return Object.values(store);
}

/**
 * Get ancestors (path to root)
 */
export function getAncestors(state: NormalizedState, id: string): string[] {
  const ancestors: string[] = [];
  let currentId = state.reverseRefs[id];

  while (currentId) {
    ancestors.push(currentId);
    currentId = state.reverseRefs[currentId];
  }

  return ancestors;
}

/**
 * Get all descendants recursively
 */
export function getDescendants(state: NormalizedState, id: string): string[] {
  const descendants: string[] = [];
  const queue = [...(state.references[id] || [])];

  while (queue.length > 0) {
    const childId = queue.shift()!;
    descendants.push(childId);
    queue.push(...(state.references[childId] || []));
  }

  return descendants;
}

// ============================================================================
// Collection Membership Queries (Non-hierarchical, many-to-many)
// ============================================================================

/**
 * Get all Collections that reference a given resource (Manifest or nested Collection)
 * Supports the IIIF 3.0 model where same Manifest can be in multiple Collections
 */
export function getCollectionsContaining(state: NormalizedState, resourceId: string): string[] {
  return state.memberOfCollections[resourceId] || [];
}

/**
 * Get all members (Manifests/Collections) referenced by a Collection
 */
export function getCollectionMembers(state: NormalizedState, collectionId: string): string[] {
  return state.collectionMembers[collectionId] || [];
}

/**
 * Check if a Manifest is standalone (not in any Collection)
 */
export function isOrphanManifest(state: NormalizedState, manifestId: string): boolean {
  const type = state.typeIndex[manifestId];
  if (type !== 'Manifest') return false;
  const memberships = state.memberOfCollections[manifestId] || [];
  return memberships.length === 0;
}

/**
 * Get all standalone Manifests (not referenced by any Collection)
 */
export function getOrphanManifests(state: NormalizedState): IIIFManifest[] {
  return Object.values(state.entities.Manifest).filter(
    manifest => isOrphanManifest(state, manifest.id)
  );
}

/**
 * Add a resource to a Collection (creates a reference, not ownership)
 */
export function addToCollection(
  state: NormalizedState,
  collectionId: string,
  resourceId: string
): NormalizedState {
  // Verify both entities exist
  if (!state.typeIndex[collectionId] || !state.typeIndex[resourceId]) {
    console.warn('Cannot add to collection: entity not found');
    return state;
  }

  // Update collection members
  const currentMembers = state.collectionMembers[collectionId] || [];
  if (currentMembers.includes(resourceId)) {
    return state; // Already a member
  }

  const newCollectionMembers = {
    ...state.collectionMembers,
    [collectionId]: [...currentMembers, resourceId]
  };

  // Update reverse lookup
  const currentMemberships = state.memberOfCollections[resourceId] || [];
  const newMemberOfCollections = {
    ...state.memberOfCollections,
    [resourceId]: [...currentMemberships, collectionId]
  };

  return {
    ...state,
    collectionMembers: newCollectionMembers,
    memberOfCollections: newMemberOfCollections
  };
}

/**
 * Remove a resource from a Collection (removes reference, not the resource itself)
 */
export function removeFromCollection(
  state: NormalizedState,
  collectionId: string,
  resourceId: string
): NormalizedState {
  // Update collection members
  const currentMembers = state.collectionMembers[collectionId] || [];
  const newMembers = currentMembers.filter(id => id !== resourceId);

  const newCollectionMembers = {
    ...state.collectionMembers,
    [collectionId]: newMembers
  };

  // Update reverse lookup
  const currentMemberships = state.memberOfCollections[resourceId] || [];
  const newMemberships = currentMemberships.filter(id => id !== collectionId);

  const newMemberOfCollections = {
    ...state.memberOfCollections,
    [resourceId]: newMemberships
  };

  return {
    ...state,
    collectionMembers: newCollectionMembers,
    memberOfCollections: newMemberOfCollections
  };
}

// ============================================================================
// Update Functions (Immutable)
// ============================================================================

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
      console.warn("Direct ID update through updateEntity is discouraged. Use renameEntity logic.");
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
  const id = entity.id;

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
          (draft.entities[eType][eid] as any)._state = 'trashed';
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

  const entity = trashed.entity;
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
export function emptyTrash(state: NormalizedState): { state: NormalizedState; deletedCount: number; errors: string[] } {
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

/**
 * Move an entity to a new parent
 */
export function moveEntity(
  state: NormalizedState,
  id: string,
  newParentId: string,
  index?: number
): NormalizedState {
  const oldParentId = state.reverseRefs[id];
  if (!oldParentId) return state;

  // Remove from old parent's children
  const oldParentChildren = state.references[oldParentId] || [];
  const filteredOldChildren = oldParentChildren.filter(cid => cid !== id);

  // Add to new parent's children
  const newParentChildren = [...(state.references[newParentId] || [])];
  if (typeof index === 'number') {
    newParentChildren.splice(index, 0, id);
  } else {
    newParentChildren.push(id);
  }

  return {
    ...state,
    references: {
      ...state.references,
      [oldParentId]: filteredOldChildren,
      [newParentId]: newParentChildren
    },
    reverseRefs: {
      ...state.reverseRefs,
      [id]: newParentId
    }
  };
}

/**
 * Reorder children of a parent
 */
export function reorderChildren(
  state: NormalizedState,
  parentId: string,
  newOrder: string[]
): NormalizedState {
  return {
    ...state,
    references: {
      ...state.references,
      [parentId]: newOrder
    }
  };
}

// ============================================================================
// Vault Class (Stateful wrapper)
// ============================================================================

export class Vault {
  private state: NormalizedState;
  private listeners: Set<(state: NormalizedState) => void> = new Set();

  constructor(initial?: IIIFItem) {
    this.state = initial ? normalize(initial) : createEmptyState();
  }

  /**
   * Load a new IIIF tree, replacing current state
   */
  load(root: IIIFItem): void {
    this.state = normalize(root);
    this.notify();
  }

  /**
   * Reload the vault from a potentially modified IIIF tree.
   * Use this when the tree has been modified externally (e.g., by healing)
   * and you need to sync the vault's normalized state.
   *
   * This is safer than individual updateEntity calls because it ensures
   * all IDs are properly indexed and the typeIndex is fresh.
   */
  reload(root: IIIFItem): void {
    this.state = normalize(root);
    this.notify();
  }

  /**
   * Check if an entity exists in the vault by ID.
   * Useful for validating that healing hasn't broken ID references.
   */
  has(id: string): boolean {
    const type = this.state.typeIndex[id];
    if (!type) return false;
    return !!this.state.entities[type][id];
  }

  /**
   * Export as nested IIIF tree
   */
  export(): IIIFItem | null {
    return denormalize(this.state);
  }

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<NormalizedState> {
    return this.state;
  }

  /**
   * Get entity by ID - O(1)
   */
  get(id: string): IIIFItem | null {
    return getEntity(this.state, id);
  }

  /**
   * Update entity
   */
  update(id: string, updates: Partial<IIIFItem>): void {
    this.state = updateEntity(this.state, id, updates);
    this.notify();
  }

  /**
   * Add entity to parent
   */
  add(entity: IIIFItem, parentId: string): void {
    this.state = addEntity(this.state, entity, parentId);
    this.notify();
  }

  /**
   * Remove entity (soft delete by default, use permanent: true for hard delete)
   */
  remove(id: string, options?: { permanent?: boolean }): void {
    this.state = removeEntity(this.state, id, options);
    this.notify();
  }

  /**
   * Move entity to trash (soft delete)
   */
  moveToTrash(id: string): void {
    this.state = moveEntityToTrash(this.state, id);
    this.notify();
  }

  /**
   * Restore entity from trash
   */
  restoreFromTrash(id: string, options?: { parentId?: string; index?: number }): void {
    this.state = restoreEntityFromTrash(this.state, id, options);
    this.notify();
  }

  /**
   * Empty trash (permanently delete all trashed entities)
   */
  emptyTrash(): { deletedCount: number; errors: string[] } {
    const result = emptyTrash(this.state);
    this.state = result.state;
    this.notify();
    return { deletedCount: result.deletedCount, errors: result.errors };
  }

  /**
   * Get all trashed entity IDs
   */
  getTrashedIds(): string[] {
    return Object.keys(this.state.trashedEntities);
  }

  /**
   * Get trashed entity metadata
   */
  getTrashedEntity(id: string): TrashedEntity | null {
    return this.state.trashedEntities[id] || null;
  }

  /**
   * Check if entity is in trash
   */
  isTrashed(id: string): boolean {
    return id in this.state.trashedEntities;
  }

  /**
   * Move entity
   */
  move(id: string, newParentId: string, index?: number): void {
    this.state = moveEntity(this.state, id, newParentId, index);
    this.notify();
  }

  /**
   * Get parent ID
   */
  getParent(id: string): string | null {
    return getParentId(this.state, id);
  }

  /**
   * Get child IDs
   */
  getChildren(id: string): string[] {
    return getChildIds(this.state, id);
  }

  // ============================================================================
  // Collection Membership (Non-hierarchical, many-to-many)
  // ============================================================================

  /**
   * Get all Collections that contain a resource
   */
  getCollectionsContaining(resourceId: string): string[] {
    return getCollectionsContaining(this.state, resourceId);
  }

  /**
   * Get all members of a Collection
   */
  getCollectionMembers(collectionId: string): string[] {
    return getCollectionMembers(this.state, collectionId);
  }

  /**
   * Check if a Manifest is standalone (not in any Collection)
   */
  isOrphanManifest(manifestId: string): boolean {
    return isOrphanManifest(this.state, manifestId);
  }

  /**
   * Get all standalone Manifests
   */
  getOrphanManifests(): IIIFManifest[] {
    return getOrphanManifests(this.state);
  }

  /**
   * Add a resource to a Collection (reference, not ownership)
   */
  addToCollection(collectionId: string, resourceId: string): void {
    this.state = addToCollection(this.state, collectionId, resourceId);
    this.notify();
  }

  /**
   * Remove a resource from a Collection (removes reference only)
   */
  removeFromCollection(collectionId: string, resourceId: string): void {
    this.state = removeFromCollection(this.state, collectionId, resourceId);
    this.notify();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: NormalizedState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  /**
   * Create snapshot for undo/redo
   */
  snapshot(): VaultSnapshot {
    return {
      state: this.state, // Immutable, safe to share
      timestamp: Date.now()
    };
  }

  /**
   * Restore from snapshot
   */
  restore(snapshot: VaultSnapshot): void {
    this.state = snapshot.state;
    this.notify();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let vaultInstance: Vault | null = null;

export function getVault(): Vault {
  if (!vaultInstance) {
    vaultInstance = new Vault();
  }
  return vaultInstance;
}

export function resetVault(): void {
  vaultInstance = null;
}
