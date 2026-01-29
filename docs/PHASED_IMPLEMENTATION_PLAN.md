# IIIF Field Archive Studio - Phased Implementation Plan

## Architecture Improvements Roadmap

**Document Version:** 1.0  
**Last Updated:** 2026-01-29  
**Status:** Draft for Review

---

## Executive Summary

### Overview of 4-Phase Approach

This document outlines a comprehensive four-phase implementation plan to address critical stability, data safety, user experience, and performance improvements in the IIIF Field Archive Studio architecture. Each phase builds upon the previous, with clear dependencies, testing strategies, and rollback procedures.

| Phase | Priority | Focus | Duration Estimate |
|-------|----------|-------|-------------------|
| Phase 1 | P0 - Critical | Memory Leak Fixes | 3-5 days |
| Phase 2 | P0 - Critical | Trash/Restore System | 5-7 days |
| Phase 3 | P1 - High | Enhanced Progress Indicators | 3-4 days |
| Phase 4 | P1 - High | Worker Migration | 7-10 days |

### Dependencies Between Phases

```
Phase 1: Memory Leak Fixes
    │
    ├──→ Phase 3: Progress Indicators (requires memory stability)
    │
    └──→ Phase 4: Worker Migration (requires worker URL leak fix)

Phase 2: Trash/Restore System
    │
    └──→ Phase 3: Progress Indicators (trash state needed for cleanup)

Phase 3: Progress Indicators
    │
    └──→ Phase 4: Worker Migration (progress protocol informs messaging)
```

### Risk Mitigation Strategy

1. **Feature Flags:** Each phase includes feature flags for gradual rollout
2. **Main Thread Fallbacks:** Worker operations maintain main-thread fallbacks
3. **Database Snapshots:** Pre-migration snapshots for data rollback
4. **A/B Testing:** Performance comparisons before full deployment

### Rollback Procedures

| Scenario | Rollback Action |
|----------|-----------------|
| Memory leak regression | Disable cleanup feature flag |
| Data loss in trash | Restore from automatic snapshots |
| Worker communication failure | Fall back to main thread processing |
| Performance degradation | Toggle worker usage flag |

---

## Phase 1: Memory Leak Fixes (P0 - Critical Stability)

### Objective

Fix critical memory leaks in object URL creation to prevent browser crashes during long-running sessions and large batch ingest operations.

### Critical Issues Identified

#### 1.1 Worker Blob URL Leak (CRITICAL)

**Location:** [`services/tileWorker.ts`](services/tileWorker.ts:233) (Line 233)

**Issue:** The worker blob URL created at line 233 is never revoked:

```typescript
// Line 231-233 - CRITICAL LEAK
const workerBlob = new Blob([workerScript], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);  // ← Created but never revoked
```

**Impact:** Each tile worker pool creation leaks ~50-200KB of memory. In long sessions with multiple imports, this accumulates significantly.

**Solution:** Implement singleton pattern with proper cleanup:

```typescript
// services/tileWorker.ts - Proposed Fix (around line 230)
let workerUrl: string | null = null;
let workerBlob: Blob | null = null;

function getWorkerUrl(): string {
  if (!workerUrl) {
    workerBlob = new Blob([workerScript], { type: 'application/javascript' });
    workerUrl = URL.createObjectURL(workerBlob);
  }
  return workerUrl;
}

/**
 * Cleanup function for worker resources
 * Call during app shutdown or before hot-reload
 */
export function cleanupWorkerResources(): void {
  if (workerUrl) {
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;
    workerBlob = null;
  }
  // Terminate any active pools
  if (tileWorkerPool) {
    tileWorkerPool.terminate();
    tileWorkerPool = null;
  }
}

// Use in TileWorkerPool.initWorkers() (line 496-501)
private initWorkers() {
  const url = getWorkerUrl();
  for (let i = 0; i < this.poolSize; i++) {
    const worker = new Worker(url);
    // ... rest of initialization
  }
}
```

**Cleanup Pattern Reference:** Follow the existing [`bitmap.close()`](services/iiifBuilder.ts:243-246) pattern used in iiifBuilder.ts.

---

#### 1.2 Blob URL Cleanup in Image Source Resolution

**Location:** [`services/imageSourceResolver.ts`](services/imageSourceResolver.ts:258) (Line 258)

**Issue:** Blob URLs created from `_fileRef` have `needsCleanup: true` flag but cleanup is not integrated into React lifecycle:

```typescript
// Line 256-270 - Blob URL creation with cleanup flag
if (canvas._fileRef && canvas._fileRef instanceof Blob) {
  try {
    const blobUrl = URL.createObjectURL(canvas._fileRef);
    return {
      url: blobUrl,
      // ...
      needsCleanup: true // ← Caller must revoke, but often doesn't
    };
  }
}
```

**Solution:** Create a React hook for automatic cleanup:

```typescript
// hooks/useImageSource.ts - New File
import { useEffect, useRef } from 'react';
import { 
  resolveImageSource, 
  cleanupImageSource, 
  ResolvedImageSource 
} from '../services/imageSourceResolver';
import type { IIIFCanvas } from '../types';

export function useImageSource(
  canvas: IIIFCanvas | null,
  options?: Parameters<typeof resolveImageSource>[1]
) {
  const sourceRef = useRef<ResolvedImageSource | null>(null);
  
  useEffect(() => {
    // Resolve new source
    const newSource = resolveImageSource(canvas, options);
    const oldSource = sourceRef.current;
    
    // Update reference
    sourceRef.current = newSource;
    
    // Cleanup old source if different
    if (oldSource && oldSource !== newSource) {
      cleanupImageSource(oldSource);
    }
    
    // Cleanup on unmount
    return () => {
      cleanupImageSource(sourceRef.current);
      sourceRef.current = null;
    };
  }, [canvas?.id, options?.preferredSize]);
  
  return sourceRef.current;
}
```

**Existing Cleanup Helper:** [`cleanupImageSource()`](services/imageSourceResolver.ts:485-493) already exists and should be used consistently.

---

#### 1.3 File Reference Lifecycle Management

**Location:** [`services/iiifBuilder.ts`](services/iiifBuilder.ts:347) (Line 347)

**Issue:** `_fileRef` stores File object references without cleanup mechanism:

```typescript
// Line 336-349 - File reference storage without cleanup
items.push({
  id: canvasId,
  type: "Canvas",
  // ...
  _fileRef: file  // ← File reference stored but never released
});
```

**Solution:** Implement lifecycle management:

```typescript
// services/fileLifecycle.ts - New File
export interface FileReference {
  id: string;
  file: File;
  createdAt: number;
  lastAccessed: number;
}

class FileLifecycleManager {
  private refs = new Map<string, FileReference>();
  private maxAge = 30 * 60 * 1000; // 30 minutes
  private checkInterval: number | null = null;
  
  register(id: string, file: File): void {
    this.refs.set(id, {
      id,
      file,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    });
    this.startCleanupTimer();
  }
  
  get(id: string): File | undefined {
    const ref = this.refs.get(id);
    if (ref) {
      ref.lastAccessed = Date.now();
      return ref.file;
    }
    return undefined;
  }
  
  release(id: string): void {
    this.refs.delete(id);
  }
  
  private startCleanupTimer(): void {
    if (this.checkInterval) return;
    this.checkInterval = window.setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [id, ref] of this.refs) {
      if (now - ref.lastAccessed > this.maxAge) {
        this.refs.delete(id);
      }
    }
    if (this.refs.size === 0 && this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  dispose(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.refs.clear();
  }
}

export const fileLifecycle = new FileLifecycleManager();
```

**Pattern Reference:** Follow the existing [`CanvasTilePipeline.dispose()`](services/tileWorker.ts:468-472) method pattern.

### Testing Strategy

#### Memory Profiling

```typescript
// tests/memory/memoryProfiling.ts
export class MemoryProfiler {
  private baseline: number = 0;
  
  async takeBaseline(): Promise<void> {
    if (globalThis.gc) globalThis.gc();
    await new Promise(r => setTimeout(r, 100));
    this.baseline = performance.memory?.usedJSHeapSize || 0;
  }
  
  getDelta(): number {
    const current = performance.memory?.usedJSHeapSize || 0;
    return current - this.baseline;
  }
  
  async profileIngest(fileCount: number): Promise<{
    peakDelta: number;
    finalDelta: number;
    leakedUrls: number;
  }> {
    // Implementation for ingest profiling
  }
}
```

#### Long-Running Session Tests

```typescript
// tests/memory/longRunning.test.ts
describe('Long-running session memory stability', () => {
  test('should not leak memory over 2-hour simulated session', async () => {
    const profiler = new MemoryProfiler();
    await profiler.takeBaseline();
    
    // Simulate 2 hours of activity in compressed time
    for (let i = 0; i < 120; i++) {
      await simulateOneMinuteOfActivity();
      const delta = profiler.getDelta();
      expect(delta).toBeLessThan(100 * 1024 * 1024); // < 100MB growth
    }
  }, 300000);
});
```

#### Chrome DevTools Validation

1. Open Chrome DevTools → Memory tab
2. Take heap snapshot before ingest
3. Perform large batch import (1000+ files)
4. Force garbage collection (`globalThis.gc()` if available)
5. Take heap snapshot after ingest
6. Compare: Look for detached ArrayBuffers and Blob URLs

### Rollback: Feature Flag

```typescript
// constants/features.ts
export const FEATURES = {
  // ... existing flags
  MEMORY_CLEANUP: {
    enabled: import.meta.env.VITE_ENABLE_MEMORY_CLEANUP !== 'false',
    workerCleanup: true,
    blobUrlCleanup: true,
    fileLifecycle: true
  }
};

// Usage in tileWorker.ts
if (FEATURES.MEMORY_CLEANUP.enabled && FEATURES.MEMORY_CLEANUP.workerCleanup) {
  cleanupWorkerResources();
}
```

