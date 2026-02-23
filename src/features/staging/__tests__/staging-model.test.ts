/**
 * Staging Feature Model Tests
 *
 * Comprehensive tests for all pure functions in the staging feature:
 * - model/index.ts selectors & operations
 * - model/conflictDetection.ts
 * - Svelte <script module> helpers extracted from StagingWorkbench, SourceTreePane, FileTreeNode
 *
 * Since <script module> exports cannot be imported from .svelte files in vitest
 * without the Svelte compiler pipeline for module-level exports, the pure functions
 * are copied inline here. This is a standard approach for testing <script module> exports.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  selectAllSourceManifests,
  selectSourceManifestById,
  selectTotalCanvasCount,
  selectSelectedManifests,
  addSourceManifest,
  removeSourceManifest,
  reorderCanvases,
  createCollectionFromManifests,
  mergeSourceManifests,
  findSimilarFilenames,
  countFilesRecursive,
  flattenFileTree,
  buildDirectoryMenuSections,
  buildFileMenuSections,
  buildCollectionMenuSections,
  applyAnnotationsToTree,
  type SourceManifest,
  type SourceManifests,
  type SourceCanvas,
  type NodeAnnotations,
} from '../model';
import { detectConflicts } from '../model/conflictDetection';

// ============================================================================
// FileTree interface (defined in React codebase src/shared/types; not yet in
// svelte-migration shared types — reproduced here for test purposes)
// ============================================================================

interface FileTree {
  name: string;
  path: string;
  files: Map<string, File>;
  directories: Map<string, FileTree>;
  iiifIntent?: string;
  iiifBehavior?: string[];
  viewingDirection?: string;
  iiifBaseUrl?: string;
  rights?: string;
  navDate?: string;
  startCanvasName?: string;
}

// ============================================================================
// IngestPreviewNode interface (used by StagingWorkbench & SourceTreePane helpers)
// ============================================================================

interface IngestPreviewNode {
  path: string;
  proposedType: string;
  confidence: number;
  detectionReasons: Array<{ type: string; details: string }>;
  children: IngestPreviewNode[];
}

// ============================================================================
// Helpers extracted from StagingWorkbench.svelte <script module>
// ============================================================================

interface UnsupportedFile {
  path: string;
  name: string;
  ext: string;
}

// Minimal MIME_TYPE_MAP for testing collectUnsupportedFiles
// Matches the shape from @/src/shared/constants/image
const MIME_TYPE_MAP: Record<string, { type: string; format: string; motivation: string }> = {
  jpg: { type: 'Image', format: 'image/jpeg', motivation: 'painting' },
  jpeg: { type: 'Image', format: 'image/jpeg', motivation: 'painting' },
  png: { type: 'Image', format: 'image/png', motivation: 'painting' },
  webp: { type: 'Image', format: 'image/webp', motivation: 'painting' },
  gif: { type: 'Image', format: 'image/gif', motivation: 'painting' },
  avif: { type: 'Image', format: 'image/avif', motivation: 'painting' },
  bmp: { type: 'Image', format: 'image/bmp', motivation: 'painting' },
  tiff: { type: 'Image', format: 'image/tiff', motivation: 'painting' },
  tif: { type: 'Image', format: 'image/tiff', motivation: 'painting' },
  svg: { type: 'Image', format: 'image/svg+xml', motivation: 'painting' },
  mp3: { type: 'Sound', format: 'audio/mpeg', motivation: 'painting' },
  wav: { type: 'Sound', format: 'audio/wav', motivation: 'painting' },
  ogg: { type: 'Sound', format: 'audio/ogg', motivation: 'painting' },
  m4a: { type: 'Sound', format: 'audio/mp4', motivation: 'painting' },
  aac: { type: 'Sound', format: 'audio/aac', motivation: 'painting' },
  flac: { type: 'Sound', format: 'audio/flac', motivation: 'painting' },
  mp4: { type: 'Video', format: 'video/mp4', motivation: 'painting' },
  webm: { type: 'Video', format: 'video/webm', motivation: 'painting' },
  mov: { type: 'Video', format: 'video/quicktime', motivation: 'painting' },
  pdf: { type: 'Text', format: 'application/pdf', motivation: 'painting' },
  txt: { type: 'Text', format: 'text/plain', motivation: 'supplementing' },
  json: { type: 'Dataset', format: 'application/json', motivation: 'supplementing' },
  csv: { type: 'Dataset', format: 'text/csv', motivation: 'supplementing' },
  glb: { type: 'Model', format: 'model/gltf-binary', motivation: 'painting' },
  gltf: { type: 'Model', format: 'model/gltf+json', motivation: 'painting' },
};

/** Extracted from StagingWorkbench.svelte <script module> */
function collectUnsupportedFiles(tree: FileTree, parentPath: string): UnsupportedFile[] {
  const result: UnsupportedFile[] = [];
  for (const [fileName] of tree.files) {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (!MIME_TYPE_MAP[ext]) {
      const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
      result.push({ path: filePath, name: fileName, ext });
    }
  }
  for (const dir of tree.directories.values()) {
    result.push(...collectUnsupportedFiles(dir, dir.path));
  }
  return result;
}

/** Extracted from StagingWorkbench.svelte <script module> */
function getUniqueUnsupportedExts(files: UnsupportedFile[]): string[] {
  return [...new Set(files.map(f => f.ext))].sort();
}

/** Extracted from StagingWorkbench.svelte <script module> */
function findAnalysisNodeWorkbench(root: IngestPreviewNode | undefined, path: string): IngestPreviewNode | undefined {
  if (!root) return undefined;
  if (root.path === path) return root;
  for (const child of root.children) {
    const found = findAnalysisNodeWorkbench(child, path);
    if (found) return found;
  }
  return undefined;
}

/** Extracted from StagingWorkbench.svelte <script module> */
function buildAnnotationsFromAnalysis(node: IngestPreviewNode): Map<string, NodeAnnotations> {
  const map = new Map<string, NodeAnnotations>();
  const walk = (n: IngestPreviewNode) => {
    if (n.proposedType === 'Excluded') {
      map.set(n.path, { excluded: true });
    } else {
      const intent = n.proposedType as 'Collection' | 'Manifest';
      if (n.confidence >= 0.7) {
        map.set(n.path, { iiifIntent: intent });
      }
    }
    for (const child of n.children) walk(child);
  };
  walk(node);
  return map;
}

