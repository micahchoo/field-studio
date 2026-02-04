/**
 * Staging Feature Model
 *
 * Domain-specific selectors and helpers for the staging feature.
 * Manages the two-pane import workbench: source manifests and target collections.
 *
 * ATOMIC REFACTOR NOTE: This feature slice follows the Atomic Design philosophy.
 * - Organisms receive cx and fieldMode via props from FieldModeTemplate
 * - Molecules from shared/ui/molecules are composed here
 * - No prop-drilling of fieldMode - context is injected at template level
 *
 * LEGACY DECOMPOSITION:
 * - StagingWorkbench.tsx (main view) → StagingView organism
 * - SourcePane.tsx (left pane) → SourcePane sub-organism or molecule
 * - useStagingState.ts → This model layer
 * - useSourceManifestsBuilder.ts → Source manifest building logic
 *
 * TODO: Full refactoring requires extracting:
 *   - StagingWorkbench logic → StagingView organism
 *   - SourcePane component → Either feature molecule or shared molecule
 *   - CanvasItem/CollectionCard → Shared molecules
 *   - Drag-drop logic → Reusable hook in shared/lib
 *
 * @module features/staging/model
 */

import type { IIIFCollection, IIIFItem, IIIFManifest } from '@/types';
import { collection, manifest } from '@/src/entities';

// Re-export entity models for convenience
export { collection, manifest };

// ============================================================================
// Types
// ============================================================================

/**
 * Source manifest from external import
 * Represents a manifest that hasn't been fully integrated yet
 */
export interface SourceManifest {
  id: string;
  label: string;
  canvases: SourceCanvas[];
  isPartial?: boolean;
  sourceUrl?: string;
}

/**
 * Canvas within a source manifest
 */
export interface SourceCanvas {
  id: string;
  label: string;
  thumbnail?: string;
  blobUrl?: string;
  width?: number;
  height?: number;
}

/**
 * Collection of source manifests
 * The left pane of the staging workbench
 */
export interface SourceManifests {
  byId: Record<string, SourceManifest>;
  allIds: string[];
}

/**
 * Staging operation types
 */
export type StagingAction =
  | { type: 'ADD_TO_COLLECTION'; manifestIds: string[]; collectionId: string }
  | { type: 'REORDER_CANVASES'; manifestId: string; newOrder: string[] }
  | { type: 'REMOVE_FROM_SOURCE'; manifestId: string }
  | { type: 'CREATE_COLLECTION'; label: string; manifestIds: string[] }
  | { type: 'MERGE_MANIFESTS'; sourceIds: string[]; targetId: string };

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get all source manifests as array
 *
 * @param sourceManifests - Source manifests collection
 * @returns Array of source manifests
 */
export const selectAllSourceManifests = (
  sourceManifests: SourceManifests
): SourceManifest[] => {
  return sourceManifests.allIds.map((id) => sourceManifests.byId[id]);
};

/**
 * Get source manifest by ID
 *
 * @param sourceManifests - Source manifests collection
 * @param id - Manifest ID
 * @returns Source manifest or undefined
 */
export const selectSourceManifestById = (
  sourceManifests: SourceManifests,
  id: string
): SourceManifest | undefined => {
  return sourceManifests.byId[id];
};

/**
 * Get total canvas count across all source manifests
 *
 * @param sourceManifests - Source manifests collection
 * @returns Total canvas count
 */
export const selectTotalCanvasCount = (
  sourceManifests: SourceManifests
): number => {
  return Object.values(sourceManifests.byId).reduce(
    (sum, m) => sum + m.canvases.length,
    0
  );
};

/**
 * Get selected manifests by ID list
 *
 * @param sourceManifests - Source manifests collection
 * @param selectedIds - Selected manifest IDs
 * @returns Array of selected manifests
 */
export const selectSelectedManifests = (
  sourceManifests: SourceManifests,
  selectedIds: string[]
): SourceManifest[] => {
  return selectedIds
    .map((id) => sourceManifests.byId[id])
    .filter(Boolean);
};

// ============================================================================
// Source Manifest Operations
// ============================================================================

/**
 * Create a source manifest from a IIIF manifest
 * Extracts only the data needed for staging
 *
 * @param manifest - IIIF manifest
 * @returns Source manifest
 */
export const createSourceManifest = (
  manifest: IIIFManifest
): SourceManifest => {
  return {
    id: manifest.id,
    label: manifest.label?.en?.[0] || manifest.label?.none?.[0] || 'Untitled',
    canvases:
      manifest.items?.map((canvas) => ({
        id: canvas.id,
        label:
          canvas.label?.en?.[0] || canvas.label?.none?.[0] || 'Untitled',
        thumbnail: canvas.thumbnail?.[0]?.id,
        width: canvas.width,
        height: canvas.height,
      })) || [],
  };
};

/**
 * Add source manifest to collection
 *
 * @param sourceManifests - Current source manifests
 * @param manifest - New source manifest
 * @returns Updated source manifests
 */
