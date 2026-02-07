/**
 * Vault Normalization (Organism Layer)
 *
 * Functions for converting nested IIIF trees into flat normalized state.
 * This is a complex organism composed of smaller normalization molecules.
 */

import { sanitizeAnnotationBody } from '@/utils/sanitization';
import type {
  EntityType,
  IIIFAnnotationPage,
  IIIFCanvas,
  IIIFCollection,
  IIIFItem,
  IIIFManifest,
  IIIFRange,
  NormalizedState
} from '@/src/shared/types';
import { cloneAsRecord, hasType } from './cloning';
import { extractExtensions } from './extensions';

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
  const { id } = item;

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
      normalizeCollection(item as IIIFCollection, state, id);
      break;
    }

    case 'Manifest': {
      normalizeManifest(item as IIIFManifest, state, id);
      break;
    }

    case 'Canvas': {
      normalizeCanvas(item as IIIFCanvas, state, id);
      break;
    }

    case 'Range': {
      normalizeRange(item as IIIFRange, state, id);
      break;
    }

    default:
      console.warn(`Unknown entity type: ${type}`);
  }
}

/**
 * Normalize a Collection entity
 */
function normalizeCollection(
  collection: IIIFCollection,
  state: NormalizedState,
  id: string
): void {
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
}

/**
 * Normalize a Manifest entity
 */
function normalizeManifest(
  manifest: IIIFManifest,
  state: NormalizedState,
  id: string
): void {
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
}

/**
 * Normalize a Canvas entity
 */
function normalizeCanvas(
  canvas: IIIFCanvas,
  state: NormalizedState,
  id: string
): void {
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
      childIds.push(page.id);
      normalizeAnnotationPage(page, state, id);
    }
  }

  state.references[id] = childIds;
}

/**
 * Normalize a Range entity
 */
function normalizeRange(
  range: IIIFRange,
  state: NormalizedState,
  id: string
): void {
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
}

/**
 * Normalize an annotation page and its annotations
 */
function normalizeAnnotationPage(
  page: IIIFAnnotationPage,
  state: NormalizedState,
  parentId: string
): void {
  const { id } = page;

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

// Re-export for use by other modules
export { normalizeItem, normalizeAnnotationPage };
