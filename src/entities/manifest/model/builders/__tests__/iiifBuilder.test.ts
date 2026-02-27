/**
 * Tests for iiifBuilder.ts
 *
 * Focuses on the pure factory functions and synchronous utilities that are
 * exported and testable without triggering the un-migrated `ingestTree` path
 * (which intentionally throws).
 */
import { describe, it, expect, vi } from 'vitest';
import {
  buildTree,
  createManifest,
  createCanvas,
  createAnnotation,
  createAnnotationPage,
  createCollection,
  createRange,
  validateIIIFResource,
  buildManifestFromFiles,
} from '../iiifBuilder';

// ============================================================================
// Mocks
// ============================================================================

// fileIntegrity opens IndexedDB on import — stub openDB globally
vi.stubGlobal('openDB', vi.fn().mockResolvedValue({
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  getAll: vi.fn().mockResolvedValue([]),
  getAllKeys: vi.fn().mockResolvedValue([]),
  objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
  createObjectStore: vi.fn(),
}));

vi.mock('@/src/shared/services/storage', () => ({
  storage: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/src/shared/services/logger', () => ({
  storageLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  uiLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/src/shared/services/metadataHarvester', () => ({
  extractMetadata: vi.fn().mockResolvedValue({}),
}));

vi.mock('../ingest/tileWorker', () => ({
  generateDerivativeAsync: vi.fn(),
  getTileWorkerPool: vi.fn(),
}));

vi.mock('@/utils/iiifHierarchy', () => ({
  generateId: vi.fn((_type: string) => `https://example.org/generated-id`),
  getRelationshipType: vi.fn(),
  isStandaloneType: vi.fn(),
  isValidChildType: vi.fn(),
}));

vi.mock('@/utils', () => ({
  createImageServiceReference: vi.fn(),
  DEFAULT_VIEWING_DIRECTION: 'left-to-right',
  getContentTypeFromFilename: vi.fn(),
  getMimeType: vi.fn(),
  IMAGE_API_PROTOCOL: 'http://iiif.io/api/image',
  isImageMimeType: vi.fn().mockReturnValue(true),
  isTimeBasedMimeType: vi.fn().mockReturnValue(false),
  suggestBehaviors: vi.fn().mockReturnValue([]),
  validateResource: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  resolveFileFormat: vi.fn().mockReturnValue('image/jpeg'),
}));

vi.mock('../fileLifecycle', () => ({
  getFileLifecycleManager: vi.fn().mockReturnValue({
    register: vi.fn(),
    release: vi.fn(),
  }),
}));

// ============================================================================
// buildTree
// ============================================================================

describe('buildTree', () => {
  it('returns an empty tree for an empty file list', () => {
    const tree = buildTree([]);
    expect(tree.name).toBe('root');
    expect(tree.files.size).toBe(0);
    expect(tree.directories.size).toBe(0);
  });

  it('adds top-level files to the root', () => {
    const file = new File(['data'], 'image.jpg', { type: 'image/jpeg' });
    const tree = buildTree([file]);
    expect(tree.files.has('image.jpg')).toBe(true);
  });

  it('ignores dot-files (hidden files)', () => {
    const hidden = new File([''], '.DS_Store');
    const visible = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const tree = buildTree([hidden, visible]);
    expect(tree.files.has('.DS_Store')).toBe(false);
    expect(tree.files.has('photo.jpg')).toBe(true);
  });

  it('nests files into subdirectories based on webkitRelativePath', () => {
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'webkitRelativePath', { value: 'folder/subfolder/photo.jpg' });
    const tree = buildTree([file]);

    expect(tree.directories.has('folder')).toBe(true);
    const folderNode = tree.directories.get('folder')!;
    expect(folderNode.directories.has('subfolder')).toBe(true);
    const subfolderNode = folderNode.directories.get('subfolder')!;
    expect(subfolderNode.files.has('photo.jpg')).toBe(true);
  });

  it('groups sibling files under the same directory node', () => {
    const f1 = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const f2 = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
    Object.defineProperty(f1, 'webkitRelativePath', { value: 'folder/a.jpg' });
    Object.defineProperty(f2, 'webkitRelativePath', { value: 'folder/b.jpg' });

    const tree = buildTree([f1, f2]);
    const folder = tree.directories.get('folder')!;
    expect(folder.files.size).toBe(2);
  });

  it('assigns correct path to nested directory nodes', () => {
    const f = new File(['data'], 'img.jpg', { type: 'image/jpeg' });
    Object.defineProperty(f, 'webkitRelativePath', { value: 'a/b/img.jpg' });
    const tree = buildTree([f]);

    const aNode = tree.directories.get('a')!;
    expect(aNode.path).toBe('a');
    const bNode = aNode.directories.get('b')!;
    expect(bNode.path).toBe('a/b');
  });
});