// ============================================================================
// Helpers extracted from SourceTreePane.svelte <script module>
// ============================================================================

/** Extracted from SourceTreePane.svelte <script module> */
function getRootDirPaths(tree: FileTree): string[] {
  const paths: string[] = [];
  for (const dir of tree.directories.values()) {
    paths.push(dir.path);
  }
  return paths;
}

/** Extracted from SourceTreePane.svelte <script module> */
function countAllFiles(tree: FileTree): number {
  let count = tree.files.size;
  for (const dir of tree.directories.values()) {
    count += countAllFiles(dir);
  }
  return count;
}

/** Extracted from SourceTreePane.svelte <script module> */
function collectAncestorPaths(matchingPaths: Set<string>): Set<string> {
  const ancestors = new Set<string>();
  for (const p of matchingPaths) {
    const parts = p.split('/');
    let current = '';
    for (let i = 0; i < parts.length - 1; i++) {
      current = current ? `${current}/${parts[i]}` : parts[i];
      ancestors.add(current);
    }
  }
  return ancestors;
}

/** Extracted from SourceTreePane.svelte <script module> */
function collectMatchingPaths(tree: FileTree, filterLower: string, parentPath: string): Set<string> {
  const matches = new Set<string>();

  for (const [, dir] of tree.directories) {
    if (dir.name.toLowerCase().includes(filterLower)) {
      matches.add(dir.path);
    }
    const childMatches = collectMatchingPaths(dir, filterLower, dir.path);
    for (const m of childMatches) matches.add(m);
  }

  for (const [fileName] of tree.files) {
    if (fileName.toLowerCase().includes(filterLower)) {
      const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
      matches.add(filePath);
    }
  }

  return matches;
}

/** Extracted from SourceTreePane.svelte <script module> */
function findAnalysisNodePane(root: IngestPreviewNode | undefined, path: string): IngestPreviewNode | undefined {
  if (!root) return undefined;
  if (root.path === path) return root;
  for (const child of root.children) {
    const found = findAnalysisNodePane(child, path);
    if (found) return found;
  }
  return undefined;
}

// ============================================================================
// Helpers extracted from FileTreeNode.svelte <script module>
// ============================================================================

/** Extracted from FileTreeNode.svelte <script module> */
function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const entry = MIME_TYPE_MAP[ext];
  if (!entry) return 'insert_drive_file';
  switch (entry.type) {
    case 'Image': return 'image';
    case 'Sound': return 'audiotrack';
    case 'Video': return 'videocam';
    case 'Text': return 'description';
    case 'Dataset': return 'table_chart';
    case 'Model': return 'view_in_ar';
    default: return 'insert_drive_file';
  }
}

/** Extracted from FileTreeNode.svelte <script module> */
function getDirIcon(intent?: string): string {
  switch (intent) {
    case 'Collection': return 'collections_bookmark';
    case 'Manifest': return 'auto_stories';
    case 'Range': return 'segment';
    default: return 'folder';
  }
}

/** Extracted from FileTreeNode.svelte <script module> */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
}

/** Extracted from FileTreeNode.svelte <script module> */
function getConfidenceColor(confidence: number): string {
  if (confidence > 0.8) return 'bg-nb-green';
  if (confidence > 0.5) return 'bg-nb-orange';
  return 'bg-nb-red';
}

// ============================================================================
// Test helpers
// ============================================================================

function makeFileTree(overrides?: Partial<FileTree>): FileTree {
  return {
    name: overrides?.name ?? 'root',
    path: overrides?.path ?? '',
    files: overrides?.files ?? new Map(),
    directories: overrides?.directories ?? new Map(),
    ...(overrides?.iiifIntent && { iiifIntent: overrides.iiifIntent }),
    ...(overrides?.iiifBehavior && { iiifBehavior: overrides.iiifBehavior }),
    ...(overrides?.viewingDirection && { viewingDirection: overrides.viewingDirection }),
    ...(overrides?.rights && { rights: overrides.rights }),
    ...(overrides?.navDate && { navDate: overrides.navDate }),
    ...(overrides?.startCanvasName && { startCanvasName: overrides.startCanvasName }),
  };
}

function makeSourceManifests(manifests: SourceManifest[]): SourceManifests {
  const byId: Record<string, SourceManifest> = {};
  const allIds: string[] = [];
  for (const m of manifests) {
    byId[m.id] = m;
    allIds.push(m.id);
  }
  return { byId, allIds };
}

function makeSourceManifest(id: string, label: string, canvases: SourceCanvas[] = []): SourceManifest {
  return { id, label, canvases };
}

function makeCanvas(id: string, label: string): SourceCanvas {
  return { id, label };
}

function makeFile(name: string, size = 100): File {
  const content = new Array(size).fill('x').join('');
  return new File([content], name, { type: 'image/jpeg' });
}

function makeAnalysisNode(
  path: string,
  proposedType: string,
  confidence: number,
  children: IngestPreviewNode[] = [],
): IngestPreviewNode {
  return {
    path,
    proposedType,
    confidence,
    detectionReasons: [{ type: 'test', details: 'test reason' }],
    children,
  };
}

// ============================================================================
// 1. Model Functions (model/index.ts)
// ============================================================================

describe('selectAllSourceManifests', () => {
  it('returns all manifests in allIds order', () => {
    const sm = makeSourceManifests([
      makeSourceManifest('m1', 'Manifest 1'),
      makeSourceManifest('m2', 'Manifest 2'),
    ]);
    const result = selectAllSourceManifests(sm);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('m1');
    expect(result[1].id).toBe('m2');
  });

  it('returns empty array for empty collection', () => {
    const sm = makeSourceManifests([]);
    expect(selectAllSourceManifests(sm)).toEqual([]);
  });
});

describe('selectSourceManifestById', () => {
  it('returns the correct manifest by ID', () => {
    const sm = makeSourceManifests([
      makeSourceManifest('m1', 'Manifest 1'),
      makeSourceManifest('m2', 'Manifest 2'),
    ]);
    const result = selectSourceManifestById(sm, 'm2');
    expect(result).toBeDefined();
    expect(result!.label).toBe('Manifest 2');
  });

  it('returns undefined for a non-existent ID', () => {
    const sm = makeSourceManifests([makeSourceManifest('m1', 'Manifest 1')]);
    expect(selectSourceManifestById(sm, 'nonexistent')).toBeUndefined();
  });
});

