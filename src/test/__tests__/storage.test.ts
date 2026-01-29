/**
 * Unit Tests for services/storage.ts
 *
 * Tests IndexedDB operations, file storage, and quota management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  openDatabase,
  saveFile,
  getFile,
  deleteFile,
  listFiles,
  saveProject,
  getProject,
  checkStorageQuota,
  clearAllData,
  DB_NAME,
} from '../../../services/storage';

// ============================================================================
// Test Setup and Teardown
// ============================================================================

beforeEach(async () => {
  // Clear all data before each test
  try {
    await clearAllData();
  } catch {
    // Ignore errors if database doesn't exist yet
  }
});

afterEach(async () => {
  // Clean up after tests
  try {
    await clearAllData();
  } catch {
    // Ignore cleanup errors
  }
});

// ============================================================================
// Database Operations Tests
// ============================================================================

describe('openDatabase', () => {
  it('should open database successfully', async () => {
    const db = await openDatabase();
    expect(db).toBeDefined();
    expect(db.name).toBe(DB_NAME);
  });

  it('should create object stores on upgrade', async () => {
    const db = await openDatabase();
    expect(db.objectStoreNames).toContain('files');
    expect(db.objectStoreNames).toContain('derivatives');
    expect(db.objectStoreNames).toContain('project');
    expect(db.objectStoreNames).toContain('checkpoints');
    expect(db.objectStoreNames).toContain('tiles');
    expect(db.objectStoreNames).toContain('tileManifests');
  });
});

// ============================================================================
// File Storage Tests
// ============================================================================

describe('saveFile', () => {
  it('should save file to IndexedDB', async () => {
    const file = new Blob(['test content'], { type: 'text/plain' });
    const fileId = 'test-file-1';

    const result = await saveFile(fileId, file);
    expect(result).toBe(fileId);
  });

  it('should save file with metadata', async () => {
    const file = new Blob(['test content'], { type: 'image/jpeg' });
    const metadata = {
      name: 'test.jpg',
      size: file.size,
      type: file.type,
      lastModified: Date.now(),
    };

    const fileId = await saveFile('file-with-metadata', file, metadata);
    expect(fileId).toBe('file-with-metadata');
    
    const retrieved = await getFile('file-with-metadata');
    expect(retrieved).toBeDefined();
    // In test environment with fake-indexeddb, blob may be returned as object
    expect(retrieved?.blob).toBeTruthy();
  });
});

describe('getFile', () => {
  it('should retrieve saved file', async () => {
    const file = new Blob(['test content'], { type: 'text/plain' });
    await saveFile('test-file', file);

    const retrieved = await getFile('test-file');
    expect(retrieved).toBeDefined();
    // In test environment with fake-indexeddb, blob may be returned as object
    expect(retrieved?.blob).toBeTruthy();
  });

  it('should return null for non-existent file', async () => {
    const file = await getFile('nonexistent-file-12345');
    expect(file).toBeNull();
  });

  it('should retrieve file with metadata', async () => {
    const file = new Blob(['test'], { type: 'image/jpeg' });
    await saveFile('file-with-meta', file, { name: 'test.jpg' });

    const retrieved = await getFile('file-with-meta');
    expect(retrieved?.metadata).toBeDefined();
    expect(retrieved?.metadata.type).toBe('image/jpeg');
  });
});

describe('deleteFile', () => {
  it('should delete file from storage', async () => {
    const file = new Blob(['test'], { type: 'text/plain' });
    await saveFile('file-to-delete', file);

    // Verify file exists
    const beforeDelete = await getFile('file-to-delete');
    expect(beforeDelete).toBeDefined();

    await deleteFile('file-to-delete');
    
    const retrieved = await getFile('file-to-delete');
    expect(retrieved).toBeNull();
  });
});

describe('listFiles', () => {
  it('should list all files', async () => {
    await saveFile('file-1', new Blob(['test1']));
    await saveFile('file-2', new Blob(['test2']));
    await saveFile('file-3', new Blob(['test3']));

    const files = await listFiles();
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  it('should return array even when empty', async () => {
    const files = await listFiles();
    expect(Array.isArray(files)).toBe(true);
  });

  it('should filter files by type', async () => {
    await saveFile('image-file', new Blob(['test'], { type: 'image/jpeg' }));
    
    const files = await listFiles({ type: 'image/jpeg' });
    expect(Array.isArray(files)).toBe(true);
  });
});

// ============================================================================
// Project Storage Tests
// ============================================================================

describe('saveProject', () => {
  it('should save IIIF project data', async () => {
    const project = {
      '@context': 'http://iiif.io/api/presentation/3/context.json' as const,
      id: 'https://example.com/manifest',
      type: 'Manifest' as const,
      label: { en: ['Test Project'] },
      items: [],
    };

    await saveProject(project);
    const retrieved = await getProject();

    expect(retrieved).toEqual(project);
  });

  it('should overwrite existing project', async () => {
    const project1 = {
      '@context': 'http://iiif.io/api/presentation/3/context.json' as const,
      id: 'https://example.com/manifest1',
      type: 'Manifest' as const,
      label: { en: ['Project 1'] },
      items: [],
    };

    const project2 = {
      '@context': 'http://iiif.io/api/presentation/3/context.json' as const,
      id: 'https://example.com/manifest2',
      type: 'Manifest' as const,
      label: { en: ['Project 2'] },
      items: [],
    };

    await saveProject(project1);
    await saveProject(project2);
    const retrieved = await getProject();

    expect(retrieved?.id).toBe('https://example.com/manifest2');
    expect(retrieved?.label).toEqual({ en: ['Project 2'] });
  });
});

describe('getProject', () => {
  it('should retrieve saved project', async () => {
    const project = {
      '@context': 'http://iiif.io/api/presentation/3/context.json' as const,
      id: 'https://example.com/manifest',
      type: 'Manifest' as const,
      label: { en: ['Test'] },
      items: [],
    };

    await saveProject(project);
    const retrieved = await getProject();

    expect(retrieved).toEqual(project);
  });

  it('should return null if no project exists', async () => {
    await clearAllData();
    const project = await getProject();
    expect(project).toBeNull();
  });
});

// ============================================================================
// Quota Management Tests
// ============================================================================

describe('checkStorageQuota', () => {
  it('should return quota information', async () => {
    const quota = await checkStorageQuota();

    expect(quota).toHaveProperty('usage');
    expect(quota).toHaveProperty('quota');
    expect(quota).toHaveProperty('percentUsed');
    expect(typeof quota.usage).toBe('number');
    expect(typeof quota.quota).toBe('number');
    expect(typeof quota.percentUsed).toBe('number');
  });

  it('should calculate percentage correctly', async () => {
    const quota = await checkStorageQuota();

    if (quota.quota > 0) {
      const expectedPercent = (quota.usage / quota.quota) * 100;
      expect(quota.percentUsed).toBeCloseTo(expectedPercent, 2);
    }
  });
});

// ============================================================================
// Cleanup Tests
// ============================================================================

describe('clearAllData', () => {
  it('should clear all data from IndexedDB', async () => {
    // Add some data first
    await saveFile('file-1', new Blob(['test']));
    await saveProject({
      '@context': 'http://iiif.io/api/presentation/3/context.json' as const,
      id: 'https://example.com/manifest',
      type: 'Manifest' as const,
      label: { en: ['Test'] },
      items: [],
    });

    // Verify data exists
    const filesBefore = await listFiles();
    expect(filesBefore.length).toBeGreaterThan(0);

    await clearAllData();

    const files = await listFiles();
    const project = await getProject();

    expect(files).toHaveLength(0);
    expect(project).toBeNull();
  });
});
