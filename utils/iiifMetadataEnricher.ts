/**
 * IIIF Metadata Enricher
 *
 * Enriches manifests and collections with thumbnails and summary metadata
 * per IIIF Presentation API 3.0 recommendations.
 */

import { IIIFItem, IIIFManifest, IIIFCollection, getIIIFValue, isManifest, isCollection } from '../types';
import { resolveHierarchicalThumbs, resolveLeafCanvases } from './imageSourceResolver';

/**
 * Thumbnail specification for IIIF resources
 */
export interface ThumbnailSpec {
  id: string;
  type: "Image";
  format: string;
  width?: number;
  height?: number;
}

/**
 * Enrich a manifest or collection with thumbnail metadata.
 * Uses hierarchical thumbnail resolution to find images from child canvases.
 *
 * @param item - The IIIF item to enrich
 * @param thumbWidth - Preferred thumbnail width (default: 200)
 * @returns The thumbnail spec or null if no images found
 */
export function generateThumbnailMetadata(
  item: IIIFItem,
  thumbWidth: number = 200
): ThumbnailSpec[] | null {
  // Resolve up to 4 thumbnails for stacked display
  const thumbs = resolveHierarchicalThumbs(item, thumbWidth);

  if (thumbs.length === 0) {
    return null;
  }

  // Create thumbnail specs from resolved URLs
  return thumbs.map(url => ({
    id: url,
    type: "Image" as const,
    format: "image/jpeg",
    width: thumbWidth,
    height: thumbWidth // Approximate square aspect ratio
  }));
}

/**
 * Generate a summary for a manifest or collection based on its contents.
 *
 * @param item - The IIIF item
 * @returns Summary string appropriate for the item type
 */
export function generateSummary(item: IIIFItem): string {
  const label = getIIIFValue(item.label) || 'Untitled';

  if (isManifest(item)) {
    const manifest = item as IIIFManifest;
    const canvasCount = manifest.items?.length || 0;
    const hasStructures = manifest.structures && manifest.structures.length > 0;

    if (canvasCount === 0) {
      return `Empty manifest: ${label}`;
    }

    const structureInfo = hasStructures
      ? ` with ${manifest.structures!.length} sections`
      : '';

    return `Manifest containing ${canvasCount} canvas${canvasCount !== 1 ? 'es' : ''}${structureInfo}`;
  }

  if (isCollection(item)) {
    const collection = item as IIIFCollection;
    const itemCount = collection.items?.length || 0;

    // Count manifests vs sub-collections
    const manifestCount = collection.items?.filter(i => isManifest(i)).length || 0;
    const subCollectionCount = collection.items?.filter(i => isCollection(i)).length || 0;

    if (itemCount === 0) {
      return `Empty collection: ${label}`;
    }

    const parts: string[] = [];
    if (manifestCount > 0) parts.push(`${manifestCount} manifest${manifestCount !== 1 ? 's' : ''}`);
    if (subCollectionCount > 0) parts.push(`${subCollectionCount} collection${subCollectionCount !== 1 ? 's' : ''}`);

    return `Collection: ${label} (${parts.join(', ')})`;
  }

  return `${item.type}: ${label}`;
}

/**
 * Enrich an item with IIIF-compliant metadata.
 * Adds thumbnail and summary if not already present.
 *
 * @param item - The IIIF item to enrich
 * @param options - Enrichment options
 * @returns The enriched item (mutates in place for performance)
 */
export function enrichIIIFMetadata(
  item: IIIFItem,
  options: {
    thumbWidth?: number;
    forceUpdate?: boolean;
    includeSummary?: boolean;
  } = {}
): IIIFItem {
  const { thumbWidth = 200, forceUpdate = false, includeSummary = true } = options;

  // Only enrich manifests and collections
  if (!isManifest(item) && !isCollection(item)) {
    return item;
  }

  // Add thumbnail if missing or force update
  if (forceUpdate || !item.thumbnail || item.thumbnail.length === 0) {
    const thumbs = generateThumbnailMetadata(item, thumbWidth);
    if (thumbs) {
      item.thumbnail = thumbs;
    }
  }

  // Add summary if missing or force update
  if (includeSummary && (forceUpdate || !item.summary || Object.keys(item.summary).length === 0)) {
    const summaryText = generateSummary(item);
    item.summary = { none: [summaryText] };
  }

  return item;
}

/**
 * Recursively enrich all manifests and collections in a tree.
 *
 * @param root - The root IIIF item
 * @param options - Enrichment options
 * @returns The enriched root (mutates in place)
 */
export function enrichTreeMetadata(
  root: IIIFItem,
  options: {
    thumbWidth?: number;
    forceUpdate?: boolean;
    includeSummary?: boolean;
  } = {}
): IIIFItem {
  const enrich = (item: IIIFItem): void => {
    // Enrich this item if it's a manifest or collection
    if (isManifest(item) || isCollection(item)) {
      enrichIIIFMetadata(item, options);
    }

    // Recurse into children
    if (item.items && Array.isArray(item.items)) {
      item.items.forEach(child => {
        if (typeof child === 'object' && child !== null) {
          enrich(child as IIIFItem);
        }
      });
    }
  };

  enrich(root);
  return root;
}

/**
 * Get stacked thumbnail URLs for a manifest or collection.
 * Returns up to 4 thumbnail URLs for display.
 *
 * @param item - The IIIF item
 * @param width - Preferred thumbnail width
 * @returns Array of thumbnail URLs
 */
export function getStackedThumbnails(
  item: IIIFItem | null | undefined,
  width: number = 200
): string[] {
  if (!item) return [];

  // First check if item already has thumbnails
  if (item.thumbnail && item.thumbnail.length > 0) {
    return item.thumbnail
      .map(t => t.id)
      .filter((id): id is string => !!id)
      .slice(0, 4);
  }

  // Otherwise resolve from children
  return resolveHierarchicalThumbs(item, width);
}

/**
 * Batch enrich operation for multiple items.
 * Useful when processing a collection of manifests.
 *
 * @param items - Array of IIIF items
 * @param options - Enrichment options
 * @returns Array of enriched items
 */
export function batchEnrichMetadata(
  items: IIIFItem[],
  options: {
    thumbWidth?: number;
    forceUpdate?: boolean;
    includeSummary?: boolean;
  } = {}
): IIIFItem[] {
  return items.map(item => enrichIIIFMetadata(item, options));
}

export default {
  generateThumbnailMetadata,
  generateSummary,
  enrichIIIFMetadata,
  enrichTreeMetadata,
  getStackedThumbnails,
  batchEnrichMetadata
};
