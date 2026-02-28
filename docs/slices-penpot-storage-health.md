---
shaping: true
---

# Penpot Storage Health — Slices

**Selected shape:** B + C Foundation (Hybrid)
**Greenfield:** No existing user data. Hash keys and SQLite primary from day 1.
**Source:** `docs/shaping-penpot-storage-health.md`

---

## Slice Overview

| Slice | Phase | Parts | R | Demo |
|-------|:-----:|-------|---|------|
| **V1** | 1 | B1, B2 | R4 | Import 15MB image → OPFS; 5MB → IDB; both display in viewer |
| **V2** | 1 | B3, B4 | R4 | Reload page → images still display; export includes both |
| **V3** | 2 | B5, B6 | R2 | Import same image twice → one blob stored |
| **V4** | 3 | B8, B9, B10 | R1 | Delete canvas + empty trash → orphan blob reclaimed |
| **V5** | 4 | C1 | — | SQLite Worker boots, runs `SELECT 1`, responds via postMessage |
| **V6** | 4 | C1 (cont.) | — | Asset index table tracks inserts/deletes from V1-V4 path |

---

## V1: OPFS Blob Routing

**Phase 1a — R4 (OPFS wiring)**

### Affordances

| Place | Affordance | Type | Wires Out |
|-------|-----------|------|-----------|
| `shared/services/storage.ts` | `getAsset(id)` — checks OPFS → IDB fallback | fn (new) | → exporters, viewer |
| `shared/services/opfsStorage.ts` | Already implemented: `storeFile`, `getFile`, `listFiles` | fn (existing) | → storage.getAsset |
| `entities/manifest/model/builders/iiifBuilder.ts:269` | Size gate: `blob.size > SIZE_THRESHOLD` → OPFS else IDB | branch (modify) | → opfsStorage.storeFile / storage.saveAsset |

### Wiring

```
iiifBuilder.ts:269 (ingest)
  │
  ├── blob > 10MB → opfsStorage.storeFile(id, blob)
  └── blob ≤ 10MB → storage.saveAsset(id, blob)  [IDB, existing]

storage.getAsset(id)  [NEW unified read]
  │
  ├── opfsStorage.getFile(id)  → if found, return
  └── IDB files store get(id)  → fallback
```

### File Scope

| File | Change |
|------|--------|
| `src/shared/services/storage.ts` | Add `getAsset()` with OPFS→IDB fallback |
| `src/entities/manifest/model/builders/iiifBuilder.ts` | Branch at line 269 on blob.size |
| `src/shared/services/opfsStorage.ts` | No changes — already implemented |

### Demo Criteria

- [ ] Import a >10MB image → verify `opfsStorage.listFiles()` includes the key
- [ ] Import a <10MB image → verify IDB `files` store includes the key
- [ ] Both images display correctly in the viewer (SW serves tiles)
- [ ] `storage.getAsset(id)` returns blobs from both locations

### Test Plan

- Unit: `getAsset()` returns from OPFS when present, falls back to IDB
- Unit: size gate routes large blobs to OPFS, small to IDB
- Integration: ingest → store → serve round-trip for both paths

---

## V2: Export + _fileRef Fix

**Phase 1b — R4 (complete OPFS wiring)**

### Affordances

| Place | Affordance | Type | Wires Out |
|-------|-----------|------|-----------|
| `shared/types/index.ts` | Remove `_fileRef?: File` from IIIFItem | type change | → all consumers |
| `features/export/model/staticSiteExporter.ts:425` | Use `storage.getAsset(id)` instead of direct IDB | fn call change | → storage.getAsset |
| `features/export/model/exportService.ts:384-393` | Remove `_fileRef` check, use `storage.getAsset(id)` | fn call change | → storage.getAsset |
| `features/export/model/archivalPackageService.ts:541` | Use `storage.getAsset(id)` | fn call change | → storage.getAsset |

### Wiring

```
Export triggers (any exporter)
  │
  ├── staticSiteExporter:425 → storage.getAsset(imageId)
  ├── exportService:384       → storage.getAsset(assetId)  [was: _fileRef check]
  └── archivalPackageService:541 → storage.getAsset(mediaId)
                                         │
                                    OPFS → IDB fallback (from V1)
```

### File Scope

| File | Change |
|------|--------|
| `src/shared/types/index.ts` | Remove `_fileRef?: File` from IIIFItem |
| `src/features/export/model/exportService.ts` | Replace `_fileRef` fallback with `storage.getAsset()` |
| `src/features/export/model/staticSiteExporter.ts` | Use `storage.getAsset()` |
| `src/features/export/model/archivalPackageService.ts` | Use `storage.getAsset()` |
| `src/entities/manifest/model/builders/iiifBuilder.ts` | Remove `_fileRef` assignment |

