/**
 * Tests for fileIntegrity.ts
 *
 * fileIntegrity.ts declares `openDB` as a global (not a real module import)
 * and constructs the FileIntegrityService singleton at module load time.
 * We must inject a `openDB` stub onto `globalThis` BEFORE the module is
 * imported so that the constructor does not throw.
 *
 * Pure exported functions (calculateHash, calculateHashWithProgress) are
 * tested with the real Web Crypto API, which is available in happy-dom.
 */

// ─── 1. Hoist the openDB stub so it runs before any import ──────────────────
const { mockOpenDB } = vi.hoisted(() => {
  const mockDb = {
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue('ok'),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    getAllKeys: vi.fn().mockResolvedValue([]),
    objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
    createObjectStore: vi.fn(),
  };
  const mockOpenDB = vi.fn().mockResolvedValue(mockDb);
  // Inject as a global so the `declare function openDB` usage resolves
  (globalThis as any).openDB = mockOpenDB;
  return { mockOpenDB };
});

// ─── 2. Now we can safely import from the module ────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateHash, calculateHashWithProgress } from '../model/fileIntegrity';

// ============================================================================
// Helpers
// ============================================================================

function makeBlob(content: string, type = 'image/jpeg'): Blob {
  return new Blob([content], { type });
}

function makeFile(content: string, name = 'test.jpg', type = 'image/jpeg'): File {
  return new File([content], name, { type });
}

// ============================================================================
// calculateHash
// ============================================================================

describe('calculateHash', () => {
  it('returns a 64-character lowercase hex string for a Blob', async () => {
    const blob = makeBlob('hello world');
    const hash = await calculateHash(blob);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns a 64-character lowercase hex string for an ArrayBuffer', async () => {
    const buf = new TextEncoder().encode('hello world').buffer;
    const hash = await calculateHash(buf);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces the same hash for identical content regardless of input type', async () => {
    const content = 'identical content';
    const blobHash = await calculateHash(makeBlob(content));
    const bufHash = await calculateHash(new TextEncoder().encode(content).buffer);
    expect(blobHash).toBe(bufHash);
  });

  it('produces different hashes for different content', async () => {
    const hash1 = await calculateHash(makeBlob('content A'));
    const hash2 = await calculateHash(makeBlob('content B'));
    expect(hash1).not.toBe(hash2);
  });

  it('is deterministic — same input yields same hash on repeated calls', async () => {
    const blob = makeBlob('deterministic test');
    const h1 = await calculateHash(blob);
    const h2 = await calculateHash(blob);
    expect(h1).toBe(h2);
  });

  it('handles an empty Blob without throwing', async () => {
    const hash = await calculateHash(makeBlob(''));
    // SHA-256 of empty bytes is a known constant
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('handles an empty ArrayBuffer without throwing', async () => {
    const hash = await calculateHash(new ArrayBuffer(0));
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

// ============================================================================
// calculateHashWithProgress
// ============================================================================

describe('calculateHashWithProgress', () => {
  it('returns the same hash as calculateHash for identical content', async () => {
    const content = 'progress test content';
    const file = makeFile(content);
    const blob = makeBlob(content);

    const hashFromProgress = await calculateHashWithProgress(file);
    const hashDirect = await calculateHash(blob);

    expect(hashFromProgress).toBe(hashDirect);
  });

  it('calls onProgress with 100 when the entire file is processed', async () => {
    const file = makeFile('small file');
    const progressValues: number[] = [];

    await calculateHashWithProgress(file, (p) => progressValues.push(p));

    expect(progressValues.length).toBeGreaterThan(0);
    expect(progressValues[progressValues.length - 1]).toBe(100);
  });

  it('calls onProgress with monotonically non-decreasing values', async () => {
    const bigContent = 'x'.repeat(1024); // 1 KB — fits in one chunk but exercises the loop
    const file = makeFile(bigContent);
    const progressValues: number[] = [];

    await calculateHashWithProgress(file, (p) => progressValues.push(p));

    for (let i = 1; i < progressValues.length; i++) {
      expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
    }
  });

  it('works without an onProgress callback', async () => {
    const file = makeFile('no callback file');
    const hash = await calculateHashWithProgress(file);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces a 64-character hex string', async () => {
    const file = makeFile('hex output test');
    const hash = await calculateHashWithProgress(file);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ============================================================================
// Module smoke tests
// ============================================================================

describe('fileIntegrity module exports', () => {
  it('calculateHash is a function', () => {
    expect(typeof calculateHash).toBe('function');
  });

  it('calculateHashWithProgress is a function', () => {
    expect(typeof calculateHashWithProgress).toBe('function');
  });

  it('exports a fileIntegrity singleton object', async () => {
    const mod = await import('../model/fileIntegrity');
    expect(mod.fileIntegrity).toBeDefined();
    expect(typeof mod.fileIntegrity).toBe('object');
  });

  it('fileIntegrity singleton exposes expected public methods', async () => {
    const { fileIntegrity } = await import('../model/fileIntegrity');
    expect(typeof (fileIntegrity as any).registerFile).toBe('function');
    expect(typeof (fileIntegrity as any).getFingerprint).toBe('function');
    expect(typeof (fileIntegrity as any).checkDuplicate).toBe('function');
    expect(typeof (fileIntegrity as any).verifyFile).toBe('function');
    expect(typeof (fileIntegrity as any).getAllFingerprints).toBe('function');
    expect(typeof (fileIntegrity as any).getStats).toBe('function');
    expect(typeof (fileIntegrity as any).clear).toBe('function');
    expect(typeof (fileIntegrity as any).export).toBe('function');
  });
});
