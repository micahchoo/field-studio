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

import type { IIIFCollection, IIIFManifest, FileTree } from '@/src/shared/types';
import type { ContextMenuSectionType } from '@/src/shared/ui/molecules/ContextMenu';
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

// ============================================================================
// Node Annotations — IIIF overrides for FileTree nodes
// ============================================================================

export interface NodeAnnotations {
  iiifIntent?: 'Collection' | 'Manifest' | 'Range' | 'Canvas';
  iiifBehavior?: string[];
  viewingDirection?: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';
  label?: string;
  excluded?: boolean;
  rights?: string;
  navDate?: string;
  start?: boolean;
  provider?: string;
}

// ============================================================================
// FlatFileTreeNode — Virtualised-list–friendly flat representation
// ============================================================================

export interface FlatFileTreeNode {
  path: string;
  name: string;
  depth: number;
  isDirectory: boolean;
  file: File | null;
  childCount: number;
  totalFileCount: number;
  size: number;
  isExpanded: boolean;
  annotations: NodeAnnotations;
}

// ============================================================================
// flattenFileTree — recursive flatten respecting expand state
// ============================================================================

function countFilesRecursive(tree: FileTree): number {
  let count = tree.files.size;
  for (const dir of tree.directories.values()) {
    count += countFilesRecursive(dir);
  }
  return count;
}

export function flattenFileTree(
  tree: FileTree,
  expandedPaths: Set<string>,
  annotationsMap: Map<string, NodeAnnotations>,
  depth = 0,
): FlatFileTreeNode[] {
  const nodes: FlatFileTreeNode[] = [];

  // Sort directories alphabetically
  const sortedDirs = [...tree.directories.entries()].sort(([a], [b]) => a.localeCompare(b));
  // Sort files alphabetically
  const sortedFiles = [...tree.files.entries()].sort(([a], [b]) => a.localeCompare(b));

  for (const [, dir] of sortedDirs) {
    const dirPath = dir.path;
    const isExpanded = expandedPaths.has(dirPath);
    const ann = annotationsMap.get(dirPath) || {};

    nodes.push({
      path: dirPath,
      name: dir.name,
      depth,
      isDirectory: true,
      file: null,
      childCount: dir.directories.size + dir.files.size,
      totalFileCount: countFilesRecursive(dir),
      size: 0,
      isExpanded,
      annotations: ann,
    });

    if (isExpanded) {
      nodes.push(...flattenFileTree(dir, expandedPaths, annotationsMap, depth + 1));
    }
  }

  for (const [fileName, file] of sortedFiles) {
    const filePath = tree.path ? `${tree.path}/${fileName}` : fileName;
    const ann = annotationsMap.get(filePath) || {};

    nodes.push({
      path: filePath,
      name: fileName,
      depth,
      isDirectory: false,
      file,
      childCount: 0,
      totalFileCount: 0,
      size: file.size,
      isExpanded: false,
      annotations: ann,
    });
  }

  return nodes;
}

// ============================================================================
// Context menu section builders
// ============================================================================