---

## Phase 2: Trash/Restore System (P0 - Data Safety)

### Objective

Replace hard deletion with soft-delete architecture to prevent accidental data loss and provide recovery mechanisms.

### Files to Modify

#### 2.1 Extend ResourceState Enum

**Location:** [`types.ts`](types.ts:7) (Line 7)

**Current State:**
```typescript
export type ResourceState = 'cached' | 'stub' | 'local-only' | 'stale' | 'conflict';
```

**Extended State:**
```typescript
export type ResourceState = 
  | 'cached' 
  | 'stub' 
  | 'local-only' 
  | 'stale' 
  | 'conflict'
  | 'trashed'    // Soft-deleted, recoverable
  | 'deleted';   // Permanently deleted (for audit trail)
```

#### 2.2 Modify Vault for Soft-Delete

**Location:** [`services/vault.ts`](services/vault.ts:909-1045) (Lines 909-1045)

**Add Trash Tracking to NormalizedState:**

```typescript
// Line 42-88 - Add to NormalizedState interface
export interface NormalizedState {
  // ... existing fields
  
  /**
   * Trashed entities - soft-deleted items pending permanent deletion
   * Key: entity ID, Value: trash metadata
   */
  trashedEntities: Record<string, {
    entityType: EntityType;
    trashedAt: number;      // Timestamp
    trashedBy?: string;     // User/session ID
    originalParent?: string; // For restore
    expiresAt: number;      // Auto-cleanup timestamp (30 days)
  }>;
  
  /**
   * Trash configuration
   */
  trashConfig: {
    autoCleanupDays: number;
    maxTrashSize: number;   // Max items in trash
    retentionPolicy: 'auto' | 'manual';
  };
}
```

**Modify removeEntity() for Soft-Delete:**

```typescript
// services/vault.ts - New function
export function moveToTrash(
  state: NormalizedState,
  id: string,
  options?: { trashedBy?: string; skipExpired?: boolean }
): NormalizedState {
  const type = state.typeIndex[id];
  if (!type) return state;
  
  const trashEntry = {
    entityType: type,
    trashedAt: Date.now(),
    trashedBy: options?.trashedBy,
    originalParent: state.reverseRefs[id],
    expiresAt: Date.now() + (state.trashConfig.autoCleanupDays * 24 * 60 * 60 * 1000)
  };
  
  // Keep entity in storage but mark as trashed
  return produce(state, draft => {
    // Add to trash tracking
    draft.trashedEntities[id] = trashEntry;
    
    // Mark entity state
    const entity = draft.entities[type][id];
    if (entity) {
      (entity as any)._state = 'trashed';
    }
    
    // Remove from parent's children list (soft-remove from hierarchy)
    const parentId = draft.reverseRefs[id];
    if (parentId && draft.references[parentId]) {
      draft.references[parentId] = draft.references[parentId].filter(cid => cid !== id);
    }
  });
}

// services/vault.ts - New function
export function restoreFromTrash(
  state: NormalizedState,
  id: string,
  options?: { restoreToParent?: string }
): { state: NormalizedState; success: boolean; error?: string } {
  const trashEntry = state.trashedEntities[id];
  if (!trashEntry) {
    return { state, success: false, error: 'Entity not found in trash' };
  }
  
  const targetParent = options?.restoreToParent || trashEntry.originalParent;
  if (!targetParent || !state.typeIndex[targetParent]) {
    return { state, success: false, error: 'Original parent not available' };
  }
  
  return {
    state: produce(state, draft => {
      // Remove from trash
      delete draft.trashedEntities[id];
      
      // Restore entity state
      const entity = draft.entities[trashEntry.entityType][id];
      if (entity) {
        (entity as any)._state = 'cached';
      }
      
      // Restore to parent's children list
      if (!draft.references[targetParent]) {
        draft.references[targetParent] = [];
      }
      draft.references[targetParent].push(id);
      draft.reverseRefs[id] = targetParent;
    }),
    success: true
  };
}

// services/vault.ts - New function
export function emptyTrash(
  state: NormalizedState,
  options?: { olderThan?: number; ids?: string[] }
): NormalizedState {
  const idsToDelete = options?.ids || 
    Object.entries(state.trashedEntities)
      .filter(([_, entry]) => 
        !options?.olderThan || entry.trashedAt < options.olderThan
      )
      .map(([id]) => id);
  
  return produce(state, draft => {
    for (const id of idsToDelete) {
      // Hard delete the entity
      const entry = draft.trashedEntities[id];
      if (entry) {
        delete draft.entities[entry.entityType][id];
        delete draft.trashedEntities[id];
        delete draft.typeIndex[id];
      }
    }
  });
}
```

#### 2.3 Add Trash Actions

**Location:** [`services/actions.ts`](services/actions.ts)

**Add Action Types:**

```typescript
// Line 53-69 - Add to Action union type
export type Action =
  | { type: 'UPDATE_LABEL'; id: string; label: LanguageMap }
  // ... existing actions
  | { type: 'MOVE_TO_TRASH'; id: string; trashedBy?: string }
  | { type: 'RESTORE_FROM_TRASH'; id: string; restoreToParent?: string }
  | { type: 'EMPTY_TRASH'; ids?: string[]; olderThan?: number }
  | { type: 'UPDATE_TRASH_CONFIG'; config: Partial<NormalizedState['trashConfig']> };
```

**Add Reducer Cases:**

```typescript
// In reduce() function, add cases:
case 'MOVE_TO_TRASH': {
  return {
    success: true,
    state: moveToTrash(state, action.id, { trashedBy: action.trashedBy }),
    changes: [{ property: '_state', oldValue: null, newValue: 'trashed' }]
  };
}

case 'RESTORE_FROM_TRASH': {
  const result = restoreFromTrash(state, action.id, {
    restoreToParent: action.restoreToParent
  });
  return {
    success: result.success,
    state: result.state,
    error: result.error,
    changes: result.success 
      ? [{ property: '_state', oldValue: 'trashed', newValue: 'cached' }]
      : undefined
  };
}

case 'EMPTY_TRASH': {
  return {
    success: true,
    state: emptyTrash(state, { ids: action.ids, olderThan: action.olderThan }),
    changes: [{ property: '_state', oldValue: 'trashed', newValue: 'deleted' }]
  };
}
```

#### 2.4 Create Trash Service

**New File:** `services/trashService.ts`

```typescript
/**
 * Trash Service - Lifecycle management for soft-deleted entities
 */

import { NormalizedState, EntityType } from './vault';

export interface TrashStats {
  totalItems: number;
  byType: Record<EntityType, number>;
  oldestItem: number;
  newestItem: number;
  totalSize: number;  // Estimated storage size
}

export interface TrashPolicy {
  autoCleanupDays: number;
  maxTrashSize: number;
  warnAtSize: number;
}

const DEFAULT_POLICY: TrashPolicy = {
  autoCleanupDays: 30,
  maxTrashSize: 1000,  // Max 1000 items in trash
  warnAtSize: 800
};

export class TrashService {
  private policy: TrashPolicy;
  
  constructor(policy: Partial<TrashPolicy> = {}) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
  }
  
  /**
   * Get current trash statistics
   */
  getStats(state: NormalizedState): TrashStats {
    const entries = Object.entries(state.trashedEntities);
    const byType = {} as Record<EntityType, number>;
    
    let oldest = Infinity;
    let newest = 0;
    
    for (const [id, entry] of entries) {
      byType[entry.entityType] = (byType[entry.entityType] || 0) + 1;
      oldest = Math.min(oldest, entry.trashedAt);
      newest = Math.max(newest, entry.trashedAt);
    }
    
    return {
      totalItems: entries.length,
      byType,
      oldestItem: entries.length > 0 ? oldest : 0,
      newestItem: entries.length > 0 ? newest : 0,
      totalSize: entries.length * 1024  // Rough estimate
    };
  }
  
  /**
   * Get items nearing expiration
   */
  getExpiringItems(
    state: NormalizedState, 
    withinDays: number = 7
  ): Array<{ id: string; daysRemaining: number }> {
    const now = Date.now();
    const cutoff = now + (withinDays * 24 * 60 * 60 * 1000);
    
    return Object.entries(state.trashedEntities)
      .filter(([_, entry]) => entry.expiresAt <= cutoff)
      .map(([id, entry]) => ({
        id,
        daysRemaining: Math.ceil((entry.expiresAt - now) / (24 * 60 * 60 * 1000))
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }
  
  /**
   * Check if trash needs cleanup
   */
  needsCleanup(state: NormalizedState): {
    needed: boolean;
    reason?: 'size' | 'expired';
    count: number;
  } {
    const stats = this.getStats(state);
    
    if (stats.totalItems >= this.policy.maxTrashSize) {
      return { needed: true, reason: 'size', count: stats.totalItems - this.policy.warnAtSize };
    }
    
    const expired = this.getExpiredItems(state);
    if (expired.length > 0) {
      return { needed: true, reason: 'expired', count: expired.length };
    }
    
    return { needed: false, count: 0 };
  }
  
  /**
   * Get expired items ready for permanent deletion
   */
  getExpiredItems(state: NormalizedState): string[] {
    const now = Date.now();
    return Object.entries(state.trashedEntities)
      .filter(([_, entry]) => entry.expiresAt <= now)
      .map(([id]) => id);
  }
  
  /**
   * Bulk restore multiple items
   */
  async bulkRestore(
    state: NormalizedState,
    ids: string[],
    restoreToParent?: string
  ): Promise<{ restored: string[]; failed: Array<{ id: string; error: string }> }> {
    const results = { restored: [] as string[], failed: [] as Array<{ id: string; error: string }> };
    
    for (const id of ids) {
      try {
        // Dispatch restore action
        results.restored.push(id);
      } catch (error) {
        results.failed.push({ id, error: String(error) });
      }
    }
    
    return results;
  }
  
  /**
   * Emergency restore all (for rollback scenarios)
   */
  async restoreAll(
    state: NormalizedState
  ): Promise<{ restored: string[]; failed: Array<{ id: string; error: string }> }> {
    const ids = Object.keys(state.trashedEntities);
    return this.bulkRestore(state, ids);
  }
}

export const trashService = new TrashService();
```