### Demo Criteria

- [ ] Reload page → export produces correct bundle (no silently skipped assets)
- [ ] Export includes images from both OPFS and IDB storage
- [ ] `_fileRef` no longer appears in serialized vault JSON
- [ ] No TypeScript errors after removing `_fileRef` from type

### Test Plan

- Unit: export service retrieves assets via `getAsset()` not `_fileRef`
- Integration: ingest → reload → export round-trip produces valid output

---

## V3: Content-Addressable Dedup

**Phase 2 — R2 (SHA-256 on ingest)**

Greenfield: hash keys from day 1. No migration, no dual-key support.

### Affordances

| Place | Affordance | Type | Wires Out |
|-------|-----------|------|-----------|
| `entities/manifest/model/builders/iiifBuilder.ts` | SHA-256 hash blob → hex string as asset key | fn (new) | → storage, opfsStorage |
| `shared/services/storage.ts` | `hasAsset(id)` — check key exists without loading blob | fn (new) | → iiifBuilder dedup check |

### Wiring

```
iiifBuilder.ts (ingest)
  │
  ├── const hash = hex(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))
  ├── const key = hash
  │
  ├── storage.hasAsset(key)? → skip store, reuse key
  │
  └── new asset → V1 size-gate routing (OPFS/IDB) under hash key
                         │
                         ▼
                annotation.body[0].id = `/tiles/${key}/info.json`
```

### File Scope

| File | Change |
|------|--------|
| `src/entities/manifest/model/builders/iiifBuilder.ts` | Replace `buildAssetId()` with SHA-256 hash; add dedup check |
| `src/shared/services/storage.ts` | Add `hasAsset(id)` method |

### Demo Criteria

- [ ] Import an image → asset key is a 64-char hex string
- [ ] Import the same image into a different canvas → no new blob stored
- [ ] Both canvases display the image correctly
- [ ] `storage.hasAsset(hash)` returns true for stored assets

### Test Plan

- Unit: same blob → same hash (deterministic)
- Unit: different blob → different hash
- Unit: dedup check skips store when hash exists
- Adversarial: import two different images with same filename → different hashes, both stored

---

## V4: GC Pipeline

**Phase 3 — R1 (orphan collection)**

### Affordances

| Place | Affordance | Type | Wires Out |
|-------|-----------|------|-----------|
| `shared/services/gc.ts` (new) | `scanReferences(vault)` → Set<assetId> of live refs | fn (new) | → orphan detection |
| | `enumerateStorage()` → Set<assetId> of stored blobs | fn (new) | → orphan detection |
| | `collectOrphans()` → delete orphaned blobs from OPFS + IDB | fn (new) | → storage, opfsStorage |
| `entities/manifest/model/vault/trash.ts` | Call `gc.collectOrphans()` after `emptyTrash()` | hook (modify) | → gc.ts |

### Wiring

```
emptyTrash() [existing — removes vault entities]
  │
  ▼
gc.collectOrphans()  [NEW — triggered after emptyTrash]
  │
  ├── scanReferences(vaultState, trashedEntities)
  │     walk all entity types → collect asset IDs from annotation bodies
  │     walk trashedEntities → collect asset IDs (exclude from deletion)
  │     → Set<assetId> liveRefs
  │
  ├── enumerateStorage()
  │     IDB: getAllKeys() on files store
  │     OPFS: opfsStorage.listFiles()
  │     → Set<assetId> storedKeys
  │
  ├── orphans = storedKeys - liveRefs
  │
  └── for each orphan:
        IDB: delete from files store
        OPFS: opfsStorage.deleteFile(key)
```

### File Scope

| File | Change |
|------|--------|
| `src/shared/services/gc.ts` (new) | Reference scanner, orphan detector, GC executor |
| `src/entities/manifest/model/vault/trash.ts` | Call GC after emptyTrash |
| `src/shared/services/storage.ts` | Add `getAllAssetKeys()` method |
| `src/shared/services/opfsStorage.ts` | Already has `listFiles()` and `deleteFile()` |

### Demo Criteria

- [ ] Import image A into canvas → delete canvas → empty trash → blob A gone from IDB/OPFS
- [ ] Import image A into two canvases → delete one → empty trash → blob A still exists
- [ ] Trashed-but-not-emptied entities' assets are NOT collected
- [ ] GC works for both IDB and OPFS storage locations

