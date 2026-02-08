/**
 * Vault Denormalization (Organism Layer)
 *
 * Functions for reconstructing nested IIIF trees from flat normalized state.
 * Complementary to normalization - converts flat storage back to tree structure.
 */

import type {
  IIIFAnnotationPage,
  IIIFCanvas,
  IIIFCollection,
  IIIFItem,
  IIIFManifest,
  IIIFRange,
  NormalizedState
} from '@/src/shared/types';
import { cloneAsRecord, recordAs } from './cloning';
import { applyExtensions } from './extensions';

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
      return denormalizeCollection(state, id);
    }

    case 'Manifest': {
      return denormalizeManifest(state, id);
    }

    case 'Canvas': {
      return denormalizeCanvas(state, id);
    }

    case 'Range': {
      return denormalizeRange(state, id);
    }

    default:
      throw new Error(`Cannot denormalize type: ${type}`);
  }
}

/**
 * Denormalize a Collection entity
 */
function denormalizeCollection(state: NormalizedState, id: string): IIIFCollection {
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

/**
 * Denormalize a Manifest entity
 */
function denormalizeManifest(state: NormalizedState, id: string): IIIFManifest {
  const manifest = cloneAsRecord(state.entities.Manifest[id]);
  const childIds = state.references[id] || [];

  // Reconstruct canvases
  manifest.items = childIds
    .filter(childId => state.typeIndex[childId] === 'Canvas')
    .map(childId => denormalizeCanvas(state, childId));

  // Reconstruct structures (ranges) — use references index instead of scanning all ranges
  const rangeIds = (state.references[id] || [])
    .filter(childId => state.typeIndex[childId] === 'Range');

  if (rangeIds.length > 0) {
    manifest.structures = rangeIds.map(rid => {
      const range = cloneAsRecord(state.entities.Range[rid]);
      applyExtensions(range, state.extensions[rid]);
      return recordAs<IIIFRange>(range);
    });
  }

  // Apply preserved extensions
  applyExtensions(manifest, state.extensions[id]);

  return recordAs<IIIFManifest>(manifest);
}

/**
 * Check if an annotation page contains painting annotations.
 * Per IIIF spec, all annotations in a page share the same motivation,
 * so checking only the first annotation is sufficient — O(1) instead of O(n).
 */
function isPaintingAnnotationPage(state: NormalizedState, pageId: string): boolean {
  const annoIds = state.references[pageId] || [];
  if (annoIds.length === 0) return false;

  // Check first annotation only — spec guarantees homogeneous motivation per page
  const firstAnno = state.entities.Annotation[annoIds[0]];
  if (!firstAnno) return false;
  return (firstAnno as unknown as Record<string, unknown>).motivation === 'painting';
}

/**
 * Denormalize a Canvas with its annotation pages
 * Separates painting annotations (canvas.items) from non-painting (canvas.annotations)
 */
export function denormalizeCanvas(state: NormalizedState, id: string): IIIFCanvas {
  const canvas = cloneAsRecord(state.entities.Canvas[id]);
  const pageIds = state.references[id] || [];

  // Filter to only annotation pages
  const annotationPageIds = pageIds.filter(pid => state.typeIndex[pid] === 'AnnotationPage');

  // Separate painting vs non-painting annotation pages based on annotation motivation
  const paintingPageIds: string[] = [];
  const nonPaintingPageIds: string[] = [];

  for (const pageId of annotationPageIds) {
    if (isPaintingAnnotationPage(state, pageId)) {
      paintingPageIds.push(pageId);
    } else {
      nonPaintingPageIds.push(pageId);
    }
  }

  // Reconstruct painting annotation pages (canvas.items)
  canvas.items = paintingPageIds.map(pid => denormalizeAnnotationPage(state, pid));

  // Reconstruct non-painting annotation pages (canvas.annotations)
  if (nonPaintingPageIds.length > 0) {
    canvas.annotations = nonPaintingPageIds.map(pid => denormalizeAnnotationPage(state, pid));
  }

  // Apply preserved extensions
  applyExtensions(canvas, state.extensions[id]);

  return recordAs<IIIFCanvas>(canvas);
}

/**
 * Denormalize a Range entity
 */
function denormalizeRange(state: NormalizedState, id: string): IIIFRange {
  const range = cloneAsRecord(state.entities.Range[id]);
  applyExtensions(range, state.extensions[id]);
  return recordAs<IIIFRange>(range);
}

/**
 * Denormalize an annotation page with its annotations
 */
export function denormalizeAnnotationPage(state: NormalizedState, id: string): IIIFAnnotationPage {
  const page = cloneAsRecord(state.entities.AnnotationPage[id]);
  const annoIds = state.references[id] || [];

  page.items = annoIds
    .filter(aid => state.typeIndex[aid] === 'Annotation')
    .map(aid => {
      const anno = cloneAsRecord(state.entities.Annotation[aid]);
      applyExtensions(anno, state.extensions[aid]);
      return recordAs<import('@/src/shared/types').IIIFAnnotation>(anno);
    });

  // Apply preserved extensions
  applyExtensions(page, state.extensions[id]);

  return recordAs<IIIFAnnotationPage>(page);
}

// Re-export for use by other modules
export { denormalizeItem };
