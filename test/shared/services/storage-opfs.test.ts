import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mock fns are available inside vi.mock factories (which are hoisted)
const {
  mockStoreFile,
  mockGetFile,
  mockHasFile,
  mockListFiles,
  mockInitialize,
  mockIsSupported,
  mockPut,
  mockGet,
  mockGetKey,
  mockGetAllKeys,
} = vi.hoisted(() => ({
  mockStoreFile: vi.fn(),
  mockGetFile: vi.fn(),
  mockHasFile: vi.fn(),
  mockListFiles: vi.fn(),
  mockInitialize: vi.fn(),
  mockIsSupported: vi.fn().mockReturnValue(true),
  mockPut: vi.fn(),
  mockGet: vi.fn(),
  mockGetKey: vi.fn(),
  mockGetAllKeys: vi.fn(),
}));

vi.mock('@/src/shared/services/opfsStorage', () => {
  const OPFSStorage = vi.fn().mockImplementation(() => ({
    storeFile: mockStoreFile,
    getFile: mockGetFile,
    hasFile: mockHasFile,
    listFiles: mockListFiles,
    initialize: mockInitialize,
    isReady: true,
  }));
  OPFSStorage.isSupported = mockIsSupported;
  return { OPFSStorage };
});

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue({
    put: mockPut,
    get: mockGet,
    getKey: mockGetKey,
    getAllKeys: mockGetAllKeys,
    objectStoreNames: { contains: () => true },
  }),
}));

