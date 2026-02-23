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

// ===========================================================================
// getTypeIcon
// ===========================================================================

describe('getTypeIcon', () => {
  it('returns "folder" for Collection', () => {
    expect(getTypeIcon('Collection')).toBe('folder');
  });

  it('returns "book-open" for Manifest', () => {
    expect(getTypeIcon('Manifest')).toBe('book-open');
  });

  it('returns "image" for Canvas', () => {
    expect(getTypeIcon('Canvas')).toBe('image');
  });

  it('returns "layers" for Range', () => {
    expect(getTypeIcon('Range')).toBe('layers');
  });

  it('returns "file" for unknown types', () => {
    expect(getTypeIcon('Annotation')).toBe('file');
    expect(getTypeIcon('')).toBe('file');
    expect(getTypeIcon('SomethingElse')).toBe('file');
  });
});

// ===========================================================================
// hasDescendantMatch
// ===========================================================================

describe('hasDescendantMatch', () => {
  it('returns true for a direct label match', () => {
    const items = [makeItem('photo-1', 'Canvas')];
    expect(hasDescendantMatch(items, 'photo')).toBe(true);
  });

  it('returns true for a descendant match', () => {
    const child = makeItem('medieval-page', 'Canvas');
    const parent = makeItem('book', 'Manifest', [child]);
    expect(hasDescendantMatch([parent], 'medieval')).toBe(true);
  });

  it('returns false when nothing matches', () => {
    const items = [
      makeItem('alpha', 'Canvas'),
      makeItem('beta', 'Canvas'),
    ];
    expect(hasDescendantMatch(items, 'gamma')).toBe(false);
  });

  it('matches through deep nesting', () => {
    const leaf = makeItem('deep-match', 'Canvas');
    const mid = makeItem('mid', 'Range', [leaf]);
    const top = makeItem('top', 'Manifest', [mid]);
    expect(hasDescendantMatch([top], 'deep-match')).toBe(true);
  });

  it('returns false for empty items array', () => {
    expect(hasDescendantMatch([], 'anything')).toBe(false);
  });

  it('is case-insensitive', () => {
    const items = [makeItem('Medieval Folio', 'Canvas')];
    expect(hasDescendantMatch(items, 'medieval folio')).toBe(true);
    expect(hasDescendantMatch(items, 'MEDIEVAL')).toBe(true);
  });
});

// ===========================================================================
// computeBreadcrumbs
// ===========================================================================

describe('computeBreadcrumbs', () => {
  it('returns an empty array when root is null', () => {
    expect(computeBreadcrumbs(null, 'x')).toEqual([]);
  });

  it('returns a single-element path when root is the target', () => {
    const root = makeItem('root', 'Collection');
    const result = computeBreadcrumbs(root, 'root');
    expect(result).toEqual([{ id: 'root', label: 'root' }]);
  });

  it('builds a full path for a nested target', () => {
    const child = makeItem('c', 'Canvas');
    const manifest = makeItem('m', 'Manifest', [child]);
    const root = makeItem('r', 'Collection', [manifest]);

    const result = computeBreadcrumbs(root, 'c');
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
    expect(computeBreadcrumbs(root, 'missing')).toEqual([]);
  });
});

// ===========================================================================
// flattenTree
// ===========================================================================

describe('flattenTree', () => {
  it('returns an empty array for null root', () => {
    expect(flattenTree(null, new Set(), '')).toEqual([]);
  });

  it('returns a single node for a leaf item', () => {
    const root = makeItem('only', 'Canvas');
    const nodes = flattenTree(root, new Set(), '');
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

    const expanded = new Set(['root', 'm']);
    const nodes = flattenTree(root, expanded, '');

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

    // root is expanded but m is not — c1, c2 should be hidden
    const expanded = new Set(['root']);
    const nodes = flattenTree(root, expanded, '');

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

    // Not expanded — search should force children open
    const nodes = flattenTree(root, new Set(), 'target-leaf');

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

    const nodes = flattenTree(root, new Set(), 'match-me');

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

    const nodes = flattenTree(root, new Set(), 'zzzzz');
    expect(nodes).toEqual([]);
  });
});
