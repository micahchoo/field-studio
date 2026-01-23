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

// ============================================================================
// Types
// ============================================================================

export type EntityType = 'Collection' | 'Manifest' | 'Canvas' | 'Range' | 'AnnotationPage' | 'Annotation';

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

  /** Parent → child ID references */
  references: Record<string, string[]>;

  /** Child → parent ID reverse lookup */
  reverseRefs: Record<string, string>;

  /** Root entity ID */
  rootId: string | null;

  /** Entity type index for O(1) type lookup */
  typeIndex: Record<string, EntityType>;

  /**
   * Extension preservation for round-tripping
   * Stores unknown/vendor-specific properties by entity ID
   * Ensures properties like Mirador configs, Tify settings survive import/export
   */
  extensions: Record<string, Record<string, unknown>>;
}

/**
 * Known IIIF Presentation API 3.0 properties by entity type
 * Properties not in this list are preserved as extensions
 */
const KNOWN_IIIF_PROPERTIES: Record<EntityType | 'common', Set<string>> = {
  common: new Set([
    '@context', 'id', 'type', 'label', 'summary', 'metadata', 'requiredStatement',
    'rights', 'navDate', 'thumbnail', 'behavior', 'provider', 'homepage', 'seeAlso',
    'rendering', 'service', 'services', 'partOf', 'items', 'annotations',
    // Internal properties (prefixed with _)
    '_fileRef', '_blobUrl', '_parentId', '_state', '_filename'
  ]),
  Collection: new Set(['viewingDirection']),
  Manifest: new Set(['viewingDirection', 'structures', 'start', 'supplementary', 'placeholderCanvas', 'accompanyingCanvas']),
  Canvas: new Set(['width', 'height', 'duration']),
  Range: new Set(['supplementary', 'start', 'viewingDirection']),
  AnnotationPage: new Set([]),
  Annotation: new Set(['motivation', 'body', 'target', 'bodyValue'])
};

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
    rootId: null,
    typeIndex: {},
    extensions: {}
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
  const extensions = extractExtensions(item as Record<string, unknown>, type);
  if (Object.keys(extensions).length > 0) {
    state.extensions[id] = extensions;
  }

  // Process based on type
  switch (type) {
    case 'Collection': {
      const collection = item as IIIFCollection;
      const childIds: string[] = [];

      // Store without nested items
      state.entities.Collection[id] = {
        ...collection,
        items: [] // Will be reconstructed on denormalize
      };

      // Normalize children
      if (collection.items) {
        for (const child of collection.items) {
          childIds.push(child.id);
          normalizeItem(child, state, id);
        }
      }

      state.references[id] = childIds;
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
          if ((rangeItem as any).type === 'Range') {
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
  const pageExtensions = extractExtensions(page as Record<string, unknown>, 'AnnotationPage');
  if (Object.keys(pageExtensions).length > 0) {
    state.extensions[id] = pageExtensions;
  }

  // Store page without nested annotations
  state.entities.AnnotationPage[id] = {
    ...page,
    items: []
  };

  // Normalize annotations
  const annotationIds: string[] = [];
  if (page.items) {
    for (const anno of page.items) {
      annotationIds.push(anno.id);
      state.typeIndex[anno.id] = 'Annotation';
      state.reverseRefs[anno.id] = id;
      state.entities.Annotation[anno.id] = { ...anno };

      // Extract extensions from annotation
      const annoExtensions = extractExtensions(anno as Record<string, unknown>, 'Annotation');
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
      const collection = { ...state.entities.Collection[id] } as Record<string, unknown>;
      const childIds = state.references[id] || [];

      collection.items = childIds
        .map(childId => denormalizeItem(state, childId))
        .filter(Boolean);

      // Apply preserved extensions
      applyExtensions(collection, state.extensions[id]);

      return collection as IIIFCollection;
    }

    case 'Manifest': {
      const manifest = { ...state.entities.Manifest[id] } as Record<string, unknown>;
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
          const range = { ...state.entities.Range[rid] } as Record<string, unknown>;
          applyExtensions(range, state.extensions[rid]);
          return range;
        });
      }

      // Apply preserved extensions
      applyExtensions(manifest, state.extensions[id]);

      return manifest as IIIFManifest;
    }

    case 'Canvas':
      return denormalizeCanvas(state, id);

    case 'Range': {
      const range = { ...state.entities.Range[id] } as Record<string, unknown>;
      applyExtensions(range, state.extensions[id]);
      return range as IIIFRange;
    }

    default:
      throw new Error(`Cannot denormalize type: ${type}`);
  }
}

/**
 * Denormalize a canvas with its annotation pages
 */
function denormalizeCanvas(state: NormalizedState, id: string): IIIFCanvas {
  const canvas = { ...state.entities.Canvas[id] } as Record<string, unknown>;
  const pageIds = state.references[id] || [];

  // Reconstruct painting annotation pages
  canvas.items = pageIds
    .filter(pid => state.typeIndex[pid] === 'AnnotationPage')
    .map(pid => denormalizeAnnotationPage(state, pid));

  // Apply preserved extensions
  applyExtensions(canvas, state.extensions[id]);

  return canvas as IIIFCanvas;
}

/**
 * Denormalize an annotation page with its annotations
 */
function denormalizeAnnotationPage(state: NormalizedState, id: string): IIIFAnnotationPage {
  const page = { ...state.entities.AnnotationPage[id] } as Record<string, unknown>;
  const annoIds = state.references[id] || [];

  page.items = annoIds
    .filter(aid => state.typeIndex[aid] === 'Annotation')
    .map(aid => {
      const anno = { ...state.entities.Annotation[aid] } as Record<string, unknown>;
      applyExtensions(anno, state.extensions[aid]);
      return anno as IIIFAnnotation;
    });

  // Apply preserved extensions
  applyExtensions(page, state.extensions[id]);

  return page as IIIFAnnotationPage;
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
// Update Functions (Immutable)
// ============================================================================

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
    console.warn(`Entity not found: ${id}`);
    return state;
  }

  const store = state.entities[type] as Record<string, IIIFItem>;
  const existing = store[id];
  if (!existing) return state;

  // Create new entity with updates
  const updated = { ...existing, ...updates };

  // Return new state with only the affected store changed
  return {
    ...state,
    entities: {
      ...state.entities,
      [type]: {
        ...store,
        [id]: updated
      }
    }
  };
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
  const id = entity.id;

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
 */
export function removeEntity(
  state: NormalizedState,
  id: string
): NormalizedState {
  const type = state.typeIndex[id];
  if (!type) return state;

  // Get all IDs to remove (entity + descendants)
  const toRemove = new Set([id, ...getDescendants(state, id)]);

  // Create new stores with entities removed
  const newEntities = { ...state.entities };
  for (const entityType of Object.keys(newEntities) as EntityType[]) {
    const store = newEntities[entityType] as Record<string, IIIFItem>;
    const filtered: Record<string, IIIFItem> = {};
    for (const [eid, entity] of Object.entries(store)) {
      if (!toRemove.has(eid)) {
        filtered[eid] = entity;
      }
    }
    (newEntities as any)[entityType] = filtered;
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

  return {
    ...state,
    entities: newEntities,
    typeIndex: newTypeIndex,
    references: newReferences,
    reverseRefs: newReverseRefs,
    rootId: toRemove.has(state.rootId!) ? null : state.rootId
  };
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
   * Remove entity
   */
  remove(id: string): void {
    this.state = removeEntity(this.state, id);
    this.notify();
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