// ============================================================================
// createManifest
// ============================================================================

describe('createManifest', () => {
  it('creates a manifest with the correct type', () => {
    const m = createManifest({ id: 'https://example.org/m/1', label: { en: ['Test'] } });
    expect(m.type).toBe('Manifest');
  });

  it('sets the provided id', () => {
    const m = createManifest({ id: 'https://example.org/m/1', label: { en: ['Test'] } });
    expect(m.id).toBe('https://example.org/m/1');
  });

  it('sets the provided label', () => {
    const m = createManifest({ id: 'https://example.org/m/1', label: { en: ['My Manifest'] } });
    expect(m.label).toEqual({ en: ['My Manifest'] });
  });

  it('initialises items as an empty array', () => {
    const m = createManifest({ id: 'https://example.org/m/1', label: { en: ['T'] } });
    expect(m.items).toEqual([]);
  });

  it('includes optional fields when provided', () => {
    const m = createManifest({
      id: 'https://example.org/m/1',
      label: { en: ['T'] },
      rights: 'https://creativecommons.org/licenses/by/4.0/',
      behavior: ['paged'],
    });
    expect(m.rights).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(m.behavior).toEqual(['paged']);
  });

  it('includes the IIIF Presentation 3 context', () => {
    const m = createManifest({ id: 'https://example.org/m/1', label: { en: ['T'] } });
    expect(m['@context']).toContain('iiif.io');
  });
});

// ============================================================================
// createCanvas
// ============================================================================

describe('createCanvas', () => {
  it('creates a canvas with the correct type', () => {
    const c = createCanvas({ id: 'https://example.org/c/1', label: { en: ['C'] }, width: 800, height: 600 });
    expect(c.type).toBe('Canvas');
  });

  it('sets width and height', () => {
    const c = createCanvas({ id: 'x', label: { en: ['X'] }, width: 1920, height: 1080 });
    expect(c.width).toBe(1920);
    expect(c.height).toBe(1080);
  });

  it('initialises items as an empty array', () => {
    const c = createCanvas({ id: 'x', label: { en: ['X'] }, width: 100, height: 100 });
    expect(c.items).toEqual([]);
  });

  it('optionally sets duration', () => {
    const c = createCanvas({ id: 'x', label: { en: ['X'] }, width: 1, height: 1, duration: 120 });
    expect(c.duration).toBe(120);
  });
});

// ============================================================================
// createAnnotation
// ============================================================================

describe('createAnnotation', () => {
  it('creates an annotation with the correct type', () => {
    const a = createAnnotation({
      id: 'https://example.org/a/1',
      motivation: 'painting',
      target: 'https://example.org/canvas/1',
      body: { id: 'https://example.org/img.jpg', type: 'Image' },
    });
    expect(a.type).toBe('Annotation');
  });

  it('sets motivation, target, and body', () => {
    const a = createAnnotation({
      id: 'https://example.org/a/1',
      motivation: 'commenting',
      target: 'https://example.org/canvas/1',
      body: { type: 'TextualBody', value: 'Hello', format: 'text/plain' },
    });
    expect(a.motivation).toBe('commenting');
    expect(a.target).toBe('https://example.org/canvas/1');
    expect((a.body as any).value).toBe('Hello');
  });
});

// ============================================================================
// createAnnotationPage
// ============================================================================

describe('createAnnotationPage', () => {
  it('creates an AnnotationPage with correct type', () => {
    const page = createAnnotationPage({ id: 'https://example.org/p/1' });
    expect(page.type).toBe('AnnotationPage');
  });

  it('initialises items to an empty array when not provided', () => {
    const page = createAnnotationPage({ id: 'https://example.org/p/1' });
    expect(page.items).toEqual([]);
  });

  it('stores provided items', () => {
    const annotation = createAnnotation({
      id: 'a1',
      motivation: 'painting',
      target: 'c1',
      body: { id: 'img.jpg', type: 'Image' },
    });
    const page = createAnnotationPage({ id: 'p1', items: [annotation] });
    expect(page.items).toHaveLength(1);
    expect(page.items[0].id).toBe('a1');
  });
});

// ============================================================================
// createCollection
// ============================================================================

