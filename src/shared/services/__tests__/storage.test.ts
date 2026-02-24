/**
 * StorageService — unit tests
 *
 * Tests the core project persistence API:
 *  1. saveProject + loadProject round-trip
 *  2. loadProject returns null when nothing stored
 *  3. getAsset returns null for unknown keys
 *  4. saveAsset + getAsset round-trip
 *
 * The `idb` library requires a native indexedDB global which is not
 * available in happy-dom. We replace it with a Map-backed mock so the
 * StorageService logic can be exercised without a real browser IDB.
 * idbStores is cleared in beforeEach so each test starts with an empty DB.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IIIFItem, IIIFManifest } from '@/src/shared/types';

// ─── idb mock ────────────────────────────────────────────────────────────────
// vi.mock() is hoisted; use vi.hoisted() so idbStores is ready when the
// factory runs (and closured into the mock db methods).

const idbStores = vi.hoisted(
  () => new Map<string, Map<unknown, unknown>>(),
);

vi.mock('idb', () => ({
  openDB: vi.fn(() =>
    Promise.resolve({
      get: (store: string, key: unknown) =>
        Promise.resolve(idbStores.get(store)?.get(key)),
      put: (store: string, value: unknown, key: unknown) => {
        if (!idbStores.has(store)) idbStores.set(store, new Map());
        idbStores.get(store)!.set(key, value);
        return Promise.resolve(key);
      },
    }),
  ),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeManifest(overrides: Partial<IIIFItem> = {}): IIIFItem {
  return {
    id: 'https://example.com/manifest/1',
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: [],
    ...overrides,
  } as IIIFItem;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StorageService', () => {
  let storage: typeof import('../storage')['storage'];

  beforeEach(async () => {
    // Clear all stores so each test sees an empty DB
    idbStores.clear();
    // Dynamic import picks up the (already-mocked) idb module
    const mod = await import('../storage');
    storage = mod.storage;
  });

  it('loadProject() returns null when nothing has been stored', async () => {
    const result = await storage.loadProject();
    expect(result).toBeNull();
  });

  it('saveProject + loadProject round-trip', async () => {
    const manifest = makeManifest({ label: { en: ['My Collection'] } });
    await storage.saveProject(manifest);
    const loaded = await storage.loadProject();
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(manifest.id);
    expect(loaded!.type).toBe('Manifest');
    expect((loaded as IIIFManifest).label?.en?.[0]).toBe('My Collection');
  });

  it('saveProject preserves nested items', async () => {
    const manifest = makeManifest({
      items: [{ id: 'https://example.com/canvas/1', type: 'Canvas', items: [] } as IIIFItem],
    });
    await storage.saveProject(manifest);
    const loaded = await storage.loadProject();
    const result = loaded as IIIFManifest;
    expect(result?.items).toHaveLength(1);
    expect(result?.items?.[0].id).toBe('https://example.com/canvas/1');
  });

  it('saveProject overwrites previous project', async () => {
    await storage.saveProject(makeManifest({ id: 'https://example.com/manifest/1' }));
    await storage.saveProject(makeManifest({ id: 'https://example.com/manifest/2' }));
    const loaded = await storage.loadProject();
    expect(loaded?.id).toBe('https://example.com/manifest/2');
  });

  it('getAsset() returns null for unknown id', async () => {
    const result = await storage.getAsset('nonexistent-id');
    expect(result).toBeNull();
  });

  it('saveAsset + getAsset round-trip', async () => {
    const blob = new Blob(['hello world'], { type: 'text/plain' });
    await storage.saveAsset('asset-1', blob);
    const retrieved = await storage.getAsset('asset-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.type).toBe('text/plain');
    const text = await retrieved!.text();
    expect(text).toBe('hello world');
  });
});