### Test Plan

- Unit: scanReferences finds asset IDs from annotation bodies
- Unit: scanReferences includes trashed entity refs in live set
- Unit: orphan detection correctly diffs stored vs live
- Adversarial: empty vault (no entities) → GC deletes all stored blobs
- Adversarial: concurrent ingest guard — GC during import doesn't delete the new asset

---

## V5: SQLite Worker Bootstrap

**Phase 4a — C1 (wa-sqlite foundation)**

### Affordances

| Place | Affordance | Type | Wires Out |
|-------|-----------|------|-----------|
| `shared/services/workers/sqliteWorker.ts` (new) | Web Worker: loads wa-sqlite + OPFSAdaptiveVFS, opens DB | Worker (new) | → main thread via postMessage |
| `shared/services/sqliteIndex.ts` (new) | Main-thread client: lazy Worker init, typed message protocol | class (new) | → sqliteWorker |
| `vite.config.ts` | Add `optimizeDeps.exclude: ['wa-sqlite']` | config change | — |

### Key Decision: OPFSAdaptiveVFS (not OPFSCoopSyncVFS)

`OPFSCoopSyncVFS` requires `SharedArrayBuffer` → requires COOP/COEP headers → **blocks all cross-origin resources without CORS**. This is too risky for a foundation slice.

`OPFSAdaptiveVFS` works without `SharedArrayBuffer`, no isolation headers needed, slightly slower writes but adequate for an index (not blob-heavy). Can upgrade to CoopSync later if COOP/COEP proves safe.

### Wiring

```
App startup (lazy)
  │
  ▼
sqliteIndex.init()  [first call triggers Worker creation]
  │
  ├── new Worker('./workers/sqliteWorker.ts', { type: 'module' })
  │
  ├── Worker loads wa-sqlite-async.wasm via ?url import
  │
  ├── Worker opens DB via OPFSAdaptiveVFS in /field-sqlite/
  │
  ├── Worker runs schema: CREATE TABLE IF NOT EXISTS assets(...)
  │
  └── Worker sends { type: 'ready' } → main thread
```

### File Scope

| File | Change |
|------|--------|
| `src/shared/services/workers/sqliteWorker.ts` (new) | Worker: wa-sqlite init, OPFSAdaptiveVFS, schema, message handler |
| `src/shared/services/sqliteIndex.ts` (new) | Main-thread client: lazy init, postMessage RPC |
| `vite.config.ts` | Add `optimizeDeps.exclude` |
| `tsconfig.worker.json` (new) | Worker-scoped TS config with `"lib": ["ES2022", "WebWorker"]` |
| `package.json` | Add `wa-sqlite` dependency |

### Demo Criteria

- [ ] App loads without errors (SQLite Worker initializes lazily)
- [ ] `sqliteIndex.query('SELECT 1')` returns `1` via postMessage round-trip
- [ ] OPFS directory `/field-sqlite/` contains DB file
- [ ] No COOP/COEP headers required (OPFSAdaptiveVFS)
- [ ] Vite dev + production build both work

### Test Plan

