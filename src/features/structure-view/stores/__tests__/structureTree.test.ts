/**
 * StructureTreeStore Tests
 *
 * Comprehensive tests for the Svelte 5 runes-based structure tree store.
 * Covers: tree building, flattening, selection, expansion, filtering,
 * drag-and-drop validation, navigation helpers, stats, and utilities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StructureTreeStore } from '../structureTree.svelte';

// ---------------------------------------------------------------------------
// Mock vault state builder
//
// Creates a tree:
//   root (Collection)
//   +-- manifest-1 (Manifest)
//   |   +-- canvas-1 (Canvas)
//   |   +-- canvas-2 (Canvas)
//   +-- manifest-2 (Manifest)
//       +-- canvas-3 (Canvas)
//       +-- range-1 (Range)
//           +-- canvas-4 (Canvas)
// ---------------------------------------------------------------------------

function buildMockState() {
  return {
    entities: {
      Collection: {
        root: { id: 'root', type: 'Collection', label: { en: ['Root Collection'] } },
      },
      Manifest: {
        'manifest-1': { id: 'manifest-1', type: 'Manifest', label: { en: ['First Manifest'] } },
        'manifest-2': { id: 'manifest-2', type: 'Manifest', label: { en: ['Second Manifest'] } },
      },
      Canvas: {
        'canvas-1': { id: 'canvas-1', type: 'Canvas', label: { en: ['Canvas One'] } },
        'canvas-2': { id: 'canvas-2', type: 'Canvas', label: { en: ['Canvas Two'] } },
        'canvas-3': { id: 'canvas-3', type: 'Canvas', label: { en: ['Canvas Three'] } },
        'canvas-4': { id: 'canvas-4', type: 'Canvas', label: { en: ['Deep Canvas'] } },
      },
      Range: {
        'range-1': { id: 'range-1', type: 'Range', label: { en: ['A Range'] } },
      },
    },
    typeIndex: {
      root: 'Collection',
      'manifest-1': 'Manifest',
      'manifest-2': 'Manifest',
      'canvas-1': 'Canvas',
      'canvas-2': 'Canvas',
      'canvas-3': 'Canvas',
      'canvas-4': 'Canvas',
      'range-1': 'Range',
    },
    references: {
      root: ['manifest-1', 'manifest-2'],
      'manifest-1': ['canvas-1', 'canvas-2'],
      'manifest-2': ['canvas-3', 'range-1'],
      'range-1': ['canvas-4'],
      'canvas-1': [],
      'canvas-2': [],
      'canvas-3': [],
      'canvas-4': [],
    },
  };
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

let tree: StructureTreeStore;

beforeEach(() => {
  tree = new StructureTreeStore();
});

// ===========================================================================
// 1. buildFromVault
// ===========================================================================

describe('buildFromVault', () => {
  it('builds tree with correct total node count', () => {
    tree.buildFromVault(buildMockState(), 'root');
    // 8 entities: root, manifest-1, manifest-2, canvas-1..4, range-1
    expect(tree.treeStats.totalNodes).toBe(8);
  });

  it('auto-expands the root node', () => {
    tree.buildFromVault(buildMockState(), 'root');
    expect(tree.expandedIds.has('root')).toBe(true);
  });

  it('assigns correct depth to each node', () => {
    tree.buildFromVault(buildMockState(), 'root');

    expect(tree.findNode('root')?.depth).toBe(0);
    expect(tree.findNode('manifest-1')?.depth).toBe(1);
    expect(tree.findNode('canvas-1')?.depth).toBe(2);
    expect(tree.findNode('range-1')?.depth).toBe(2);
    expect(tree.findNode('canvas-4')?.depth).toBe(3);
  });

  it('sets correct parentId and childCount on nodes', () => {
    tree.buildFromVault(buildMockState(), 'root');

    // Root has no parent
    const rootNode = tree.findNode('root');
    expect(rootNode?.parentId).toBeUndefined();
    expect(rootNode?.childCount).toBe(2);
    expect(rootNode?.hasChildren).toBe(true);

    // Manifest-1 is child of root with 2 canvas children
    const m1 = tree.findNode('manifest-1');
    expect(m1?.parentId).toBe('root');
    expect(m1?.childCount).toBe(2);
    expect(m1?.hasChildren).toBe(true);

    // Canvas-1 is a leaf under manifest-1
    const c1 = tree.findNode('canvas-1');
    expect(c1?.parentId).toBe('manifest-1');
    expect(c1?.childCount).toBe(0);
    expect(c1?.hasChildren).toBe(false);

    // Range-1 is under manifest-2, has 1 child
    const r1 = tree.findNode('range-1');
    expect(r1?.parentId).toBe('manifest-2');
    expect(r1?.childCount).toBe(1);

    // canvas-4 is under range-1
    const c4 = tree.findNode('canvas-4');
    expect(c4?.parentId).toBe('range-1');
  });
});

// ===========================================================================
// 2. flattenedNodes
// ===========================================================================

describe('flattenedNodes', () => {
  it('only shows root and its direct children when only root is expanded', () => {
    tree.buildFromVault(buildMockState(), 'root');
    // Root is auto-expanded, so we see root + manifest-1 + manifest-2
    const ids = tree.flattenedNodes.map(n => n.id);
    expect(ids).toEqual(['root', 'manifest-1', 'manifest-2']);
  });

  it('shows grandchildren when a child is also expanded', () => {
    tree.buildFromVault(buildMockState(), 'root');
    tree.toggleExpanded('manifest-1');

    const ids = tree.flattenedNodes.map(n => n.id);
    // root -> manifest-1 -> canvas-1, canvas-2 -> manifest-2
    expect(ids).toEqual(['root', 'manifest-1', 'canvas-1', 'canvas-2', 'manifest-2']);
  });

  it('respects multi-level expansion through the full tree depth', () => {
    tree.buildFromVault(buildMockState(), 'root');
    tree.toggleExpanded('manifest-2');
    tree.toggleExpanded('range-1');

    const ids = tree.flattenedNodes.map(n => n.id);
    // root -> manifest-1, manifest-2 -> canvas-3, range-1 -> canvas-4
    expect(ids).toEqual([
      'root',
      'manifest-1',
      'manifest-2',
      'canvas-3',
      'range-1',
      'canvas-4',
    ]);
  });
});

// ===========================================================================
// 3. selectNode
// ===========================================================================

describe('selectNode', () => {
  beforeEach(() => {
    tree.buildFromVault(buildMockState(), 'root');
  });

  it('single select replaces previous selection', () => {
    tree.selectNode('manifest-1');
    expect(tree.selectedIds.has('manifest-1')).toBe(true);
    expect(tree.selectedIds.size).toBe(1);

    tree.selectNode('manifest-2');
    expect(tree.selectedIds.has('manifest-1')).toBe(false);
    expect(tree.selectedIds.has('manifest-2')).toBe(true);
    expect(tree.selectedIds.size).toBe(1);
  });

  it('additive select adds to existing selection', () => {
    tree.selectNode('manifest-1');
    tree.selectNode('manifest-2', { additive: true });

    expect(tree.selectedIds.has('manifest-1')).toBe(true);
    expect(tree.selectedIds.has('manifest-2')).toBe(true);
    expect(tree.selectedIds.size).toBe(2);
  });

  it('additive select toggles off an already-selected node', () => {
    tree.selectNode('manifest-1');
    tree.selectNode('manifest-1', { additive: true });

    expect(tree.selectedIds.has('manifest-1')).toBe(false);
    expect(tree.selectedIds.size).toBe(0);
  });

  it('range select selects a contiguous range of visible nodes', () => {
    // Expand manifest-1 to make canvases visible
    tree.toggleExpanded('manifest-1');
    // Visible: root, manifest-1, canvas-1, canvas-2, manifest-2

    // Select manifest-1 first, then shift-select manifest-2
    tree.selectNode('manifest-1');
    tree.selectNode('manifest-2', { range: true });

    // Should select manifest-1 through manifest-2 inclusive
    expect(tree.selectedIds.has('manifest-1')).toBe(true);
    expect(tree.selectedIds.has('canvas-1')).toBe(true);
    expect(tree.selectedIds.has('canvas-2')).toBe(true);
    expect(tree.selectedIds.has('manifest-2')).toBe(true);
    expect(tree.selectedIds.size).toBe(4);
  });

  it('selecting a nonexistent node is a no-op', () => {
    tree.selectNode('manifest-1');
    tree.selectNode('does-not-exist');

    // Selection should still be manifest-1 (the new single-select failed silently)
    expect(tree.selectedIds.has('manifest-1')).toBe(true);
    expect(tree.selectedIds.size).toBe(1);
  });
});

// ===========================================================================
// 4. toggleExpanded / expandAll / collapseAll
// ===========================================================================

describe('toggleExpanded / expandAll / collapseAll', () => {
  beforeEach(() => {
    tree.buildFromVault(buildMockState(), 'root');
  });

  it('toggleExpanded expands a collapsed node', () => {
    expect(tree.expandedIds.has('manifest-1')).toBe(false);
    tree.toggleExpanded('manifest-1');
    expect(tree.expandedIds.has('manifest-1')).toBe(true);
  });

  it('toggleExpanded collapses an expanded node', () => {
    // Root is auto-expanded
    expect(tree.expandedIds.has('root')).toBe(true);
    tree.toggleExpanded('root');
    expect(tree.expandedIds.has('root')).toBe(false);
  });

  it('expandAll expands all nodes that have children', () => {
    tree.expandAll();

    // Nodes with children: root, manifest-1, manifest-2, range-1
    expect(tree.expandedIds.has('root')).toBe(true);
    expect(tree.expandedIds.has('manifest-1')).toBe(true);
    expect(tree.expandedIds.has('manifest-2')).toBe(true);
    expect(tree.expandedIds.has('range-1')).toBe(true);

    // Leaf nodes should not be in expanded set
    expect(tree.expandedIds.has('canvas-1')).toBe(false);
    expect(tree.expandedIds.has('canvas-2')).toBe(false);
    expect(tree.expandedIds.has('canvas-3')).toBe(false);
    expect(tree.expandedIds.has('canvas-4')).toBe(false);
  });

  it('collapseAll collapses every node', () => {
    tree.expandAll();
    tree.collapseAll();

    expect(tree.expandedIds.size).toBe(0);
    // After collapsing all, flattenedNodes should only show root
    const ids = tree.flattenedNodes.map(n => n.id);
    expect(ids).toEqual(['root']);
  });
});

// ===========================================================================
// 5. expandToNode
// ===========================================================================

describe('expandToNode', () => {
  beforeEach(() => {
    tree.buildFromVault(buildMockState(), 'root');
  });

  it('expands all ancestors of a deeply nested node', () => {
    // canvas-4 is at depth 3: root > manifest-2 > range-1 > canvas-4
    tree.expandToNode('canvas-4');

    expect(tree.expandedIds.has('root')).toBe(true);
    expect(tree.expandedIds.has('manifest-2')).toBe(true);
    expect(tree.expandedIds.has('range-1')).toBe(true);
  });

  it('makes the deep node visible in flattenedNodes after expansion', () => {
    tree.expandToNode('canvas-4');

    const ids = tree.flattenedNodes.map(n => n.id);
    expect(ids).toContain('canvas-4');
  });
});

// ===========================================================================
// 6. filteredNodes / setFilterQuery
// ===========================================================================

describe('filteredNodes / setFilterQuery', () => {
  beforeEach(() => {
    tree.buildFromVault(buildMockState(), 'root');
    // Expand everything so flattenedNodes shows all 8 nodes
    tree.expandAll();
  });

  it('empty query returns same result as flattenedNodes', () => {
    tree.setFilterQuery('');
    const filtered = tree.filteredNodes;
    const flattened = tree.flattenedNodes;

    expect(filtered.map(n => n.id)).toEqual(flattened.map(n => n.id));
  });

  it('query filters to matching nodes plus their ancestors', () => {
    // "Deep" matches only "Deep Canvas" (canvas-4)
    // Ancestors: range-1, manifest-2, root
    tree.setFilterQuery('Deep');

    const ids = tree.filteredNodes.map(n => n.id);
    expect(ids).toContain('canvas-4');
    expect(ids).toContain('range-1');
    expect(ids).toContain('manifest-2');
    expect(ids).toContain('root');

    // Non-matching branches should be excluded
    expect(ids).not.toContain('manifest-1');
    expect(ids).not.toContain('canvas-1');
    expect(ids).not.toContain('canvas-2');
  });

  it('matchCount returns the correct number of matching nodes', () => {
    // "Canvas" matches: Canvas One, Canvas Two, Canvas Three, Deep Canvas
    tree.setFilterQuery('Canvas');
    expect(tree.matchCount).toBe(4);
  });

  it('matching is case-insensitive', () => {
    tree.setFilterQuery('deep canvas');
    expect(tree.matchCount).toBe(1);

    tree.setFilterQuery('DEEP CANVAS');
    expect(tree.matchCount).toBe(1);

    tree.setFilterQuery('Deep Canvas');
    expect(tree.matchCount).toBe(1);
  });
});

// ===========================================================================
// 7. canDrop (drag and drop validation)
// ===========================================================================

describe('canDrop', () => {
  beforeEach(() => {
    tree.buildFromVault(buildMockState(), 'root');
  });

  it('cannot drop a node onto itself', () => {
    expect(tree.canDrop('manifest-1', 'manifest-1')).toBe(false);
  });

  it('cannot drop a node onto one of its descendants (cycle prevention)', () => {
    // root is ancestor of manifest-1, dropping root onto manifest-1 would create a cycle
    expect(tree.canDrop('root', 'manifest-1')).toBe(false);
    // manifest-2 is ancestor of range-1
    expect(tree.canDrop('manifest-2', 'range-1')).toBe(false);
    // manifest-2 is ancestor of canvas-4 (through range-1)
    expect(tree.canDrop('manifest-2', 'canvas-4')).toBe(false);
  });

  it('cannot drop a node onto its current parent (already there)', () => {
    // canvas-1's parent is manifest-1
    expect(tree.canDrop('canvas-1', 'manifest-1')).toBe(false);
    // range-1's parent is manifest-2
    expect(tree.canDrop('range-1', 'manifest-2')).toBe(false);
  });

  it('cannot drop onto a Canvas (leaf-only type, not a container)', () => {
    // Canvas is not in the containerTypes list
    expect(tree.canDrop('canvas-1', 'canvas-2')).toBe(false);
    expect(tree.canDrop('manifest-1', 'canvas-3')).toBe(false);
  });

  it('can drop a Canvas onto a valid Collection, Manifest, or Range target', () => {
    // canvas-1 (child of manifest-1) can be dropped onto manifest-2
    expect(tree.canDrop('canvas-1', 'manifest-2')).toBe(true);
    // canvas-1 can be dropped onto root (Collection)
    expect(tree.canDrop('canvas-1', 'root')).toBe(true);
    // canvas-1 can be dropped onto range-1 (Range)
    expect(tree.canDrop('canvas-1', 'range-1')).toBe(true);
  });
});

// ===========================================================================
// 8. getNodePath / getNodeChildren / getNodeParent
// ===========================================================================

describe('getNodePath / getNodeChildren / getNodeParent', () => {
  beforeEach(() => {
    tree.buildFromVault(buildMockState(), 'root');
  });

  it('getNodePath returns the full path from root to the target node', () => {
    const path = tree.getNodePath('canvas-4');
    const pathIds = path.map(n => n.id);
    // root -> manifest-2 -> range-1 -> canvas-4
    expect(pathIds).toEqual(['root', 'manifest-2', 'range-1', 'canvas-4']);
  });

  it('getNodeChildren returns direct children of a node', () => {
    const children = tree.getNodeChildren('root');
    const childIds = children.map(n => n.id);
    expect(childIds).toEqual(['manifest-1', 'manifest-2']);

    const m2Children = tree.getNodeChildren('manifest-2');
    expect(m2Children.map(n => n.id)).toEqual(['canvas-3', 'range-1']);

    // Leaf node has no children
    const leafChildren = tree.getNodeChildren('canvas-1');
    expect(leafChildren).toEqual([]);
  });

  it('getNodeParent returns the parent node, or null for root', () => {
    const rootParent = tree.getNodeParent('root');
    expect(rootParent).toBeNull();

    const m1Parent = tree.getNodeParent('manifest-1');
    expect(m1Parent?.id).toBe('root');

    const c4Parent = tree.getNodeParent('canvas-4');
    expect(c4Parent?.id).toBe('range-1');
  });
});

// ===========================================================================
// 9. treeStats
// ===========================================================================

describe('treeStats', () => {
  it('returns correct totalNodes, expandedNodes, selectedNodes, maxDepth', () => {
    tree.buildFromVault(buildMockState(), 'root');

    // After buildFromVault: 8 nodes, root auto-expanded (1 expanded), 0 selected
    let stats = tree.treeStats;
    expect(stats.totalNodes).toBe(8);
    expect(stats.expandedNodes).toBe(1);
    expect(stats.selectedNodes).toBe(0);
    // maxDepth is 3 (canvas-4 at root > manifest-2 > range-1 > canvas-4)
    expect(stats.maxDepth).toBe(3);

    // Expand more and select some
    tree.expandAll();
    tree.selectNode('canvas-1');
    tree.selectNode('canvas-2', { additive: true });

    stats = tree.treeStats;
    // 4 nodes with children: root, manifest-1, manifest-2, range-1
    expect(stats.expandedNodes).toBe(4);
    expect(stats.selectedNodes).toBe(2);
  });
});

// ===========================================================================
// 10. Additional edge cases and utilities
// ===========================================================================

describe('clearSelection', () => {
  it('removes all selected nodes', () => {
    tree.buildFromVault(buildMockState(), 'root');
    tree.selectNode('manifest-1');
    tree.selectNode('manifest-2', { additive: true });
    expect(tree.selectedIds.size).toBe(2);

    tree.clearSelection();
    expect(tree.selectedIds.size).toBe(0);
  });
});

describe('drag lifecycle', () => {
  beforeEach(() => {
    tree.buildFromVault(buildMockState(), 'root');
  });

  it('startDrag / setDropTarget / endDrag lifecycle', () => {
    expect(tree.draggingId).toBeNull();
    expect(tree.dropTargetId).toBeNull();

    tree.startDrag('canvas-1');
    expect(tree.draggingId).toBe('canvas-1');

    tree.setDropTarget('manifest-2');
    expect(tree.dropTargetId).toBe('manifest-2');

    tree.endDrag();
    expect(tree.draggingId).toBeNull();
    expect(tree.dropTargetId).toBeNull();
  });
});

describe('getValidDropTargets', () => {
  it('returns all valid target IDs for a given drag source', () => {
    tree.buildFromVault(buildMockState(), 'root');

    // canvas-1 is under manifest-1.
    // Valid containers: Collection, Manifest, Range (minus self, ancestor, current parent)
    // root (Collection) -- valid
    // manifest-1 (Manifest) -- invalid (current parent)
    // manifest-2 (Manifest) -- valid
    // range-1 (Range) -- valid
    // canvas-* -- all invalid (not containers)
    const targets = tree.getValidDropTargets('canvas-1');
    expect(targets).toContain('root');
    expect(targets).toContain('manifest-2');
    expect(targets).toContain('range-1');
    expect(targets).not.toContain('manifest-1'); // current parent
    expect(targets).not.toContain('canvas-1');    // self
    expect(targets).not.toContain('canvas-2');    // not a container
    expect(targets).toHaveLength(3);
  });
});

describe('findNode', () => {
  it('returns the node for a valid ID', () => {
    tree.buildFromVault(buildMockState(), 'root');
    const node = tree.findNode('range-1');
    expect(node).not.toBeNull();
    expect(node?.type).toBe('Range');
    expect(node?.label).toBe('A Range');
  });

  it('returns null for unknown ID', () => {
    tree.buildFromVault(buildMockState(), 'root');
    expect(tree.findNode('nonexistent')).toBeNull();
  });
});

describe('scrollToNode', () => {
  it('calls the registered scroll callback after expanding ancestors', () => {
    tree.buildFromVault(buildMockState(), 'root');
    const scrollCb = vi.fn();
    tree.setScrollCallback(scrollCb);

    tree.scrollToNode('canvas-4');

    // Should have expanded ancestors
    expect(tree.expandedIds.has('manifest-2')).toBe(true);
    expect(tree.expandedIds.has('range-1')).toBe(true);

    // Should have called the callback
    expect(scrollCb).toHaveBeenCalledWith('canvas-4');
    expect(scrollCb).toHaveBeenCalledTimes(1);
  });

  it('works silently when no scroll callback is registered', () => {
    tree.buildFromVault(buildMockState(), 'root');
    // Should not throw
    expect(() => tree.scrollToNode('canvas-4')).not.toThrow();
  });
});

describe('label extraction', () => {
  it('extracts label from IIIF { lang: [value] } format', () => {
    tree.buildFromVault(buildMockState(), 'root');
    expect(tree.findNode('root')?.label).toBe('Root Collection');
    expect(tree.findNode('manifest-1')?.label).toBe('First Manifest');
  });

  it('uses entity ID as fallback when label is missing', () => {
    const state = buildMockState();
    // Remove label from one entity
    delete (state.entities.Canvas['canvas-1'] as any).label;
    tree.buildFromVault(state, 'root');

    expect(tree.findNode('canvas-1')?.label).toBe('canvas-1');
  });

  it('handles plain string labels', () => {
    const state = buildMockState();
    (state.entities.Canvas['canvas-1'] as any).label = 'Plain Label';
    tree.buildFromVault(state, 'root');

    expect(tree.findNode('canvas-1')?.label).toBe('Plain Label');
  });
});

describe('visibleNodes', () => {
  it('returns flattenedNodes when no filter is set', () => {
    tree.buildFromVault(buildMockState(), 'root');
    tree.expandAll();

    const visible = tree.visibleNodes;
    const flattened = tree.flattenedNodes;
    expect(visible.map(n => n.id)).toEqual(flattened.map(n => n.id));
  });

  it('returns filteredNodes when a filter query is active', () => {
    tree.buildFromVault(buildMockState(), 'root');
    tree.expandAll();
    tree.setFilterQuery('Range');

    const visible = tree.visibleNodes;
    const visibleIds = visible.map(n => n.id);

    // "A Range" matches, plus its ancestors
    expect(visibleIds).toContain('range-1');
    expect(visibleIds).toContain('root');
    expect(visibleIds).toContain('manifest-2');

    // Non-matching branch excluded
    expect(visibleIds).not.toContain('manifest-1');
  });
});

describe('matchCount edge cases', () => {
  it('returns 0 when filter query is empty', () => {
    tree.buildFromVault(buildMockState(), 'root');
    tree.setFilterQuery('');
    expect(tree.matchCount).toBe(0);
  });

  it('returns 0 when filter query is whitespace only', () => {
    tree.buildFromVault(buildMockState(), 'root');
    tree.setFilterQuery('   ');
    expect(tree.matchCount).toBe(0);
  });

  it('returns 0 when no nodes match', () => {
    tree.buildFromVault(buildMockState(), 'root');
    tree.setFilterQuery('zzzzzzzznotfound');
    expect(tree.matchCount).toBe(0);
  });
});

describe('empty state', () => {
  it('flattenedNodes returns empty array before buildFromVault', () => {
    expect(tree.flattenedNodes).toEqual([]);
  });

  it('rootId is null before buildFromVault', () => {
    expect(tree.rootId).toBeNull();
  });

  it('treeStats returns all zeros before buildFromVault', () => {
    const stats = tree.treeStats;
    expect(stats.totalNodes).toBe(0);
    expect(stats.expandedNodes).toBe(0);
    expect(stats.selectedNodes).toBe(0);
    expect(stats.maxDepth).toBe(0);
  });
});
