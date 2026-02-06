/**
 * Virtualized Data Service
 * Enables scaling to 5000+ canvases through lazy loading and LRU caching
 *
 * Architecture:
 * - Load manifest "stubs" initially (id, label, thumbnail, canvasCount)
 * - Full manifest data loaded on demand
 * - LRU cache with configurable memory limit
 * - Reference counting for blob URLs
 */

import { IIIFCanvas, IIIFCollection, IIIFItem, IIIFManifest } from '@/src/shared/types';
import { storage } from './storage';

// ============================================================================
// Types
// ============================================================================

export interface ManifestStub {
  id: string;
  type: 'Manifest';
  label: Record<string, string[]>;
  summary?: Record<string, string[]>;
  thumbnail?: Array<{ id: string; type: string; format?: string }>;
  navDate?: string;
  canvasCount: number;
  _loaded: boolean;
  _lastAccessed: number;
}

export interface CollectionStub {
  id: string;
  type: 'Collection';
  label: Record<string, string[]>;
  summary?: Record<string, string[]>;
  thumbnail?: Array<{ id: string; type: string; format?: string }>;
  childCount: number;
  manifestCount: number;
  _loaded: boolean;
  _lastAccessed: number;
}

export type ResourceStub = ManifestStub | CollectionStub;

interface CacheEntry {
  data: IIIFItem;
  size: number; // Estimated memory size in bytes
  lastAccessed: number;
  refCount: number;
}

interface VirtualizedState {
  rootStub: ResourceStub | null;
  stubs: Map<string, ResourceStub>;
  loadedIds: Set<string>;
}

// ============================================================================
// LRU Cache Implementation
// ============================================================================

class LRUCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private currentSize: number = 0;

  constructor(maxSizeMB: number = 100) {
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
  }

  get(id: string): IIIFItem | null {
    const entry = this.cache.get(id);
    if (entry) {
      entry.lastAccessed = Date.now();
      return entry.data;
    }
    return null;
  }

  set(id: string, data: IIIFItem): void {
    const size = this.estimateSize(data);

    // Evict entries if needed
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    const existing = this.cache.get(id);
    if (existing) {
      this.currentSize -= existing.size;
    }

    this.cache.set(id, {
      data,
      size,
      lastAccessed: Date.now(),
      refCount: 1
    });
    this.currentSize += size;
  }

  retain(id: string): void {
    const entry = this.cache.get(id);
    if (entry) {
      entry.refCount++;
    }
  }

  release(id: string): void {
    const entry = this.cache.get(id);
    if (entry) {
      entry.refCount = Math.max(0, entry.refCount - 1);
    }
  }

  private evictLRU(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, entry] of this.cache) {
      // Don't evict entries with active references
      if (entry.refCount > 0) continue;

      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestId = id;
      }
    }

    if (oldestId) {
      const entry = this.cache.get(oldestId)!;
      this.currentSize -= entry.size;
      this.cache.delete(oldestId);
    }
  }

  private estimateSize(data: any): number {
    // Rough estimation: JSON string length * 2 (UTF-16)
    return JSON.stringify(data).length * 2;
  }

  getStats(): { entries: number; sizeMB: number; maxMB: number } {
    return {
      entries: this.cache.size,
      sizeMB: Math.round(this.currentSize / 1024 / 1024 * 100) / 100,
      maxMB: this.maxSize / 1024 / 1024
    };
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }
}

// ============================================================================
// Virtualized Data Service
// ============================================================================

class VirtualizedDataService {
  private cache: LRUCache;
  private stubs: Map<string, ResourceStub> = new Map();
  private loadingPromises: Map<string, Promise<IIIFItem>> = new Map();
  private blobUrls: Map<string, { url: string; refCount: number }> = new Map();

  constructor() {
    this.cache = new LRUCache(100); // 100MB cache
  }

  /**
   * Create stubs from a full IIIF tree for initial load
   */
  createStubTree(root: IIIFItem): ResourceStub {
    return this.createStub(root);
  }

  private createStub(item: IIIFItem): ResourceStub {
    if (item.type === 'Collection') {
      const collection = item as IIIFCollection;
      const children = collection.items || [];

      const stub: CollectionStub = {
        id: item.id,
        type: 'Collection',
        label: item.label || { none: ['Untitled'] },
        summary: item.summary,
        thumbnail: item.thumbnail,
        childCount: children.length,
        manifestCount: children.filter(c => c.type === 'Manifest').length,
        _loaded: false,
        _lastAccessed: Date.now()
      };

      this.stubs.set(item.id, stub);

      // Recursively create stubs for children
      children.forEach(child => {
        if (child.type === 'Collection' || child.type === 'Manifest') {
          this.createStub(child);
        }
      });

      // Store full data in cache
      this.cache.set(item.id, item);
      stub._loaded = true;

      return stub;
    } else if (item.type === 'Manifest') {
      const manifest = item as IIIFManifest;
      const canvases = manifest.items || [];

      const stub: ManifestStub = {
        id: item.id,
        type: 'Manifest',
        label: item.label || { none: ['Untitled'] },
        summary: item.summary,
        thumbnail: item.thumbnail,
        navDate: item.navDate,
        canvasCount: canvases.length,
        _loaded: false,
        _lastAccessed: Date.now()
      };

      this.stubs.set(item.id, stub);

      // Store full data in cache
      this.cache.set(item.id, item);
      stub._loaded = true;

      return stub;
    }

    // For other types, just cache
    this.cache.set(item.id, item);
    return item as any;
  }