describe('selectTotalCanvasCount', () => {
  it('sums canvases across all manifests', () => {
    const sm = makeSourceManifests([
      makeSourceManifest('m1', 'M1', [makeCanvas('c1', 'C1'), makeCanvas('c2', 'C2')]),
      makeSourceManifest('m2', 'M2', [makeCanvas('c3', 'C3')]),
    ]);
    expect(selectTotalCanvasCount(sm)).toBe(3);
  });

  it('returns 0 when no manifests exist', () => {
    const sm = makeSourceManifests([]);
    expect(selectTotalCanvasCount(sm)).toBe(0);
  });

  it('returns 0 when manifests have no canvases', () => {
    const sm = makeSourceManifests([makeSourceManifest('m1', 'M1')]);
    expect(selectTotalCanvasCount(sm)).toBe(0);
  });
});

describe('selectSelectedManifests', () => {
  it('returns manifests matching the selected IDs', () => {
    const sm = makeSourceManifests([
      makeSourceManifest('m1', 'M1'),
      makeSourceManifest('m2', 'M2'),
      makeSourceManifest('m3', 'M3'),
    ]);
    const result = selectSelectedManifests(sm, ['m1', 'm3']);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('m1');
    expect(result[1].id).toBe('m3');
  });

  it('skips missing IDs without error', () => {
    const sm = makeSourceManifests([makeSourceManifest('m1', 'M1')]);
    const result = selectSelectedManifests(sm, ['m1', 'missing']);
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no IDs match', () => {
    const sm = makeSourceManifests([makeSourceManifest('m1', 'M1')]);
    expect(selectSelectedManifests(sm, ['missing'])).toEqual([]);
  });
});

describe('addSourceManifest', () => {
  it('adds a new manifest to an empty collection', () => {
    const sm = makeSourceManifests([]);
    const m = makeSourceManifest('m1', 'New', [makeCanvas('c1', 'C1')]);
    const result = addSourceManifest(sm, m);
    expect(result.allIds).toEqual(['m1']);
    expect(result.byId['m1'].label).toBe('New');
  });

  it('appends manifest to existing collection', () => {
    const sm = makeSourceManifests([makeSourceManifest('m1', 'First')]);
    const m = makeSourceManifest('m2', 'Second');
    const result = addSourceManifest(sm, m);
    expect(result.allIds).toEqual(['m1', 'm2']);
  });

  it('merges canvases when manifest ID already exists', () => {
    const sm = makeSourceManifests([
      makeSourceManifest('m1', 'M1', [makeCanvas('c1', 'C1')]),
    ]);
    const duplicate = makeSourceManifest('m1', 'M1 Updated', [
      makeCanvas('c1', 'C1'), // already exists, should not be duplicated
      makeCanvas('c2', 'C2'), // new, should be added
    ]);
    const result = addSourceManifest(sm, duplicate);
    expect(result.byId['m1'].canvases).toHaveLength(2);
    expect(result.byId['m1'].canvases[0].id).toBe('c1');
    expect(result.byId['m1'].canvases[1].id).toBe('c2');
  });

  it('does not add duplicate to allIds when merging', () => {
    const sm = makeSourceManifests([makeSourceManifest('m1', 'M1')]);
    const duplicate = makeSourceManifest('m1', 'M1');
    const result = addSourceManifest(sm, duplicate);
    expect(result.allIds).toEqual(['m1']);
  });
});

describe('removeSourceManifest', () => {
  it('removes a manifest from byId and allIds', () => {
    const sm = makeSourceManifests([
      makeSourceManifest('m1', 'M1'),
      makeSourceManifest('m2', 'M2'),
    ]);
    const result = removeSourceManifest(sm, 'm1');
    expect(result.allIds).toEqual(['m2']);
    expect(result.byId['m1']).toBeUndefined();
    expect(result.byId['m2']).toBeDefined();
  });

  it('handles removing non-existent ID gracefully', () => {
    const sm = makeSourceManifests([makeSourceManifest('m1', 'M1')]);
    const result = removeSourceManifest(sm, 'nonexistent');
    expect(result.allIds).toEqual(['m1']);
  });
});

describe('reorderCanvases', () => {
  it('reorders canvases according to the new order', () => {
    const sm = makeSourceManifests([
      makeSourceManifest('m1', 'M1', [
        makeCanvas('c1', 'C1'),
        makeCanvas('c2', 'C2'),
        makeCanvas('c3', 'C3'),
      ]),
    ]);
    const result = reorderCanvases(sm, 'm1', ['c3', 'c1', 'c2']);
    const ids = result.byId['m1'].canvases.map(c => c.id);
    expect(ids).toEqual(['c3', 'c1', 'c2']);
  });

  it('returns unchanged when manifest not found', () => {
    const sm = makeSourceManifests([makeSourceManifest('m1', 'M1', [makeCanvas('c1', 'C1')])]);
    const result = reorderCanvases(sm, 'nonexistent', ['c1']);
    expect(result).toBe(sm);
  });

  it('filters out canvas IDs that do not exist in the manifest', () => {
    const sm = makeSourceManifests([
      makeSourceManifest('m1', 'M1', [makeCanvas('c1', 'C1'), makeCanvas('c2', 'C2')]),
    ]);
    const result = reorderCanvases(sm, 'm1', ['c2', 'c_missing', 'c1']);
    const ids = result.byId['m1'].canvases.map(c => c.id);
    expect(ids).toEqual(['c2', 'c1']);
  });
});