export const addSourceManifest = (
  sourceManifests: SourceManifests,
  manifest: SourceManifest
): SourceManifests => {
  if (sourceManifests.byId[manifest.id]) {
    // Merge canvases if manifest already exists
    const existing = sourceManifests.byId[manifest.id];
    const mergedCanvases = [...existing.canvases];

    manifest.canvases.forEach((canvas) => {
      if (!mergedCanvases.find((c) => c.id === canvas.id)) {
        mergedCanvases.push(canvas);
      }
    });

    return {
      ...sourceManifests,
      byId: {
        ...sourceManifests.byId,
        [manifest.id]: {
          ...existing,
          canvases: mergedCanvases,
        },
      },
    };
  }

  return {
    byId: {
      ...sourceManifests.byId,
      [manifest.id]: manifest,
    },
    allIds: [...sourceManifests.allIds, manifest.id],
  };
};

/**
 * Remove source manifest from collection
 *
 * @param sourceManifests - Current source manifests
 * @param id - Manifest ID to remove
 * @returns Updated source manifests
 */
export const removeSourceManifest = (
  sourceManifests: SourceManifests,
  id: string
): SourceManifests => {
  const { [id]: _, ...remainingById } = sourceManifests.byId;
  return {
    byId: remainingById,
    allIds: sourceManifests.allIds.filter((manifestId) => manifestId !== id),
  };
};

/**
 * Reorder canvases within a source manifest
 *
 * @param sourceManifests - Current source manifests
 * @param manifestId - Manifest ID
 * @param newOrder - New canvas order (array of canvas IDs)
 * @returns Updated source manifests
 */
export const reorderCanvases = (
  sourceManifests: SourceManifests,
  manifestId: string,
  newOrder: string[]
): SourceManifests => {
  const manifest = sourceManifests.byId[manifestId];
  if (!manifest) return sourceManifests;

  const canvasMap = new Map(manifest.canvases.map((c) => [c.id, c]));
  const reorderedCanvases = newOrder
    .map((id) => canvasMap.get(id))
    .filter(Boolean) as SourceCanvas[];

  return {
    ...sourceManifests,
    byId: {
      ...sourceManifests.byId,
      [manifestId]: {
        ...manifest,
        canvases: reorderedCanvases,
      },
    },
  };
};

// ============================================================================
// Target Collection Operations
// ============================================================================

/**
 * Create IIIF collection from selected manifests
 *
 * @param label - Collection label
 * @param manifests - Source manifests to include
 * @returns New IIIF collection
 */
export const createCollectionFromManifests = (
  label: string,
  manifests: SourceManifest[]
): IIIFCollection => {
  const id = `https://example.com/collection/${Date.now()}`;

  return {
    id,
    type: 'Collection',
    label: { en: [label] },
    items: manifests.map((m) => ({
      id: m.id,
      type: 'Manifest' as const,
      label: { en: [m.label] },
      items: [], // Required by IIIFManifest type
    })),
  };
};

/**
 * Merge source manifests into a single manifest
 * Used for combining similar files (e.g., multi-angle shots)
 *
 * @param sourceIds - Source manifest IDs to merge
 * @param targetId - Target manifest ID (receives all canvases)
 * @param sourceManifests - Source manifests collection
 * @returns Updated source manifests
 */
export const mergeSourceManifests = (
  sourceManifests: SourceManifests,
  sourceIds: string[],
  targetId: string
): SourceManifests => {
  const target = sourceManifests.byId[targetId];
  if (!target) return sourceManifests;

  const allCanvases = [...target.canvases];

  sourceIds.forEach((id) => {
    if (id === targetId) return;
    const source = sourceManifests.byId[id];
    if (source) {
      allCanvases.push(...source.canvases);
    }
  });

  // Remove merged sources
  let updated = {
    ...sourceManifests,
    byId: {
      ...sourceManifests.byId,
      [targetId]: {
        ...target,
        canvases: allCanvases,
      },
    },
  };

  sourceIds.forEach((id) => {
    if (id !== targetId) {
      updated = removeSourceManifest(updated, id);
    }
  });

  return updated;
};

// ============================================================================
// Similarity Detection
// ============================================================================

/**
 * Find similar filenames that might be related
 * Useful for detecting multi-angle shots or sequences
 *
 * @param filenames - Array of filenames
 * @returns Groups of similar filenames
 */
export const findSimilarFilenames = (filenames: string[]): string[][] => {
  const groups: string[][] = [];
  const processed = new Set<string>();

  filenames.forEach((name) => {
    if (processed.has(name)) return;

    const base = name.replace(/_\d+\.[^.]+$/, '').replace(/\.[^.]+$/, '');
    const similar = filenames.filter((n) => {
      const otherBase = n.replace(/_\d+\.[^.]+$/, '').replace(/\.[^.]+$/, '');
      return otherBase === base && n !== name;
    });

    if (similar.length > 0) {
      groups.push([name, ...similar]);
      processed.add(name);
      similar.forEach((s) => processed.add(s));
    }
  });

  return groups;
};