  /**
   * Get a stub by ID
   */
  getStub(id: string): ResourceStub | null {
    const stub = this.stubs.get(id);
    if (stub) {
      stub._lastAccessed = Date.now();
    }
    return stub || null;
  }

  /**
   * Get all stubs of a specific type
   */
  getStubsByType(type: 'Manifest' | 'Collection'): ResourceStub[] {
    return Array.from(this.stubs.values()).filter(s => s.type === type);
  }

  /**
   * Load full resource data (lazy loading)
   */
  async loadFull(id: string): Promise<IIIFItem | null> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached) {
      const stub = this.stubs.get(id);
      if (stub) stub._loaded = true;
      return cached;
    }

    // Check if already loading
    const existing = this.loadingPromises.get(id);
    if (existing) {
      return existing;
    }

    // Load from storage
    const loadPromise = this.loadFromStorage(id);
    this.loadingPromises.set(id, loadPromise);

    try {
      const result = await loadPromise;
      if (result) {
        this.cache.set(id, result);
        const stub = this.stubs.get(id);
        if (stub) stub._loaded = true;
      }
      return result;
    } finally {
      this.loadingPromises.delete(id);
    }
  }

  private async loadFromStorage(id: string): Promise<IIIFItem | null> {
    // Try to load from IndexedDB
    try {
      const data = await storage.loadResource(id);
      return data;
    } catch (e) {
      console.warn(`Failed to load resource ${id}:`, e);
      return null;
    }
  }

  /**
   * Check if a resource is fully loaded
   */
  isLoaded(id: string): boolean {
    return this.stubs.get(id)?._loaded ?? false;
  }

  /**
   * Retain a resource in cache (prevent eviction)
   */
  retain(id: string): void {
    this.cache.retain(id);
  }

  /**
   * Release a resource (allow eviction)
   */
  release(id: string): void {
    this.cache.release(id);
  }

  /**
   * Manage blob URLs with reference counting
   */
  getBlobUrl(assetId: string, blob: Blob): string {
    const existing = this.blobUrls.get(assetId);
    if (existing) {
      existing.refCount++;
      return existing.url;
    }

    const url = URL.createObjectURL(blob);
    this.blobUrls.set(assetId, { url, refCount: 1 });
    return url;
  }

  releaseBlobUrl(assetId: string): void {
    const entry = this.blobUrls.get(assetId);
    if (entry) {
      entry.refCount--;
      if (entry.refCount <= 0) {
        URL.revokeObjectURL(entry.url);
        this.blobUrls.delete(assetId);
      }
    }
  }

  /**
   * Update a resource (also updates stub metadata)
   */
  updateResource(id: string, updates: Partial<IIIFItem>): void {
    const cached = this.cache.get(id);
    if (cached) {
      Object.assign(cached, updates);
      this.cache.set(id, cached);
    }

    // Update stub if relevant fields changed
    const stub = this.stubs.get(id);
    if (stub) {
      if (updates.label) stub.label = updates.label;
      if (updates.summary) stub.summary = updates.summary;
      if (updates.thumbnail) stub.thumbnail = updates.thumbnail;
      if (updates.navDate && stub.type === 'Manifest') {
        (stub as ManifestStub).navDate = updates.navDate;
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      ...this.cache.getStats(),
      stubCount: this.stubs.size,
      blobUrlCount: this.blobUrls.size
    };
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    this.stubs.clear();
    this.loadingPromises.clear();

    // Revoke all blob URLs
    for (const entry of this.blobUrls.values()) {
      URL.revokeObjectURL(entry.url);
    }
    this.blobUrls.clear();
  }

  /**
   * Preload resources that will likely be needed
   */
  async preloadChildren(parentId: string): Promise<void> {
    const parent = this.cache.get(parentId);
    if (!parent || !('items' in parent)) return;

    const items = (parent as any).items || [];
    const toLoad = items
      .filter((item: any) => !this.isLoaded(item.id))
      .slice(0, 10); // Preload max 10 at a time

    await Promise.all(toLoad.map((item: any) => this.loadFull(item.id)));
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const virtualizedData = new VirtualizedDataService();

// ============================================================================
// React Hook for Virtualized Data
// ============================================================================

import { useCallback, useEffect, useState } from 'react';

export function useVirtualizedResource(id: string | null) {
  const [resource, setResource] = useState<IIIFItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setResource(null);
      return;
    }

    // Retain resource while in use
    virtualizedData.retain(id);

    const loadResource = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await virtualizedData.loadFull(id);
        setResource(data);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    loadResource();

    return () => {
      virtualizedData.release(id);
    };
  }, [id]);

  const update = useCallback((updates: Partial<IIIFItem>) => {
    if (id) {
      virtualizedData.updateResource(id, updates);
      setResource(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [id]);

  return { resource, loading, error, update };
}

export function useResourceStub(id: string | null): ResourceStub | null {
  const [stub, setStub] = useState<ResourceStub | null>(null);

  useEffect(() => {
    if (id) {
      setStub(virtualizedData.getStub(id));
    } else {
      setStub(null);
    }
  }, [id]);

  return stub;
}