export function buildDirectoryMenuSections(
  path: string,
  annotations: NodeAnnotations,
  onAnnotationChange: (path: string, ann: NodeAnnotations) => void,
  onBehaviorModal: (path: string, resourceType: string) => void,
  onClose: () => void,
  metadataCallbacks?: {
    onRightsModal?: (path: string) => void;
    onNavDateModal?: (path: string) => void;
  },
): ContextMenuSectionType[] {
  const currentIntent = annotations.iiifIntent;
  const currentDir = annotations.viewingDirection;

  return [
    {
      title: 'IIIF Structure',
      items: [
        {
          id: 'intent-collection',
          label: currentIntent === 'Collection' ? '\u2713 Collection' : 'Collection',
          icon: 'collections_bookmark',
          onClick: () => {
            onAnnotationChange(path, { ...annotations, iiifIntent: currentIntent === 'Collection' ? undefined : 'Collection' });
            onClose();
          },
        },
        {
          id: 'intent-manifest',
          label: currentIntent === 'Manifest' ? '\u2713 Manifest' : 'Manifest',
          icon: 'auto_stories',
          onClick: () => {
            onAnnotationChange(path, { ...annotations, iiifIntent: currentIntent === 'Manifest' ? undefined : 'Manifest' });
            onClose();
          },
        },
        {
          id: 'intent-range',
          label: currentIntent === 'Range' ? '\u2713 Range' : 'Range',
          icon: 'segment',
          onClick: () => {
            onAnnotationChange(path, { ...annotations, iiifIntent: currentIntent === 'Range' ? undefined : 'Range' });
            onClose();
          },
        },
        {
          id: 'intent-clear',
          label: 'Clear Structure',
          icon: 'block',
          onClick: () => {
            onAnnotationChange(path, { ...annotations, iiifIntent: undefined });
            onClose();
          },
          disabled: !currentIntent,
        },
      ],
    },
    {
      title: 'Viewing Direction',
      items: [
        { id: 'vd-ltr', label: currentDir === 'left-to-right' ? '\u2713 Left to Right' : 'Left to Right', icon: 'arrow_forward', onClick: () => { onAnnotationChange(path, { ...annotations, viewingDirection: currentDir === 'left-to-right' ? undefined : 'left-to-right' }); onClose(); } },
        { id: 'vd-rtl', label: currentDir === 'right-to-left' ? '\u2713 Right to Left' : 'Right to Left', icon: 'arrow_back', onClick: () => { onAnnotationChange(path, { ...annotations, viewingDirection: currentDir === 'right-to-left' ? undefined : 'right-to-left' }); onClose(); } },
        { id: 'vd-ttb', label: currentDir === 'top-to-bottom' ? '\u2713 Top to Bottom' : 'Top to Bottom', icon: 'arrow_downward', onClick: () => { onAnnotationChange(path, { ...annotations, viewingDirection: currentDir === 'top-to-bottom' ? undefined : 'top-to-bottom' }); onClose(); } },
        { id: 'vd-btt', label: currentDir === 'bottom-to-top' ? '\u2713 Bottom to Top' : 'Bottom to Top', icon: 'arrow_upward', onClick: () => { onAnnotationChange(path, { ...annotations, viewingDirection: currentDir === 'bottom-to-top' ? undefined : 'bottom-to-top' }); onClose(); } },
      ],
    },
    {
      items: [
        {
          id: 'set-behavior',
          label: 'Set Behavior\u2026',
          icon: 'tune',
          onClick: () => {
            const resourceType = annotations.iiifIntent || 'Manifest';
            onBehaviorModal(path, resourceType);
            onClose();
          },
        },
      ],
    },
    ...(metadataCallbacks ? [{
      title: 'Metadata',
      items: [
        ...(metadataCallbacks.onRightsModal ? [{
          id: 'set-rights',
          label: annotations.rights ? '\u2713 Rights' : 'Set Rights\u2026',
          icon: 'copyright',
          onClick: () => {
            metadataCallbacks.onRightsModal!(path);
            onClose();
          },
        }] : []),
        ...(metadataCallbacks.onNavDateModal ? [{
          id: 'set-navdate',
          label: annotations.navDate ? '\u2713 Date' : 'Set Date\u2026',
          icon: 'calendar_today',
          onClick: () => {
            metadataCallbacks.onNavDateModal!(path);
            onClose();
          },
        }] : []),
      ],
    }] : []),
  ];
}