#### 2.5 Create Trash View Component

**New File:** `components/TrashView.tsx`

```typescript
/**
 * TrashView - UI for managing trashed items
 */

import React, { useState, useMemo } from 'react';
import { useVault } from '../hooks/useVault';
import { trashService } from '../services/trashService';
import { Icon } from './Icon';

interface TrashItem {
  id: string;
  type: string;
  label: string;
  trashedAt: number;
  daysRemaining: number;
}

export function TrashView() {
  const vault = useVault();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'type' | 'name'>('date');
  
  const trashItems = useMemo(() => {
    const state = vault.getState();
    return Object.entries(state.trashedEntities)
      .map(([id, entry]) => {
        const entity = state.entities[entry.entityType][id];
        return {
          id,
          type: entry.entityType,
          label: entity?.label?.none?.[0] || id,
          trashedAt: entry.trashedAt,
          daysRemaining: Math.ceil(
            (entry.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)
          )
        };
      })
      .filter(item => 
        filter === '' || 
        item.label.toLowerCase().includes(filter.toLowerCase())
      )
      .sort((a, b) => {
        switch (sortBy) {
          case 'date': return b.trashedAt - a.trashedAt;
          case 'type': return a.type.localeCompare(b.type);
          case 'name': return a.label.localeCompare(b.label);
        }
      });
  }, [vault, filter, sortBy]);
  
  const stats = useMemo(() => {
    return trashService.getStats(vault.getState());
  }, [vault]);
  
  const handleRestore = async (ids: string[]) => {
    for (const id of ids) {
      // Dispatch RESTORE_FROM_TRASH action
    }
    setSelectedIds(new Set());
  };
  
  const handleDelete = async (ids: string[]) => {
    if (confirm(`Permanently delete ${ids.length} items? This cannot be undone.`)) {
      // Dispatch EMPTY_TRASH action
    }
  };
  
  return (
    <div className="trash-view">
      <header className="trash-header">
        <h2>Trash ({stats.totalItems} items)</h2>
        <div className="trash-actions">
          <button 
            onClick={() => handleRestore(Array.from(selectedIds))}
            disabled={selectedIds.size === 0}
          >
            <Icon name="restore" /> Restore Selected
          </button>
          <button 
            onClick={() => handleDelete(Array.from(selectedIds))}
            disabled={selectedIds.size === 0}
            className="danger"
          >
            <Icon name="delete" /> Delete Permanently
          </button>
          <button onClick={() => handleRestore(Object.keys(vault.getState().trashedEntities))}>
            <Icon name="restore_all" /> Restore All
          </button>
        </div>
      </header>
      
      <div className="trash-filters">
        <input
          type="search"
          placeholder="Filter items..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
          <option value="date">Sort by Date</option>
          <option value="type">Sort by Type</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>
      
      <table className="trash-table">
        <thead>
          <tr>
            <th>
              <input 
                type="checkbox"
                checked={selectedIds.size === trashItems.length}
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedIds(new Set(trashItems.map(i => i.id)));
                  } else {
                    setSelectedIds(new Set());
                  }
                }}
              />
            </th>
            <th>Type</th>
            <th>Name</th>
            <th>Trashed</th>
            <th>Expires In</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {trashItems.map(item => (
            <tr key={item.id} className={item.daysRemaining <= 7 ? 'expiring' : ''}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={e => {
                    const newSet = new Set(selectedIds);
                    if (e.target.checked) newSet.add(item.id);
                    else newSet.delete(item.id);
                    setSelectedIds(newSet);
                  }}
                />
              </td>
              <td><Icon name={item.type.toLowerCase()} /> {item.type}</td>
              <td>{item.label}</td>
              <td>{new Date(item.trashedAt).toLocaleDateString()}</td>
              <td>{item.daysRemaining} days</td>
              <td>
                <button onClick={() => handleRestore([item.id])}>
                  <Icon name="restore" />
                </button>
                <button onClick={() => handleDelete([item.id])} className="danger">
                  <Icon name="delete" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Data Migration

**Migration Script:** `migrations/addTrashSupport.ts`

```typescript
/**
 * Migration: Add trash support to existing databases
 */

import { NormalizedState } from '../services/vault';

export function migrateToTrashSupport(state: NormalizedState): NormalizedState {
  // Initialize trash fields without affecting existing data
  return {
    ...state,
    trashedEntities: state.trashedEntities || {},
    trashConfig: state.trashConfig || {
      autoCleanupDays: 30,
      maxTrashSize: 1000,
      retentionPolicy: 'auto'
    }
  };
}

// Run on app startup
export function checkAndMigrate(state: NormalizedState): NormalizedState {
  if (!state.trashConfig) {
    console.info('Migrating state to add trash support...');
    return migrateToTrashSupport(state);
  }
  return state;
}
```

### Testing Strategy

```typescript
// tests/trash/trashOperations.test.ts
describe('Trash System', () => {
  describe('moveToTrash', () => {
    test('should soft-delete entity without removing data', () => {
      // Test implementation
    });
    
    test('should track original parent for restore', () => {
      // Test implementation
    });
    
    test('should set expiration date', () => {
      // Test implementation
    });
  });
  
  describe('restoreFromTrash', () => {
    test('should restore entity to original parent', () => {
      // Test implementation
    });
    
    test('should allow restore to different parent', () => {
      // Test implementation
    });
    
    test('should fail if original parent no longer exists', () => {
      // Test implementation
    });
  });
  
  describe('emptyTrash', () => {
    test('should permanently delete specified items', () => {
      // Test implementation
    });
    
    test('should delete only expired items when olderThan provided', () => {
      // Test implementation
    });
  });
  
  describe('trashService', () => {
    test('should auto-cleanup expired items', () => {
      // Test implementation
    });
    
    test('should warn when trash approaches max size', () => {
      // Test implementation
    });
  });
});
```

### Rollback: Emergency Restore All

```typescript
// Emergency command in browser console
(globalThis as any).__emergencyRestoreAll = async () => {
  const vault = getVault();
  const state = vault.getState();
  const result = await trashService.restoreAll(state);
  console.log(`Restored ${result.restored.length} items`);
  if (result.failed.length > 0) {
    console.error('Failed:', result.failed);
  }
};
```

---

## Phase 3: Enhanced Progress Indicators (P1 - UX)

### Objective

Replace basic progress callbacks with granular, cancellable operations providing accurate file-level tracking and user control.

### Files to Modify

#### 3.1 Enhanced Progress Interface

**Location:** [`services/iiifBuilder.ts`](services/iiifBuilder.ts:409-480) (Lines 409-480)

**Current Progress Callback:**
```typescript
onProgress?: (msg: string, percent: number) => void
```

**New Progress Interface:**

```typescript
// types.ts - Add new types
export interface IngestProgress {
  /** Operation ID for tracking multiple concurrent ingests */
  operationId: string;
  
  /** Overall status */
  status: 'preparing' | 'analyzing' | 'processing' | 'generating_derivatives' | 'complete' | 'cancelled' | 'error';
  
  /** Current file being processed */
  currentFile?: {
    name: string;
    index: number;      // "File 23 of 1000"
    total: number;
    bytesProcessed: number;
    bytesTotal: number;
  };
  
  /** Overall progress */
  overall: {
    filesProcessed: number;
    filesTotal: number;
    bytesProcessed: number;
    bytesTotal: number;
    percentComplete: number;
    estimatedTimeRemaining: number; // seconds
  };
  
  /** Per-stage progress */
  stages: {
    analysis: { complete: boolean; percent: number };
    hashCalculation: { complete: boolean; percent: number };
    thumbnailGeneration: { complete: boolean; percent: number };
    metadataExtraction: { complete: boolean; percent: number };
    iiifBuilding: { complete: boolean; percent: number };
    derivativeQueue: { complete: boolean; queued: number; total: number };
  };
  
  /** Recent activity log */
  recentActivity: Array<{
    timestamp: number;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  }>;
  
  /** Cancellability */
  cancellable: boolean;
}
```

**Modify ingestTree Function:**

```typescript
// services/iiifBuilder.ts - Updated signature
export interface IngestOptions {
  existingRoot?: IIIFItem | null;
  onProgress?: (progress: IngestProgress) => void;
  abortController?: AbortController;
  operationId?: string;
}