describe('createCollectionFromManifests', () => {
  it('creates a collection with correct type and label', () => {
    const manifests = [
      makeSourceManifest('m1', 'M1'),
      makeSourceManifest('m2', 'M2'),
    ];
    const result = createCollectionFromManifests('My Collection', manifests);
    expect(result.type).toBe('Collection');
    expect(result.label).toEqual({ en: ['My Collection'] });
  });

  it('includes all manifests as items', () => {
    const manifests = [
      makeSourceManifest('m1', 'M1'),
      makeSourceManifest('m2', 'M2'),
    ];
    const result = createCollectionFromManifests('Test', manifests);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe('m1');
    expect(result.items[0].type).toBe('Manifest');
    expect(result.items[1].id).toBe('m2');
  });

  it('generates an ID containing the collection URL pattern', () => {
    const result = createCollectionFromManifests('Test', []);
    expect(result.id).toMatch(/^https:\/\/example\.com\/collection\/\d+$/);
  });
});

describe('mergeSourceManifests', () => {
  it('merges canvases from source manifests into target', () => {
    const sm = makeSourceManifests([
      makeSourceManifest('m1', 'M1', [makeCanvas('c1', 'C1')]),
      makeSourceManifest('m2', 'M2', [makeCanvas('c2', 'C2')]),
      makeSourceManifest('m3', 'M3', [makeCanvas('c3', 'C3')]),
    ]);
    const result = mergeSourceManifests(sm, ['m2', 'm3'], 'm1');
    expect(result.byId['m1'].canvases).toHaveLength(3);
    expect(result.byId['m1'].canvases.map(c => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('removes source manifests after merge', () => {
    const sm = makeSourceManifests([
      makeSourceManifest('m1', 'Target', []),
      makeSourceManifest('m2', 'Source1', [makeCanvas('c2', 'C2')]),
      makeSourceManifest('m3', 'Source2', [makeCanvas('c3', 'C3')]),
    ]);
    const result = mergeSourceManifests(sm, ['m2', 'm3'], 'm1');
    expect(result.allIds).toEqual(['m1']);
    expect(result.byId['m2']).toBeUndefined();
    expect(result.byId['m3']).toBeUndefined();
  });

  it('returns unchanged when target does not exist', () => {
    const sm = makeSourceManifests([makeSourceManifest('m1', 'M1')]);
    const result = mergeSourceManifests(sm, ['m1'], 'nonexistent');
    expect(result).toBe(sm);
  });

  it('skips target ID in source list without duplicating canvases', () => {
    const sm = makeSourceManifests([
      makeSourceManifest('m1', 'M1', [makeCanvas('c1', 'C1')]),
      makeSourceManifest('m2', 'M2', [makeCanvas('c2', 'C2')]),
    ]);
    // sourceIds includes the target itself
    const result = mergeSourceManifests(sm, ['m1', 'm2'], 'm1');
    expect(result.byId['m1'].canvases).toHaveLength(2);
    expect(result.byId['m1'].canvases.map(c => c.id)).toEqual(['c1', 'c2']);
  });
});

describe('findSimilarFilenames', () => {
  it('groups files sharing the same base name', () => {
    const result = findSimilarFilenames(['photo_001.jpg', 'photo_002.jpg', 'unrelated.png']);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('photo_001.jpg');
    expect(result[0]).toContain('photo_002.jpg');
  });

  it('returns empty array when no files are similar', () => {
    const result = findSimilarFilenames(['alpha.jpg', 'beta.png', 'gamma.tiff']);
    expect(result).toEqual([]);
  });

  it('groups by base name after stripping _NNN.ext', () => {
    const result = findSimilarFilenames(['scan_001.tif', 'scan_002.tif', 'scan.jpg']);
    // 'scan_001.tif' base = 'scan', 'scan_002.tif' base = 'scan', 'scan.jpg' base = 'scan'
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(3);
  });

  it('does not produce duplicate groups for processed filenames', () => {
    const result = findSimilarFilenames(['a_001.jpg', 'a_002.jpg']);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(2);
  });
});

describe('countFilesRecursive', () => {
  it('counts files in a flat tree', () => {
    const tree = makeFileTree({
      files: new Map([
        ['a.jpg', makeFile('a.jpg')],
        ['b.png', makeFile('b.png')],
      ]),
    });
    expect(countFilesRecursive(tree as any)).toBe(2);
  });

  it('counts files in nested directories', () => {
    const sub = makeFileTree({
      name: 'sub',
      path: 'sub',
      files: new Map([['c.jpg', makeFile('c.jpg')]]),
    });
    const tree = makeFileTree({
      files: new Map([['a.jpg', makeFile('a.jpg')]]),
      directories: new Map([['sub', sub]]),
    });
    expect(countFilesRecursive(tree as any)).toBe(2);
  });

  it('returns 0 for an empty tree', () => {
    const tree = makeFileTree();
    expect(countFilesRecursive(tree as any)).toBe(0);
  });
});

describe('flattenFileTree', () => {
  it('returns directories before files, both sorted alphabetically', () => {
    const dirB = makeFileTree({ name: 'beta', path: 'beta' });
    const dirA = makeFileTree({ name: 'alpha', path: 'alpha' });
    const tree = makeFileTree({
      files: new Map([
        ['z.jpg', makeFile('z.jpg')],
        ['a.jpg', makeFile('a.jpg')],
      ]),
      directories: new Map([
        ['beta', dirB],
        ['alpha', dirA],
      ]),
    });
    const nodes = flattenFileTree(tree as any, new Set(), new Map());
    expect(nodes[0].name).toBe('alpha');
    expect(nodes[1].name).toBe('beta');
    expect(nodes[2].name).toBe('a.jpg');
    expect(nodes[3].name).toBe('z.jpg');
  });

  it('respects expanded paths for directory children', () => {
    const sub = makeFileTree({
      name: 'sub',
      path: 'sub',
      files: new Map([['nested.jpg', makeFile('nested.jpg')]]),
    });
    const tree = makeFileTree({
      directories: new Map([['sub', sub]]),
    });

    // Collapsed: only the directory node
    const collapsed = flattenFileTree(tree as any, new Set(), new Map());
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].isDirectory).toBe(true);

    // Expanded: directory + its child file
    const expanded = flattenFileTree(tree as any, new Set(['sub']), new Map());
    expect(expanded).toHaveLength(2);
    expect(expanded[1].name).toBe('nested.jpg');
    expect(expanded[1].depth).toBe(1);
  });

  it('applies annotations from the annotations map', () => {
    const tree = makeFileTree({
      files: new Map([['a.jpg', makeFile('a.jpg')]]),
    });
    const annotations = new Map<string, NodeAnnotations>([
      ['a.jpg', { excluded: true, iiifBehavior: ['facing-pages'] }],
    ]);
    const nodes = flattenFileTree(tree as any, new Set(), annotations);
    expect(nodes[0].annotations.excluded).toBe(true);
    expect(nodes[0].annotations.iiifBehavior).toEqual(['facing-pages']);
  });

  it('computes correct childCount and totalFileCount for directories', () => {
    const inner = makeFileTree({
      name: 'inner',
      path: 'outer/inner',
      files: new Map([['deep.jpg', makeFile('deep.jpg')]]),
    });
    const outer = makeFileTree({
      name: 'outer',
      path: 'outer',
      files: new Map([['mid.jpg', makeFile('mid.jpg')]]),
      directories: new Map([['inner', inner]]),
    });
    const tree = makeFileTree({ directories: new Map([['outer', outer]]) });
    const nodes = flattenFileTree(tree as any, new Set(), new Map());
    const outerNode = nodes[0];
    expect(outerNode.childCount).toBe(2); // 1 dir + 1 file
    expect(outerNode.totalFileCount).toBe(2); // 1 file here + 1 file in inner
  });
});

describe('buildDirectoryMenuSections', () => {
  it('returns sections for IIIF structure, viewing direction, and behavior', () => {
    const onAnnotation = vi.fn();
    const onBehavior = vi.fn();
    const onClose = vi.fn();
    const sections = buildDirectoryMenuSections('/photos', {}, onAnnotation, onBehavior, onClose);
    expect(sections.length).toBeGreaterThanOrEqual(3);
    expect(sections[0].title).toBe('IIIF Structure');
    expect(sections[1].title).toBe('Viewing Direction');
  });

  it('marks current intent with a checkmark prefix', () => {
    const sections = buildDirectoryMenuSections(
      '/photos',
      { iiifIntent: 'Manifest' },
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );
    const structureItems = sections[0].items;
    const manifestItem = structureItems.find((i: any) => i.id === 'intent-manifest');
    expect(manifestItem!.label).toContain('\u2713');
  });

  it('includes metadata section when metadataCallbacks are provided', () => {
    const sections = buildDirectoryMenuSections(
      '/photos',
      {},
      vi.fn(),
      vi.fn(),
      vi.fn(),
      { onRightsModal: vi.fn(), onNavDateModal: vi.fn() },
    );
    const metaSection = sections.find((s: any) => s.title === 'Metadata');
    expect(metaSection).toBeDefined();
    expect(metaSection!.items).toHaveLength(2);
  });

  it('calls onClose when a structure item is clicked', () => {
    const onClose = vi.fn();
    const onAnnotation = vi.fn();
    const sections = buildDirectoryMenuSections('/photos', {}, onAnnotation, vi.fn(), onClose);
    sections[0].items[0].onClick();
    expect(onClose).toHaveBeenCalled();
    expect(onAnnotation).toHaveBeenCalled();
  });
});

describe('buildFileMenuSections', () => {
  it('returns a Canvas Properties section', () => {
    const sections = buildFileMenuSections('/photos/img.jpg', {}, vi.fn(), vi.fn());
    expect(sections[0].title).toBe('Canvas Properties');
    expect(sections[0].items).toHaveLength(3); // facing-pages, non-paged, exclude
  });

  it('marks facing-pages with a checkmark when active', () => {
    const sections = buildFileMenuSections(
      '/photos/img.jpg',
      { iiifBehavior: ['facing-pages'] },
      vi.fn(),
      vi.fn(),
    );
    const facingItem = sections[0].items.find((i: any) => i.id === 'facing-pages');
    expect(facingItem!.label).toContain('\u2713');
  });

  it('includes metadata section with start canvas option', () => {
    const sections = buildFileMenuSections(
      '/photos/img.jpg',
      {},
      vi.fn(),
      vi.fn(),
      { onSetStart: vi.fn() },
    );
    const metaSection = sections.find((s: any) => s.title === 'Metadata');
    expect(metaSection).toBeDefined();
    const startItem = metaSection!.items.find((i: any) => i.id === 'set-start');
    expect(startItem).toBeDefined();
  });
});

describe('buildCollectionMenuSections', () => {
  it('returns Properties and Organize sections', () => {
    const callbacks = {
      onRename: vi.fn(),
      onDelete: vi.fn(),
      onCreateSub: vi.fn(),
      onBehaviorModal: vi.fn(),
    };
    const sections = buildCollectionMenuSections('col-1', callbacks, vi.fn());
    expect(sections[0].title).toBe('Properties');
    expect(sections[1].title).toBe('Organize');
  });

  it('calls onDelete with correct ID and closes menu', () => {
    const onDelete = vi.fn();
    const onClose = vi.fn();
    const callbacks = {
      onRename: vi.fn(),
      onDelete,
      onCreateSub: vi.fn(),
      onBehaviorModal: vi.fn(),
    };
    const sections = buildCollectionMenuSections('col-1', callbacks, onClose);
    const deleteItem = sections[1].items.find((i: any) => i.id === 'col-delete');
    deleteItem!.onClick();
    expect(onDelete).toHaveBeenCalledWith('col-1');
    expect(onClose).toHaveBeenCalled();
  });

  it('marks delete item as danger variant', () => {
    const callbacks = {
      onRename: vi.fn(),
      onDelete: vi.fn(),
      onCreateSub: vi.fn(),
      onBehaviorModal: vi.fn(),
    };
    const sections = buildCollectionMenuSections('col-1', callbacks, vi.fn());
    const deleteItem = sections[1].items.find((i: any) => i.id === 'col-delete');
    expect(deleteItem!.variant).toBe('danger');
  });
});

describe('applyAnnotationsToTree', () => {
  it('filters out excluded files', () => {
    const tree = makeFileTree({
      files: new Map([
        ['keep.jpg', makeFile('keep.jpg')],
        ['remove.jpg', makeFile('remove.jpg')],
      ]),
    });
    const annotations = new Map<string, NodeAnnotations>([
      ['remove.jpg', { excluded: true }],
    ]);
    const result = applyAnnotationsToTree(tree as any, annotations);
    expect(result.files.has('keep.jpg')).toBe(true);
    expect(result.files.has('remove.jpg')).toBe(false);
  });

  it('filters out excluded directories', () => {
    const sub = makeFileTree({
      name: 'excluded-dir',
      path: 'excluded-dir',
      files: new Map([['a.jpg', makeFile('a.jpg')]]),
    });
    const tree = makeFileTree({
      directories: new Map([['excluded-dir', sub]]),
    });
    const annotations = new Map<string, NodeAnnotations>([
      ['excluded-dir', { excluded: true }],
    ]);
    const result = applyAnnotationsToTree(tree as any, annotations);
    expect(result.directories.has('excluded-dir')).toBe(false);
  });

  it('applies IIIF intent to the tree node', () => {
    const tree = makeFileTree({ path: 'photos' });
    const annotations = new Map<string, NodeAnnotations>([
      ['photos', { iiifIntent: 'Collection' }],
    ]);
    const result = applyAnnotationsToTree(tree as any, annotations);
    expect(result.iiifIntent).toBe('Collection');
  });

  it('applies viewingDirection and rights overrides', () => {
    const tree = makeFileTree({ path: 'book' });
    const annotations = new Map<string, NodeAnnotations>([
      ['book', { viewingDirection: 'right-to-left', rights: 'https://creativecommons.org/licenses/by/4.0/' }],
    ]);
    const result = applyAnnotationsToTree(tree as any, annotations);
    expect(result.viewingDirection).toBe('right-to-left');
    expect(result.rights).toBe('https://creativecommons.org/licenses/by/4.0/');
  });

  it('sets startCanvasName from a file with start annotation', () => {
    const tree = makeFileTree({
      path: 'book',
      files: new Map([
        ['cover.jpg', makeFile('cover.jpg')],
        ['page1.jpg', makeFile('page1.jpg')],
      ]),
    });
    const annotations = new Map<string, NodeAnnotations>([
      ['book/page1.jpg', { start: true }],
    ]);
    const result = applyAnnotationsToTree(tree as any, annotations);
    expect(result.startCanvasName).toBe('page1.jpg');
  });

  it('preserves existing tree IIIF fields when no annotation overrides', () => {
    const tree = makeFileTree({
      path: 'root',
      iiifIntent: 'Manifest',
      viewingDirection: 'left-to-right',
    });
    const result = applyAnnotationsToTree(tree as any, new Map());
    expect(result.iiifIntent).toBe('Manifest');
    expect(result.viewingDirection).toBe('left-to-right');
  });
});

// ============================================================================
// 2. Conflict Detection (model/conflictDetection.ts)
// ============================================================================

describe('detectConflicts', () => {
  it('reports no conflicts for unique filenames', () => {
    const tree = makeFileTree({
      files: new Map([
        ['a.jpg', makeFile('a.jpg')],
        ['b.jpg', makeFile('b.jpg')],
      ]),
    });
    const report = detectConflicts(tree as any);
    expect(report.hasConflicts).toBe(false);
    expect(report.duplicateNames).toEqual([]);
    expect(report.totalDuplicates).toBe(0);
  });

  it('detects duplicate filenames in different subdirectories', () => {
    const dirA = makeFileTree({
      name: 'dirA',
      path: 'dirA',
      files: new Map([['photo.jpg', makeFile('photo.jpg')]]),
    });
    const dirB = makeFileTree({
      name: 'dirB',
      path: 'dirB',
      files: new Map([['photo.jpg', makeFile('photo.jpg')]]),
    });
    const tree = makeFileTree({
      directories: new Map([['dirA', dirA], ['dirB', dirB]]),
    });
    const report = detectConflicts(tree as any);
    expect(report.hasConflicts).toBe(true);
    expect(report.duplicateNames).toHaveLength(1);
    expect(report.duplicateNames[0].name).toBe('photo.jpg');
    expect(report.duplicateNames[0].paths).toHaveLength(2);
  });

  it('counts total duplicates as sum of all paths per entry', () => {
    const dirA = makeFileTree({
      name: 'a',
      path: 'a',
      files: new Map([['x.jpg', makeFile('x.jpg')]]),
    });
    const dirB = makeFileTree({
      name: 'b',
      path: 'b',
      files: new Map([['x.jpg', makeFile('x.jpg')]]),
    });
    const dirC = makeFileTree({
      name: 'c',
      path: 'c',
      files: new Map([['x.jpg', makeFile('x.jpg')]]),
    });
    const tree = makeFileTree({
      directories: new Map([['a', dirA], ['b', dirB], ['c', dirC]]),
    });
    const report = detectConflicts(tree as any);
    expect(report.totalDuplicates).toBe(3);
  });

  it('returns no conflicts for an empty tree', () => {
    const tree = makeFileTree();
    const report = detectConflicts(tree as any);
    expect(report.hasConflicts).toBe(false);
    expect(report.totalDuplicates).toBe(0);
  });
});

// ============================================================================
// 3. StagingWorkbench module helpers
// ============================================================================

describe('collectUnsupportedFiles', () => {
  it('identifies files with extensions not in MIME_TYPE_MAP', () => {
    const tree = makeFileTree({
      path: 'root',
      files: new Map([
        ['photo.jpg', makeFile('photo.jpg')],
        ['data.xyz', makeFile('data.xyz')],
        ['readme.docx', makeFile('readme.docx')],
      ]),
    });
    const result = collectUnsupportedFiles(tree, 'root');
    expect(result).toHaveLength(2);
    expect(result.map(f => f.ext).sort()).toEqual(['docx', 'xyz']);
  });

  it('includes nested directories in the scan', () => {
    const sub = makeFileTree({
      name: 'sub',
      path: 'root/sub',
      files: new Map([['bad.xyz', makeFile('bad.xyz')]]),
    });
    const tree = makeFileTree({
      path: 'root',
      files: new Map([['good.png', makeFile('good.png')]]),
      directories: new Map([['sub', sub]]),
    });
    const result = collectUnsupportedFiles(tree, 'root');
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('root/sub/bad.xyz');
  });

  it('returns empty array when all files are supported', () => {
    const tree = makeFileTree({
      path: '',
      files: new Map([
        ['a.jpg', makeFile('a.jpg')],
        ['b.mp4', makeFile('b.mp4')],
      ]),
    });
    const result = collectUnsupportedFiles(tree, '');
    expect(result).toEqual([]);
  });
});

describe('getUniqueUnsupportedExts', () => {
  it('deduplicates and sorts extensions', () => {
    const files: UnsupportedFile[] = [
      { path: 'a.xyz', name: 'a.xyz', ext: 'xyz' },
      { path: 'b.abc', name: 'b.abc', ext: 'abc' },
      { path: 'c.xyz', name: 'c.xyz', ext: 'xyz' },
    ];
    expect(getUniqueUnsupportedExts(files)).toEqual(['abc', 'xyz']);
  });

  it('returns empty array for empty input', () => {
    expect(getUniqueUnsupportedExts([])).toEqual([]);
  });
});

describe('findAnalysisNode (StagingWorkbench)', () => {
  it('returns the root when path matches', () => {
    const root = makeAnalysisNode('root', 'Collection', 0.9);
    expect(findAnalysisNodeWorkbench(root, 'root')).toBe(root);
  });

  it('finds a deeply nested node', () => {
    const leaf = makeAnalysisNode('root/a/b', 'Manifest', 0.8);
    const mid = makeAnalysisNode('root/a', 'Collection', 0.9, [leaf]);
    const root = makeAnalysisNode('root', 'Collection', 0.95, [mid]);
    expect(findAnalysisNodeWorkbench(root, 'root/a/b')).toBe(leaf);
  });

  it('returns undefined when path is not found', () => {
    const root = makeAnalysisNode('root', 'Collection', 0.9);
    expect(findAnalysisNodeWorkbench(root, 'nonexistent')).toBeUndefined();
  });

  it('returns undefined when root is undefined', () => {
    expect(findAnalysisNodeWorkbench(undefined, 'anything')).toBeUndefined();
  });
});

describe('buildAnnotationsFromAnalysis', () => {
  it('maps Excluded nodes to excluded: true', () => {
    const root = makeAnalysisNode('root', 'Collection', 0.9, [
      makeAnalysisNode('root/thumbs.db', 'Excluded', 1.0),
    ]);
    const map = buildAnnotationsFromAnalysis(root);
    expect(map.get('root/thumbs.db')).toEqual({ excluded: true });
  });

  it('maps high-confidence nodes to iiifIntent', () => {
    const root = makeAnalysisNode('root', 'Collection', 0.9, [
      makeAnalysisNode('root/book', 'Manifest', 0.8),
    ]);
    const map = buildAnnotationsFromAnalysis(root);
    expect(map.get('root/book')).toEqual({ iiifIntent: 'Manifest' });
  });

  it('skips low-confidence non-excluded nodes', () => {
    const root = makeAnalysisNode('root', 'Collection', 0.9, [
      makeAnalysisNode('root/unsure', 'Manifest', 0.5),
    ]);
    const map = buildAnnotationsFromAnalysis(root);
    expect(map.has('root/unsure')).toBe(false);
  });

  it('processes the tree recursively', () => {
    const root = makeAnalysisNode('root', 'Collection', 0.95, [
      makeAnalysisNode('root/a', 'Manifest', 0.85, [
        makeAnalysisNode('root/a/skip', 'Excluded', 1.0),
      ]),
    ]);
    const map = buildAnnotationsFromAnalysis(root);
    expect(map.has('root')).toBe(true);
    expect(map.has('root/a')).toBe(true);
    expect(map.get('root/a/skip')).toEqual({ excluded: true });
  });
});

// ============================================================================
// 4. SourceTreePane module helpers
// ============================================================================

describe('getRootDirPaths', () => {
  it('returns paths of root-level directories', () => {
    const dirA = makeFileTree({ name: 'alpha', path: 'alpha' });
    const dirB = makeFileTree({ name: 'beta', path: 'beta' });
    const tree = makeFileTree({
      directories: new Map([['alpha', dirA], ['beta', dirB]]),
    });
    const paths = getRootDirPaths(tree);
    expect(paths).toContain('alpha');
    expect(paths).toContain('beta');
    expect(paths).toHaveLength(2);
  });

  it('returns empty array when no directories exist', () => {
    const tree = makeFileTree({
      files: new Map([['a.jpg', makeFile('a.jpg')]]),
    });
    expect(getRootDirPaths(tree)).toEqual([]);
  });
});

describe('countAllFiles', () => {
  it('counts files recursively', () => {
    const sub = makeFileTree({
      name: 'sub',
      path: 'sub',
      files: new Map([['b.jpg', makeFile('b.jpg')], ['c.jpg', makeFile('c.jpg')]]),
    });
    const tree = makeFileTree({
      files: new Map([['a.jpg', makeFile('a.jpg')]]),
      directories: new Map([['sub', sub]]),
    });
    expect(countAllFiles(tree)).toBe(3);
  });

  it('returns 0 for empty tree', () => {
    expect(countAllFiles(makeFileTree())).toBe(0);
  });
});

describe('collectAncestorPaths', () => {
  it('collects all ancestor segments of matching paths', () => {
    const matching = new Set(['a/b/c/file.jpg']);
    const ancestors = collectAncestorPaths(matching);
    expect(ancestors.has('a')).toBe(true);
    expect(ancestors.has('a/b')).toBe(true);
    expect(ancestors.has('a/b/c')).toBe(true);
    expect(ancestors.has('a/b/c/file.jpg')).toBe(false);
  });

  it('returns empty set for root-level matches', () => {
    const matching = new Set(['file.jpg']);
    expect(collectAncestorPaths(matching).size).toBe(0);
  });

  it('merges ancestors across multiple matching paths', () => {
    const matching = new Set(['x/y/a.jpg', 'x/z/b.jpg']);
    const ancestors = collectAncestorPaths(matching);
    expect(ancestors.has('x')).toBe(true);
    expect(ancestors.has('x/y')).toBe(true);
    expect(ancestors.has('x/z')).toBe(true);
  });
});

describe('collectMatchingPaths', () => {
  it('finds files matching the filter text', () => {
    const tree = makeFileTree({
      path: '',
      files: new Map([
        ['photo.jpg', makeFile('photo.jpg')],
        ['readme.txt', makeFile('readme.txt')],
      ]),
    });
    const result = collectMatchingPaths(tree, 'photo', '');
    expect(result.has('photo.jpg')).toBe(true);
    expect(result.has('readme.txt')).toBe(false);
  });

  it('finds directories matching the filter text', () => {
    const sub = makeFileTree({
      name: 'Photos',
      path: 'Photos',
      files: new Map(),
    });
    const tree = makeFileTree({
      directories: new Map([['Photos', sub]]),
    });
    const result = collectMatchingPaths(tree, 'photo', '');
    expect(result.has('Photos')).toBe(true);
  });

  it('searches recursively into subdirectories', () => {
    const deep = makeFileTree({
      name: 'inner',
      path: 'outer/inner',
      files: new Map([['target.jpg', makeFile('target.jpg')]]),
    });
    const outer = makeFileTree({
      name: 'outer',
      path: 'outer',
      directories: new Map([['inner', deep]]),
    });
    const tree = makeFileTree({
      directories: new Map([['outer', outer]]),
    });
    const result = collectMatchingPaths(tree, 'target', '');
    expect(result.has('outer/inner/target.jpg')).toBe(true);
  });

  it('is case-insensitive', () => {
    const tree = makeFileTree({
      path: '',
      files: new Map([['IMG_001.JPG', makeFile('IMG_001.JPG')]]),
    });
    const result = collectMatchingPaths(tree, 'img', '');
    expect(result.has('IMG_001.JPG')).toBe(true);
  });
});

describe('findAnalysisNode (SourceTreePane)', () => {
  it('finds a node by path in the tree', () => {
    const target = makeAnalysisNode('root/photos', 'Manifest', 0.9);
    const root = makeAnalysisNode('root', 'Collection', 0.95, [target]);
    expect(findAnalysisNodePane(root, 'root/photos')).toBe(target);
  });

  it('returns undefined when root is undefined', () => {
    expect(findAnalysisNodePane(undefined, 'path')).toBeUndefined();
  });
});

// ============================================================================
// 5. FileTreeNode module helpers
// ============================================================================

describe('getFileIcon', () => {
  it('returns image icon for image files', () => {
    expect(getFileIcon('photo.jpg')).toBe('image');
    expect(getFileIcon('photo.png')).toBe('image');
    expect(getFileIcon('photo.webp')).toBe('image');
  });

  it('returns audiotrack icon for audio files', () => {
    expect(getFileIcon('song.mp3')).toBe('audiotrack');
    expect(getFileIcon('track.wav')).toBe('audiotrack');
    expect(getFileIcon('audio.flac')).toBe('audiotrack');
  });

  it('returns videocam icon for video files', () => {
    expect(getFileIcon('clip.mp4')).toBe('videocam');
    expect(getFileIcon('movie.webm')).toBe('videocam');
  });

  it('returns description icon for text files', () => {
    expect(getFileIcon('doc.pdf')).toBe('description');
    expect(getFileIcon('notes.txt')).toBe('description');
  });

  it('returns table_chart icon for dataset files', () => {
    expect(getFileIcon('data.json')).toBe('table_chart');
    expect(getFileIcon('spreadsheet.csv')).toBe('table_chart');
  });

  it('returns view_in_ar icon for 3D model files', () => {
    expect(getFileIcon('model.glb')).toBe('view_in_ar');
    expect(getFileIcon('scene.gltf')).toBe('view_in_ar');
  });

  it('returns generic icon for unknown extensions', () => {
    expect(getFileIcon('readme.docx')).toBe('insert_drive_file');
    expect(getFileIcon('archive.zip')).toBe('insert_drive_file');
  });

  it('handles files with no extension', () => {
    expect(getFileIcon('Makefile')).toBe('insert_drive_file');
  });
});

describe('getDirIcon', () => {
  it('returns collections_bookmark for Collection intent', () => {
    expect(getDirIcon('Collection')).toBe('collections_bookmark');
  });

  it('returns auto_stories for Manifest intent', () => {
    expect(getDirIcon('Manifest')).toBe('auto_stories');
  });

  it('returns segment for Range intent', () => {
    expect(getDirIcon('Range')).toBe('segment');
  });

  it('returns folder for undefined or unknown intent', () => {
    expect(getDirIcon(undefined)).toBe('folder');
    expect(getDirIcon('Canvas')).toBe('folder');
  });
});

describe('formatSize', () => {
  it('formats 0 bytes', () => {
    expect(formatSize(0)).toBe('0 B');
  });

  it('formats bytes under 1 KB', () => {
    expect(formatSize(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatSize(1024 * 1024)).toBe('1.0 MB');
  });

  it('formats large megabyte values without decimal', () => {
    expect(formatSize(50 * 1024 * 1024)).toBe('50 MB');
  });

  it('formats gigabytes', () => {
    expect(formatSize(1024 * 1024 * 1024)).toBe('1.0 GB');
  });

  it('uses one decimal for values under 10', () => {
    expect(formatSize(5 * 1024)).toBe('5.0 KB');
    expect(formatSize(9.5 * 1024)).toBe('9.5 KB');
  });

  it('rounds values of 10 or more', () => {
    expect(formatSize(15 * 1024)).toBe('15 KB');
  });
});

describe('getConfidenceColor', () => {
  it('returns green for confidence above 0.8', () => {
    expect(getConfidenceColor(0.9)).toBe('bg-nb-green');
    expect(getConfidenceColor(0.81)).toBe('bg-nb-green');
  });

  it('returns orange for confidence between 0.5 and 0.8', () => {
    expect(getConfidenceColor(0.7)).toBe('bg-nb-orange');
    expect(getConfidenceColor(0.51)).toBe('bg-nb-orange');
  });

  it('returns red for confidence at or below 0.5', () => {
    expect(getConfidenceColor(0.5)).toBe('bg-nb-red');
    expect(getConfidenceColor(0.2)).toBe('bg-nb-red');
    expect(getConfidenceColor(0)).toBe('bg-nb-red');
  });

  it('returns green for confidence of exactly 1.0', () => {
    expect(getConfidenceColor(1.0)).toBe('bg-nb-green');
  });

  it('returns orange for confidence of exactly 0.8', () => {
    // 0.8 is NOT > 0.8, so it falls to the next condition
    expect(getConfidenceColor(0.8)).toBe('bg-nb-orange');
  });
});
