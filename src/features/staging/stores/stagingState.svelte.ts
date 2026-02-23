/**
 * StagingState Store (Svelte 5 Runes)
 *
 * Manages the two-pane staging workbench state.
 * Replaces React's useStagingState hook.
 *
 * Architecture:
 * - $state.raw() for SourceManifests (large domain data, rule 2.C)
 * - $state() for UI state (selection, filter, focus)
 * - $derived for computed values (filtered manifests, stats)
 * - Methods for mutations (no $effect for derived values, rule 2.B)
 * - Explicit initialize/destroy lifecycle (rule 3.H)
 *
 * React source: src/features/staging/stores/useStagingState.ts
 * This store replaces the hook-based state with a singleton class instance
 * using Svelte 5 runes for fine-grained reactivity.
 *
 * @module features/staging/stores/stagingState
 */

import type {
  SourceManifests,
  SourceManifest,
  NodeAnnotations,
  FlatFileTreeNode,
} from '../model';
import {
  selectAllSourceManifests,
  addSourceManifest,
  removeSourceManifest,
  reorderCanvases,
  mergeSourceManifests,
  flattenFileTree,
  countFilesRecursive,
} from '../model';
import { detectConflicts, type ConflictReport } from '../model/conflictDetection';
import type { FileTree } from '@/src/shared/types';

// ============================================================================
// ArchiveLayout types -- represents the right-pane collection tree
// ============================================================================

export interface ArchiveNode {
  id: string;
  name: string;
  type: 'Collection' | 'Manifest';
  children: ArchiveNode[];
  manifestIds: string[];
}

export interface ArchiveLayout {
  root: ArchiveNode;
  flatIndex: Map<string, ArchiveNode>;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Recursively walk an ArchiveNode tree and build a flat Map<id, node>.
 */
function rebuildFlatIndex(root: ArchiveNode): Map<string, ArchiveNode> {
  const index = new Map<string, ArchiveNode>();

  function walk(node: ArchiveNode): void {
    index.set(node.id, node);
    for (const child of node.children) {
      walk(child);
    }
  }

  walk(root);
  return index;
}

/**
 * Deep-clone an ArchiveNode tree (structural sharing is not needed because
 * we rebuild flatIndex on every mutation anyway).
 */
function cloneNode(node: ArchiveNode): ArchiveNode {
  return {
    ...node,
    children: node.children.map(cloneNode),
    manifestIds: [...node.manifestIds],
  };
}

/**
 * Create a fresh default ArchiveLayout with an empty root collection.
 */
function createDefaultArchiveLayout(): ArchiveLayout {
  const root: ArchiveNode = {
    id: 'root',
    name: 'Archive',
    type: 'Collection',
    children: [],
    manifestIds: [],
  };
  return { root, flatIndex: rebuildFlatIndex(root) };
}

/**
 * Collect all directory paths from a FileTree (for expandAll).
 */
function collectAllDirectoryPaths(tree: FileTree, paths: Set<string>): void {
  if (tree.path) {
    paths.add(tree.path);
  }
  for (const dir of tree.directories.values()) {
    paths.add(dir.path);
    collectAllDirectoryPaths(dir, paths);
  }
}

/**
 * Find and remove a node by ID from an ArchiveNode tree.
 * Returns a new tree without the node (immutable).
 * Returns null if the node was not found.
 */
function removeNodeById(root: ArchiveNode, targetId: string): ArchiveNode {
  return {
    ...root,
    children: root.children
      .filter((child) => child.id !== targetId)
      .map((child) => removeNodeById(child, targetId)),
    manifestIds: [...root.manifestIds],
  };
}

/**
 * Remove a manifest ID from all nodes in the tree (so a manifest
 * is only in one collection at a time).
 */
function removeManifestFromAllNodes(
  node: ArchiveNode,
  manifestId: string,
): ArchiveNode {
  return {
    ...node,
    manifestIds: node.manifestIds.filter((id) => id !== manifestId),
    children: node.children.map((child) =>
      removeManifestFromAllNodes(child, manifestId),
    ),
  };
}

/**
 * Recursively collect all manifest IDs from a node and its descendants.
 */
function _collectManifestIds(node: ArchiveNode): string[] {
  const ids = [...node.manifestIds];
  for (const child of node.children) {
    ids.push(..._collectManifestIds(child));
  }
  return ids;
}

/**
 * Recursively collect all collection-type nodes into a flat array.
 */
function collectAllCollections(node: ArchiveNode): ArchiveNode[] {
  const result: ArchiveNode[] = [];
  if (node.type === 'Collection') {
    result.push(node);
  }
  for (const child of node.children) {
    result.push(...collectAllCollections(child));
  }
  return result;
}

// ============================================================================
// StagingStateStore
// ============================================================================

class StagingStateStore {
  // ---------------------------------------------------------------------------
  // Domain state ($state.raw for large data -- rule 2.C)
  // ---------------------------------------------------------------------------