export const ingestTree = async (
  tree: FileTree,
  options: IngestOptions = {}
): Promise<IngestResult> => {
  const {
    existingRoot = null,
    onProgress,
    abortController,
    operationId = `ingest-${Date.now()}`
  } = options;
  
  const progress: IngestProgress = {
    operationId,
    status: 'preparing',
    overall: {
      filesProcessed: 0,
      filesTotal: 0,
      bytesProcessed: 0,
      bytesTotal: 0,
      percentComplete: 0,
      estimatedTimeRemaining: 0
    },
    stages: {
      analysis: { complete: false, percent: 0 },
      hashCalculation: { complete: false, percent: 0 },
      thumbnailGeneration: { complete: false, percent: 0 },
      metadataExtraction: { complete: false, percent: 0 },
      iiifBuilding: { complete: false, percent: 0 },
      derivativeQueue: { complete: false, queued: 0, total: 0 }
    },
    recentActivity: [],
    cancellable: true
  };
  
  const report: IngestReport = {
    manifestsCreated: 0,
    collectionsCreated: 0,
    canvasesCreated: 0,
    filesProcessed: 0,
    warnings: []
  };
  
  // Check cancellation helper
  const checkCancelled = () => {
    if (abortController?.signal.aborted) {
      progress.status = 'cancelled';
      onProgress?.(progress);
      throw new Error('Ingest cancelled by user');
    }
  };
  
  // Update progress helper
  const updateProgress = (updates: Partial<IngestProgress>) => {
    Object.assign(progress, updates);
    onProgress?.(progress);
  };
  
  try {
    // Stage 1: Analyze file tree
    updateProgress({ status: 'analyzing' });
    const allFiles = collectAllFiles(tree);
    progress.overall.filesTotal = allFiles.length;
    progress.overall.bytesTotal = allFiles.reduce((sum, f) => sum + f.size, 0);
    progress.stages.analysis = { complete: true, percent: 100 };
    updateProgress({});
    
    // Stage 2: Process files
    updateProgress({ status: 'processing' });
    
    const startTime = Date.now();
    
    for (let i = 0; i < allFiles.length; i++) {
      checkCancelled();
      
      const file = allFiles[i];
      progress.currentFile = {
        name: file.name,
        index: i + 1,
        total: allFiles.length,
        bytesProcessed: 0,
        bytesTotal: file.size
      };
      
      // Process file with sub-stage updates
      await processFileWithProgress(file, {
        onHashProgress: (percent) => {
          progress.stages.hashCalculation = { complete: false, percent };
          updateProgress({});
        },
        onThumbnailProgress: (percent) => {
          progress.stages.thumbnailGeneration = { complete: false, percent };
          updateProgress({});
        },
        onMetadataProgress: (percent) => {
          progress.stages.metadataExtraction = { complete: false, percent };
          updateProgress({});
        }
      });
      
      progress.overall.filesProcessed++;
      progress.overall.bytesProcessed += file.size;
      progress.overall.percentComplete = Math.round(
        (progress.overall.filesProcessed / progress.overall.filesTotal) * 100
      );
      
      // Calculate ETA
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = progress.overall.filesProcessed / elapsed;
      const remaining = progress.overall.filesTotal - progress.overall.filesProcessed;
      progress.overall.estimatedTimeRemaining = Math.round(remaining / rate);
      
      updateProgress({});
    }
    
    // Stage 3: Queue derivatives
    updateProgress({ 
      status: 'generating_derivatives',
      'stages.derivativeQueue': { complete: false, queued: 0, total: tileGenerationQueue.length }
    });
    
    // ... rest of implementation
    
    progress.status = 'complete';
    updateProgress({});
    
    return { root: newRoot, report };
    
  } catch (error) {
    progress.status = 'error';
    progress.recentActivity.push({
      timestamp: Date.now(),
      message: error instanceof Error ? error.message : 'Unknown error',
      type: 'error'
    });
    updateProgress({});
    throw error;
  }
};
```

#### 3.2 Create useIngestProgress Hook

**New File:** `hooks/useIngestProgress.ts`

```typescript
/**
 * useIngestProgress - Track multiple concurrent ingest operations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { IngestProgress } from '../types';

interface IngestOperation {
  id: string;
  progress: IngestProgress;
  abortController: AbortController;
  status: 'running' | 'paused' | 'cancelled' | 'complete' | 'error';
  startTime: number;
}

interface IngestProgressState {
  operations: Map<string, IngestOperation>;
  aggregate: {
    totalFiles: number;
    filesProcessed: number;
    overallPercent: number;
    isRunning: boolean;
    canCancelAll: boolean;
    canPauseAll: boolean;
  };
}

export function useIngestProgress() {
  const [state, setState] = useState<IngestProgressState>({
    operations: new Map(),
    aggregate: {
      totalFiles: 0,
      filesProcessed: 0,
      overallPercent: 0,
      isRunning: false,
      canCancelAll: false,
      canPauseAll: false
    }
  });
  
  const operationRefs = useRef<Map<string, IngestOperation>>(new Map());
  
  // Update aggregate whenever operations change
  useEffect(() => {
    const ops = Array.from(operationRefs.current.values());
    const runningOps = ops.filter(o => o.status === 'running');
    
    const totalFiles = ops.reduce((sum, o) => 
      sum + o.progress.overall.filesTotal, 0
    );
    const filesProcessed = ops.reduce((sum, o) => 
      sum + o.progress.overall.filesProcessed, 0
    );
    
    setState({
      operations: new Map(operationRefs.current),
      aggregate: {
        totalFiles,
        filesProcessed,
        overallPercent: totalFiles > 0 ? Math.round((filesProcessed / totalFiles) * 100) : 0,
        isRunning: runningOps.length > 0,
        canCancelAll: runningOps.length > 0,
        canPauseAll: runningOps.length > 0
      }
    });
  }, [operationRefs.current.size]);
  
  const startOperation = useCallback((id: string): AbortController => {
    const abortController = new AbortController();
    
    const operation: IngestOperation = {
      id,
      progress: {
        operationId: id,
        status: 'preparing',
        overall: {
          filesProcessed: 0,
          filesTotal: 0,
          bytesProcessed: 0,
          bytesTotal: 0,
          percentComplete: 0,
          estimatedTimeRemaining: 0
        },
        stages: {
          analysis: { complete: false, percent: 0 },
          hashCalculation: { complete: false, percent: 0 },
          thumbnailGeneration: { complete: false, percent: 0 },
          metadataExtraction: { complete: false, percent: 0 },
          iiifBuilding: { complete: false, percent: 0 },
          derivativeQueue: { complete: false, queued: 0, total: 0 }
        },
        recentActivity: [],
        cancellable: true
      },
      abortController,
      status: 'running',
      startTime: Date.now()
    };
    
    operationRefs.current.set(id, operation);
    setState(s => ({ ...s, operations: new Map(operationRefs.current) }));
    
    return abortController;
  }, []);
  
  const updateProgress = useCallback((id: string, progress: IngestProgress) => {
    const operation = operationRefs.current.get(id);
    if (operation) {
      operation.progress = progress;
      setState(s => ({ ...s, operations: new Map(operationRefs.current) }));
    }
  }, []);
  
  const cancelOperation = useCallback((id: string) => {
    const operation = operationRefs.current.get(id);
    if (operation && operation.status === 'running') {
      operation.abortController.abort();
      operation.status = 'cancelled';
      setState(s => ({ ...s, operations: new Map(operationRefs.current) }));
    }
  }, []);
  
  const cancelAll = useCallback(() => {
    for (const operation of operationRefs.current.values()) {
      if (operation.status === 'running') {
        operation.abortController.abort();
        operation.status = 'cancelled';
      }
    }
    setState(s => ({ ...s, operations: new Map(operationRefs.current) }));
  }, []);
  
  const pauseOperation = useCallback((id: string) => {
    // Note: True pause requires worker cooperation
    // For now, this is a placeholder for future implementation
    const operation = operationRefs.current.get(id);
    if (operation) {
      operation.status = 'paused';
      setState(s => ({ ...s, operations: new Map(operationRefs.current) }));
    }
  }, []);
  
  const resumeOperation = useCallback((id: string) => {
    const operation = operationRefs.current.get(id);
    if (operation && operation.status === 'paused') {
      operation.status = 'running';
      setState(s => ({ ...s, operations: new Map(operationRefs.current) }));
    }
  }, []);
  
  const completeOperation = useCallback((id: string, error?: Error) => {
    const operation = operationRefs.current.get(id);
    if (operation) {
      operation.status = error ? 'error' : 'complete';
      if (error) {
        operation.progress.recentActivity.push({
          timestamp: Date.now(),
          message: error.message,
          type: 'error'
        });
      }
      setState(s => ({ ...s, operations: new Map(operationRefs.current) }));
    }
  }, []);
  
  return {
    operations: state.operations,
    aggregate: state.aggregate,
    startOperation,
    updateProgress,
    cancelOperation,
    cancelAll,
    pauseOperation,
    resumeOperation,
    completeOperation
  };
}
```

#### 3.3 Create IngestProgressPanel Component

**New File:** `components/IngestProgressPanel.tsx`

```typescript
/**
 * IngestProgressPanel - Detailed progress display with controls
 */

import React from 'react';
import { Icon } from './Icon';
import type { IngestProgress } from '../types';

interface IngestProgressPanelProps {
  progress: IngestProgress;
  onCancel: () => void;
  onPause?: () => void;
  onResume?: () => void;
  compact?: boolean;
}