vi.mock('@/src/shared/services/logger', () => ({
  storageLog: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { OPFS_SIZE_THRESHOLD } from '@/src/shared/services/storage';

/**
 * Because `storage` is a module-level singleton, its #opfsInitialized flag
 * persists across tests. We re-import a fresh module for each test using
 * vi.resetModules() + dynamic import.
 */
async function freshStorage() {
  vi.resetModules();

  vi.doMock('@/src/shared/services/opfsStorage', () => {
    const OPFSStorage = vi.fn().mockImplementation(() => ({
      storeFile: mockStoreFile,
      getFile: mockGetFile,
      hasFile: mockHasFile,
      listFiles: mockListFiles,
      initialize: mockInitialize,
      isReady: true,
    }));
    OPFSStorage.isSupported = mockIsSupported;
    return { OPFSStorage };
  });

  vi.doMock('idb', () => ({
    openDB: vi.fn().mockResolvedValue({
      put: mockPut,
      get: mockGet,
      getKey: mockGetKey,
      getAllKeys: mockGetAllKeys,
      objectStoreNames: { contains: () => true },
    }),
  }));

  vi.doMock('@/src/shared/services/logger', () => ({
    storageLog: {
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  }));

  const mod = await import('@/src/shared/services/storage');
  return mod.storage;
}

describe('StorageService OPFS routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitialize.mockResolvedValue(true);
    mockIsSupported.mockReturnValue(true);
  });

  describe('saveAsset', () => {
    it('routes blobs larger than threshold to OPFS', async () => {
      const store = await freshStorage();
      const largeBlob = new Blob([new ArrayBuffer(OPFS_SIZE_THRESHOLD + 1)]);
      await store.saveAsset('large-asset', largeBlob);

      expect(mockStoreFile).toHaveBeenCalledWith('large-asset', largeBlob);
      expect(mockPut).not.toHaveBeenCalled();
    });

    it('routes blobs smaller than threshold to IDB', async () => {
      const store = await freshStorage();
      const smallBlob = new Blob([new ArrayBuffer(1024)]);
      await store.saveAsset('small-asset', smallBlob);

      expect(mockStoreFile).not.toHaveBeenCalled();
      expect(mockPut).toHaveBeenCalledWith('files', smallBlob, 'small-asset');
    });

    it('routes blobs exactly at threshold to IDB', async () => {
      const store = await freshStorage();
      const exactBlob = new Blob([new ArrayBuffer(OPFS_SIZE_THRESHOLD)]);
      await store.saveAsset('exact-asset', exactBlob);

      expect(mockStoreFile).not.toHaveBeenCalled();
      expect(mockPut).toHaveBeenCalledWith('files', exactBlob, 'exact-asset');
    });

    it('falls back to IDB when OPFS is not supported', async () => {
      mockIsSupported.mockReturnValue(false);
      const store = await freshStorage();

      const largeBlob = new Blob([new ArrayBuffer(OPFS_SIZE_THRESHOLD + 1)]);
      await store.saveAsset('large-no-opfs', largeBlob);

      expect(mockStoreFile).not.toHaveBeenCalled();
      expect(mockPut).toHaveBeenCalledWith('files', largeBlob, 'large-no-opfs');
    });

    it('falls back to IDB when OPFS initialization fails', async () => {
      mockInitialize.mockResolvedValue(false);
      const store = await freshStorage();

      const largeBlob = new Blob([new ArrayBuffer(OPFS_SIZE_THRESHOLD + 1)]);
      await store.saveAsset('large-init-fail', largeBlob);

      expect(mockStoreFile).not.toHaveBeenCalled();
      expect(mockPut).toHaveBeenCalledWith('files', largeBlob, 'large-init-fail');
    });
  });

  describe('getAsset', () => {
    it('returns from OPFS when file exists there', async () => {
      const store = await freshStorage();
      const mockFile = new File(['data'], 'test.jpg');
      mockGetFile.mockResolvedValue(mockFile);

      const result = await store.getAsset('opfs-asset');

      expect(mockGetFile).toHaveBeenCalledWith('opfs-asset');
      expect(result).toBe(mockFile);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('falls back to IDB when not in OPFS', async () => {
      const store = await freshStorage();
      mockGetFile.mockResolvedValue(null);
      const idbBlob = new Blob(['idb-data']);
      mockGet.mockResolvedValue(idbBlob);

      const result = await store.getAsset('idb-asset');

      expect(mockGetFile).toHaveBeenCalledWith('idb-asset');
      expect(mockGet).toHaveBeenCalled();
      expect(result).toBe(idbBlob);
    });

    it('returns null when asset not in OPFS or IDB', async () => {
      const store = await freshStorage();
      mockGetFile.mockResolvedValue(null);
      mockGet.mockResolvedValue(undefined);

      const result = await store.getAsset('missing');
      expect(result).toBeNull();
    });
  });

  describe('hasAsset', () => {
    it('returns true when asset exists in OPFS', async () => {
      const store = await freshStorage();
      mockHasFile.mockResolvedValue(true);

      const result = await store.hasAsset('opfs-asset');
      expect(result).toBe(true);
    });

    it('returns true when asset exists in IDB but not OPFS', async () => {
      const store = await freshStorage();
      mockHasFile.mockResolvedValue(false);
      mockGetKey.mockResolvedValue('idb-asset');

      const result = await store.hasAsset('idb-asset');
      expect(result).toBe(true);
    });

    it('returns false when asset is nowhere', async () => {
      const store = await freshStorage();
      mockHasFile.mockResolvedValue(false);
      mockGetKey.mockResolvedValue(undefined);

      const result = await store.hasAsset('missing');
      expect(result).toBe(false);
    });
  });

  describe('getAllAssetKeys', () => {
    it('merges keys from OPFS and IDB without duplicates', async () => {
      const store = await freshStorage();
      mockListFiles.mockResolvedValue(['a', 'b']);
      mockGetAllKeys.mockResolvedValue(['b', 'c']);

      const keys = await store.getAllAssetKeys();
      expect(keys.sort()).toEqual(['a', 'b', 'c']);
    });

    it('returns only IDB keys when OPFS is not supported', async () => {
      mockIsSupported.mockReturnValue(false);
      const store = await freshStorage();
      mockGetAllKeys.mockResolvedValue(['x', 'y']);

      const keys = await store.getAllAssetKeys();
      expect(keys.sort()).toEqual(['x', 'y']);
    });

    it('returns empty array on error', async () => {
      const store = await freshStorage();
      mockListFiles.mockRejectedValue(new Error('OPFS error'));

      const keys = await store.getAllAssetKeys();
      expect(keys).toEqual([]);
    });
  });

  describe('OPFS_SIZE_THRESHOLD', () => {
    it('is 10 MB', () => {
      expect(OPFS_SIZE_THRESHOLD).toBe(10 * 1024 * 1024);
    });
  });
});
