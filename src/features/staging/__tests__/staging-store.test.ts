/**
 * Tests for StagingStateStore (Svelte 5 runes-based singleton).
 *
 * The store lives at ../stores/stagingState.svelte.ts and exports a
 * singleton `stagingState`. Because the vitest config includes
 * @sveltejs/vite-plugin-svelte, the $state/$derived rune transforms
 * are compiled and the reactive getters work as plain property access.
 *
 * @module features/staging/__tests__/staging-store.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { stagingState } from '../stores/stagingState.svelte';
import type { SourceManifests, SourceManifest, NodeAnnotations } from '../model';
import type { FileTree } from '@/src/shared/types';

// ============================================================================
// Test Helpers
// ============================================================================

function makeFileTree(): FileTree {
  return {
    path: 'root',
    name: 'root',
    files: new Map<string, File>([
      ['image1.jpg', new File([''], 'image1.jpg')],
      ['image2.jpg', new File([''], 'image2.jpg')],
    ]),
    directories: new Map<string, FileTree>([
      [
        'subdir',
        {
          path: 'root/subdir',
          name: 'subdir',
          files: new Map<string, File>([
            ['image3.jpg', new File([''], 'image3.jpg')],
          ]),
          directories: new Map<string, FileTree>(),
        },
      ],
    ]),
  };
}

function makeSourceManifests(): SourceManifests {
  return {
    byId: {
      m1: {
        id: 'm1',
        label: 'Manifest 1',
        canvases: [{ id: 'c1', label: 'Canvas 1' }],
      },
      m2: {
        id: 'm2',
        label: 'Manifest 2',
        canvases: [
          { id: 'c2', label: 'Canvas 2' },
          { id: 'c3', label: 'Canvas 3' },
        ],
      },
      m3: {
        id: 'm3',
        label: 'Other Work',
        canvases: [{ id: 'c4', label: 'Canvas 4' }],
      },
    },
    allIds: ['m1', 'm2', 'm3'],
  };
}

/**
 * Helper: initialize the store with default test data.
 */
function initDefault(): void {
  stagingState.initialize(makeFileTree(), makeSourceManifests());
}

// ============================================================================
// Tests
// ============================================================================

