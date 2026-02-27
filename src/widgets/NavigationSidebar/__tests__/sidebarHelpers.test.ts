/**
 * Navigation Sidebar Helpers — Unit Tests
 */

import { describe, it, expect } from 'vitest';
import type { IIIFItem } from '@/src/shared/types';
import {
  getTypeIcon,
  hasDescendantMatch,
  computeBreadcrumbs,
  flattenTree,
  type VaultAccessors,
} from '../lib/sidebarHelpers';

// ---------------------------------------------------------------------------
// Test fixture helper
// ---------------------------------------------------------------------------

/** Create a minimal IIIFItem for testing. */
function makeItem(id: string, type: string, items?: IIIFItem[]): IIIFItem {
  return {
    id,
    type: type as IIIFItem['type'],
    label: { en: [id] },
    ...(items ? { items } : {}),
  };
}

/**
 * Build VaultAccessors from a denormalized tree for testing.
 * Walks the tree and builds entity/child/parent maps.
 */
function buildAccessors(root: IIIFItem | null): VaultAccessors & { rootId: string | null } {
  const entities = new Map<string, IIIFItem>();
  const childMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  function walk(item: IIIFItem, parentId?: string): void {
    entities.set(item.id, item);
    if (parentId) parentMap.set(item.id, parentId);
    const children = item.items as IIIFItem[] | undefined;
    if (children) {
      childMap.set(item.id, children.map(c => c.id));
      for (const child of children) walk(child, item.id);
    } else {
      childMap.set(item.id, []);
    }
  }

  if (root) walk(root);

  return {
    rootId: root?.id ?? null,
    getEntity: (id: string) => entities.get(id) ?? null,
    getChildIds: (id: string) => childMap.get(id) ?? [],
    getAncestors: (id: string) => {
      const ancestors: string[] = [];
      let cur = parentMap.get(id);
      while (cur) {
        ancestors.push(cur);
        cur = parentMap.get(cur);
      }
      return ancestors;
    },
  };
}

// ===========================================================================
// getTypeIcon
// ===========================================================================

describe('getTypeIcon', () => {
  it('returns "folder" for Collection', () => {
    expect(getTypeIcon('Collection')).toBe('folder');
  });

  it('returns Material Icons "menu_book" for Manifest', () => {
    expect(getTypeIcon('Manifest')).toBe('menu_book');
  });

  it('returns "image" for Canvas', () => {
    expect(getTypeIcon('Canvas')).toBe('image');
  });

  it('returns "layers" for Range', () => {
    expect(getTypeIcon('Range')).toBe('layers');
  });

  it('returns Material Icons "insert_drive_file" for unknown types', () => {
    expect(getTypeIcon('Annotation')).toBe('insert_drive_file');
    expect(getTypeIcon('')).toBe('insert_drive_file');
    expect(getTypeIcon('SomethingElse')).toBe('insert_drive_file');
  });
});

// ===========================================================================
// hasDescendantMatch
// ===========================================================================

describe('hasDescendantMatch', () => {
  it('returns true for a direct label match', () => {
    const root = makeItem('root', 'Collection', [makeItem('photo-1', 'Canvas')]);
    const a = buildAccessors(root);
    expect(hasDescendantMatch(['photo-1'], a, 'photo')).toBe(true);
  });

  it('returns true for a descendant match', () => {
    const child = makeItem('medieval-page', 'Canvas');
    const parent = makeItem('book', 'Manifest', [child]);
    const root = makeItem('root', 'Collection', [parent]);
    const a = buildAccessors(root);
    expect(hasDescendantMatch(['book'], a, 'medieval')).toBe(true);
  });

  it('returns false when nothing matches', () => {
    const root = makeItem('root', 'Collection', [
      makeItem('alpha', 'Canvas'),
      makeItem('beta', 'Canvas'),
    ]);
    const a = buildAccessors(root);
    expect(hasDescendantMatch(['alpha', 'beta'], a, 'gamma')).toBe(false);
  });

  it('matches through deep nesting', () => {
    const leaf = makeItem('deep-match', 'Canvas');
    const mid = makeItem('mid', 'Range', [leaf]);
    const top = makeItem('top', 'Manifest', [mid]);
    const root = makeItem('root', 'Collection', [top]);
    const a = buildAccessors(root);
    expect(hasDescendantMatch(['top'], a, 'deep-match')).toBe(true);
  });

  it('returns false for empty ids array', () => {
    const a = buildAccessors(null);
    expect(hasDescendantMatch([], a, 'anything')).toBe(false);
  });

  it('is case-insensitive', () => {
    const root = makeItem('root', 'Collection', [makeItem('Medieval Folio', 'Canvas')]);
    const a = buildAccessors(root);
    expect(hasDescendantMatch(['Medieval Folio'], a, 'medieval folio')).toBe(true);
    expect(hasDescendantMatch(['Medieval Folio'], a, 'MEDIEVAL')).toBe(true);
  });
});

// ===========================================================================
// computeBreadcrumbs
// ===========================================================================

