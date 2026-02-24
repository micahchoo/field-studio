/**
 * detectConflicts — Unit Tests
 *
 * Tests the pure conflict detection function for the staging feature.
 * Verifies duplicate filename detection across flat trees, nested
 * directories, and edge cases.
 *
 * Source: src/features/staging/model/conflictDetection.ts
 */

import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../model/conflictDetection';
import type { FileTree } from '@/src/shared/types';

// ============================================================================
// Test helpers
// ============================================================================

function makeFile(name: string): File {
  return new File(['content'], name);
}

function makeTree(
  path: string,
  files: string[] = [],
  directories: Map<string, FileTree> = new Map(),
): FileTree {
  return {
    name: path.split('/').pop() || path,
    path,
    files: new Map(files.map(f => [f, makeFile(f)])),
    directories,
  };
}

// ============================================================================
// No conflicts — clean trees
// ============================================================================

describe('detectConflicts — no conflicts', () => {
  it('returns hasConflicts false for an empty tree', () => {
    const tree = makeTree('');
    const report = detectConflicts(tree);
    expect(report.hasConflicts).toBe(false);
  });

  it('returns empty duplicateNames for an empty tree', () => {
    const tree = makeTree('');
    expect(detectConflicts(tree).duplicateNames).toEqual([]);
  });

  it('returns totalDuplicates 0 for an empty tree', () => {
    const tree = makeTree('');
    expect(detectConflicts(tree).totalDuplicates).toBe(0);
  });

  it('reports no conflicts when all filenames in a flat tree are unique', () => {
    const tree = makeTree('root', ['alpha.jpg', 'beta.png', 'gamma.tif']);
    const report = detectConflicts(tree);
    expect(report.hasConflicts).toBe(false);
    expect(report.totalDuplicates).toBe(0);
  });

  it('reports no conflicts when subdirectories contain different filenames', () => {
    const dirA = makeTree('dirA', ['photo1.jpg']);
    const dirB = makeTree('dirB', ['photo2.jpg']);
    const tree = makeTree('root', [], new Map([['dirA', dirA], ['dirB', dirB]]));
    expect(detectConflicts(tree).hasConflicts).toBe(false);
  });

  it('reports no conflicts for a single file', () => {
    const tree = makeTree('root', ['solo.jpg']);
    expect(detectConflicts(tree).hasConflicts).toBe(false);
  });
});

// ============================================================================
// Duplicate detection — flat trees
// ============================================================================

describe('detectConflicts — flat tree duplicates', () => {
  it('detects two files with the same name in the root', () => {
    // Two separate directories both containing the same root-level filename:
    // We simulate by having the same name appear in two different subdirs
    const dirA = makeTree('dirA', ['photo.jpg']);
    const dirB = makeTree('dirB', ['photo.jpg']);
    const tree = makeTree('root', [], new Map([['dirA', dirA], ['dirB', dirB]]));
    const report = detectConflicts(tree);
    expect(report.hasConflicts).toBe(true);
    expect(report.duplicateNames).toHaveLength(1);
    expect(report.duplicateNames[0].name).toBe('photo.jpg');
  });

  it('totalDuplicates equals the number of conflicting paths', () => {
    const dirA = makeTree('dirA', ['x.jpg']);
    const dirB = makeTree('dirB', ['x.jpg']);
    const tree = makeTree('root', [], new Map([['dirA', dirA], ['dirB', dirB]]));
    const report = detectConflicts(tree);
    expect(report.totalDuplicates).toBe(2);
  });

  it('reports correct paths for each conflicting file', () => {
    const dirA = makeTree('dirA', ['photo.jpg']);
    const dirB = makeTree('dirB', ['photo.jpg']);
    const tree = makeTree('root', [], new Map([['dirA', dirA], ['dirB', dirB]]));
    const entry = detectConflicts(tree).duplicateNames[0];
    expect(entry.paths).toHaveLength(2);
    expect(entry.paths.some(p => p.includes('dirA'))).toBe(true);
    expect(entry.paths.some(p => p.includes('dirB'))).toBe(true);
  });
});

// ============================================================================
// Duplicate detection — nested trees
// ============================================================================

