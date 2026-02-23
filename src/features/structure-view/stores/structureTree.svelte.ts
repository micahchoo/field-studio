/**
 * Structure Tree -- State container (Category 2)
 *
 * Replaces useStructureTree React hook.
 * Architecture doc S4 Cat 2: Reactive class in .svelte.ts.
 *
 * Tree model with node selection, expansion, filtering,
 * drag/drop validation, and virtual scrolling support.
 *
 * Scoped class -- each sidebar/structure-view creates its own instance.
 *
 * Usage in Svelte component:
 *   let tree = new StructureTreeStore();
 *   tree.buildFromVault(vaultState, rootId);
 *   // In template: {#each tree.visibleNodes as node}
 *   // Selection: tree.selectNode(id, { additive: e.ctrlKey })
 *   // Filter: tree.setFilterQuery('search term')
 */

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface StructureNode {
  id: string;
  type: string;
  label: string;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  childCount: number;
  parentId?: string;
  hasChildren: boolean;
}

export interface TreeStats {
  totalNodes: number;
  expandedNodes: number;
  selectedNodes: number;
  maxDepth: number;
}

// ------------------------------------------------------------------
// Store
// ------------------------------------------------------------------

export class StructureTreeStore {
  // -- Reactive state --
  #nodes = $state<Map<string, StructureNode>>(new Map());
  #childIndex = $state<Map<string, string[]>>(new Map());
  #selectedIds = $state<Set<string>>(new Set());
  #expandedIds = $state<Set<string>>(new Set());
  #filterQuery = $state('');
  #rootId = $state<string | null>(null);
  #draggingId = $state<string | null>(null);
  #dropTargetId = $state<string | null>(null);

  // -- Non-reactive: scroll callback set by the host component --
  #scrollCallback?: (id: string) => void;

  // ------------------------------------------------------------------
  // Getters -- reactive reads
  // ------------------------------------------------------------------