describe('computeBreadcrumbs', () => {
  it('returns an empty array when targetId is null', () => {
    const a = buildAccessors(null);
    expect(computeBreadcrumbs(null, a)).toEqual([]);
  });

  it('returns a single-element path when root is the target', () => {
    const root = makeItem('root', 'Collection');
    const a = buildAccessors(root);
    const result = computeBreadcrumbs('root', a);
    expect(result).toEqual([{ id: 'root', label: 'root' }]);
  });

  it('builds a full path for a nested target', () => {
    const child = makeItem('c', 'Canvas');
    const manifest = makeItem('m', 'Manifest', [child]);
    const root = makeItem('r', 'Collection', [manifest]);
    const a = buildAccessors(root);

    const result = computeBreadcrumbs('c', a);
    expect(result).toEqual([
      { id: 'r', label: 'r' },
      { id: 'm', label: 'm' },
      { id: 'c', label: 'c' },
    ]);
  });

  it('returns an empty array when target is not found', () => {
    const root = makeItem('root', 'Collection', [
      makeItem('a', 'Manifest'),
    ]);
    const a = buildAccessors(root);
    expect(computeBreadcrumbs('missing', a)).toEqual([]);
  });
});

// ===========================================================================
// flattenTree
// ===========================================================================

describe('flattenTree', () => {
  it('returns an empty array for null rootId', () => {
    const a = buildAccessors(null);
    expect(flattenTree(null, a, new Set(), '')).toEqual([]);
  });

  it('returns a single node for a leaf item', () => {
    const root = makeItem('only', 'Canvas');
    const a = buildAccessors(root);
    const nodes = flattenTree('only', a, new Set(), '');
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toEqual({
      id: 'only',
      label: 'only',
      type: 'Canvas',
      depth: 0,
      hasChildren: false,
      isExpanded: false,
    });
  });

  it('flattens nested tree with all nodes expanded', () => {
    const c1 = makeItem('c1', 'Canvas');
    const c2 = makeItem('c2', 'Canvas');
    const m = makeItem('m', 'Manifest', [c1, c2]);
    const root = makeItem('root', 'Collection', [m]);
    const a = buildAccessors(root);

    const expanded = new Set(['root', 'm']);
    const nodes = flattenTree('root', a, expanded, '');

    expect(nodes).toHaveLength(4);
    expect(nodes.map((n) => n.id)).toEqual(['root', 'm', 'c1', 'c2']);
    expect(nodes[0].depth).toBe(0);
    expect(nodes[1].depth).toBe(1);
    expect(nodes[2].depth).toBe(2);
    expect(nodes[3].depth).toBe(2);
  });

  it('hides children of collapsed nodes', () => {
    const c1 = makeItem('c1', 'Canvas');
    const c2 = makeItem('c2', 'Canvas');
    const m = makeItem('m', 'Manifest', [c1, c2]);
    const root = makeItem('root', 'Collection', [m]);
    const a = buildAccessors(root);

    // root is expanded but m is not — c1, c2 should be hidden
    const expanded = new Set(['root']);
    const nodes = flattenTree('root', a, expanded, '');

    expect(nodes).toHaveLength(2);
    expect(nodes.map((n) => n.id)).toEqual(['root', 'm']);
    // m has children but is not expanded
    expect(nodes[1].hasChildren).toBe(true);
    expect(nodes[1].isExpanded).toBe(false);
  });

  it('shows matching ancestors when searching', () => {
    const target = makeItem('target-leaf', 'Canvas');
    const parent = makeItem('parent', 'Manifest', [target]);
    const root = makeItem('root', 'Collection', [parent]);
    const a = buildAccessors(root);

    // Not expanded — search should force children open
    const nodes = flattenTree('root', a, new Set(), 'target-leaf');

    // root and parent shown as ancestors, target-leaf shown as match
    expect(nodes).toHaveLength(3);
    expect(nodes.map((n) => n.id)).toEqual(['root', 'parent', 'target-leaf']);
  });

  it('excludes branches with no search matches', () => {
    const match = makeItem('match-me', 'Canvas');
    const noMatch = makeItem('other', 'Canvas');
    const branchA = makeItem('branch-a', 'Manifest', [match]);
    const branchB = makeItem('branch-b', 'Manifest', [noMatch]);
    const root = makeItem('root', 'Collection', [branchA, branchB]);
    const a = buildAccessors(root);

    const nodes = flattenTree('root', a, new Set(), 'match-me');

    const ids = nodes.map((n) => n.id);
    expect(ids).toContain('branch-a');
    expect(ids).toContain('match-me');
    // branch-b and other should be excluded
    expect(ids).not.toContain('branch-b');
    expect(ids).not.toContain('other');
  });

  it('returns empty array when search has no matches', () => {
    const root = makeItem('root', 'Collection', [
      makeItem('a', 'Manifest'),
      makeItem('b', 'Canvas'),
    ]);
    const a = buildAccessors(root);

    const nodes = flattenTree('root', a, new Set(), 'zzzzz');
    expect(nodes).toEqual([]);
  });
});