describe('detectConflicts — nested tree duplicates', () => {
  it('detects duplicates across deeply nested subdirectories', () => {
    const inner = makeTree('root/outer/inner', ['deep.jpg']);
    const outer = makeTree('root/outer', [], new Map([['inner', inner]]));
    const root = makeTree('root', ['deep.jpg'], new Map([['outer', outer]]));
    const report = detectConflicts(root);
    expect(report.hasConflicts).toBe(true);
    expect(report.duplicateNames[0].name).toBe('deep.jpg');
    expect(report.duplicateNames[0].paths).toHaveLength(2);
  });

  it('handles three or more directories with the same filename', () => {
    const dirA = makeTree('dirA', ['img.jpg']);
    const dirB = makeTree('dirB', ['img.jpg']);
    const dirC = makeTree('dirC', ['img.jpg']);
    const tree = makeTree('root', [], new Map([
      ['dirA', dirA],
      ['dirB', dirB],
      ['dirC', dirC],
    ]));
    const report = detectConflicts(tree);
    expect(report.totalDuplicates).toBe(3);
    expect(report.duplicateNames[0].paths).toHaveLength(3);
  });

  it('detects multiple distinct duplicate groups', () => {
    const dirA = makeTree('dirA', ['foo.jpg', 'bar.png']);
    const dirB = makeTree('dirB', ['foo.jpg', 'bar.png']);
    const tree = makeTree('root', [], new Map([['dirA', dirA], ['dirB', dirB]]));
    const report = detectConflicts(tree);
    expect(report.hasConflicts).toBe(true);
    expect(report.duplicateNames).toHaveLength(2);
    expect(report.totalDuplicates).toBe(4); // 2 groups × 2 paths each
  });

  it('totalDuplicates is the sum of all path counts across all duplicate groups', () => {
    const dirA = makeTree('dirA', ['x.jpg']);  // group x: 2
    const dirB = makeTree('dirB', ['x.jpg', 'y.png']); // group x +1, group y: 2
    const dirC = makeTree('dirC', ['y.png']); // group y +1 = 2 total
    const tree = makeTree('root', [], new Map([
      ['dirA', dirA],
      ['dirB', dirB],
      ['dirC', dirC],
    ]));
    const report = detectConflicts(tree);
    // group x.jpg: paths in dirA + dirB = 2
    // group y.png: paths in dirB + dirC = 2
    expect(report.totalDuplicates).toBe(4);
  });
});

// ============================================================================
// Path construction
// ============================================================================

describe('detectConflicts — path construction', () => {
  it('path includes the parent directory name for subdirectory files', () => {
    const sub = makeTree('photos', ['img.jpg']);
    const sub2 = makeTree('archive', ['img.jpg']);
    const tree = makeTree('', [], new Map([['photos', sub], ['archive', sub2]]));
    const entry = detectConflicts(tree).duplicateNames[0];
    const hasPhotos = entry.paths.some(p => p.includes('photos'));
    const hasArchive = entry.paths.some(p => p.includes('archive'));
    expect(hasPhotos).toBe(true);
    expect(hasArchive).toBe(true);
  });

  it('root-level files without a parent path use just the filename', () => {
    const _treeA = makeTree('', ['shared.jpg']);
    const dirB = makeTree('sub', ['shared.jpg']);
    const tree = makeTree('', [], new Map([['sub', dirB]]));
    // Add root-level files
    tree.files.set('shared.jpg', makeFile('shared.jpg'));
    const entry = detectConflicts(tree).duplicateNames[0];
    expect(entry.paths.some(p => p === 'shared.jpg' || !p.includes('/'))).toBe(true);
  });
});

// ============================================================================
// existingRoot parameter (currently unused)
// ============================================================================

describe('detectConflicts — existingRoot parameter', () => {
  it('accepts null as existingRoot without error', () => {
    const tree = makeTree('root', ['a.jpg']);
    expect(() => detectConflicts(tree, null)).not.toThrow();
  });

  it('accepts undefined as existingRoot without error', () => {
    const tree = makeTree('root', ['a.jpg']);
    expect(() => detectConflicts(tree, undefined)).not.toThrow();
  });

  it('result is the same regardless of existingRoot value', () => {
    const dirA = makeTree('a', ['dup.jpg']);
    const dirB = makeTree('b', ['dup.jpg']);
    const tree = makeTree('root', [], new Map([['a', dirA], ['b', dirB]]));
    const withNull = detectConflicts(tree, null);
    const withUndefined = detectConflicts(tree, undefined);
    expect(withNull.hasConflicts).toBe(withUndefined.hasConflicts);
    expect(withNull.totalDuplicates).toBe(withUndefined.totalDuplicates);
  });
});

// ============================================================================
// ConflictReport shape
// ============================================================================

describe('detectConflicts — report shape', () => {
  it('returned object always has hasConflicts, duplicateNames, and totalDuplicates', () => {
    const tree = makeTree('root');
    const report = detectConflicts(tree);
    expect(report).toHaveProperty('hasConflicts');
    expect(report).toHaveProperty('duplicateNames');
    expect(report).toHaveProperty('totalDuplicates');
  });

  it('duplicateNames entries have name and paths properties', () => {
    const dirA = makeTree('dirA', ['x.jpg']);
    const dirB = makeTree('dirB', ['x.jpg']);
    const tree = makeTree('root', [], new Map([['dirA', dirA], ['dirB', dirB]]));
    const entry = detectConflicts(tree).duplicateNames[0];
    expect(entry).toHaveProperty('name');
    expect(entry).toHaveProperty('paths');
    expect(Array.isArray(entry.paths)).toBe(true);
  });

  it('hasConflicts is false when duplicateNames is empty', () => {
    const tree = makeTree('root', ['unique.jpg']);
    const report = detectConflicts(tree);
    expect(report.hasConflicts).toBe(false);
    expect(report.duplicateNames).toHaveLength(0);
  });

  it('hasConflicts is true when duplicateNames has entries', () => {
    const dirA = makeTree('a', ['dup.jpg']);
    const dirB = makeTree('b', ['dup.jpg']);
    const tree = makeTree('root', [], new Map([['a', dirA], ['b', dirB]]));
    const report = detectConflicts(tree);
    expect(report.hasConflicts).toBe(true);
    expect(report.duplicateNames.length).toBeGreaterThan(0);
  });
});