describe('createCollection', () => {
  it('creates a collection with type Collection', () => {
    const col = createCollection({ id: 'https://example.org/col/1', label: { en: ['Col'] } });
    expect(col.type).toBe('Collection');
  });

  it('initialises items to an empty array by default', () => {
    const col = createCollection({ id: 'x', label: { en: ['X'] } });
    expect(col.items).toEqual([]);
  });

  it('includes the IIIF context', () => {
    const col = createCollection({ id: 'x', label: { en: ['X'] } });
    expect(col['@context']).toContain('iiif.io');
  });
});

// ============================================================================
// createRange
// ============================================================================

describe('createRange', () => {
  it('creates a range with type Range', () => {
    const r = createRange({ id: 'https://example.org/r/1', label: { en: ['Ch. 1'] } });
    expect(r.type).toBe('Range');
  });

  it('initialises items to an empty array by default', () => {
    const r = createRange({ id: 'x', label: { en: ['X'] } });
    expect(r.items).toEqual([]);
  });

  it('stores provided canvas references', () => {
    const r = createRange({
      id: 'x',
      label: { en: ['X'] },
      items: [{ id: 'https://example.org/c/1', type: 'Canvas' }],
    });
    expect(r.items).toHaveLength(1);
    expect(r.items[0].id).toBe('https://example.org/c/1');
  });
});

// ============================================================================
// validateIIIFResource
// ============================================================================

describe('validateIIIFResource', () => {
  it('returns valid for a minimal manifest object', () => {
    const result = validateIIIFResource({ id: 'https://example.org/m/1', type: 'Manifest', label: { en: ['T'] } });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports missing id', () => {
    const result = validateIIIFResource({ type: 'Manifest' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: id');
  });

  it('reports missing type', () => {
    const result = validateIIIFResource({ id: 'https://example.org/m/1' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: type');
  });

  it('reports invalid label (non-object)', () => {
    const result = validateIIIFResource({ id: 'x', type: 'Manifest', label: 'bad label' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('label'))).toBe(true);
  });

  it('validates canvas dimensions — rejects missing width/height', () => {
    const result = validateIIIFResource({ id: 'x', type: 'Canvas' });
    expect(result.valid).toBe(false);
    const msgs = result.errors.join(' ');
    expect(msgs).toContain('width');
    expect(msgs).toContain('height');
  });

  it('validates canvas dimensions — rejects non-positive width', () => {
    const result = validateIIIFResource({ id: 'x', type: 'Canvas', width: 0, height: 600 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('width'))).toBe(true);
  });

  it('accepts a valid canvas with positive dimensions', () => {
    const result = validateIIIFResource({ id: 'x', type: 'Canvas', width: 800, height: 600 });
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// buildManifestFromFiles
// ============================================================================

describe('buildManifestFromFiles', () => {
  it('returns a manifest with one canvas per file', async () => {
    const files = [
      { name: 'img1.jpg', type: 'image/jpeg', size: 1024, blob: new Blob(['x'], { type: 'image/jpeg' }) },
      { name: 'img2.jpg', type: 'image/jpeg', size: 2048, blob: new Blob(['y'], { type: 'image/jpeg' }) },
    ];
    const manifest = await buildManifestFromFiles(files, { label: { en: ['My Album'] } });
    expect(manifest.type).toBe('Manifest');
    expect(manifest.items).toHaveLength(2);
  });

  it('uses the provided label for the manifest', async () => {
    const manifest = await buildManifestFromFiles(
      [{ name: 'a.jpg', type: 'image/jpeg', size: 1, blob: new Blob(['a']) }],
      { label: { en: ['My Label'] } }
    );
    expect(manifest.label).toEqual({ en: ['My Label'] });
  });

  it('assigns sequential canvas IDs based on index', async () => {
    const files = [
      { name: 'a.jpg', type: 'image/jpeg', size: 1, blob: new Blob(['a']) },
      { name: 'b.jpg', type: 'image/jpeg', size: 1, blob: new Blob(['b']) },
    ];
    const manifest = await buildManifestFromFiles(files, { label: { en: ['T'] } });
    expect(manifest.items[0].id).toContain('/canvas/0');
    expect(manifest.items[1].id).toContain('/canvas/1');
  });

  it('each canvas has an annotation page with a painting annotation', async () => {
    const files = [
      { name: 'img.jpg', type: 'image/jpeg', size: 1, blob: new Blob(['x']) },
    ];
    const manifest = await buildManifestFromFiles(files, { label: { en: ['T'] } });
    const canvas = manifest.items[0];
    expect(canvas.items).toHaveLength(1);
    const page = canvas.items[0];
    expect(page.type).toBe('AnnotationPage');
    expect(page.items[0].motivation).toBe('painting');
  });
});
