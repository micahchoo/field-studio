/**
 * IIIF Metadata Enrichment
 * Organism - depends on traversal
 */

import { findAllOfType, getAllCanvases } from './traversal';
import type { IIIFItem } from '../../../types';

// ============================================================================
// Types
// ============================================================================

export interface ThumbnailSpec {
  id: string;
  type: 'Image';
  format?: string;
  width?: number;
  height?: number;
}

export interface EnrichmentResult {
  thumbnail?: ThumbnailSpec;
  thumbnails?: ThumbnailSpec[];
  summary?: string;
}

// ============================================================================
// Thumbnail Generation
// ============================================================================

/**
 * Generate thumbnail metadata for a resource
 */
export function generateThumbnailMetadata(
  resource: IIIFItem,
  maxWidth = 400
): ThumbnailSpec | undefined {
  // If resource has thumbnail property, use it
  const r = resource as Record<string, unknown>;
  if (r.thumbnail && Array.isArray(r.thumbnail) && r.thumbnail.length > 0) {
    return r.thumbnail[0] as ThumbnailSpec;
  }

  // For Canvas, try to get from painting annotation
  if (resource.type === 'Canvas') {
    const canvas = resource as Record<string, unknown>;
    const items = canvas.items as IIIFItem[] | undefined;
    if (items && items.length > 0) {
      const annotationPage = items[0];
      const ap = annotationPage as Record<string, unknown>;
      const annotations = ap.items as IIIFItem[] | undefined;
      if (annotations && annotations.length > 0) {
        const annotation = annotations[0];
        const a = annotation as Record<string, unknown>;
        const body = a.body as ThumbnailSpec | undefined;
        if (body) {
          return {
            id: body.id,
            type: 'Image',
            format: body.format,
            width: maxWidth,
            height: body.height
              ? Math.round((body.height / (body.width || 1)) * maxWidth)
              : undefined,
          };
        }
      }
    }
  }

  return undefined;
}

/**
 * Get stacked thumbnails for Collection/Manifest
 */
export function getStackedThumbnails(
  resource: IIIFItem,
  maxCount = 3
): ThumbnailSpec[] {
  const thumbnails: ThumbnailSpec[] = [];

  if (resource.type === 'Collection') {
    const manifests = findAllOfType(resource, 'Manifest').slice(0, maxCount);
    for (const manifest of manifests) {
      const thumb = generateThumbnailMetadata(manifest);
      if (thumb) thumbnails.push(thumb);
    }
  } else if (resource.type === 'Manifest') {
    const canvases = getAllCanvases(resource).slice(0, maxCount);
    for (const canvas of canvases) {
      const thumb = generateThumbnailMetadata(canvas);
      if (thumb) thumbnails.push(thumb);
    }
  }

  return thumbnails;
}

// ============================================================================
// Summary Generation
// ============================================================================

/**
 * Generate a summary for a resource
 */
export function generateSummary(resource: IIIFItem): string {
  const r = resource as Record<string, unknown>;

  // Use existing summary if available
  if (r.summary) {
    const summary = r.summary as Record<string, string[]>;
    const values = Object.values(summary).flat();
    return values[0] || '';
  }

  // Generate from child count
  if (resource.type === 'Collection') {
    const items = r.items as IIIFItem[] | undefined;
    const count = items?.length || 0;
    return `Collection with ${count} item${count !== 1 ? 's' : ''}`;
  }

  if (resource.type === 'Manifest') {
    const canvases = getAllCanvases(resource);
    return `${canvases.length} page${canvases.length !== 1 ? 's' : ''}`;
  }

  return '';
}

// ============================================================================
// Batch Enrichment
// ============================================================================

/**
 * Enrich a single resource with computed metadata
 */
export function enrichIIIFMetadata(resource: IIIFItem): EnrichmentResult {
  return {
    thumbnail: generateThumbnailMetadata(resource),
    thumbnails: getStackedThumbnails(resource),
    summary: generateSummary(resource),
  };
}

/**
 * Enrich an entire tree with metadata
 */
export function enrichTreeMetadata(root: IIIFItem): Map<string, EnrichmentResult> {
  const enriched = new Map<string, EnrichmentResult>();

  const process = (item: IIIFItem) => {
    const result = enrichIIIFMetadata(item);
    enriched.set(item.id, result);

    const r = item as Record<string, unknown>;
    const items = r.items as IIIFItem[] | undefined;
    if (items) {
      items.forEach(process);
    }
  };

  process(root);
  return enriched;
}

/**
 * Batch enrich multiple resources
 */
export function batchEnrichMetadata(
  resources: IIIFItem[]
): Array<{ id: string; enrichment: EnrichmentResult }> {
  return resources.map((resource) => ({
    id: resource.id,
    enrichment: enrichIIIFMetadata(resource),
  }));
}
