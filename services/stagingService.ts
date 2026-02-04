
import { ArchiveCollection, ArchiveLayout, FileTree, SourceManifest, SourceManifests } from '../types';
import { filenameRelationshipPatterns } from '../utils/filenameUtils';
import { buildTree } from './iiifBuilder';
import { MIME_TYPE_MAP } from '../constants';

/**
 * Natural sort comparison for strings with numbers
 * Handles "img_1.jpg" vs "img_10.jpg" correctly
 */
function naturalSort(a: string, b: string): number {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  return collator.compare(a, b);
}

/**
 * Check if a file is a media file based on extension
 */
function isMediaFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mime = MIME_TYPE_MAP[ext];
  return mime && mime.motivation === 'painting';
}

/**
 * Detect sequence patterns and return files in correct order
 * Uses filenameRelationshipPatterns from filenameUtils.ts
 */
function detectAndOrderSequence(files: File[]): {
  orderedFiles: File[];
  detectedPattern: string | null;
} {
  const filenames = files.map(f => f.name);

  // Try each sequence pattern
  for (const pattern of filenameRelationshipPatterns) {
    if (!pattern.tags.includes('sequence')) continue;

    const matches = filenames.map(name => {
      const match = name.match(pattern.regex);
      return match ? { name, base: match[1], seq: match[2] } : null;
    }).filter(Boolean) as { name: string; base: string; seq: string }[];

    // If >50% of files match this pattern with same base, use it
    if (matches.length > filenames.length * 0.5) {
      const bases = new Set(matches.map(m => m.base.toLowerCase()));
      if (bases.size === 1) {
        // Sort by sequence value
        const sorted = [...files].sort((a, b) => {
          const aMatch = a.name.match(pattern.regex);
          const bMatch = b.name.match(pattern.regex);
          if (!aMatch || !bMatch) return 0;
          return naturalSort(aMatch[2], bMatch[2]);
        });
        return { orderedFiles: sorted, detectedPattern: pattern.name };
      }
    }
  }

  // Fallback: natural sort by filename
  return {
    orderedFiles: [...files].sort((a, b) => naturalSort(a.name, b.name)),
    detectedPattern: null
  };
}

/**
 * Build SourceManifests from an array of files (from folder upload)
 * Creates a manifest for each directory node that contains direct media files.
 */
export function buildSourceManifests(files: File[]): SourceManifests {
  const fileTree = buildTree(files);
  const manifests: SourceManifest[] = [];

  // Traverse and emit a manifest for each node with direct media files
  const traverse = (node: FileTree, breadcrumbs: string[]) => {
    const path = node.name === 'root' ? [] : [...breadcrumbs, node.name];

    const mediaFiles = Array.from(node.files.values())
      .filter(f => isMediaFile(f.name));

    if (mediaFiles.length > 0) {
      // Use filenameUtils to detect sequences and order canvases
      const { orderedFiles, detectedPattern } = detectAndOrderSequence(mediaFiles);

      manifests.push({
        id: crypto.randomUUID(),
        name: path.join(' / ') || 'Root Files',
        breadcrumbs: path,
        files: orderedFiles,
        canvasOrder: orderedFiles.map(f => f.name),
        detectedPattern: detectedPattern || undefined
      });
    }

    node.directories.forEach(dir => traverse(dir, path));
  };

  traverse(fileTree, []);

  // Determine root path from the first directory or 'root'
  const rootPath = fileTree.directories.size > 0
    ? Array.from(fileTree.directories.keys())[0]
    : fileTree.name;

  return {
    id: crypto.randomUUID(),
    rootPath,
    manifests,
    createdAt: new Date().toISOString()
  };
}

/**
 * Create an initial ArchiveLayout from SourceManifests
 * All manifests start as unassigned
 */
export function createInitialArchiveLayout(sourceManifests: SourceManifests): ArchiveLayout {
  return {
    id: crypto.randomUUID(),
    root: {
      id: crypto.randomUUID(),
      name: sourceManifests.rootPath || 'My Archive',
      manifestRefs: [],
      children: []
    },
    unassignedManifests: sourceManifests.manifests.map(m => m.id)
  };
}

/**
 * Create a new collection within the archive layout
 */