  get selectedIds(): Set<string> { return this.#selectedIds; }
  get expandedIds(): Set<string> { return this.#expandedIds; }
  get filterQuery(): string { return this.#filterQuery; }
  get draggingId(): string | null { return this.#draggingId; }
  get dropTargetId(): string | null { return this.#dropTargetId; }
  get rootId(): string | null { return this.#rootId; }

  // ------------------------------------------------------------------
  // Build tree from vault state
  //
  // Pseudocode:
  //   1. Walk the vault's references/entities starting from rootId
  //   2. For each entity, create a StructureNode with type, label, depth
  //   3. Build parent->children index (#childIndex)
  //   4. Expand the root node by default
  // ------------------------------------------------------------------

  /**
   * Build the tree from a vault NormalizedState.
   * Accepts `any` to decouple from the specific NormalizedState type.
   *
   * Expected shape on `state`:
   *   state.entities      -- { [type]: { [id]: entity } }
   *   state.typeIndex      -- { [id]: type }
   *   state.references     -- { [id]: childId[] }
   */
  buildFromVault(state: any, rootId: string): void {
    const nodes = new Map<string, StructureNode>();
    const childIndex = new Map<string, string[]>();

    const typeIndex: Record<string, string> = state.typeIndex ?? {};
    const entities: Record<string, Record<string, any>> = state.entities ?? {};
    const references: Record<string, string[]> = state.references ?? {};

    // Recursive tree builder
    const walk = (id: string, depth: number, parentId?: string): void => {
      const type = typeIndex[id];
      if (!type) return;
      const entity = entities[type]?.[id];
      if (!entity) return;

      const childIds = references[id] ?? [];
      const childCount = childIds.length;

      // Extract label: IIIF label can be { en: ['...'] } or a plain string
      let label = '';
      if (entity.label) {
        if (typeof entity.label === 'string') {
          label = entity.label;
        } else if (typeof entity.label === 'object') {
          const values = Object.values(entity.label) as string[][];
          label = values[0]?.[0] ?? '';
        }
      }
      if (!label) {
        label = entity.id ?? id;
      }

      const node: StructureNode = {
        id,
        type,
        label,
        depth,
        isExpanded: this.#expandedIds.has(id),
        isSelected: this.#selectedIds.has(id),
        childCount,
        parentId,
        hasChildren: childCount > 0,
      };

      nodes.set(id, node);
      childIndex.set(id, childIds);

      for (const childId of childIds) {
        walk(childId, depth + 1, id);
      }
    };

    walk(rootId, 0);

    this.#nodes = nodes;
    this.#childIndex = childIndex;
    this.#rootId = rootId;

    // Expand root by default
    if (!this.#expandedIds.has(rootId)) {
      const next = new Set(this.#expandedIds);
      next.add(rootId);
      this.#expandedIds = next;
    }
  }

  // ------------------------------------------------------------------
  // Flattened nodes -- visible tree respecting expansion
  //
  // Pseudocode:
  //   Starting from root, DFS: emit node, then if expanded, recurse children.
  //   Result is the ordered list visible in the tree UI.
  // ------------------------------------------------------------------

  /** Get flattened visible nodes (respecting expansion state) */
  get flattenedNodes(): StructureNode[] {
    if (!this.#rootId) return [];
    const result: StructureNode[] = [];
    this.#flattenRecursive(this.#rootId, 0, result);
    return result;
  }

  // ------------------------------------------------------------------
  // Filtered nodes -- matching query, with ancestors kept visible
  //
  // Pseudocode:
  //   1. If no filter query, return flattenedNodes
  //   2. Find all nodes matching the query
  //   3. For each match, include all ancestors up to root
  //   4. Return flattened visible nodes filtered to only include matches + ancestors
  // ------------------------------------------------------------------

  /** Get filtered nodes (matching query, including ancestors for context) */
  get filteredNodes(): StructureNode[] {
    const query = this.#filterQuery.trim().toLowerCase();
    if (!query) return this.flattenedNodes;

    // Find all matching node IDs
    const matchingIds = new Set<string>();
    for (const [id, node] of this.#nodes) {
      if (this.#matchesFilter(node)) {
        matchingIds.add(id);
      }
    }

    // Add ancestors of each match so the tree structure is preserved
    const visibleIds = new Set<string>(matchingIds);
    for (const matchId of matchingIds) {
      let current = this.#nodes.get(matchId);
      while (current?.parentId) {
        visibleIds.add(current.parentId);
        current = this.#nodes.get(current.parentId);
      }
    }

    // Build a filtered flattened list (DFS, only including visible IDs)
    if (!this.#rootId || !visibleIds.has(this.#rootId)) return [];
    const result: StructureNode[] = [];
    this.#flattenFiltered(this.#rootId, 0, result, visibleIds);
    return result;
  }

  /** Currently visible nodes (filtered if query is set, otherwise flattened) */
  get visibleNodes(): StructureNode[] {
    return this.#filterQuery.trim() ? this.filteredNodes : this.flattenedNodes;
  }

  // ------------------------------------------------------------------
  // Stats and counts
  // ------------------------------------------------------------------

  get treeStats(): TreeStats {
    let maxDepth = 0;
    for (const node of this.#nodes.values()) {
      if (node.depth > maxDepth) maxDepth = node.depth;
    }
    return {
      totalNodes: this.#nodes.size,
      expandedNodes: this.#expandedIds.size,
      selectedNodes: this.#selectedIds.size,
      maxDepth,
    };
  }

  /** Number of nodes matching the current filter query */
  get matchCount(): number {
    if (!this.#filterQuery.trim()) return 0;
    let count = 0;
    for (const node of this.#nodes.values()) {
      if (this.#matchesFilter(node)) count++;
    }
    return count;
  }

  // ------------------------------------------------------------------
  // Selection
  //
  // Pseudocode:
  //   selectNode: plain click = single select; additive = toggle in set;
  //               range = select contiguous range in flattenedNodes
  //   clearSelection: empty the set
  // ------------------------------------------------------------------

  /** Select a node with optional additive (Ctrl) or range (Shift) modes */
  selectNode(id: string, options?: { additive?: boolean; range?: boolean }): void {
    if (!this.#nodes.has(id)) return;

    if (options?.additive) {
      // Toggle: add or remove from selection
      const next = new Set(this.#selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      this.#selectedIds = next;
    } else if (options?.range) {
      // Range select: from last selected to this node in flattenedNodes order
      const flat = this.flattenedNodes;
      const lastSelected = Array.from(this.#selectedIds).pop();
      if (lastSelected) {
        const lastIndex = flat.findIndex(n => n.id === lastSelected);
        const currentIndex = flat.findIndex(n => n.id === id);
        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const next = new Set(this.#selectedIds);
          for (let i = start; i <= end; i++) {
            next.add(flat[i].id);
          }
          this.#selectedIds = next;
        } else {
          this.#selectedIds = new Set([id]);
        }
      } else {
        this.#selectedIds = new Set([id]);
      }
    } else {
      // Single select (replace)
      this.#selectedIds = new Set([id]);
    }

    // Sync isSelected on nodes
    this.#syncSelectionState();
  }

  /** Clear all selection */
  clearSelection(): void {
    this.#selectedIds = new Set();
    this.#syncSelectionState();
  }

  // ------------------------------------------------------------------
  // Expansion
  //
  // Pseudocode:
  //   toggleExpanded: flip expanded state for node and rebuild isExpanded flag
  //   expandAll / collapseAll: set/clear all IDs
  //   expandToNode: expand all ancestors so the target becomes visible
  // ------------------------------------------------------------------

  /** Toggle expansion for a single node */
  toggleExpanded(id: string): void {
    const next = new Set(this.#expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.#expandedIds = next;
    this.#syncExpansionState();
  }

  /** Expand all nodes that have children */
  expandAll(): void {
    const next = new Set<string>();
    for (const [id, node] of this.#nodes) {
      if (node.hasChildren) next.add(id);
    }
    this.#expandedIds = next;
    this.#syncExpansionState();
  }

  /** Collapse all nodes */
  collapseAll(): void {
    this.#expandedIds = new Set();
    this.#syncExpansionState();
  }

  /** Expand all ancestors of a node so it becomes visible in the tree */
  expandToNode(id: string): void {
    const next = new Set(this.#expandedIds);
    let current = this.#nodes.get(id);
    while (current?.parentId) {
      next.add(current.parentId);
      current = this.#nodes.get(current.parentId);
    }
    this.#expandedIds = next;
    this.#syncExpansionState();
  }

  // ------------------------------------------------------------------
  // Navigation helpers
  // ------------------------------------------------------------------

  /** Get the path from root to the given node (list of ancestors + self) */
  getNodePath(id: string): StructureNode[] {
    const path: StructureNode[] = [];
    let current = this.#nodes.get(id);
    while (current) {
      path.unshift(current);
      current = current.parentId ? this.#nodes.get(current.parentId) : undefined;
    }
    return path;
  }

  /** Get the direct children of a node */
  getNodeChildren(id: string): StructureNode[] {
    const childIds = this.#childIndex.get(id) ?? [];
    return childIds
      .map(cid => this.#nodes.get(cid))
      .filter((n): n is StructureNode => n != null);
  }

  /** Get the parent node (or null if root / not found) */
  getNodeParent(id: string): StructureNode | null {
    const node = this.#nodes.get(id);
    if (!node?.parentId) return null;
    return this.#nodes.get(node.parentId) ?? null;
  }

  // ------------------------------------------------------------------
  // Filtering
  // ------------------------------------------------------------------

  /** Set the filter query string (case-insensitive label match) */
  setFilterQuery(query: string): void {
    this.#filterQuery = query;
  }

  // ------------------------------------------------------------------
  // Drag and Drop
  //
  // Pseudocode:
  //   startDrag: record dragging ID
  //   setDropTarget: highlight the candidate drop target
  //   endDrag: clear drag state
  //   canDrop: validate the drop (no dropping on self, ancestor, or same parent)
  //   getValidDropTargets: return all nodes where canDrop is true
  // ------------------------------------------------------------------

  /** Begin dragging a node */
  startDrag(id: string): void {
    this.#draggingId = id;
  }

  /** Set the current drop target (null to clear) */
  setDropTarget(id: string | null): void {
    this.#dropTargetId = id;
  }

  /** End the current drag operation */
  endDrag(): void {
    this.#draggingId = null;
    this.#dropTargetId = null;
  }

  /**
   * Check whether dragId can be dropped onto targetId.
   *
   * Invalid drops:
   *   - Self (dragging onto itself)
   *   - Ancestor (would create a cycle)
   *   - Already a child of the target (no-op move)
   *   - Target has no children capability (leaf-only types like Canvas)
   */
  canDrop(dragId: string, targetId: string): boolean {
    // Cannot drop on self
    if (dragId === targetId) return false;

    // Cannot drop onto an ancestor (would create cycle)
    if (this.#isAncestorOf(dragId, targetId)) return false;

    // Cannot drop onto current parent (already there)
    const dragNode = this.#nodes.get(dragId);
    if (dragNode?.parentId === targetId) return false;

    // Target must exist
    const targetNode = this.#nodes.get(targetId);
    if (!targetNode) return false;

    // Only container types can accept drops
    const containerTypes = ['Collection', 'Manifest', 'Range'];
    if (!containerTypes.includes(targetNode.type)) return false;

    return true;
  }

  /** Get all node IDs where dragging the given item would be a valid drop */
  getValidDropTargets(dragId: string): string[] {
    const valid: string[] = [];
    for (const id of this.#nodes.keys()) {
      if (this.canDrop(dragId, id)) {
        valid.push(id);
      }
    }
    return valid;
  }

  // ------------------------------------------------------------------
  // Utilities
  // ------------------------------------------------------------------

  /** Find a node by ID (or null if not in the tree) */
  findNode(id: string): StructureNode | null {
    return this.#nodes.get(id) ?? null;
  }

  /**
   * Scroll to a node in the virtual list.
   * Expands ancestors first, then calls the registered scroll callback.
   */
  scrollToNode(id: string): void {
    this.expandToNode(id);
    this.#scrollCallback?.(id);
  }

  /** Register a scroll callback (set by the virtual list host component) */
  setScrollCallback(cb: (id: string) => void): void {
    this.#scrollCallback = cb;
  }

  // ------------------------------------------------------------------
  // Private: recursive flattening
  //
  // Pseudocode:
  //   DFS from nodeId. Push current node. If expanded, recurse children.
  // ------------------------------------------------------------------

  #flattenRecursive(nodeId: string, depth: number, result: StructureNode[]): void {
    const node = this.#nodes.get(nodeId);
    if (!node) return;

    // Push node with current depth (the stored depth might be stale after rebuild)
    result.push({ ...node, depth, isExpanded: this.#expandedIds.has(nodeId), isSelected: this.#selectedIds.has(nodeId) });

    // If expanded, recurse into children
    if (this.#expandedIds.has(nodeId)) {
      const childIds = this.#childIndex.get(nodeId) ?? [];
      for (const childId of childIds) {
        this.#flattenRecursive(childId, depth + 1, result);
      }
    }
  }

  /** Filtered DFS: only descend into nodes that are in the visibleIds set */
  #flattenFiltered(
    nodeId: string,
    depth: number,
    result: StructureNode[],
    visibleIds: Set<string>,
  ): void {
    const node = this.#nodes.get(nodeId);
    if (!node) return;

    result.push({
      ...node,
      depth,
      isExpanded: true, // ancestors of matches are always shown expanded
      isSelected: this.#selectedIds.has(nodeId),
    });

    const childIds = this.#childIndex.get(nodeId) ?? [];
    for (const childId of childIds) {
      if (visibleIds.has(childId)) {
        this.#flattenFiltered(childId, depth + 1, result, visibleIds);
      }
    }
  }

  // ------------------------------------------------------------------
  // Private: ancestry check
  // ------------------------------------------------------------------

  /** Check if ancestorId is an ancestor of descendantId */
  #isAncestorOf(ancestorId: string, descendantId: string): boolean {
    let current = this.#nodes.get(descendantId);
    while (current?.parentId) {
      if (current.parentId === ancestorId) return true;
      current = this.#nodes.get(current.parentId);
    }
    return false;
  }

  // ------------------------------------------------------------------
  // Private: filter matching
  // ------------------------------------------------------------------

  /** Check if a node's label matches the current filter query */
  #matchesFilter(node: StructureNode): boolean {
    const query = this.#filterQuery.trim().toLowerCase();
    if (!query) return true;
    return node.label.toLowerCase().includes(query);
  }

  // ------------------------------------------------------------------
  // Private: sync derived boolean flags on StructureNode objects
  //
  // After changing #selectedIds or #expandedIds, refresh the
  // isSelected/isExpanded flags on each node in the map.
  // We replace the map to trigger $state reactivity.
  // ------------------------------------------------------------------

  #syncSelectionState(): void {
    const next = new Map<string, StructureNode>();
    for (const [id, node] of this.#nodes) {
      next.set(id, {
        ...node,
        isSelected: this.#selectedIds.has(id),
      });
    }
    this.#nodes = next;
  }

  #syncExpansionState(): void {
    const next = new Map<string, StructureNode>();
    for (const [id, node] of this.#nodes) {
      next.set(id, {
        ...node,
        isExpanded: this.#expandedIds.has(id),
      });
    }
    this.#nodes = next;
  }
}