- Unit: Worker boots and responds to ping
- Unit: schema creation is idempotent (reload doesn't fail)
- Integration: `sqliteIndex.init()` → `query()` → response round-trip

---

## V6: SQLite Asset Index

**Phase 4b — C1 continued (wire index to storage path)**

### Affordances

| Place | Affordance | Type | Wires Out |
|-------|-----------|------|-----------|
| `shared/services/sqliteIndex.ts` | `trackAsset(hash, size, storage)` — INSERT into assets table | method (new) | → sqliteWorker |
| | `removeAsset(hash)` — DELETE from assets table | method (new) | → sqliteWorker |
| | `hasAsset(hash)` — SELECT existence check | method (new) | → sqliteWorker |
| | `getOrphanedAssets(liveRefs)` — SQL orphan query | method (new) | → sqliteWorker |
| `entities/manifest/model/builders/iiifBuilder.ts` | After storing blob, call `sqliteIndex.trackAsset()` | hook (modify) | → sqliteIndex |
| `shared/services/gc.ts` | Use `sqliteIndex.getOrphanedAssets()` instead of manual set-diff | swap (modify) | → sqliteIndex |

### Wiring

```
iiifBuilder.ts (ingest, after V1+V3 store)
  │
  ├── await storage.saveAsset(hash, blob)  [existing from V1/V3]
  └── await sqliteIndex.trackAsset(hash, blob.size, storage)  [NEW]

gc.collectOrphans()  [from V4, enhanced]
  │
  ├── OLD: scanReferences() + enumerateStorage() + manual diff
  └── NEW: sqliteIndex.getOrphanedAssets(liveRefs)
           → SELECT hash FROM assets WHERE hash NOT IN (?)
```

### File Scope

| File | Change |
|------|--------|
| `src/shared/services/sqliteIndex.ts` | Add trackAsset, removeAsset, hasAsset, getOrphanedAssets |
| `src/shared/services/workers/sqliteWorker.ts` | Handle new message types (track, remove, has, orphans) |
| `src/entities/manifest/model/builders/iiifBuilder.ts` | Call sqliteIndex.trackAsset after store |
| `src/shared/services/gc.ts` | Swap manual set-diff for sqliteIndex.getOrphanedAssets |

### Demo Criteria

- [ ] Import images → `SELECT count(*) FROM assets` matches stored blob count
- [ ] Delete + empty trash → asset row removed from SQLite
- [ ] GC uses SQL query instead of manual enumeration
- [ ] `hasAsset(hash)` returns correct results for dedup

### Test Plan

- Unit: trackAsset inserts row, hasAsset returns true
- Unit: removeAsset deletes row, hasAsset returns false
- Unit: getOrphanedAssets returns correct set
- Integration: full ingest → GC cycle uses SQLite throughout

---

## Dependency Graph

```
V1 (OPFS routing)
 ↓
V2 (export + _fileRef)  ←── depends on V1's getAsset()
 ↓
V3 (SHA-256 dedup)      ←── depends on V1's storage routing
 ↓
V4 (GC pipeline)        ←── depends on V3's hash keys for ref scanning
 │
 │   V5 (SQLite Worker)     ←── independent of V1-V4
 │    ↓
 │   V6 (SQLite index)      ←── depends on V5 + V3 (hash keys) + V4 (GC)
 │
 └──→ V6 swaps V4's manual GC for SQL GC
```

**Parallelizable:** V5 can start as soon as V1 is done (no dependency). V1-V4 are sequential. V6 depends on V4 + V5 both complete.

---

## R × V Fit Check

| Req | Requirement | V1 | V2 | V3 | V4 | V5 | V6 |
|-----|-------------|:--:|:--:|:--:|:--:|:--:|:--:|
| R4 | Large assets in OPFS | ✅ | ✅ | | | | |
| R2 | No duplicate bytes | | | ✅ | | | |
| R1 | Orphaned blobs reclaimed | | | | ✅ | | ✅ |

**V × R Criticality:**

| Slice | R count | R's served | Risk |
|-------|---------|------------|------|
| V1 | 1 | R4 | Foundation — all other slices need storage routing |
| V2 | 1 | R4 | Completes R4 — export + _fileRef cleanup |
| V3 | 1 | R2 | Self-contained — hash keying |
| V4 | 1 | R1 | Closes R1 — manual GC |
| V5 | 0 | (infra) | Foundation for V6 — no R directly served |
| V6 | 1 | R1 | Upgrades R1 — SQL GC replaces manual GC |

---

## Spike Findings (informing slice design)

### Key Migration Spike (S4: Asset ID References)

**Single choke point confirmed.** `buildAssetId()` at `iiifBuilder.ts:192` is private, has exactly one caller (line 265). The returned ID flows into:
1. `storage.saveAsset(id, blob)` — IDB key
2. `annotation.body[0].id` — encoded in tile URL `/tiles/{id}/...`
3. SW extracts ID from tile URL path segment — uses as raw IDB lookup key

**Greenfield simplification:** No dual-key needed. Replace `buildAssetId()` with SHA-256 hash directly. The tile URL becomes `/tiles/{sha256hex}/...` and the SW parses it identically.

### wa-sqlite + Vite Spike (S4: Integration Feasibility)

**Feasible with one key decision:**
- Vite config: add `optimizeDeps.exclude: ['wa-sqlite']` — only required change
- Worker pattern: `new Worker(new URL('./workers/sqliteWorker.ts', import.meta.url), { type: 'module' })` — idiomatic Vite
- OPFS coexistence: wa-sqlite uses `/field-sqlite/`, opfsStorage uses `/originals/` — no conflict
- Bundle: +~320KB gz, fully deferrable via lazy Worker init
- SW: zero changes — SW reads blobs from OPFS/IDB directly, never touches SQLite

**Critical decision: OPFSAdaptiveVFS over OPFSCoopSyncVFS** — avoids COOP/COEP header requirement that would block cross-origin resources. Can upgrade later if isolation proves safe.

No existing Web Workers in codebase. No WASM dependencies. Clean integration surface.