export function createCollection(
  layout: ArchiveLayout,
  parentId: string | null,
  name: string
): { layout: ArchiveLayout; newCollectionId: string } {
  const newCollection: ArchiveCollection = {
    id: crypto.randomUUID(),
    name,
    manifestRefs: [],
    children: []
  };

  const newLayout = { ...layout, root: { ...layout.root } };

  if (!parentId || parentId === layout.root.id) {
    // Add to root
    newLayout.root = {
      ...newLayout.root,
      children: [...newLayout.root.children, newCollection]
    };
  } else {
    // Find parent and add child
    const addToParent = (collection: ArchiveCollection): ArchiveCollection => {
      if (collection.id === parentId) {
        return { ...collection, children: [...collection.children, newCollection] };
      }
      return {
        ...collection,
        children: collection.children.map(addToParent)
      };
    };
    newLayout.root = addToParent(newLayout.root);
  }

  return { layout: newLayout, newCollectionId: newCollection.id };
}

/**
 * Add manifest references to a collection
 */
export function addManifestsToCollection(
  layout: ArchiveLayout,
  collectionId: string,
  manifestIds: string[]
): ArchiveLayout {
  const addToCollection = (collection: ArchiveCollection): ArchiveCollection => {
    if (collection.id === collectionId) {
      const existingRefs = new Set(collection.manifestRefs);
      const newRefs = manifestIds.filter(id => !existingRefs.has(id));
      return {
        ...collection,
        manifestRefs: [...collection.manifestRefs, ...newRefs]
      };
    }
    return {
      ...collection,
      children: collection.children.map(addToCollection)
    };
  };

  // Remove from unassigned if being assigned
  const newUnassigned = layout.unassignedManifests.filter(id => !manifestIds.includes(id));

  return {
    ...layout,
    root: addToCollection(layout.root),
    unassignedManifests: newUnassigned
  };
}

/**
 * Remove manifest references from a collection
 */
export function removeManifestsFromCollection(
  layout: ArchiveLayout,
  collectionId: string,
  manifestIds: string[]
): ArchiveLayout {
  const removeFromCollection = (collection: ArchiveCollection): ArchiveCollection => {
    if (collection.id === collectionId) {
      return {
        ...collection,
        manifestRefs: collection.manifestRefs.filter(id => !manifestIds.includes(id))
      };
    }
    return {
      ...collection,
      children: collection.children.map(removeFromCollection)
    };
  };

  // Check if manifest is still referenced anywhere
  const isReferenced = (layout: ArchiveLayout, manifestId: string): boolean => {
    const checkCollection = (collection: ArchiveCollection): boolean => {
      if (collection.manifestRefs.includes(manifestId)) return true;
      return collection.children.some(checkCollection);
    };
    return checkCollection(layout.root);
  };

  const newLayout = {
    ...layout,
    root: removeFromCollection(layout.root)
  };

  // Add back to unassigned if no longer referenced anywhere
  const newUnassigned = [...newLayout.unassignedManifests];
  for (const id of manifestIds) {
    if (!isReferenced(newLayout, id) && !newUnassigned.includes(id)) {
      newUnassigned.push(id);
    }
  }

  return {
    ...newLayout,
    unassignedManifests: newUnassigned
  };
}

/**
 * Update canvas order within a source manifest
 */
export function updateCanvasOrder(
  sourceManifests: SourceManifests,
  manifestId: string,
  newOrder: string[]
): SourceManifests {
  return {
    ...sourceManifests,
    manifests: sourceManifests.manifests.map(m => {
      if (m.id === manifestId) {
        // Reorder files array to match new order
        const fileMap = new Map(m.files.map(f => [f.name, f]));
        const orderedFiles = newOrder
          .map(name => fileMap.get(name))
          .filter((f): f is File => f !== undefined);

        return {
          ...m,
          canvasOrder: newOrder,
          files: orderedFiles
        };
      }
      return m;
    })
  };
}

/**
 * Rename a collection
 */
export function renameCollection(
  layout: ArchiveLayout,
  collectionId: string,
  newName: string
): ArchiveLayout {
  const rename = (collection: ArchiveCollection): ArchiveCollection => {
    if (collection.id === collectionId) {
      return { ...collection, name: newName };
    }
    return {
      ...collection,
      children: collection.children.map(rename)
    };
  };

  return {
    ...layout,
    root: rename(layout.root)
  };
}

/**
 * Delete a collection (manifests become unassigned)
 */