describe('StagingStateStore', () => {
  beforeEach(() => {
    stagingState.destroy();
  });

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  describe('lifecycle', () => {
    it('initialize sets domain data and resets UI state', () => {
      initDefault();

      // Domain data populated
      expect(stagingState.sourceManifests.allIds).toEqual(['m1', 'm2', 'm3']);
      expect(stagingState.fileTree).not.toBeNull();
      expect(stagingState.fileTree!.name).toBe('root');

      // UI state reset
      expect(stagingState.selectedIds).toEqual([]);
      expect(stagingState.focusedPane).toBe('source');
      expect(stagingState.filterText).toBe('');
      expect(stagingState.dragState).toBeNull();

      // Archive layout starts with a root collection
      expect(stagingState.archiveLayout.root.id).toBe('root');
      expect(stagingState.archiveLayout.root.type).toBe('Collection');
    });

    it('initialize expands root-level directories by default', () => {
      initDefault();

      // The root path and the subdir path should both be expanded
      expect(stagingState.expandedPaths.has('root')).toBe(true);
      expect(stagingState.expandedPaths.has('root/subdir')).toBe(true);
    });

    it('destroy resets everything to defaults', () => {
      initDefault();
      stagingState.toggleSelection('m1');
      stagingState.setFilterText('something');

      stagingState.destroy();

      expect(stagingState.sourceManifests.allIds).toEqual([]);
      expect(stagingState.fileTree).toBeNull();
      expect(stagingState.selectedIds).toEqual([]);
      expect(stagingState.filterText).toBe('');
      expect(stagingState.expandedPaths.size).toBe(0);
      expect(stagingState.annotationsMap.size).toBe(0);
      expect(stagingState.focusedPane).toBe('source');
      expect(stagingState.dragState).toBeNull();
    });

    it('double initialize overwrites cleanly', () => {
      initDefault();
      stagingState.toggleSelection('m1');

      // Re-initialize with different data
      const smallManifests: SourceManifests = {
        byId: {
          x1: { id: 'x1', label: 'X1', canvases: [] },
        },
        allIds: ['x1'],
      };
      const smallTree: FileTree = {
        path: 'other',
        name: 'other',
        files: new Map(),
        directories: new Map(),
      };

      stagingState.initialize(smallTree, smallManifests);

      expect(stagingState.sourceManifests.allIds).toEqual(['x1']);
      expect(stagingState.fileTree!.name).toBe('other');
      // Selection should be cleared
      expect(stagingState.selectedIds).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Selection
  // --------------------------------------------------------------------------

  describe('selection', () => {
    beforeEach(() => initDefault());

    it('toggleSelection adds an ID when not selected', () => {
      stagingState.toggleSelection('m1');
      expect(stagingState.selectedIds).toEqual(['m1']);
    });

    it('toggleSelection removes an ID when already selected', () => {
      stagingState.toggleSelection('m1');
      stagingState.toggleSelection('m1');
      expect(stagingState.selectedIds).toEqual([]);
    });

    it('toggleSelection supports multiple independent selections', () => {
      stagingState.toggleSelection('m1');
      stagingState.toggleSelection('m3');
      expect(stagingState.selectedIds).toEqual(['m1', 'm3']);
    });

    it('selectRange selects a contiguous range from anchor to target', () => {
      // Set anchor by toggling m1
      stagingState.toggleSelection('m1');
      // Now shift-select to m3 -- should select m1, m2, m3
      stagingState.selectRange('m3');
      expect(stagingState.selectedIds).toEqual(['m1', 'm2', 'm3']);
    });

    it('selectRange with no previous anchor selects only the target', () => {
      stagingState.selectRange('m2');
      expect(stagingState.selectedIds).toEqual(['m2']);
    });

    it('selectRange works in reverse direction', () => {
      stagingState.toggleSelection('m3');
      stagingState.selectRange('m1');
      expect(stagingState.selectedIds).toEqual(['m1', 'm2', 'm3']);
    });

    it('selectAll selects all filtered manifests', () => {
      stagingState.selectAll();
      expect(stagingState.selectedIds).toEqual(['m1', 'm2', 'm3']);
    });

    it('selectAll respects active filter', () => {
      stagingState.setFilterText('Other');
      stagingState.selectAll();
      // Only 'Other Work' (m3) matches the filter
      expect(stagingState.selectedIds).toEqual(['m3']);
    });

    it('clearSelection empties selectedIds', () => {
      stagingState.toggleSelection('m1');
      stagingState.toggleSelection('m2');
      stagingState.clearSelection();
      expect(stagingState.selectedIds).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Source manifest mutations
  // --------------------------------------------------------------------------

  describe('source manifest mutations', () => {
    beforeEach(() => initDefault());

    it('addManifest adds a new manifest', () => {
      const newManifest: SourceManifest = {
        id: 'm4',
        label: 'Manifest 4',
        canvases: [{ id: 'c5', label: 'Canvas 5' }],
      };
      stagingState.addManifest(newManifest);

      expect(stagingState.sourceManifests.allIds).toContain('m4');
      expect(stagingState.sourceManifests.byId['m4'].label).toBe('Manifest 4');
    });

    it('addManifest merges canvases for an existing manifest ID', () => {
      const duplicate: SourceManifest = {
        id: 'm1',
        label: 'Manifest 1',
        canvases: [
          { id: 'c1', label: 'Canvas 1' }, // duplicate, should not be added twice
          { id: 'c99', label: 'New Canvas' },
        ],
      };
      stagingState.addManifest(duplicate);

      const m1 = stagingState.sourceManifests.byId['m1'];
      // Original c1 plus new c99
      expect(m1.canvases).toHaveLength(2);
      expect(m1.canvases.map((c) => c.id)).toEqual(['c1', 'c99']);
      // allIds should not have a duplicate entry
      expect(
        stagingState.sourceManifests.allIds.filter((id) => id === 'm1'),
      ).toHaveLength(1);
    });

    it('removeManifest removes the manifest from byId and allIds', () => {
      stagingState.removeManifest('m2');

      expect(stagingState.sourceManifests.allIds).toEqual(['m1', 'm3']);
      expect(stagingState.sourceManifests.byId['m2']).toBeUndefined();
    });

    it('removeManifest also removes from selectedIds', () => {
      stagingState.toggleSelection('m2');
      expect(stagingState.selectedIds).toContain('m2');

      stagingState.removeManifest('m2');
      expect(stagingState.selectedIds).not.toContain('m2');
    });

    it('mergeManifests combines canvases into target and removes sources', () => {
      stagingState.mergeManifests(['m1', 'm2'], 'm2');

      const merged = stagingState.sourceManifests.byId['m2'];
      // m2 had [c2, c3], m1 had [c1] => merged should have [c2, c3, c1]
      expect(merged.canvases.map((c) => c.id)).toEqual(['c2', 'c3', 'c1']);
      // m1 should be removed
      expect(stagingState.sourceManifests.byId['m1']).toBeUndefined();
      expect(stagingState.sourceManifests.allIds).not.toContain('m1');
    });

    it('mergeManifests clears selection', () => {
      stagingState.toggleSelection('m1');
      stagingState.toggleSelection('m2');

      stagingState.mergeManifests(['m1', 'm2'], 'm2');
      expect(stagingState.selectedIds).toEqual([]);
    });

    it('reorderManifestCanvases reorders canvases within a manifest', () => {
      // m2 has [c2, c3], reorder to [c3, c2]
      stagingState.reorderManifestCanvases('m2', ['c3', 'c2']);

      const m2 = stagingState.sourceManifests.byId['m2'];
      expect(m2.canvases.map((c) => c.id)).toEqual(['c3', 'c2']);
    });
  });

  // --------------------------------------------------------------------------
  // Collection / archive mutations
  // --------------------------------------------------------------------------

  describe('collection/archive mutations', () => {
    beforeEach(() => initDefault());

    it('createNewCollection adds a collection under root', () => {
      const id = stagingState.createNewCollection('My Collection');

      expect(typeof id).toBe('string');
      expect(id.startsWith('coll-')).toBe(true);

      const node = stagingState.archiveLayout.flatIndex.get(id);
      expect(node).toBeDefined();
      expect(node!.name).toBe('My Collection');
      expect(node!.type).toBe('Collection');
      expect(node!.children).toEqual([]);
      expect(node!.manifestIds).toEqual([]);
    });

    it('addToCollection adds manifest IDs to a collection', () => {
      const collId = stagingState.createNewCollection('Coll A');
      stagingState.addToCollection(collId, ['m1', 'm2']);

      const node = stagingState.archiveLayout.flatIndex.get(collId);
      expect(node!.manifestIds).toEqual(['m1', 'm2']);
    });

    it('addToCollection removes manifest from old collection first', () => {
      const collA = stagingState.createNewCollection('Coll A');
      const collB = stagingState.createNewCollection('Coll B');

      stagingState.addToCollection(collA, ['m1']);
      expect(
        stagingState.archiveLayout.flatIndex.get(collA)!.manifestIds,
      ).toEqual(['m1']);

      // Move m1 from A to B
      stagingState.addToCollection(collB, ['m1']);

      expect(
        stagingState.archiveLayout.flatIndex.get(collA)!.manifestIds,
      ).toEqual([]);
      expect(
        stagingState.archiveLayout.flatIndex.get(collB)!.manifestIds,
      ).toEqual(['m1']);
    });

    it('removeFromCollection removes manifest IDs', () => {
      const collId = stagingState.createNewCollection('Coll A');
      stagingState.addToCollection(collId, ['m1', 'm2', 'm3']);
      stagingState.removeFromCollection(collId, ['m2']);

      const node = stagingState.archiveLayout.flatIndex.get(collId);
      expect(node!.manifestIds).toEqual(['m1', 'm3']);
    });

    it('renameCollection updates the name', () => {
      const collId = stagingState.createNewCollection('Old Name');
      stagingState.renameCollection(collId, 'New Name');

      const node = stagingState.archiveLayout.flatIndex.get(collId);
      expect(node!.name).toBe('New Name');
    });

    it('deleteCollection removes the node from the tree', () => {
      const collId = stagingState.createNewCollection('Doomed');
      expect(stagingState.archiveLayout.flatIndex.has(collId)).toBe(true);

      stagingState.deleteCollection(collId);
      expect(stagingState.archiveLayout.flatIndex.has(collId)).toBe(false);
      expect(stagingState.archiveLayout.root.children).toHaveLength(0);
    });

    it('deleteCollection does not delete root', () => {
      stagingState.deleteCollection('root');

      expect(stagingState.archiveLayout.root.id).toBe('root');
      expect(stagingState.archiveLayout.flatIndex.has('root')).toBe(true);
    });

    it('createSubCollection adds a child collection under parent', () => {
      const parentId = stagingState.createNewCollection('Parent');
      const childId = stagingState.createSubCollection(parentId, 'Child');

      const parent = stagingState.archiveLayout.flatIndex.get(parentId);
      expect(parent!.children).toHaveLength(1);
      expect(parent!.children[0].id).toBe(childId);

      const child = stagingState.archiveLayout.flatIndex.get(childId);
      expect(child!.name).toBe('Child');
      expect(child!.type).toBe('Collection');
    });

    it('getAllCollectionsList returns flat list of all collections', () => {
      const c1 = stagingState.createNewCollection('A');
      const c2 = stagingState.createSubCollection(c1, 'B');

      const list = stagingState.getAllCollectionsList();
      const ids = list.map((n) => n.id);

      // root, c1, c2 should all be present
      expect(ids).toContain('root');
      expect(ids).toContain(c1);
      expect(ids).toContain(c2);
      expect(list).toHaveLength(3);
    });
  });

  // --------------------------------------------------------------------------
  // File tree operations
  // --------------------------------------------------------------------------

  describe('file tree operations', () => {
    beforeEach(() => initDefault());

    it('toggleExpanded adds a path when not expanded', () => {
      // After initialize, root and root/subdir are expanded
      // Add a new path that is not in the set
      stagingState.toggleExpanded('some/new/path');
      expect(stagingState.expandedPaths.has('some/new/path')).toBe(true);
    });

    it('toggleExpanded removes a path when already expanded', () => {
      // root/subdir is expanded after initialize
      expect(stagingState.expandedPaths.has('root/subdir')).toBe(true);

      stagingState.toggleExpanded('root/subdir');
      expect(stagingState.expandedPaths.has('root/subdir')).toBe(false);
    });

    it('expandAll expands all directory paths in the tree', () => {
      stagingState.collapseAll();
      expect(stagingState.expandedPaths.size).toBe(0);

      stagingState.expandAll();
      // root + root/subdir
      expect(stagingState.expandedPaths.has('root')).toBe(true);
      expect(stagingState.expandedPaths.has('root/subdir')).toBe(true);
    });

    it('collapseAll clears all expanded paths', () => {
      expect(stagingState.expandedPaths.size).toBeGreaterThan(0);
      stagingState.collapseAll();
      expect(stagingState.expandedPaths.size).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Annotations
  // --------------------------------------------------------------------------

  describe('annotations', () => {
    beforeEach(() => initDefault());

    it('setAnnotation creates a new Map entry', () => {
      const ann: NodeAnnotations = { iiifIntent: 'Manifest', label: 'Test' };
      stagingState.setAnnotation('root/subdir', ann);

      expect(stagingState.annotationsMap.has('root/subdir')).toBe(true);
      expect(stagingState.annotationsMap.get('root/subdir')).toEqual(ann);
    });

    it('setAnnotation overwrites an existing entry', () => {
      stagingState.setAnnotation('root/subdir', { iiifIntent: 'Collection' });
      stagingState.setAnnotation('root/subdir', {
        iiifIntent: 'Range',
        viewingDirection: 'right-to-left',
      });

      const ann = stagingState.annotationsMap.get('root/subdir');
      expect(ann!.iiifIntent).toBe('Range');
      expect(ann!.viewingDirection).toBe('right-to-left');
    });

    it('setAnnotation creates an immutable new Map (does not mutate previous reference)', () => {
      stagingState.setAnnotation('a', { label: 'A' });
      const mapBefore = stagingState.annotationsMap;

      stagingState.setAnnotation('b', { label: 'B' });
      const mapAfter = stagingState.annotationsMap;

      // Should be a different Map instance (immutable update)
      expect(mapBefore).not.toBe(mapAfter);
      // Both entries should exist in the new map
      expect(mapAfter.has('a')).toBe(true);
      expect(mapAfter.has('b')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Filter
  // --------------------------------------------------------------------------

  describe('filter', () => {
    beforeEach(() => initDefault());

    it('setFilterText updates filterText', () => {
      stagingState.setFilterText('hello');
      expect(stagingState.filterText).toBe('hello');
    });

    it('filteredManifests returns all when filterText is empty', () => {
      expect(stagingState.filteredManifests).toHaveLength(3);
    });

    it('filteredManifests filters by label (case insensitive)', () => {
      stagingState.setFilterText('manifest');
      const filtered = stagingState.filteredManifests;
      // 'Manifest 1' and 'Manifest 2' match, 'Other Work' does not
      expect(filtered).toHaveLength(2);
      expect(filtered.map((m) => m.id)).toEqual(['m1', 'm2']);
    });

    it('filteredManifests returns empty array when nothing matches', () => {
      stagingState.setFilterText('zzz_no_match');
      expect(stagingState.filteredManifests).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Focus / drag
  // --------------------------------------------------------------------------

  describe('focus and drag', () => {
    beforeEach(() => initDefault());

    it('setFocusedPane updates focused pane', () => {
      expect(stagingState.focusedPane).toBe('source');
      stagingState.setFocusedPane('archive');
      expect(stagingState.focusedPane).toBe('archive');
    });

    it('startDrag sets dragState with source IDs and null target', () => {
      stagingState.startDrag(['m1', 'm2']);
      expect(stagingState.dragState).toEqual({
        sourceIds: ['m1', 'm2'],
        overTarget: null,
      });
    });

    it('updateDragTarget updates overTarget in dragState', () => {
      stagingState.startDrag(['m1']);
      stagingState.updateDragTarget('coll-123');
      expect(stagingState.dragState!.overTarget).toBe('coll-123');
    });

    it('updateDragTarget is a no-op when no drag is active', () => {
      stagingState.updateDragTarget('coll-123');
      expect(stagingState.dragState).toBeNull();
    });

    it('endDrag without a target just clears dragState', () => {
      stagingState.startDrag(['m1']);
      stagingState.endDrag();
      expect(stagingState.dragState).toBeNull();
    });

    it('endDrag with a target calls addToCollection then clears dragState', () => {
      const collId = stagingState.createNewCollection('Drop Target');

      stagingState.startDrag(['m1', 'm2']);
      stagingState.updateDragTarget(collId);
      stagingState.endDrag();

      // dragState should be cleared
      expect(stagingState.dragState).toBeNull();

      // m1 and m2 should now be in the collection
      const node = stagingState.archiveLayout.flatIndex.get(collId);
      expect(node!.manifestIds).toEqual(['m1', 'm2']);
    });
  });

  // --------------------------------------------------------------------------
  // Derived values
  // --------------------------------------------------------------------------

  describe('derived values', () => {
    it('stats reflects current state after initialize', () => {
      initDefault();

      const stats = stagingState.stats;
      expect(stats.totalManifests).toBe(3);
      // root has 2 files, subdir has 1 file = 3 total
      expect(stats.totalFiles).toBe(3);
      // root collection only (the default archive layout)
      expect(stats.totalCollections).toBe(1);
      expect(stats.selectedCount).toBe(0);
    });

    it('stats.selectedCount updates after selection changes', () => {
      initDefault();
      stagingState.toggleSelection('m1');
      stagingState.toggleSelection('m2');
      expect(stagingState.stats.selectedCount).toBe(2);
    });

    it('stats.totalCollections increases when collections are created', () => {
      initDefault();
      stagingState.createNewCollection('A');
      stagingState.createNewCollection('B');
      // root + A + B = 3
      expect(stagingState.stats.totalCollections).toBe(3);
    });

    it('hasSelection is false with empty selectedIds', () => {
      initDefault();
      expect(stagingState.hasSelection).toBe(false);
    });

    it('hasSelection is true when items are selected', () => {
      initDefault();
      stagingState.toggleSelection('m1');
      expect(stagingState.hasSelection).toBe(true);
    });

    it('flatNodes reflects file tree with expanded state', () => {
      initDefault();
      // With root and root/subdir expanded, we should see:
      // subdir (depth 0, directory) -> image3.jpg (depth 1) -> image1.jpg (depth 0) -> image2.jpg (depth 0)
      const nodes = stagingState.flatNodes;
      expect(nodes.length).toBeGreaterThan(0);

      // Directories come first (sorted alpha), then files (sorted alpha)
      const names = nodes.map((n) => n.name);
      // subdir should be first (only directory at root depth)
      expect(names[0]).toBe('subdir');
      // Inside subdir (expanded): image3.jpg
      expect(names[1]).toBe('image3.jpg');
      // Then root-level files
      expect(names[2]).toBe('image1.jpg');
      expect(names[3]).toBe('image2.jpg');
    });

    it('flatNodes hides children when directory is collapsed', () => {
      initDefault();
      // Collapse subdir
      stagingState.toggleExpanded('root/subdir');

      const nodes = stagingState.flatNodes;
      const names = nodes.map((n) => n.name);

      // subdir should still be present
      expect(names).toContain('subdir');
      // image3.jpg (inside subdir) should be hidden
      expect(names).not.toContain('image3.jpg');
    });

    it('conflictReport detects no conflicts in a clean tree', () => {
      initDefault();
      const report = stagingState.conflictReport;
      // Our test tree has unique filenames across directories
      // image1.jpg, image2.jpg are in root; image3.jpg is in subdir
      expect(report.hasConflicts).toBe(false);
      expect(report.totalDuplicates).toBe(0);
    });

    it('conflictReport detects duplicate filenames across directories', () => {
      const treeWithDupes: FileTree = {
        path: 'root',
        name: 'root',
        files: new Map<string, File>([
          ['photo.jpg', new File([''], 'photo.jpg')],
        ]),
        directories: new Map<string, FileTree>([
          [
            'subdir',
            {
              path: 'root/subdir',
              name: 'subdir',
              files: new Map<string, File>([
                ['photo.jpg', new File([''], 'photo.jpg')],
              ]),
              directories: new Map(),
            },
          ],
        ]),
      };
      stagingState.initialize(treeWithDupes, makeSourceManifests());

      const report = stagingState.conflictReport;
      expect(report.hasConflicts).toBe(true);
      expect(report.duplicateNames).toHaveLength(1);
      expect(report.duplicateNames[0].name).toBe('photo.jpg');
      expect(report.duplicateNames[0].paths).toHaveLength(2);
    });

    it('conflictReport returns no conflicts when fileTree is null', () => {
      // After destroy, fileTree is null
      const report = stagingState.conflictReport;
      expect(report.hasConflicts).toBe(false);
      expect(report.totalDuplicates).toBe(0);
      expect(report.duplicateNames).toEqual([]);
    });

    it('stats returns zero files when fileTree is null', () => {
      const stats = stagingState.stats;
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalManifests).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases and integration
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    beforeEach(() => initDefault());

    it('removeManifest on non-existent ID does not crash', () => {
      expect(() => stagingState.removeManifest('nonexistent')).not.toThrow();
      expect(stagingState.sourceManifests.allIds).toHaveLength(3);
    });

    it('renameCollection on non-existent ID does not crash', () => {
      expect(() =>
        stagingState.renameCollection('nonexistent', 'Foo'),
      ).not.toThrow();
    });

    it('addToCollection with non-existent collection ID is a no-op', () => {
      stagingState.addToCollection('nonexistent', ['m1']);
      // Manifests should not appear anywhere new
      const root = stagingState.archiveLayout.root;
      expect(root.manifestIds).toEqual([]);
    });

    it('deleteCollection recursively removes sub-collections', () => {
      const parentId = stagingState.createNewCollection('Parent');
      const childId = stagingState.createSubCollection(parentId, 'Child');

      expect(stagingState.archiveLayout.flatIndex.has(childId)).toBe(true);

      stagingState.deleteCollection(parentId);

      expect(stagingState.archiveLayout.flatIndex.has(parentId)).toBe(false);
      expect(stagingState.archiveLayout.flatIndex.has(childId)).toBe(false);
    });

    it('expandAll is a no-op when fileTree is null', () => {
      stagingState.destroy();
      expect(() => stagingState.expandAll()).not.toThrow();
      expect(stagingState.expandedPaths.size).toBe(0);
    });

    it('selectRange with filtered-out anchor falls back to single selection', () => {
      stagingState.toggleSelection('m1'); // sets anchor to m1
      stagingState.setFilterText('Other'); // m1 is no longer in filtered list

      stagingState.selectRange('m3');
      // Since anchor m1 is not in filteredManifests, should fallback to [m3]
      expect(stagingState.selectedIds).toEqual(['m3']);
    });

    it('endDrag full cycle moves manifests to target collection', () => {
      const collId = stagingState.createNewCollection('Target');
      stagingState.addToCollection(collId, ['m1']);

      // Start a new drag with m2, m3
      stagingState.startDrag(['m2', 'm3']);
      stagingState.updateDragTarget(collId);
      stagingState.endDrag();

      const node = stagingState.archiveLayout.flatIndex.get(collId);
      // m1 should still be there (was not dragged), plus m2 and m3
      // However, addToCollection removes from all first, then adds.
      // m1 was in collId, m2/m3 were not in any collection.
      // After removeManifestFromAllNodes for m2 and m3 (no-op since they aren't in any),
      // then adds [m2, m3] to collId. m1 was already there and not touched.
      expect(node!.manifestIds).toContain('m1');
      expect(node!.manifestIds).toContain('m2');
      expect(node!.manifestIds).toContain('m3');
    });
  });
});