export function IngestProgressPanel({
  progress,
  onCancel,
  onPause,
  onResume,
  compact = false
}: IngestProgressPanelProps) {
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };
  
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };
  
  if (compact) {
    return (
      <div className="ingest-progress-compact">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress.overall.percentComplete}%` }}
          />
        </div>
        <span className="progress-text">
          {progress.overall.percentComplete}% - {progress.status}
        </span>
        {progress.cancellable && (
          <button onClick={onCancel} className="cancel-btn">
            <Icon name="cancel" />
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className="ingest-progress-panel">
      <header>
        <h3>Ingest Progress</h3>
        <div className="header-actions">
          {progress.status === 'running' && onPause && (
            <button onClick={onPause}>
              <Icon name="pause" /> Pause
            </button>
          )}
          {progress.status === 'paused' && onResume && (
            <button onClick={onResume}>
              <Icon name="play" /> Resume
            </button>
          )}
          {progress.cancellable && (
            <button onClick={onCancel} className="danger">
              <Icon name="cancel" /> Cancel
            </button>
          )}
        </div>
      </header>
      
      {/* Overall Progress */}
      <section className="overall-progress">
        <div className="progress-bar-large">
          <div 
            className="progress-fill" 
            style={{ width: `${progress.overall.percentComplete}%` }}
          />
          <span className="progress-percent">{progress.overall.percentComplete}%</span>
        </div>
        
        <div className="progress-stats">
          <div>
            <Icon name="files" />
            <span>
              File {progress.currentFile?.index || progress.overall.filesProcessed} of {progress.overall.filesTotal}
            </span>
          </div>
          <div>
            <Icon name="storage" />
            <span>
              {formatBytes(progress.overall.bytesProcessed)} / {formatBytes(progress.overall.bytesTotal)}
            </span>
          </div>
          {progress.overall.estimatedTimeRemaining > 0 && (
            <div>
              <Icon name="time" />
              <span>~{formatTime(progress.overall.estimatedTimeRemaining)} remaining</span>
            </div>
          )}
        </div>
      </section>
      
      {/* Current File */}
      {progress.currentFile && (
        <section className="current-file">
          <h4>Processing: {progress.currentFile.name}</h4>
          <div className="file-progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(progress.currentFile.bytesProcessed / progress.currentFile.bytesTotal) * 100}%` }}
            />
          </div>
        </section>
      )}
      
      {/* Stage Progress */}
      <section className="stage-progress">
        <h4>Stages</h4>
        <div className="stages-grid">
          <StageIndicator 
            label="Analysis" 
            stage={progress.stages.analysis}
            icon="search"
          />
          <StageIndicator 
            label="Hash Check" 
            stage={progress.stages.hashCalculation}
            icon="fingerprint"
          />
          <StageIndicator 
            label="Thumbnail" 
            stage={progress.stages.thumbnailGeneration}
            icon="image"
          />
          <StageIndicator 
            label="Metadata" 
            stage={progress.stages.metadataExtraction}
            icon="info"
          />
          <StageIndicator 
            label="IIIF Build" 
            stage={progress.stages.iiifBuilding}
            icon="build"
          />
          <StageIndicator 
            label="Derivatives" 
            stage={progress.stages.derivativeQueue}
            icon="layers"
            sublabel={`${progress.stages.derivativeQueue.queued}/${progress.stages.derivativeQueue.total}`}
          />
        </div>
      </section>
      
      {/* Activity Log */}
      {progress.recentActivity.length > 0 && (
        <section className="activity-log">
          <h4>Recent Activity</h4>
          <ul>
            {progress.recentActivity.slice(-5).map((activity, i) => (
              <li key={i} className={`activity-${activity.type}`}>
                <Icon name={activity.type} />
                <span>{activity.message}</span>
                <time>{new Date(activity.timestamp).toLocaleTimeString()}</time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StageIndicator({ 
  label, 
  stage, 
  icon,
  sublabel 
}: { 
  label: string; 
  stage: { complete: boolean; percent: number }; 
  icon: string;
  sublabel?: string;
}) {
  return (
    <div className={`stage-item ${stage.complete ? 'complete' : ''}`}>
      <Icon name={stage.complete ? 'check' : icon} />
      <span className="stage-label">{label}</span>
      {!stage.complete && stage.percent > 0 && (
        <div className="stage-progress">
          <div className="progress-fill" style={{ width: `${stage.percent}%` }} />
        </div>
      )}
      {sublabel && <span className="stage-sublabel">{sublabel}</span>}
    </div>
  );
}
```

### Code Patterns to Follow

#### AbortSignal Pattern (from CanvasTilePipeline)

```typescript
// Pattern: services/imagePipeline/canvasPipeline.ts lines 391-395
private checkCancellation(): void {
  if (this.options.signal?.aborted) {
    throw new Error('Tile generation cancelled');
  }
}
```

#### Progress Callback Pattern (from CanvasTilePipeline)

```typescript
// Pattern: services/imagePipeline/canvasPipeline.ts lines 51-60
export interface CanvasTilePipelineOptions {
  quality?: number;
  onProgress?: (progress: TileGenerationProgress) => void;
  onTileGenerated?: (level: number, x: number, y: number, blob: Blob) => void;
  signal?: AbortSignal;
}
```

#### Hash Progress Pattern (from fileIntegrity)

```typescript
// Reference: services/fileIntegrity.ts - calculateHashWithProgress
export async function calculateHashWithProgress(
  file: File,
  onProgress: (percent: number) => void
): Promise<string> {
  // Chunked hashing with progress updates
}
```

### Testing Strategy

```typescript
// tests/ingest/progressAccuracy.test.ts
describe('Ingest Progress Accuracy', () => {
  test('progress should be within 5% of actual completion', async () => {
    const profiler = new IngestProfiler();
    const result = await profiler.profileLargeBatch(1000);
    
    for (const snapshot of result.progressSnapshots) {
      const actualPercent = (snapshot.actualFilesProcessed / result.totalFiles) * 100;
      const diff = Math.abs(snapshot.reportedPercent - actualPercent);
      expect(diff).toBeLessThanOrEqual(5);
    }
  });
  
  test('cancellation should stop processing within 1 second', async () => {
    const controller = new AbortController();
    const startTime = Date.now();
    
    setTimeout(() => controller.abort(), 100);
    
    try {
      await ingestTree(largeTree, { abortController: controller });
    } catch (e) {
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1100); // 1s + 100ms buffer
    }
  });
  
  test('ETA should improve accuracy over time', async () => {
    // Test that ETA becomes more accurate as more files are processed
  });
});
```

---

## Phase 4: Worker Migration (P1 - Performance)

### Objective

Move CPU-intensive blocking operations to web workers to maintain UI responsiveness during large batch imports and processing operations.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MAIN THREAD                                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐ │
│  │  StagingWorkbench│    │   buildTree()   │    │  Incremental Update │ │
│  │    (UI Updates)  │    │  (Coordination) │    │     (Results)       │ │
│  └─────────────────┘    └────────┬────────┘    └─────────────────────┘ │
│                                  │                                      │
│                           ┌──────▼──────┐                              │
│                           │  Message    │                              │
│                           │  Protocol   │                              │
│                           └──────┬──────┘                              │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
           ┌────────▼─────┐ ┌──────▼──────┐ ┌───▼──────────┐
           │  Ingest      │ │   Ingest    │ │   Ingest     │
           │  Worker 1    │ │  Worker 2   │ │  Worker N    │
           └────────┬─────┘ └──────┬──────┘ └──────┬───────┘
                    │              │               │
           ┌────────▼──────────────▼───────────────▼───────┐
           │              WORKER OPERATIONS                │
           │  • createImageBitmap()                        │
           │  • generateDerivative()                       │
           │  • calculateHash()                            │
           │  • extractMetadata()                          │
           │  • buildIIIFStructure()                       │
           └──────────────────┬────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Batched IndexedDB │
                    │      Writes        │
                    └────────────────────┘
```

### Files to Create/Modify

#### 4.1 Create Ingest Worker

**New File:** `workers/ingest.worker.ts`

```typescript
/**
 * Ingest Web Worker
 * 
 * Offloads CPU-intensive ingest operations from main thread:
 * - Image decoding (createImageBitmap)
 * - Thumbnail generation
 * - File hash calculation
 * - Metadata extraction
 * - IIIF structure building
 */

import type { FileTree, IIIFCanvas, IIIFItem } from '../types';

// ============================================================================
// Message Types
// ============================================================================

export interface IngestWorkerInitMessage {
  type: 'INIT_INGEST';
  payload: {
    operationId: string;
    fileTree: FileTree;
    baseUrl: string;
    options?: {
      generateThumbnails?: boolean;
      calculateHashes?: boolean;
      extractMetadata?: boolean;
      derivativeSizes?: number[];
    };
  };
}

export interface ProcessFileMessage {
  type: 'PROCESS_FILE';
  payload: {
    file: File;
    index: number;
    total: number;
    parentPath: string;
  };
}

export interface CancelIngestMessage {
  type: 'CANCEL_INGEST';
  payload: {
    operationId: string;
  };
}

export interface IngestProgressMessage {
  type: 'INGEST_PROGRESS';
  payload: {
    operationId: string;
    fileIndex: number;
    fileName: string;
    stage: 'decoding' | 'hashing' | 'thumbnail' | 'metadata' | 'building';
    stagePercent: number;
    bytesProcessed: number;
    result?: {
      canvas: IIIFCanvas;
      derivatives: Map<string, Blob>;
      hash: string;
    };
  };
}

export interface IngestCompleteMessage {
  type: 'INGEST_COMPLETE';
  payload: {
    operationId: string;
    root: IIIFItem;
    stats: {
      filesProcessed: number;
      totalTime: number;
      derivativesGenerated: number;
    };
  };
}

export interface IngestErrorMessage {
  type: 'INGEST_ERROR';
  payload: {
    operationId: string;
    fileName?: string;
    error: string;
    recoverable: boolean;
  };
}

export type IngestWorkerMessage =
  | IngestWorkerInitMessage
  | ProcessFileMessage
  | CancelIngestMessage
  | IngestProgressMessage
  | IngestCompleteMessage
  | IngestErrorMessage;

// ============================================================================
// Worker State
// ============================================================================

interface IngestState {
  operationId: string | null;
  aborted: boolean;
  processedCount: number;
  startTime: number;
  options: {
    generateThumbnails: boolean;
    calculateHashes: boolean;
    extractMetadata: boolean;
    derivativeSizes: number[];
  };
}

const state: IngestState = {
  operationId: null,
  aborted: false,
  processedCount: 0,
  startTime: 0,
  options: {
    generateThumbnails: true,
    calculateHashes: true,
    extractMetadata: true,
    derivativeSizes: [150, 600, 1200]
  }
};

// ============================================================================
// Worker Operations
// ============================================================================

/**
 * Decode image and get dimensions
 */
async function decodeImage(file: File): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  return { bitmap, width: bitmap.width, height: bitmap.height };
}

/**
 * Generate derivative at specified width
 */
async function generateDerivative(
  sourceBitmap: ImageBitmap,
  targetWidth: number,
  quality: number = 0.85
): Promise<Blob> {
  const ratio = sourceBitmap.height / sourceBitmap.width;
  const targetHeight = Math.floor(targetWidth * ratio);
  
  // Use OffscreenCanvas in worker
  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceBitmap, 0, 0, targetWidth, targetHeight);
  
  return canvas.convertToBlob({ type: 'image/jpeg', quality });
}

/**
 * Calculate file hash using chunked reading
 */
async function calculateHash(file: File, onProgress?: (percent: number) => void): Promise<string> {
  const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  const chunks = Math.ceil(file.size / CHUNK_SIZE);
  
  // Use SubtleCrypto in worker context
  const crypto = self.crypto;
  const encoder = new TextEncoder();
  
  // Simple hash for demonstration - in production use SHA-256
  let hash = 0;
  
  for (let i = 0; i < chunks; i++) {
    if (state.aborted) throw new Error('Ingest cancelled');
    
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const buffer = await chunk.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Simple hash accumulation
    for (let j = 0; j < bytes.length; j++) {
      hash = ((hash << 5) - hash + bytes[j]) | 0;
    }
    
    onProgress?.(Math.round(((i + 1) / chunks) * 100));
  }
  
  return hash.toString(16);
}

/**
 * Extract metadata from file
 */
async function extractMetadata(file: File): Promise<{
  navDate?: string;
  metadata: Array<{ label: Record<string, string[]>; value: Record<string, string[]> }>;
}> {
  // Basic metadata extraction
  const metadata = [{
    label: { none: ['Filename'] },
    value: { none: [file.name] }
  }, {
    label: { none: ['File Size'] },
    value: { none: [`${(file.size / 1024 / 1024).toFixed(2)} MB`] }
  }];
  
  // Try to extract EXIF data for images
  if (file.type.startsWith('image/')) {
    try {
      const exifData = await extractExifData(file);
      if (exifData.dateTaken) {
        metadata.push({
          label: { none: ['Date Taken'] },
          value: { none: [exifData.dateTaken] }
        });
      }
    } catch (e) {
      // EXIF extraction failed, continue without it
    }
  }
  
  return { metadata };
}

/**
 * Extract EXIF data (simplified)
 */
async function extractExifData(file: File): Promise<{ dateTaken?: string }> {
  // Simplified EXIF extraction
  // In production, use a library like exifr
  return {};
}

/**
 * Build IIIF canvas from processed file
 */
function buildCanvas(
  file: File,
  imageData: { width: number; height: number },
  assetId: string,
  baseUrl: string,
  metadata: any
): IIIFCanvas {
  const canvasId = `${baseUrl}/canvas/${assetId}`;
  
  return {
    id: canvasId,
    type: 'Canvas',
    label: { none: [file.name] },
    width: imageData.width,
    height: imageData.height,
    items: [{
      id: `${canvasId}/page/painting`,
      type: 'AnnotationPage',
      items: [{
        id: `${canvasId}/annotation/painting`,
        type: 'Annotation',
        motivation: 'painting',
        target: canvasId,
        body: {
          id: `${baseUrl}/asset/${assetId}`,
          type: 'Image',
          format: file.type
        }
      }]
    }],
    metadata: metadata.metadata,
    navDate: metadata.navDate
  } as IIIFCanvas;
}

// ============================================================================
// Main Processing Loop
// ============================================================================

async function processFile(
  file: File,
  index: number,
  total: number,
  baseUrl: string
): Promise<{ canvas: IIIFCanvas; derivatives: Map<string, Blob>; hash: string }> {
  if (state.aborted) throw new Error('Ingest cancelled');
  
  // Stage 1: Hash calculation
  sendProgress(index, file.name, 'hashing', 0);
  const hash = state.options.calculateHashes 
    ? await calculateHash(file, (p) => sendProgress(index, file.name, 'hashing', p))
    : '';
  
  if (state.aborted) throw new Error('Ingest cancelled');
  
  // Stage 2: Image decoding
  sendProgress(index, file.name, 'decoding', 0);
  const { bitmap, width, height } = await decodeImage(file);
  
  if (state.aborted) {
    bitmap.close();
    throw new Error('Ingest cancelled');
  }
  
  // Stage 3: Thumbnail generation
  sendProgress(index, file.name, 'thumbnail', 0);
  const derivatives = new Map<string, Blob>();
  
  if (state.options.generateThumbnails) {
    const sizes = state.options.derivativeSizes.filter(s => s < width);
    for (let i = 0; i < sizes.length; i++) {
      const derivative = await generateDerivative(bitmap, sizes[i]);
      derivatives.set(`size_${sizes[i]}`, derivative);
      sendProgress(index, file.name, 'thumbnail', Math.round(((i + 1) / sizes.length) * 100));
      
      if (state.aborted) {
        bitmap.close();
        throw new Error('Ingest cancelled');
      }
    }
  }
  
  // Stage 4: Metadata extraction
  sendProgress(index, file.name, 'metadata', 0);
  const metadata = state.options.extractMetadata 
    ? await extractMetadata(file)
    : { metadata: [] };
  sendProgress(index, file.name, 'metadata', 100);
  
  // Stage 5: Build IIIF structure
  sendProgress(index, file.name, 'building', 50);
  const assetId = `asset-${Date.now()}-${index}`;
  const canvas = buildCanvas(file, { width, height }, assetId, baseUrl, metadata);
  
  // Clean up bitmap
  bitmap.close();
  
  sendProgress(index, file.name, 'building', 100, { canvas, derivatives, hash });
  
  return { canvas, derivatives, hash };
}

function sendProgress(
  fileIndex: number,
  fileName: string,
  stage: IngestProgressMessage['payload']['stage'],
  stagePercent: number,
  result?: { canvas: IIIFCanvas; derivatives: Map<string, Blob>; hash: string }
): void {
  const message: IngestProgressMessage = {
    type: 'INGEST_PROGRESS',
    payload: {
      operationId: state.operationId!,
      fileIndex,
      fileName,
      stage,
      stagePercent,
      bytesProcessed: 0,
      result
    }
  };
  self.postMessage(message);
}

// ============================================================================
// Message Handler
// ============================================================================

self.onmessage = async (event: MessageEvent<IngestWorkerMessage>) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'INIT_INGEST': {
      const { operationId, options } = payload;
      state.operationId = operationId;
      state.aborted = false;
      state.processedCount = 0;
      state.startTime = performance.now();
      
      if (options) {
        Object.assign(state.options, options);
      }
      
      // Acknowledge initialization
      self.postMessage({
        type: 'INGEST_PROGRESS',
        payload: {
          operationId,
          fileIndex: 0,
          fileName: 'Initializing...',
          stage: 'decoding',
          stagePercent: 0,
          bytesProcessed: 0
        }
      });
      break;
    }
    
    case 'PROCESS_FILE': {
      const { file, index, total, parentPath } = payload;
      
      try {
        const result = await processFile(file, index, total, parentPath);
        state.processedCount++;
        
        // If this was the last file, send completion
        if (index === total - 1) {
          const completeMessage: IngestCompleteMessage = {
            type: 'INGEST_COMPLETE',
            payload: {
              operationId: state.operationId!,
              root: {} as IIIFItem, // Build actual root structure
              stats: {
                filesProcessed: state.processedCount,
                totalTime: performance.now() - state.startTime,
                derivativesGenerated: result.derivatives.size
              }
            }
          };
          self.postMessage(completeMessage);
        }
      } catch (error) {
        const errorMessage: IngestErrorMessage = {
          type: 'INGEST_ERROR',
          payload: {
            operationId: state.operationId!,
            fileName: file.name,
            error: error instanceof Error ? error.message : 'Unknown error',
            recoverable: error instanceof Error && error.message !== 'Ingest cancelled'
          }
        };
        self.postMessage(errorMessage);
      }
      break;
    }
    
    case 'CANCEL_INGEST': {
      state.aborted = true;
      break;
    }
  }
};

export {};
```

#### 4.2 Create Worker Pool Manager

**New File:** `services/ingestWorkerPool.ts`

```typescript
/**
 * Ingest Worker Pool
 * 
 * Manages multiple ingest workers for parallel processing
 * with backpressure and load balancing.
 */

import type { FileTree, IIIFItem, IngestProgress } from '../types';

// Worker instance type
interface IngestWorker {
  worker: Worker;
  busy: boolean;
  operationId: string | null;
}

// Task queue item
interface IngestTask {
  file: File;
  index: number;
  total: number;
  operationId: string;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

export interface IngestWorkerPoolOptions {
  poolSize?: number;
  maxQueueSize?: number;
  enableLoadBalancing?: boolean;
}

export class IngestWorkerPool {
  private workers: IngestWorker[] = [];
  private queue: IngestTask[] = [];
  private options: Required<IngestWorkerPoolOptions>;
  private progressCallbacks = new Map<string, (progress: IngestProgress) => void>();
  private completionCallbacks = new Map<string, (result: any) => void>();
  private errorCallbacks = new Map<string, (error: Error) => void>();
  
  constructor(options: IngestWorkerPoolOptions = {}) {
    this.options = {
      poolSize: options.poolSize || Math.min(navigator.hardwareConcurrency || 4, 4),
      maxQueueSize: options.maxQueueSize || 100,
      enableLoadBalancing: options.enableLoadBalancing ?? true
    };
    
    this.initWorkers();
  }
  
  private initWorkers(): void {
    for (let i = 0; i < this.options.poolSize; i++) {
      const worker = new Worker(
        new URL('../workers/ingest.worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      worker.onmessage = this.handleWorkerMessage.bind(this);
      worker.onerror = this.handleWorkerError.bind(this);
      
      this.workers.push({
        worker,
        busy: false,
        operationId: null
      });
    }
  }
  
  private handleWorkerMessage(event: MessageEvent): void {
    const { type, payload } = event.data;
    
    switch (type) {
      case 'INGEST_PROGRESS': {
        const callback = this.progressCallbacks.get(payload.operationId);
        if (callback) {
          // Convert worker progress to main thread format
          callback({
            operationId: payload.operationId,
            status: 'processing',
            currentFile: {
              name: payload.fileName,
              index: payload.fileIndex + 1,
              total: payload.total,
              bytesProcessed: payload.bytesProcessed,
              bytesTotal: 0
            },
            overall: {
              filesProcessed: payload.fileIndex,
              filesTotal: payload.total,
              bytesProcessed: payload.bytesProcessed,
              bytesTotal: 0,
              percentComplete: Math.round(((payload.fileIndex + 1) / payload.total) * 100),
              estimatedTimeRemaining: 0
            },
            stages: {
              analysis: { complete: payload.stage !== 'decoding', percent: 100 },
              hashCalculation: { complete: payload.stage !== 'hashing', percent: payload.stage === 'hashing' ? payload.stagePercent : 100 },
              thumbnailGeneration: { complete: payload.stage !== 'thumbnail', percent: payload.stage === 'thumbnail' ? payload.stagePercent : 100 },
              metadataExtraction: { complete: payload.stage !== 'metadata', percent: payload.stage === 'metadata' ? payload.stagePercent : 100 },
              iiifBuilding: { complete: payload.stage !== 'building', percent: payload.stage === 'building' ? payload.stagePercent : 100 },
              derivativeQueue: { complete: false, queued: 0, total: 0 }
            },
            recentActivity: [],
            cancellable: true
          });
        }
        break;
      }
      
      case 'INGEST_COMPLETE': {
        const callback = this.completionCallbacks.get(payload.operationId);
        if (callback) {
          callback(payload);
        }
        this.cleanupOperation(payload.operationId);
        break;
      }
      
      case 'INGEST_ERROR': {
        const callback = this.errorCallbacks.get(payload.operationId);
        if (callback) {
          callback(new Error(payload.error));
        }
        break;
      }
    }
    
    // Mark worker as available and process next task
    const workerInstance = this.workers.find(w => 
      w.operationId === payload.operationId
    );
    if (workerInstance) {
      workerInstance.busy = false;
      workerInstance.operationId = null;
      this.processQueue();
    }
  }
  
  private handleWorkerError(event: ErrorEvent): void {
    console.error('Ingest worker error:', event);
    // Find the worker that errored and clean it up
    for (const worker of this.workers) {
      if (worker.worker === event.target) {
        worker.busy = false;
        if (worker.operationId) {
          const callback = this.errorCallbacks.get(worker.operationId);
          if (callback) {
            callback(new Error(event.message));
          }
        }
      }
    }
    this.processQueue();
  }
  
  private processQueue(): void {
    if (this.queue.length === 0) return;
    
    // Find available worker
    const availableWorker = this.workers.find(w => !w.busy);
    if (!availableWorker) return;
    
    // Get next task
    const task = this.queue.shift();
    if (!task) return;
    
    // Assign task to worker
    availableWorker.busy = true;
    availableWorker.operationId = task.operationId;
    
    availableWorker.worker.postMessage({
      type: 'PROCESS_FILE',
      payload: {
        file: task.file,
        index: task.index,
        total: task.total,
        parentPath: ''
      }
    });
  }
  
  /**
   * Start a new ingest operation
   */
  async ingest(
    tree: FileTree,
    options: {
      onProgress: (progress: IngestProgress) => void;
      abortController?: AbortController;
    }
  ): Promise<{ root: IIIFItem; stats: any }> {
    const operationId = `ingest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Register callbacks
    this.progressCallbacks.set(operationId, options.onProgress);
    
    return new Promise((resolve, reject) => {
      this.completionCallbacks.set(operationId, resolve);
      this.errorCallbacks.set(operationId, reject);
      
      // Handle cancellation
      options.abortController?.signal.addEventListener('abort', () => {
        this.cancel(operationId);
        reject(new Error('Ingest cancelled'));
      });
      
      // Collect all files
      const files = this.collectFiles(tree);
      
      // Initialize all workers with the operation
      for (const worker of this.workers) {
        worker.worker.postMessage({
          type: 'INIT_INGEST',
          payload: {
            operationId,
            fileTree: tree,
            baseUrl: '', // Set appropriately
            options: {
              generateThumbnails: true,
              calculateHashes: true,
              extractMetadata: true
            }
          }
        });
      }
      
      // Queue all files
      for (let i = 0; i < files.length; i++) {
        this.queue.push({
          file: files[i],
          index: i,
          total: files.length,
          operationId,
          resolve: () => {},
          reject: () => {}
        });
      }
      
      // Start processing
      this.processQueue();
    });
  }
  
  /**
   * Cancel an operation
   */
  cancel(operationId: string): void {
    // Send cancel to all workers
    for (const worker of this.workers) {
      worker.worker.postMessage({
        type: 'CANCEL_INGEST',
        payload: { operationId }
      });
    }
    
    // Remove pending tasks
    this.queue = this.queue.filter(t => t.operationId !== operationId);
    
    this.cleanupOperation(operationId);
  }
  
  /**
   * Cancel all operations
   */
  cancelAll(): void {
    const operationIds = new Set(this.queue.map(t => t.operationId));
    for (const id of operationIds) {
      this.cancel(id);
    }
  }
  
  private cleanupOperation(operationId: string): void {
    this.progressCallbacks.delete(operationId);
    this.completionCallbacks.delete(operationId);
    this.errorCallbacks.delete(operationId);
  }
  
  private collectFiles(tree: FileTree): File[] {
    const files: File[] = [];
    
    function traverse(node: FileTree) {
      for (const file of node.files.values()) {
        files.push(file);
      }
      for (const child of node.directories.values()) {
        traverse(child);
      }
    }
    
    traverse(tree);
    return files;
  }
  
  /**
   * Get pool statistics
   */
  getStats(): {
    activeWorkers: number;
    queueLength: number;
    activeOperations: string[];
  } {
    return {
      activeWorkers: this.workers.filter(w => w.busy).length,
      queueLength: this.queue.length,
      activeOperations: [...new Set(this.queue.map(t => t.operationId))]
    };
  }
  
  /**
   * Dispose of all workers
   */
  terminate(): void {
    for (const worker of this.workers) {
      worker.worker.terminate();
    }
    this.workers = [];
    this.queue = [];
    this.progressCallbacks.clear();
    this.completionCallbacks.clear();
    this.errorCallbacks.clear();
  }
}

// Singleton instance
let poolInstance: IngestWorkerPool | null = null;

export function getIngestWorkerPool(): IngestWorkerPool {
  if (!poolInstance) {
    poolInstance = new IngestWorkerPool();
  }
  return poolInstance;
}

export function resetIngestWorkerPool(): void {
  poolInstance?.terminate();
  poolInstance = null;
}
```

#### 4.3 Refactor iiifBuilder for Worker Integration

**Location:** [`services/iiifBuilder.ts`](services/iiifBuilder.ts)

**Add Worker Fallback Pattern:**

```typescript
// services/iiifBuilder.ts - Add to imports
import { 
  getIngestWorkerPool, 
  IngestWorkerPool 
} from './ingestWorkerPool';
import { FEATURES } from '../constants';

// services/iiifBuilder.ts - Modified ingestTree
export const ingestTree = async (
  tree: FileTree,
  options: IngestOptions = {}
): Promise<IngestResult> => {
  const { 
    onProgress, 
    abortController, 
    operationId,
    useWorkers = FEATURES.WORKER_INGEST.enabled 
  } = options;
  
  // Try worker-based ingest first if enabled
  if (useWorkers && window.Worker) {
    try {
      const pool = getIngestWorkerPool();
      const result = await pool.ingest(tree, {
        onProgress,
        abortController
      });
      
      return {
        root: result.root,
        report: {
          manifestsCreated: 0, // Calculate from result
          collectionsCreated: 0,
          canvasesCreated: result.stats.filesProcessed,
          filesProcessed: result.stats.filesProcessed,
          warnings: []
        }
      };
    } catch (error) {
      console.warn('Worker ingest failed, falling back to main thread:', error);
      // Fall through to main thread implementation
    }
  }
  
  // Main thread fallback (existing implementation)
  return ingestTreeMainThread(tree, options);
};

// Original main thread implementation
async function ingestTreeMainThread(
  tree: FileTree,
  options: IngestOptions
): Promise<IngestResult> {
  // ... existing implementation
}
```

#### 4.4 Update Vite Configuration

**New File:** `vite.config.ts` (or update existing)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // Worker configuration
  worker: {
    format: 'es',
    plugins: []
  },
  
  build: {
    // Ensure workers are properly bundled
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate chunk for worker-related code
          'ingest-worker': ['./src/workers/ingest.worker.ts']
        }
      }
    }
  },
  
  // Optimize worker imports
  optimizeDeps: {
    exclude: ['src/workers/*.ts']
  }
});
```

### Testing Strategy

```typescript
// tests/workers/performanceComparison.test.ts
describe('Worker vs Main Thread Performance', () => {
  const TEST_FILE_COUNT = 100;
  
  test('worker processing should not block UI', async () => {
    const frameDrops: number[] = [];
    let lastFrameTime = performance.now();
    
    // Monitor frame rate
    const monitorFrameRate = () => {
      const now = performance.now();
      const delta = now - lastFrameTime;
      if (delta > 33) { // Missed 30fps target
        frameDrops.push(delta);
      }
      lastFrameTime = now;
      requestAnimationFrame(monitorFrameRate);
    };
    
    requestAnimationFrame(monitorFrameRate);
    
    // Run worker-based ingest
    await ingestTree(testTree, { useWorkers: true });
    
    // Should have minimal frame drops
    expect(frameDrops.length).toBeLessThan(TEST_FILE_COUNT * 0.1); // < 10% drops
  });
  
  test('worker processing should be faster for large batches', async () => {
    const mainThreadTime = await measureIngestTime(testTree, false);
    const workerTime = await measureIngestTime(testTree, true);
    
    // Workers should be faster for parallelizable work
    expect(workerTime).toBeLessThan(mainThreadTime * 0.8);
  });
  
  test('worker results should match main thread', async () => {
    const mainResult = await ingestTree(testTree, { useWorkers: false });
    const workerResult = await ingestTree(testTree, { useWorkers: true });
    
    // Compare structure
    expect(workerResult.root?.type).toBe(mainResult.root?.type);
    expect(workerResult.report.filesProcessed).toBe(mainResult.report.filesProcessed);
  });
  
  test('fallback should activate on worker failure', async () => {
    // Simulate worker failure
    const result = await ingestTree(testTree, {
      useWorkers: true,
      forceWorkerFailure: true // Test helper
    });
    
    // Should still complete via fallback
    expect(result.root).toBeDefined();
  });
});
```

### Migration Strategy

1. **Gradual Rollout:**
   ```typescript
   // constants/features.ts
   export const FEATURES = {
     WORKER_INGEST: {
       enabled: import.meta.env.VITE_WORKER_INGEST === 'true',
       // Gradually increase: 10% → 50% → 100%
       rolloutPercentage: parseInt(import.meta.env.VITE_WORKER_ROLLOUT || '0')
     }
   };
   ```

2. **Browser Support Detection:**
   ```typescript
   function supportsWorkers(): boolean {
     return !!(
       window.Worker &&
       window.OffscreenCanvas &&
       window.Blob &&
       window.URL?.createObjectURL
     );
   }
   ```

3. **A/B Testing:**
   ```typescript
   const useWorkers = FEATURES.WORKER_INGEST.enabled &&
     Math.random() * 100 < FEATURES.WORKER_INGEST.rolloutPercentage;
   ```

---

## Dependencies Between Phases

| From Phase | To Phase | Dependency Reason |
|------------|----------|-------------------|
| Phase 1 | Phase 3 | Memory stability required for long-running progress operations |
| Phase 1 | Phase 4 | Worker URL leak fix required before worker refactoring |
| Phase 2 | Phase 3 | Trash state needed for cancellable operation cleanup |
| Phase 3 | Phase 4 | Progress protocol design informs worker message format |

### Implementation Order Recommendation

```
Week 1-2: Phase 1 (Memory Leak Fixes)
    │
    ▼
Week 2-3: Phase 2 (Trash/Restore System)  
    │
    ▼
Week 4: Phase 3 (Progress Indicators)
    │
    ▼
Week 5-6: Phase 4 (Worker Migration)
```

---

## Testing Strategy

### Unit Tests

Each phase includes independent test suites with mocked dependencies:

```typescript
// Test structure per phase
tests/
├── phase1-memory/
│   ├── workerUrlLeak.test.ts
│   ├── blobUrlCleanup.test.ts
│   └── fileLifecycle.test.ts
├── phase2-trash/
│   ├── softDelete.test.ts
│   ├── restore.test.ts
│   └── autoCleanup.test.ts
├── phase3-progress/
│   ├── progressAccuracy.test.ts
│   ├── cancellation.test.ts
│   └── etaCalculation.test.ts
└── phase4-workers/
    ├── workerPool.test.ts
    ├── messageProtocol.test.ts
    └── fallback.test.ts
```

### Integration Tests

Cross-phase integration scenarios:

```typescript
// tests/integration/endToEndIngest.test.ts
describe('End-to-End Ingest Workflow', () => {
  test('complete workflow with all phases', async () => {
    // 1. Start ingest with worker (Phase 4)
    // 2. Verify progress updates (Phase 3)
    // 3. Cancel and verify trash state (Phase 2)
    // 4. Restore from trash
    // 5. Verify no memory leaks (Phase 1)
  });
});
```

### Performance Tests

| Phase | Test | Success Criteria |
|-------|------|------------------|
| Phase 1 | Memory profiling | Zero growth in 2-hour session |
| Phase 4 | CPU utilization | 60%+ reduction in main thread blocking |
| Phase 3 | Progress accuracy | Within 5% of actual completion |
| Phase 4 | Large file handling | Successfully process 10GB+ sessions |

### Rollback Testing

```typescript
// tests/rollback/rollbackProcedures.test.ts
describe('Rollback Procedures', () => {
  test('memory cleanup feature flag works', () => {
    // Disable cleanup, verify leaks return
    // Enable cleanup, verify leaks stop
  });
  
  test('database rollback works', async () => {
    // Create snapshot
    // Make changes
    // Rollback
    // Verify state matches snapshot
  });
  
  test('worker fallback activates', async () => {
    // Simulate worker failure
    // Verify fallback to main thread
  });
});
```

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Memory leak regression | Low | High | Extensive profiling + feature flags + gradual rollout |
| Data loss during trash implementation | Low | Critical | Atomic operations + automatic snapshots + emergency restore |
| Worker communication failures | Medium | Medium | Main thread fallback + retry logic + graceful degradation |
| Performance degradation | Medium | High | A/B testing + performance budgets + gradual rollout |
| Browser compatibility | Low | Medium | Feature detection + polyfills + main thread fallback |

### Contingency Plans

**If Phase 4 Workers Cause Issues:**
1. Immediately disable via feature flag
2. Fall back to main thread processing
3. Investigate in staging environment
4. Re-enable with fixes or skip to next release

**If Phase 2 Trash Corrupts Data:**
1. Emergency restore all command
2. Rollback to previous version
3. Restore from automatic snapshot
4. Investigate root cause

---

## Timeline Estimates

| Phase | Duration | Start Week | End Week |
|-------|----------|------------|----------|
| Phase 1: Memory Leak Fixes | 3-5 days | Week 1 | Week 1 |
| Phase 2: Trash/Restore System | 5-7 days | Week 2 | Week 3 |
| Phase 3: Progress Indicators | 3-4 days | Week 3 | Week 4 |
| Phase 4: Worker Migration | 7-10 days | Week 4 | Week 6 |
| **Buffer/Testing** | 3-5 days | Week 6 | Week 7 |
| **Total** | **~6-7 weeks** | | |

---

## Success Metrics

### Phase 1: Memory Leak Fixes
- ✅ Zero memory growth in 2-hour session
- ✅ All `URL.createObjectURL` calls paired with `revokeObjectURL`
- ✅ No detached ArrayBuffers in heap snapshots

### Phase 2: Trash/Restore System
- ✅ 100% data recovery from trash
- ✅ < 1s restore time for single item
- ✅ < 5s bulk restore for 100 items

### Phase 3: Progress Indicators
- ✅ Progress accuracy within 5% of actual
- ✅ Cancellation response within 1 second
- ✅ ETA accuracy improves to < 20% deviation after 10% completion

### Phase 4: Worker Migration
- ✅ 60%+ reduction in main thread blocking time
- ✅ UI maintains 30fps during ingest operations
- ✅ Zero data loss in worker fallback scenarios

---

## Appendix A: Code Reference Quick Links

### Memory Leak Fixes (Phase 1)
- [`services/tileWorker.ts:233`](services/tileWorker.ts:233) - Worker blob URL
- [`services/imageSourceResolver.ts:258`](services/imageSourceResolver.ts:258) - Blob URL cleanup
- [`services/iiifBuilder.ts:347`](services/iiifBuilder.ts:347) - File reference storage
- [`services/tileWorker.ts:468-472`](services/tileWorker.ts:468-472) - Dispose pattern

### Trash System (Phase 2)
- [`types.ts:7`](types.ts:7) - ResourceState enum
- [`services/vault.ts:909-1045`](services/vault.ts:909-1045) - removeEntity function
- [`services/actions.ts`](services/actions.ts) - Action types

### Progress System (Phase 3)
- [`services/iiifBuilder.ts:409-480`](services/iiifBuilder.ts:409-480) - Ingest function
- [`services/imagePipeline/canvasPipeline.ts:391-395`](services/imagePipeline/canvasPipeline.ts:391-395) - AbortSignal pattern
- [`services/imagePipeline/canvasPipeline.ts:33-46`](services/imagePipeline/canvasPipeline.ts:33-46) - Progress interface

### Worker Migration (Phase 4)
- [`workers/validation.worker.ts`](workers/validation.worker.ts) - Existing worker pattern
- [`services/tileWorker.ts:482-714`](services/tileWorker.ts:482-714) - TileWorkerPool backpressure

---

## Appendix B: Migration Checklist

### Pre-Implementation
- [ ] Create feature flags for all phases
- [ ] Set up memory profiling tools
- [ ] Create rollback snapshots
- [ ] Document current performance baselines

### Per-Phase
- [ ] Implement changes with feature flag
- [ ] Write comprehensive tests
- [ ] Performance profiling
- [ ] Code review
- [ ] Staging deployment
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Monitor metrics
- [ ] Full rollout or rollback decision

### Post-Implementation
- [ ] Remove feature flags (after 2 weeks stable)
- [ ] Update documentation
- [ ] Team knowledge sharing
- [ ] Archive rollback snapshots

---

*Document maintained by the IIIF Field Archive Studio development team. Last updated 2026-01-29.*