  #sourceManifests = $state.raw<SourceManifests>({ byId: {}, allIds: [] });
  #archiveLayout = $state.raw<ArchiveLayout>(createDefaultArchiveLayout());
  #fileTree = $state.raw<FileTree | null>(null);
  #annotationsMap = $state.raw<Map<string, NodeAnnotations>>(new Map());

  // ---------------------------------------------------------------------------
  // UI state ($state for small reactive values)
  // ---------------------------------------------------------------------------

  #selectedIds = $state<string[]>([]);
  #focusedPane = $state<'source' | 'archive'>('source');
  #filterText = $state<string>('');
  #expandedPaths = $state<Set<string>>(new Set());
  #lastSelectedId = $state<string | null>(null);
  #dragState = $state<{
    sourceIds: string[];
    overTarget: string | null;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // Derived ($derived -- rule 2.B: no $effect for computed values)
  // ---------------------------------------------------------------------------

  readonly filteredManifests: SourceManifest[] = $derived.by(() => {
    const all = selectAllSourceManifests(this.#sourceManifests);
    if (!this.#filterText) return all;
    const lower = this.#filterText.toLowerCase();
    return all.filter((m) => m.label.toLowerCase().includes(lower));
  });

  readonly flatNodes: FlatFileTreeNode[] = $derived.by(() => {
    if (!this.#fileTree) return [];
    return flattenFileTree(
      this.#fileTree,
      this.#expandedPaths,
      this.#annotationsMap,
    );
  });

  readonly stats = $derived.by(() => ({
    totalManifests: this.#sourceManifests.allIds.length,
    totalFiles: this.#fileTree ? countFilesRecursive(this.#fileTree) : 0,
    totalCollections: this.#archiveLayout.flatIndex.size,
    selectedCount: this.#selectedIds.length,
  }));

  readonly conflictReport: ConflictReport = $derived.by(() => {
    if (!this.#fileTree) {
      return { duplicateNames: [], totalDuplicates: 0, hasConflicts: false };
    }
    return detectConflicts(this.#fileTree);
  });

  readonly hasSelection: boolean = $derived.by(
    () => this.#selectedIds.length > 0,
  );

  // ---------------------------------------------------------------------------
  // Getters (expose private state as read-only)
  // ---------------------------------------------------------------------------

  get sourceManifests(): SourceManifests {
    return this.#sourceManifests;
  }

  get archiveLayout(): ArchiveLayout {
    return this.#archiveLayout;
  }

  get fileTree(): FileTree | null {
    return this.#fileTree;
  }

  get annotationsMap(): Map<string, NodeAnnotations> {
    return this.#annotationsMap;
  }

  get selectedIds(): string[] {
    return this.#selectedIds;
  }

  get focusedPane(): 'source' | 'archive' {
    return this.#focusedPane;
  }

  get filterText(): string {
    return this.#filterText;
  }

  get expandedPaths(): Set<string> {
    return this.#expandedPaths;
  }

  get dragState(): { sourceIds: string[]; overTarget: string | null } | null {
    return this.#dragState;
  }

  // ---------------------------------------------------------------------------
  // Selection methods
  // ---------------------------------------------------------------------------

  /**
   * Toggle a single manifest selection.
   * If already selected, deselect. Otherwise add to selectedIds.
   * Updates lastSelectedId for range anchor.
   */
  toggleSelection(id: string): void {
    const idx = this.#selectedIds.indexOf(id);
    if (idx >= 0) {
      this.#selectedIds = this.#selectedIds.filter((sid) => sid !== id);
    } else {
      this.#selectedIds = [...this.#selectedIds, id];
    }
    this.#lastSelectedId = id;
  }

  /**
   * Shift-click range select from lastSelectedId to id.
   * Uses the filteredManifests order to determine range bounds.
   * Replaces current selection with the range.
   */
  selectRange(id: string): void {
    if (!this.#lastSelectedId) {
      this.#selectedIds = [id];
      this.#lastSelectedId = id;
      return;
    }

    const manifests = this.filteredManifests;
    const anchorIdx = manifests.findIndex(
      (m) => m.id === this.#lastSelectedId,
    );
    const targetIdx = manifests.findIndex((m) => m.id === id);

    if (anchorIdx === -1 || targetIdx === -1) {
      this.#selectedIds = [id];
      this.#lastSelectedId = id;
      return;
    }

    const start = Math.min(anchorIdx, targetIdx);
    const end = Math.max(anchorIdx, targetIdx);
    this.#selectedIds = manifests.slice(start, end + 1).map((m) => m.id);
  }

  /**
   * Select all currently filtered manifests.
   */
  selectAll(): void {
    this.#selectedIds = this.filteredManifests.map((m) => m.id);
  }

  /**
   * Clear selectedIds and lastSelectedId.
   */
  clearSelection(): void {
    this.#selectedIds = [];
    this.#lastSelectedId = null;
  }

  // ---------------------------------------------------------------------------
  // Source manifest mutations
  // ---------------------------------------------------------------------------

  /**
   * Add a manifest to sourceManifests.
   * Reassigns #sourceManifests (immutable update for $state.raw).
   */
  addManifest(manifest: SourceManifest): void {
    this.#sourceManifests = addSourceManifest(this.#sourceManifests, manifest);
  }

  /**
   * Remove a manifest using removeSourceManifest().
   * Also removes from selectedIds if present.
   */
  removeManifest(id: string): void {
    this.#sourceManifests = removeSourceManifest(this.#sourceManifests, id);
    if (this.#selectedIds.includes(id)) {
      this.#selectedIds = this.#selectedIds.filter((sid) => sid !== id);
    }
  }

  /**
   * Merge multiple manifests into one using mergeSourceManifests().
   * Clears selection after merge.
   */
  mergeManifests(sourceIds: string[], targetId: string): void {
    this.#sourceManifests = mergeSourceManifests(
      this.#sourceManifests,
      sourceIds,
      targetId,
    );
    this.clearSelection();
  }

  /**
   * Reorder canvases within a manifest using reorderCanvases().
   */
  reorderManifestCanvases(manifestId: string, newOrder: string[]): void {
    this.#sourceManifests = reorderCanvases(
      this.#sourceManifests,
      manifestId,
      newOrder,
    );
  }

  // ---------------------------------------------------------------------------
  // Collection / archive layout mutations
  // ---------------------------------------------------------------------------

  /**
   * Create a new ArchiveNode of type 'Collection' under root.
   * Returns the new collection's generated ID.
   */
  createNewCollection(name: string): string {
    const id = `coll-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newNode: ArchiveNode = {
      id,
      name,
      type: 'Collection',
      children: [],
      manifestIds: [],
    };

    const newRoot = cloneNode(this.#archiveLayout.root);
    newRoot.children = [...newRoot.children, newNode];

    this.#archiveLayout = {
      root: newRoot,
      flatIndex: rebuildFlatIndex(newRoot),
    };

    return id;
  }

  /**
   * Add manifest IDs to a collection node's manifestIds array.
   * Removes from previous location if manifest was in another collection.
   */
  addToCollection(collectionId: string, manifestIds: string[]): void {
    let newRoot = cloneNode(this.#archiveLayout.root);

    // Remove manifests from any existing collection first
    for (const manifestId of manifestIds) {
      newRoot = removeManifestFromAllNodes(newRoot, manifestId);
    }

    // Find the target collection and add the manifest IDs
    const flatIndex = rebuildFlatIndex(newRoot);
    const target = flatIndex.get(collectionId);
    if (!target) return;

    target.manifestIds = [...target.manifestIds, ...manifestIds];

    this.#archiveLayout = {
      root: newRoot,
      flatIndex: rebuildFlatIndex(newRoot),
    };
  }

  /**
   * Remove manifest IDs from a collection node.
   */
  removeFromCollection(collectionId: string, manifestIds: string[]): void {
    const newRoot = cloneNode(this.#archiveLayout.root);
    const flatIndex = rebuildFlatIndex(newRoot);
    const target = flatIndex.get(collectionId);
    if (!target) return;

    const removeSet = new Set(manifestIds);
    target.manifestIds = target.manifestIds.filter(
      (id) => !removeSet.has(id),
    );

    this.#archiveLayout = {
      root: newRoot,
      flatIndex: rebuildFlatIndex(newRoot),
    };
  }

  /**
   * Update the name of an ArchiveNode.
   */
  renameCollection(id: string, newName: string): void {
    const newRoot = cloneNode(this.#archiveLayout.root);
    const flatIndex = rebuildFlatIndex(newRoot);
    const node = flatIndex.get(id);
    if (!node) return;

    node.name = newName;

    this.#archiveLayout = {
      root: newRoot,
      flatIndex: rebuildFlatIndex(newRoot),
    };
  }

  /**
   * Remove an ArchiveNode and return its manifests to unassigned.
   * Recursively deletes sub-collections.
   */
  deleteCollection(id: string): void {
    if (id === 'root') return; // Never delete the root

    const newRoot = removeNodeById(
      cloneNode(this.#archiveLayout.root),
      id,
    );

    this.#archiveLayout = {
      root: newRoot,
      flatIndex: rebuildFlatIndex(newRoot),
    };
  }

  /**
   * Create a child collection under parentId. Returns new ID.
   */
  createSubCollection(parentId: string, name: string): string {
    const id = `coll-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newNode: ArchiveNode = {
      id,
      name,
      type: 'Collection',
      children: [],
      manifestIds: [],
    };

    const newRoot = cloneNode(this.#archiveLayout.root);
    const flatIndex = rebuildFlatIndex(newRoot);
    const parent = flatIndex.get(parentId);
    if (!parent) return id;

    parent.children = [...parent.children, newNode];

    this.#archiveLayout = {
      root: newRoot,
      flatIndex: rebuildFlatIndex(newRoot),
    };

    return id;
  }

  /**
   * Flat list of all collection nodes (for dropdown pickers).
   */
  getAllCollectionsList(): ArchiveNode[] {
    return collectAllCollections(this.#archiveLayout.root);
  }

  // ---------------------------------------------------------------------------
  // File tree operations
  // ---------------------------------------------------------------------------

  /**
   * Toggle a directory's expanded state in expandedPaths.
   * Creates a new Set (immutable) for $state reactivity.
   */
  toggleExpanded(path: string): void {
    const next = new Set(this.#expandedPaths);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    this.#expandedPaths = next;
  }

  /**
   * Expand all directory paths in the file tree.
   */
  expandAll(): void {
    if (!this.#fileTree) return;
    const paths = new Set<string>();
    collectAllDirectoryPaths(this.#fileTree, paths);
    this.#expandedPaths = paths;
  }

  /**
   * Collapse all directories (clear expandedPaths).
   */
  collapseAll(): void {
    this.#expandedPaths = new Set();
  }

  /**
   * Set IIIF overrides for a file tree node.
   * Creates a new Map (immutable) for $state.raw reactivity.
   */
  setAnnotation(path: string, annotations: NodeAnnotations): void {
    const next = new Map(this.#annotationsMap);
    next.set(path, annotations);
    this.#annotationsMap = next;
  }

  // ---------------------------------------------------------------------------
  // Filter
  // ---------------------------------------------------------------------------

  /**
   * Update #filterText. filteredManifests $derived recomputes automatically.
   */
  setFilterText(text: string): void {
    this.#filterText = text;
  }

  // ---------------------------------------------------------------------------
  // Focus / drag
  // ---------------------------------------------------------------------------

  /**
   * Set which pane has keyboard focus.
   */
  setFocusedPane(pane: 'source' | 'archive'): void {
    this.#focusedPane = pane;
  }

  /**
   * Begin a drag operation with the given manifest IDs.
   */
  startDrag(sourceIds: string[]): void {
    this.#dragState = { sourceIds, overTarget: null };
  }

  /**
   * Update the current drop target during drag.
   */
  updateDragTarget(targetId: string | null): void {
    if (!this.#dragState) return;
    this.#dragState = { ...this.#dragState, overTarget: targetId };
  }

  /**
   * Complete or cancel the drag. If over a valid target, calls
   * addToCollection. Resets dragState to null.
   */
  endDrag(): void {
    if (this.#dragState?.overTarget) {
      this.addToCollection(this.#dragState.overTarget, this.#dragState.sourceIds);
    }
    this.#dragState = null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle (rule 3.H: explicit initialize/destroy)
  // ---------------------------------------------------------------------------

  /**
   * Set initial data from the file import step.
   * Populates #fileTree, #sourceManifests.
   * Expands root-level directories by default.
   * Resets all UI state (selection, filter, focus).
   * Called from StagingView.svelte onMount or from parent orchestrator.
   */
  initialize(fileTree: FileTree, sourceManifests: SourceManifests): void {
    // Set domain data
    this.#fileTree = fileTree;
    this.#sourceManifests = sourceManifests;
    this.#archiveLayout = createDefaultArchiveLayout();
    this.#annotationsMap = new Map();

    // Reset UI state
    this.#selectedIds = [];
    this.#focusedPane = 'source';
    this.#filterText = '';
    this.#lastSelectedId = null;
    this.#dragState = null;

    // Expand root-level directories by default
    const rootPaths = new Set<string>();
    if (fileTree.path) {
      rootPaths.add(fileTree.path);
    }
    for (const dir of fileTree.directories.values()) {
      rootPaths.add(dir.path);
    }
    this.#expandedPaths = rootPaths;
  }

  /**
   * Reset all state to defaults.
   * Called from StagingView.svelte onDestroy.
   * Prevents stale state if user navigates away and back.
   */
  destroy(): void {
    this.#sourceManifests = { byId: {}, allIds: [] };
    this.#archiveLayout = createDefaultArchiveLayout();
    this.#fileTree = null;
    this.#annotationsMap = new Map();
    this.#selectedIds = [];
    this.#focusedPane = 'source';
    this.#filterText = '';
    this.#expandedPaths = new Set();
    this.#lastSelectedId = null;
    this.#dragState = null;
  }
}

export const stagingState = new StagingStateStore();