export function buildFileMenuSections(
  path: string,
  annotations: NodeAnnotations,
  onAnnotationChange: (path: string, ann: NodeAnnotations) => void,
  onClose: () => void,
  metadataCallbacks?: {
    onRightsModal?: (path: string) => void;
    onNavDateModal?: (path: string) => void;
    onSetStart?: (path: string) => void;
  },
): ContextMenuSectionType[] {
  const behaviors = annotations.iiifBehavior || [];
  const hasFacing = behaviors.includes('facing-pages');
  const hasNonPaged = behaviors.includes('non-paged');
  const isExcluded = !!annotations.excluded;

  return [
    {
      title: 'Canvas Properties',
      items: [
        {
          id: 'facing-pages',
          label: hasFacing ? '\u2713 Facing Pages' : 'Facing Pages',
          icon: 'menu_book',
          onClick: () => {
            const next = hasFacing
              ? behaviors.filter(b => b !== 'facing-pages')
              : [...behaviors.filter(b => b !== 'non-paged'), 'facing-pages'];
            onAnnotationChange(path, { ...annotations, iiifBehavior: next });
            onClose();
          },
        },
        {
          id: 'non-paged',
          label: hasNonPaged ? '\u2713 Non-Paged' : 'Non-Paged',
          icon: 'insert_page_break',
          onClick: () => {
            const next = hasNonPaged
              ? behaviors.filter(b => b !== 'non-paged')
              : [...behaviors.filter(b => b !== 'facing-pages'), 'non-paged'];
            onAnnotationChange(path, { ...annotations, iiifBehavior: next });
            onClose();
          },
        },
        {
          id: 'exclude',
          label: isExcluded ? '\u2713 Excluded from Import' : 'Exclude from Import',
          icon: 'visibility_off',
          variant: isExcluded ? 'danger' : 'default',
          onClick: () => {
            onAnnotationChange(path, { ...annotations, excluded: !isExcluded });
            onClose();
          },
        },
      ],
    },
    ...(metadataCallbacks ? [{
      title: 'Metadata',
      items: [
        ...(metadataCallbacks.onRightsModal ? [{
          id: 'set-rights',
          label: annotations.rights ? '\u2713 Rights' : 'Set Rights\u2026',
          icon: 'copyright',
          onClick: () => {
            metadataCallbacks.onRightsModal!(path);
            onClose();
          },
        }] : []),
        ...(metadataCallbacks.onNavDateModal ? [{
          id: 'set-navdate',
          label: annotations.navDate ? '\u2713 Date' : 'Set Date\u2026',
          icon: 'calendar_today',
          onClick: () => {
            metadataCallbacks.onNavDateModal!(path);
            onClose();
          },
        }] : []),
        ...(metadataCallbacks.onSetStart ? [{
          id: 'set-start',
          label: annotations.start ? '\u2713 Start Canvas' : 'Set as Start Canvas',
          icon: 'star',
          onClick: () => {
            onAnnotationChange(path, { ...annotations, start: !annotations.start });
            onClose();
          },
        }] : []),
      ],
    }] : []),
  ];
}

export function buildCollectionMenuSections(
  collectionId: string,
  callbacks: {
    onRename: (id: string) => void;
    onDelete: (id: string) => void;
    onCreateSub: (parentId: string) => void;
    onBehaviorModal: (id: string, resourceType: string) => void;
  },
  onClose: () => void,
): ContextMenuSectionType[] {
  return [
    {
      title: 'Properties',
      items: [
        {
          id: 'col-behavior',
          label: 'Set Behavior\u2026',
          icon: 'tune',
          onClick: () => { callbacks.onBehaviorModal(collectionId, 'Collection'); onClose(); },
        },
      ],
    },
    {
      title: 'Organize',
      items: [
        {
          id: 'col-add-sub',
          label: 'Add Sub-Collection',
          icon: 'create_new_folder',
          onClick: () => { callbacks.onCreateSub(collectionId); onClose(); },
        },
        {
          id: 'col-rename',
          label: 'Rename',
          icon: 'edit',
          onClick: () => { callbacks.onRename(collectionId); onClose(); },
        },
        {
          id: 'col-delete',
          label: 'Delete',
          icon: 'delete',
          variant: 'danger',
          onClick: () => { callbacks.onDelete(collectionId); onClose(); },
        },
      ],
    },
  ];
}

// ============================================================================
// Apply annotations to FileTree for ingest
// ============================================================================

export function applyAnnotationsToTree(
  tree: FileTree,
  annotationsMap: Map<string, NodeAnnotations>,
): FileTree {
  const ann = annotationsMap.get(tree.path);

  // Clone maps
  const newFiles = new Map<string, File>();
  const newDirs = new Map<string, FileTree>();

  // Filter out excluded files, detect start canvas
  let startCanvasName: string | undefined;
  for (const [name, file] of tree.files) {
    const filePath = tree.path ? `${tree.path}/${name}` : name;
    const fileAnn = annotationsMap.get(filePath);
    if (!fileAnn?.excluded) {
      newFiles.set(name, file);
    }
    if (fileAnn?.start) {
      startCanvasName = name;
    }
  }

  // Recursively apply to directories
  for (const [name, dir] of tree.directories) {
    const dirAnn = annotationsMap.get(dir.path);
    if (!dirAnn?.excluded) {
      newDirs.set(name, applyAnnotationsToTree(dir, annotationsMap));
    }
  }

  return {
    ...tree,
    files: newFiles,
    directories: newDirs,
    iiifIntent: ann?.iiifIntent ?? tree.iiifIntent,
    iiifBehavior: ann?.iiifBehavior ?? tree.iiifBehavior,
    viewingDirection: ann?.viewingDirection ?? tree.viewingDirection,
    rights: ann?.rights ?? tree.rights,
    navDate: ann?.navDate ?? tree.navDate,
    startCanvasName: startCanvasName ?? tree.startCanvasName,
  };
}
