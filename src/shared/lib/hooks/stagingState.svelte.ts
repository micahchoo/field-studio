/**
 * Staging State — State container (Category 2)
 *
 * Replaces useStagingState React hook.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts.
 *
 * Manages staging workbench state: file selection, collection organization,
 * manifest grouping, tree expansion, and layout mode.
 *
 * Usage in Svelte:
 *   let staging = new StagingStateStore();
 *   staging.setNodes(nodes);
 *   staging.select('node-1');
 *   staging.createCollection('My Collection');
 */

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export type ArchiveLayout = 'flat' | 'grouped' | 'tree';

export interface ArchiveNode {
  id: string;
  label: string;
  type: 'file' | 'folder' | 'collection';
  parentId?: string;
  children?: string[];
  metadata?: Record<string, string>;
}

// --------------------------------------------------------------------------
// StagingStateStore
// --------------------------------------------------------------------------

export class StagingStateStore {
  #nodes = $state<Map<string, ArchiveNode>>(new Map());
  #selectedIds = $state<Set<string>>(new Set());
  #layout = $state<ArchiveLayout>('flat');
  #expandedIds = $state<Set<string>>(new Set());
  #rootCollectionId = $state<string | null>(null);

  // ---- Getters ----

  /** All nodes as an array, insertion-order preserved via Map */
  get nodes(): ArchiveNode[] {
    return [...this.#nodes.values()];
  }

  /** Set of currently selected node IDs */
  get selectedIds(): Set<string> {
    return this.#selectedIds;
  }

  /** Selected nodes resolved to ArchiveNode objects */
  get selectedNodes(): ArchiveNode[] {
    const result: ArchiveNode[] = [];
    for (const id of this.#selectedIds) {
      const node = this.#nodes.get(id);
      if (node) result.push(node);
    }
    return result;
  }

  /** Current layout mode */
  get layout(): ArchiveLayout {
    return this.#layout;
  }

  /** Whether any nodes are selected */
  get hasSelection(): boolean {
    return this.#selectedIds.size > 0;
  }

  /** Number of selected nodes */
  get selectionCount(): number {
    return this.#selectedIds.size;
  }

  /** Set of expanded node IDs (for tree layout) */
  get expandedIds(): Set<string> {
    return this.#expandedIds;
  }

  /** Root collection ID, if one has been set */
  get rootCollectionId(): string | null {
    return this.#rootCollectionId;
  }

  // ==========================================================================
  // Selection
  // ==========================================================================

  /**
   * Select a single node, clearing previous selection.
   *
   * Pseudocode:
   *   1. Create new Set containing only this id
   *   2. Replace #selectedIds
   */
  select(id: string): void {
    this.#selectedIds = new Set([id]);
  }

  /**
   * Toggle a node's selection (add if missing, remove if present).
   *
   * Pseudocode:
   *   1. Clone the current set
   *   2. If id is in set, delete it; otherwise add it
   */
  toggleSelect(id: string): void {
    const next = new Set(this.#selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.#selectedIds = next;
  }

  /**
   * Select all nodes.
   *
   * Pseudocode:
   *   1. Create set from all node keys
   */
  selectAll(): void {
    this.#selectedIds = new Set(this.#nodes.keys());
  }

  /**
   * Clear all selections.
   */
  clearSelection(): void {
    this.#selectedIds = new Set();
  }

  /**
   * Select a contiguous range between two nodes (in iteration order).
   *
   * Pseudocode:
   *   1. Get all node IDs as an ordered array
   *   2. Find indices of fromId and toId
   *   3. Select all IDs between min(index) and max(index) inclusive
   */
  selectRange(fromId: string, toId: string): void {
    const allIds = [...this.#nodes.keys()];
    const fromIdx = allIds.indexOf(fromId);
    const toIdx = allIds.indexOf(toId);

    if (fromIdx === -1 || toIdx === -1) return;

    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);

    const next = new Set<string>();
    for (let i = start; i <= end; i++) {
      next.add(allIds[i]);
    }
    this.#selectedIds = next;
  }

  // ==========================================================================
  // Layout
  // ==========================================================================

  /**
   * Set the display layout mode.
   */
  setLayout(layout: ArchiveLayout): void {
    this.#layout = layout;
  }

  // ==========================================================================
  // Tree operations
  // ==========================================================================

  /**
   * Toggle expansion of a folder/collection node.
   *
   * Pseudocode:
   *   1. Clone expanded set
   *   2. Toggle the id
   */
  toggleExpanded(id: string): void {
    const next = new Set(this.#expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.#expandedIds = next;
  }

  /**
   * Expand all folder/collection nodes.
   *
   * Pseudocode:
   *   1. Iterate all nodes
   *   2. Add those with type 'folder' or 'collection' to expanded set
   */
  expandAll(): void {
    const next = new Set<string>();
    for (const [id, node] of this.#nodes) {
      if (node.type === 'folder' || node.type === 'collection') {
        next.add(id);
      }
    }
    this.#expandedIds = next;
  }

  /**
   * Collapse all nodes.
   */
  collapseAll(): void {
    this.#expandedIds = new Set();
  }

  // ==========================================================================
  // Data management
  // ==========================================================================

  /**
   * Replace all nodes with a new array.
   *
   * Pseudocode:
   *   1. Build a Map from the array keyed by id
   *   2. Clear selection and expanded (stale references)
   */
  setNodes(nodes: ArchiveNode[]): void {
    const map = new Map<string, ArchiveNode>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    this.#nodes = map;
    this.#selectedIds = new Set();
    this.#expandedIds = new Set();
  }

  /**
   * Add a single node (or replace if id exists).
   */
  addNode(node: ArchiveNode): void {
    const next = new Map(this.#nodes);
    next.set(node.id, node);
    this.#nodes = next;
  }

  /**
   * Remove a node by id. Also removes it from parent's children array
   * and clears it from selection/expanded sets.
   *
   * Pseudocode:
   *   1. Look up the node to get its parentId
   *   2. If it has a parent, remove this id from parent's children
   *   3. Recursively remove all descendant nodes
   *   4. Delete from the map, selection, and expanded
   */
  removeNode(id: string): void {
    const next = new Map(this.#nodes);
    const node = next.get(id);
    if (!node) return;

    // Remove from parent's children list
    if (node.parentId) {
      const parent = next.get(node.parentId);
      if (parent && parent.children) {
        next.set(node.parentId, {
          ...parent,
          children: parent.children.filter((cid) => cid !== id),
        });
      }
    }

    // Recursively collect all descendant IDs to remove
    const toRemove = this.#collectDescendants(id, next);
    toRemove.push(id);

    for (const removeId of toRemove) {
      next.delete(removeId);
    }

    this.#nodes = next;

    // Clean up selection and expansion
    const nextSelected = new Set(this.#selectedIds);
    const nextExpanded = new Set(this.#expandedIds);
    for (const removeId of toRemove) {
      nextSelected.delete(removeId);
      nextExpanded.delete(removeId);
    }
    this.#selectedIds = nextSelected;
    this.#expandedIds = nextExpanded;
  }

  /**
   * Move a node to a new parent.
   *
   * Pseudocode:
   *   1. Remove node from old parent's children
   *   2. Set node's parentId to newParentId
   *   3. Add node id to new parent's children
   */
  moveNode(id: string, newParentId: string): void {
    const next = new Map(this.#nodes);
    const node = next.get(id);
    const newParent = next.get(newParentId);
    if (!node || !newParent) return;

    // Remove from old parent
    if (node.parentId) {
      const oldParent = next.get(node.parentId);
      if (oldParent && oldParent.children) {
        next.set(node.parentId, {
          ...oldParent,
          children: oldParent.children.filter((cid) => cid !== id),
        });
      }
    }

    // Update node's parentId
    next.set(id, { ...node, parentId: newParentId });

    // Add to new parent's children
    const existingChildren = newParent.children ?? [];
    if (!existingChildren.includes(id)) {
      next.set(newParentId, {
        ...newParent,
        children: [...existingChildren, id],
      });
    }

    this.#nodes = next;
  }

  // ==========================================================================
  // Collection operations
  // ==========================================================================

  /**
   * Create a new collection node and return its generated id.
   *
   * Pseudocode:
   *   1. Generate a unique id
   *   2. Create ArchiveNode with type 'collection'
   *   3. If parentId provided, add to parent's children
   *   4. If no rootCollectionId set, make this the root
   *   5. Return the generated id
   */
  createCollection(label: string, parentId?: string): string {
    const id = `collection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const node: ArchiveNode = {
      id,
      label,
      type: 'collection',
      parentId,
      children: [],
    };

    const next = new Map(this.#nodes);
    next.set(id, node);

    // Add to parent's children if specified
    if (parentId) {
      const parent = next.get(parentId);
      if (parent) {
        const existingChildren = parent.children ?? [];
        next.set(parentId, {
          ...parent,
          children: [...existingChildren, id],
        });
      }
    }

    this.#nodes = next;

    // Set as root if no root exists
    if (this.#rootCollectionId === null) {
      this.#rootCollectionId = id;
    }

    // Auto-expand the new collection
    const nextExpanded = new Set(this.#expandedIds);
    nextExpanded.add(id);
    this.#expandedIds = nextExpanded;

    return id;
  }

  /**
   * Add nodes to a collection.
   *
   * Pseudocode:
   *   1. For each nodeId, set parentId to collectionId
   *   2. Add nodeId to collection's children array (if not already present)
   */
  addToCollection(collectionId: string, nodeIds: string[]): void {
    const next = new Map(this.#nodes);
    const collection = next.get(collectionId);
    if (!collection || collection.type !== 'collection') return;

    const existingChildren = new Set(collection.children ?? []);

    for (const nodeId of nodeIds) {
      const node = next.get(nodeId);
      if (!node) continue;

      // Remove from old parent first
      if (node.parentId && node.parentId !== collectionId) {
        const oldParent = next.get(node.parentId);
        if (oldParent && oldParent.children) {
          next.set(node.parentId, {
            ...oldParent,
            children: oldParent.children.filter((cid) => cid !== nodeId),
          });
        }
      }

      // Update node parentId
      next.set(nodeId, { ...node, parentId: collectionId });
      existingChildren.add(nodeId);
    }

    // Update collection's children
    next.set(collectionId, {
      ...collection,
      children: [...existingChildren],
    });

    this.#nodes = next;
  }

  /**
   * Remove nodes from a collection (unparent them, don't delete).
   *
   * Pseudocode:
   *   1. For each nodeId, clear parentId
   *   2. Remove nodeId from collection's children
   */
  removeFromCollection(collectionId: string, nodeIds: string[]): void {
    const next = new Map(this.#nodes);
    const collection = next.get(collectionId);
    if (!collection) return;

    const removeSet = new Set(nodeIds);

    // Unparent the nodes
    for (const nodeId of nodeIds) {
      const node = next.get(nodeId);
      if (node && node.parentId === collectionId) {
        next.set(nodeId, { ...node, parentId: undefined });
      }
    }

    // Update collection's children
    if (collection.children) {
      next.set(collectionId, {
        ...collection,
        children: collection.children.filter((cid) => !removeSet.has(cid)),
      });
    }

    this.#nodes = next;
  }

  // ==========================================================================
  // Grouping
  // ==========================================================================

  /**
   * Group nodes by their breadcrumb path (folder hierarchy).
   *
   * Pseudocode:
   *   1. For each node, build a path string by walking up parentId chain
   *   2. Group nodes by their path string
   *   3. Return as Map<path, ArchiveNode[]>
   */
  getGroupedByBreadcrumb(): Map<string, ArchiveNode[]> {
    const groups = new Map<string, ArchiveNode[]>();

    for (const node of this.#nodes.values()) {
      // Build breadcrumb path by walking up the parent chain
      const pathParts: string[] = [];
      let currentId = node.parentId;
      const visited = new Set<string>();

      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const parent = this.#nodes.get(currentId);
        if (parent) {
          pathParts.unshift(parent.label);
          currentId = parent.parentId;
        } else {
          break;
        }
      }

      const path = pathParts.length > 0 ? pathParts.join(' / ') : '(root)';
      const group = groups.get(path);
      if (group) {
        group.push(node);
      } else {
        groups.set(path, [node]);
      }
    }

    return groups;
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  /**
   * Recursively collect all descendant IDs of a node.
   */
  #collectDescendants(id: string, nodes: Map<string, ArchiveNode>): string[] {
    const descendants: string[] = [];
    const node = nodes.get(id);
    if (!node || !node.children) return descendants;

    for (const childId of node.children) {
      descendants.push(childId);
      descendants.push(...this.#collectDescendants(childId, nodes));
    }

    return descendants;
  }
}