export function deleteCollection(
  layout: ArchiveLayout,
  collectionId: string
): ArchiveLayout {
  // Cannot delete root
  if (collectionId === layout.root.id) return layout;

  // Collect manifest refs from deleted collection and its children
  const collectManifestRefs = (collection: ArchiveCollection): string[] => {
    return [
      ...collection.manifestRefs,
      ...collection.children.flatMap(collectManifestRefs)
    ];
  };

  let freedManifests: string[] = [];

  const deleteFromCollection = (collection: ArchiveCollection): ArchiveCollection => {
    const targetChild = collection.children.find(c => c.id === collectionId);
    if (targetChild) {
      freedManifests = collectManifestRefs(targetChild);
      return {
        ...collection,
        children: collection.children.filter(c => c.id !== collectionId)
      };
    }
    return {
      ...collection,
      children: collection.children.map(deleteFromCollection)
    };
  };

  const newLayout = {
    ...layout,
    root: deleteFromCollection(layout.root)
  };

  // Check which freed manifests are now truly unassigned
  const isStillReferenced = (manifestId: string): boolean => {
    const check = (collection: ArchiveCollection): boolean => {
      if (collection.manifestRefs.includes(manifestId)) return true;
      return collection.children.some(check);
    };
    return check(newLayout.root);
  };

  const newUnassigned = [
    ...newLayout.unassignedManifests,
    ...freedManifests.filter(id => !isStillReferenced(id) && !newLayout.unassignedManifests.includes(id))
  ];

  return {
    ...newLayout,
    unassignedManifests: newUnassigned
  };
}

/**
 * Move a collection to a new parent
 */
export function moveCollection(
  layout: ArchiveLayout,
  collectionId: string,
  newParentId: string
): ArchiveLayout {
  // Cannot move root
  if (collectionId === layout.root.id) return layout;
  // Cannot move into itself
  if (collectionId === newParentId) return layout;

  let movedCollection: ArchiveCollection | null = null;

  // Remove from current parent
  const removeFromParent = (collection: ArchiveCollection): ArchiveCollection => {
    const target = collection.children.find(c => c.id === collectionId);
    if (target) {
      movedCollection = target;
      return {
        ...collection,
        children: collection.children.filter(c => c.id !== collectionId)
      };
    }
    return {
      ...collection,
      children: collection.children.map(removeFromParent)
    };
  };

  const layoutAfterRemove = {
    ...layout,
    root: removeFromParent(layout.root)
  };

  if (!movedCollection) return layout;

  // Add to new parent
  const addToNewParent = (collection: ArchiveCollection): ArchiveCollection => {
    if (collection.id === newParentId) {
      return {
        ...collection,
        children: [...collection.children, movedCollection!]
      };
    }
    return {
      ...collection,
      children: collection.children.map(addToNewParent)
    };
  };

  return {
    ...layoutAfterRemove,
    root: addToNewParent(layoutAfterRemove.root)
  };
}

/**
 * Get all collections as a flat list (for dropdowns, etc.)
 */
export function getAllCollections(layout: ArchiveLayout): ArchiveCollection[] {
  const collections: ArchiveCollection[] = [];

  const collect = (collection: ArchiveCollection) => {
    collections.push(collection);
    collection.children.forEach(collect);
  };

  collect(layout.root);
  return collections;
}

/**
 * Find a manifest by ID in SourceManifests
 */
export function findManifest(sourceManifests: SourceManifests, manifestId: string): SourceManifest | undefined {
  return sourceManifests.manifests.find(m => m.id === manifestId);
}

/**
 * Get total file count across all manifests
 */
export function getTotalFileCount(sourceManifests: SourceManifests): number {
  return sourceManifests.manifests.reduce((sum, m) => sum + m.files.length, 0);
}

/**
 * Get manifest statistics
 */
export function getManifestStats(sourceManifests: SourceManifests): {
  totalManifests: number;
  totalFiles: number;
  sequencePatterns: Map<string, number>;
} {
  const sequencePatterns = new Map<string, number>();

  for (const manifest of sourceManifests.manifests) {
    if (manifest.detectedPattern) {
      const count = sequencePatterns.get(manifest.detectedPattern) || 0;
      sequencePatterns.set(manifest.detectedPattern, count + 1);
    }
  }

  return {
    totalManifests: sourceManifests.manifests.length,
    totalFiles: getTotalFileCount(sourceManifests),
    sequencePatterns
  };
}
