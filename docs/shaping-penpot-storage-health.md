---
shaping: true
---

# Penpot as Code Shop — Wave 2: Storage Health

## Frame

### Source

> Study and compare the shape of Penpot's backend subsystems against field-studio.
> Use recommended opportunities as requirements. Spike the riskiest questions.

Penpot reference documents (8 files in `docs/penpot references/`) describe a mature
client-server architecture with 7 subsystems: entity hierarchy, storage pipeline, auth/RPC,
collaboration, background tasks, file operations, serialization.

### Problem

Field-studio's storage layer has four gaps that Penpot solves with mature infrastructure:

1. **Orphaned blobs**: `emptyTrash()` removes vault entities but never cleans IDB/OPFS blobs. No mechanism to identify or collect orphans.
2. **No deduplication**: Importing the same image into multiple manifests stores duplicate bytes. No content-addressing.
3. **OPFS unwired**: `opfsStorage.ts` is fully implemented but has zero callers. All blobs go to IDB regardless of size. Service worker reads OPFS-first but nothing writes there.
4. **Single-blob persistence**: `storage.saveProject()` serializes the entire vault as one JSON blob. Every save re-serializes everything. No incremental/fragment model.

### Outcome

A storage layer that: cleans up after itself (GC), avoids duplicate bytes (dedup),
routes large files efficiently (OPFS), and can be incrementally improved toward
fragment-based persistence.

### Appetite

3-4 sessions across 4 phases. Phase 1 (OPFS wiring) is the beachhead — lowest risk,
highest immediate value. Phases 2-4 build on it.

### Greenfield Constraint

No existing user data to migrate. This eliminates: dual-key support, slug→hash migration
passes, backward-compatible IDB reads, shadow index bootstrapping. SHA-256 keys and SQLite
can be primary from day 1 for their respective phases.

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | Vault state can be partitioned into independently-loadable fragments without breaking cross-entity references | Deferred |
| R1 | Orphaned storage blobs (IDB files, OPFS, derivatives) are identified and reclaimed after trash is emptied | Must-have |
| R2 | Importing the same image file into multiple manifests does not store duplicate bytes | Must-have |
| R3 | Auto-save only re-serializes entities that changed since last save, not the entire vault | Deferred (depends on R0) |
| R4 | Large binary assets (>10MB) are stored in OPFS with transparent fallback, and all read paths (SW, export, viewer) can retrieve them | Must-have |
| R5 | Users can restore a previous version of a manifest from a local snapshot history | Deferred |

### R Quality Validation

| R | Text | Sub? | Mech? | Taut? | Verdict |
|---|------|:----:|:-----:|:-----:|---------|
| R0 | Vault state partitioned into fragments | ✅ | ✅ | ✅ | PASS (deferred) |
| R1 | Orphaned blobs identified and reclaimed | ✅ | ✅ | ✅ | PASS |
| R2 | Same image doesn't store duplicate bytes | ✅ | ✅ | ✅ | PASS |
| R3 | Auto-save only re-serializes changed entities | ✅ | ✅ | ✅ | PASS (deferred) |
| R4 | Large assets in OPFS with transparent fallback | ✅ | ✅ | ✅ | PASS |
| R5 | Restore previous version from local snapshots | ✅ | ✅ | ✅ | PASS (deferred) |

---

## Interrelationship Map

| Subsystem A | Subsystem B | Relationship | Implication |
|-------------|-------------|:------------:|-------------|
| R0 Fragment storage | R3 Dirty tracking | COUPLED | R3 depends on R0's fragment model |
| R0 Fragment storage | R5 Snapshots | SEQUENTIAL | Fragments enable efficient snapshots |
| R1 GC pipeline | R2 Dedup | SEQUENTIAL | Dedup changes storage keys → GC must understand content-addressed keys |
| R1 GC pipeline | R4 OPFS tiering | SEQUENTIAL | GC must scan both IDB and OPFS |
| R2 Dedup | R4 OPFS tiering | ORTHOGONAL | Independent — different concerns |
| R4 OPFS tiering | R0 Fragment storage | ORTHOGONAL | OPFS is for blobs; fragments are for vault JSON |

**Build implication:** R4 is independent (start here). R2 is independent. R1 depends on knowing where blobs live (R4) and how they're keyed (R2). R0+R3+R5 are coupled and deferred.

---

## Fit Check: R × CURRENT

| Req | Requirement | Status | CURRENT |
|-----|-------------|--------|:-------:|
| R1 | Orphaned blobs identified and reclaimed | Must-have | ❌ |
| R2 | Same image doesn't store duplicate bytes | Must-have | ❌ |
| R4 | Large assets in OPFS with transparent fallback | Must-have | ❌ |

**S × R Profile:**
- CURRENT (0/3): Covers nothing. All 3 active R's are gaps.

**Notes:**
- CURRENT fails R1: `emptyTrash()` at `trash.ts:231-262` removes vault entities, does zero asset cleanup from IDB/OPFS
- CURRENT fails R2: `buildAssetId()` at `iiifBuilder.ts:192` generates `{manifest-slug}-{filename}` — no content hash
- CURRENT fails R4: `opfsStorage.ts` is fully implemented but has zero callers; `storage.saveAsset()` always writes to IDB; export's `storage.getAsset()` only checks IDB

---

## Spike Findings

### S2: Tiered Storage (OPFS Wiring) — serves R4

**Verdict: LOW risk. Clear insertion point. One mandatory fix.**

Key findings:
- **Write path**: User action → `iiifBuilder.ts:269` calls `storage.saveAsset(id, blob)` → IDB. OPFS branch inserts here: `if (blob.size > threshold) opfsStorage.storeFile(id, blob) else storage.saveAsset(id, blob)`
- **Read path (SW)**: `getFileBlob()` at `sw.js:318` already checks OPFS-first → IDB-fallback. No SW changes needed for happy path.
- **1-second timeout race**: `getFromOPFS()` at `sw.js:786-805` uses `Promise.race` with 1-second timer. On timeout, falls back to IDB silently. This is manageable — OPFS reads are typically <50ms.
- **`_fileRef` bug (mx-c64077)**: `IIIFItem._fileRef` is a `File` handle that doesn't survive JSON serialization. After page reload, `_fileRef` is undefined. Export at `exportService.ts:384-393` silently skips these assets. **Pre-existing bug, independent of OPFS work, but should be fixed in this phase.**
- **Export gap**: `staticSiteExporter.ts:425` calls `storage.getAsset(imageId)` — IDB only. Must add OPFS fallback.
- **SW write access**: Main thread writes OPFS, SW reads OPFS. No coordination needed — OPFS supports concurrent readers.
- **`derivatives` store**: Empty phantom schema in SW. No assets stored there. Can be ignored for now.

Full spike: `docs/spike-tiered-storage.md`

### S3: GC Pipeline & Deduplication — serves R1, R2

**Verdict: Feasible. Well-scoped. Clean repair.**

Key findings:
- **Reference chain**: Annotation body → `IIIFItem.body[].id` → asset ID → IDB `files` store key. The key IS the asset ID (no transformation). `_blobUrl` is a derived object URL, not a storage reference.
- **Trashed entities**: `TrashedEntity` at `types/index.ts:317-323` holds a full entity snapshot. Trashed-but-not-emptied entities still reference assets — GC must exclude these.
- **Key enumeration**: IDB `getAllKeys()` on `files` store returns all keys without loading blobs. `opfsStorage.listFiles()` lists OPFS keys. Both are O(keys), not O(bytes).
- **GC algorithm**: (1) Scan all vault entities + trashed entities for asset references, (2) `getAllKeys()` from IDB + OPFS, (3) diff → orphan set, (4) delete orphans. Safe as long as GC doesn't run during active ingest.
- **Client-side hashing**: `crypto.subtle.digest('SHA-256')` — native, async, ~200ms for 50MB. Fast enough for ingest-time dedup without blocking UI.
- **Live references outside vault**: Object URLs (`_blobUrl`) hold blob refs but are revocable. SW tile cache holds derived tiles, not source blobs. No other live references.
- **Multi-manifest scanning**: All manifests in same IDB database share the `files` store. GC must scan ALL manifests' vault states, not just the active one.

Full spike: `docs/spike-gc-pipeline.md`

### S1: Fragment Storage — serves R0, R5

**Verdict: HIGH complexity. 4 structural blockers. DEFERRED.**

Key findings:
- **Blocker 1**: `normalize()` at `normalization.ts:79-86` always starts from `createEmptyState()`. No partial/incremental load path exists.
- **Blocker 2**: `references` and `reverseRefs` are cross-cutting maps — any entity can reference any other. Not fragmentable without a shared index.
- **Blocker 3**: 8+ fragmentation-hostile call sites need all canvases simultaneously (Archive grid, Map, Timeline, Export, Staging merge, ViewRouter, Viewer facing-pages).
- **Blocker 4**: JSON patches in ActionHistory use 3-segment paths (`/entities/{Type}/{id}`) — `references`/`reverseRefs` diffed as atomic top-level objects. Any mutation replaces the entire map.
- **`vault.export()` call sites**: 8 total. Two are hot reactive paths: `StagingWorkbench:66` and `ExportDialog:72` both use `$derived(vault.export())`.

Full spike: `docs/spike-fragment-storage.md`

---

## Revised Build Sequence

Original risk-first sequence (R0+R5 → R4 → R2 → R1) was **inverted** by spike findings:

| Phase | R's | Work | Risk | Why this order |
|-------|-----|------|------|----------------|
| **Phase 1** | R4 | OPFS wiring + `_fileRef` fix | LOW | Clear insertion point, zero blockers, enables Phase 3 |
| **Phase 2** | R2 | Content-addressable dedup (SHA-256 on ingest) | LOW-MED | Independent, changes key scheme |
| **Phase 3** | R1 | GC pipeline (scan vault → diff storage → delete orphans) | MED | Must understand both IDB + OPFS storage locations |
| **Phase 4** | R0, R3, R5 | Fragment storage model | HIGH | 4 structural blockers — requires vault architecture changes |

---

## Shape A: CURRENT State

| Part | Mechanism | Status |
|------|-----------|--------|
| **A1** | `storage.saveAsset(id, blob)` → all blobs to IDB `files` store regardless of size | Working but wasteful |
| **A2** | `opfsStorage.ts` — full OPFS class, zero callers | Dead code |
| **A3** | `emptyTrash()` — removes vault entities, no asset cleanup | Working but leaks blobs |
| **A4** | `buildAssetId()` — `{manifest-slug}-{filename}`, no content hash | Working but allows duplicates |
| **A5** | `storage.saveProject(vault.export())` — single JSON blob, full re-serialize every save | Working but O(n) on every save |

---

## Shape B: Penpot-Inspired Storage Health

| Part | Mechanism | Phase | Flag |
|------|-----------|:-----:|:----:|
| **B1** | Size-gated OPFS routing: `iiifBuilder.ts` branches on `blob.size > 10MB` → `opfsStorage.storeFile()` | 1 | |
| **B2** | Unified `getAsset()`: storage method checks OPFS then IDB (mirrors SW's `getFileBlob()`) | 1 | |
| **B3** | `_fileRef` lifecycle fix: stop persisting `File` handles in vault state; derive from storage on demand | 1 | |
| **B4** | Export path fix: `staticSiteExporter.ts` + `exportService.ts` use unified `getAsset()` | 1 | |
| **B5** | Ingest-time SHA-256: `crypto.subtle.digest()` on blob → content hash as storage key | 2 | |
| **B6** | Dedup check: before storing, check if hash-key already exists in IDB/OPFS; skip if present | 2 | |
| **B7** | ~~Reference rewriting~~ — greenfield: hash keys from day 1, no rewriting needed | — | |
| **B8** | Reference scanner: walk all vault entities + trashed entities → collect referenced asset IDs | 3 | |
| **B9** | Orphan detector: `getAllKeys()` from IDB files + `opfsStorage.listFiles()` → diff against scanner output | 3 | |
| **B10** | GC executor: delete orphaned blobs from IDB + OPFS; guard against concurrent ingest | 3 | |

### Fit Check: R × B

| Req | Requirement | Status | CURRENT | B |
|-----|-------------|--------|:-------:|:-:|
| R1 | Orphaned blobs identified and reclaimed | Must-have | ❌ | ✅ |
| R2 | Same image doesn't store duplicate bytes | Must-have | ❌ | ✅ |
| R4 | Large assets in OPFS with transparent fallback | Must-have | ❌ | ✅ |

**S × R Profile:**
- CURRENT (0/3): Baseline. All R's are gaps.
- B (3/3): Closes all gaps. Additive — extends CURRENT, loses nothing.

**Notes:**
- B satisfies R1 via B8+B9+B10 (reference scanner + orphan detector + GC executor)
- B satisfies R2 via B5+B6+B7 (SHA-256 hash + dedup check + reference rewrite)
- B satisfies R4 via B1+B2+B3+B4 (OPFS routing + unified getAsset + _fileRef fix + export fix)

---

## Detail B: Phase 1 — OPFS Wiring (R4)

### Parts

| Part | Mechanism | Approach | Files |
|------|-----------|----------|-------|
| **B1** | Size-gated OPFS routing | REPAIR | `iiifBuilder.ts` (insertion at line 269) |
| **B2** | Unified `getAsset()` | REPAIR | `storage.ts` (add method checking OPFS → IDB) |
| **B3** | `_fileRef` lifecycle fix | REPAIR | `types/index.ts` (remove `_fileRef`), `exportService.ts`, consumers |
| **B4** | Export path fix | REPAIR | `staticSiteExporter.ts:425`, `exportService.ts:384-393` |

### Wiring

```
User drops image
       │
       ▼
iiifBuilder.ts:269
  saveAsset(id, blob)
       │
       ├── blob.size > 10MB ──→ opfsStorage.storeFile(id, blob)
       │                              │
       └── blob.size ≤ 10MB ──→ storage.saveAsset(id, blob) [IDB]
                                      │
                                      ▼
                              Both paths: asset ID in vault entity
                                      │
       ┌──────────────────────────────┤
       ▼                              ▼
  SW getFileBlob()              storage.getAsset(id)  [NEW unified]
  (OPFS → IDB fallback)        (OPFS → IDB fallback)
       │                              │
       ▼                              ▼
  Tile serving                  Export / Viewer
```

### Demo Criteria

- Import a 15MB image → verify it lands in OPFS (not IDB)
- Import a 5MB image → verify it lands in IDB (not OPFS)
- Reload page → both images still display in viewer
- Export manifest → both images included in export bundle
- `_fileRef` is no longer in serialized vault state

---

## Detail B: Phase 2 — Content-Addressable Dedup (R2)

### Parts

| Part | Mechanism | Approach | Files |
|------|-----------|----------|-------|
| **B5** | SHA-256 on ingest | REPAIR | `iiifBuilder.ts` (hash before save) |
| **B6** | Dedup check | NEW CHASSIS | `storage.ts` or new `dedupStorage.ts` |
| **B7** | Reference rewriting | REPAIR | `iiifBuilder.ts`, vault entity asset ID fields |

### Wiring

```
User drops image
       │
       ▼
iiifBuilder.ts
  const hash = await crypto.subtle.digest('SHA-256', blob)
  const key = hexEncode(hash)
       │
       ├── storage.hasAsset(key)? ──→ skip store, reuse key
       │
       └── new asset ──→ B1 routing (OPFS/IDB by size)
                              │
                              ▼
                     Stored under content-hash key
                              │
                              ▼
                     Vault entity references hash key
```

### Demo Criteria

- Import same image into two different canvases → only one blob in storage
- `getAllKeys()` on IDB files store shows hash-based keys
- Both canvases display the image correctly
- Delete one canvas → image still serves from remaining reference

---

## Detail B: Phase 3 — GC Pipeline (R1)

### Parts

| Part | Mechanism | Approach | Files |
|------|-----------|----------|-------|
| **B8** | Reference scanner | NEW CHASSIS | New `gcScanner.ts` in `shared/services/` |
| **B9** | Orphan detector | NEW CHASSIS | New `gcDetector.ts` or method in `gcScanner.ts` |
| **B10** | GC executor | NEW CHASSIS | New `gc.ts` in `shared/services/` |

### Wiring

```
User empties trash
       │
       ▼
emptyTrash() [existing — removes vault entities]
       │
       ▼
gc.collect()  [NEW — triggered after emptyTrash]
       │
       ├── scanReferences(allVaultStates, trashedEntities)
       │     → Set<assetId> of live references
       │
       ├── enumerateStorage()
       │     → getAllKeys() from IDB files
       │     → opfsStorage.listFiles()
       │     → Set<assetId> of stored blobs
       │
       ├── orphans = stored - live
       │
       └── deleteOrphans(orphans)
             → IDB: delete each key from files store
             → OPFS: opfsStorage.deleteFile(key)
             → SW: postMessage to invalidate tile cache entries
```

### Demo Criteria

- Import image, delete canvas, empty trash → blob removed from IDB/OPFS
- Import same image in two canvases, delete one, empty trash → blob NOT removed (still referenced)
- GC doesn't delete blobs for trashed-but-not-emptied entities
- GC handles both IDB and OPFS storage locations

---

## Shape C: SQLite-WASM Storage Substrate

**Premise:** Replace IDB key-value stores with SQLite-WASM (via `wa-sqlite`) backed by OPFS. SQLite manages all structured data (vault state, asset index, refs, trash). Raw files (OPFS for large, IDB for small) store binary blobs. Service worker reads blobs directly — never touches SQLite.

**Architecture: "SQLite as brain, OPFS/IDB as muscles"**

| Part | Mechanism | Phase | Flag |
|------|-----------|:-----:|:----:|
| **C1** | Web Worker + wa-sqlite + OPFSCoopSyncVFS — dedicated Worker hosts SQLite, main thread sends queries via postMessage | 0 | |
| **C2** | ~~Shadow index~~ — greenfield: SQLite is primary asset index from day 1, no IDB mirroring | — | |
| **C3** | Size-gated OPFS blob routing (same as B1) — blobs stay outside SQLite | 1 | |
| **C4** | Unified `getAsset()` (same as B2) — storage checks OPFS → IDB | 1 | |
| **C5** | `_fileRef` lifecycle fix (same as B3) — stop persisting File handles | 1 | |
| **C6** | Export path fix (same as B4) — use unified `getAsset()` | 1 | |
| **C7** | Content-hash keying — `assets(hash TEXT PRIMARY KEY, size INT, storage TEXT)` with SHA-256 on ingest | 2 | |
| **C8** | Dedup via UNIQUE constraint — `INSERT OR IGNORE INTO assets` skips duplicates | 2 | |
| **C9** | SQL-based GC — `DELETE FROM assets WHERE hash NOT IN (SELECT asset_hash FROM entity_assets UNION SELECT asset_hash FROM trashed_assets)` + delete orphan blobs | 3 | |
| **C10** | Vault state in SQLite — `manifests`, `canvases`, `annotations` tables replace IDB `root` blob | 4 | ⚠️ |
| **C11** | Per-canvas dirty tracking — `UPDATE canvases SET dirty = 1` on mutation, save only dirty rows | 4 | ⚠️ |
| **C12** | Vault adapter — NormalizedState ↔ SQLite rows bidirectional mapping for action handlers | 4 | ⚠️ |

### Fit Check: R × C (SQLite-WASM)

| Req | Requirement | Status | CURRENT | B | C |
|-----|-------------|--------|:-------:|:-:|:-:|
| R0 | Vault partitioned into fragments | Deferred | ❌ | ❌ | ❌ |
| R1 | Orphaned blobs reclaimed | Must-have | ❌ | ✅ | ✅ |
| R2 | No duplicate bytes | Must-have | ❌ | ✅ | ✅ |
| R3 | Incremental save | Deferred | ❌ | ❌ | ❌ |
| R4 | Large assets in OPFS | Must-have | ❌ | ✅ | ✅ |
| R5 | Restore from snapshots | Deferred | ❌ | ❌ | ❌ |

**Notes:**
- C fails R0: C10+C11+C12 are all ⚠️ flagged — vault adapter (blocker 4 from S1 spike) unresolved
- C fails R3: Depends on R0's fragment model (C10+C11)
- C fails R5: Snapshot mechanism not yet designed (SQLite backup API is promising but unproven in browser)
- C matches B on active R's (R1, R2, R4) — identical pass/fail for must-haves

**S × R Profile:**
- CURRENT (0/3 active): Baseline. All gaps.
- B (3/3 active): Closes all must-have gaps via targeted repairs.
- C (3/3 active): Closes same must-have gaps, but via SQLite infrastructure. Deferred R's remain ❌ due to ⚠️ flags on C10-C12.

### B vs C: Shape Comparison

| Dimension | B (Targeted Repairs) | C (SQLite Substrate) |
|-----------|---------------------|---------------------|
| **Active R coverage** | 3/3 (R1, R2, R4) | 3/3 (R1, R2, R4) |
| **Deferred R trajectory** | R0 still has 4 blockers | R0 drops to 1 blocker + adapter ⚠️ |
| **Bundle cost** | 0 KB — uses existing APIs | ~800KB (WASM + JS wrapper) |
| **New dependencies** | None | wa-sqlite (single maintainer) |
| **Complexity** | Low — repairs at known insertion points | Med — Web Worker, message protocol, schema |
| **SW compatibility** | No change — SW reads OPFS/IDB directly | No change — blob-outside pattern identical |
| **GC mechanism** | Manual set-diff (B8-B10) | SQL query (C9) — transactional, simpler |
| **Migration risk** | Incremental — each phase is independent | Phase 0-3 incremental, Phase 4 is structural |
| **Debugging** | IDB inspector in DevTools | OPFS files less inspectable |
| **Phase 1-3 difference** | Minimal — same blob routing + dedup | Adds Worker + SQLite init overhead |
| **Phase 4 difference** | Not attempted (deferred) | Enables fragment model (C10-C12) but ⚠️ |

### Decision Framework

**If appetite is 3-4 sessions (active R's only):** B wins. Same coverage, zero new dependencies, lower complexity. SQLite adds overhead for no additional must-have coverage.

**If appetite extends to deferred R's (R0, R3, R5):** C is the better foundation. SQLite's relational model makes fragments (R0), dirty tracking (R3), and snapshots (R5) architecturally natural instead of fighting the vault's single-blob design. But C10-C12 remain ⚠️ and need a dedicated spike on the vault adapter.

**Hybrid option (B now, C later):** B's Phase 1-3 work (blob routing, dedup, GC) is **not wasted** if C is adopted later. C's blob-outside architecture uses the exact same OPFS/IDB blob stores. B's SHA-256 keying carries forward. Only B8-B10 (manual GC) gets replaced by C9 (SQL GC). Cost of B-then-C ≈ cost of C alone + ~1 session of throwaway GC code.

Full spike: `docs/spike-sqlite-wasm.md`

---

## Selected Shape: B + C Foundation (Hybrid)

**Decision:** B1-B10 (targeted repairs) + C1-C2 (SQLite Worker + shadow index) as foundation.

**Composition:** Phases 1-3 are pure Shape B. Phase 4 introduces C1+C2 as a non-destructive beachhead — SQLite mirrors IDB as a read-only index, proving the Worker + query path before anything migrates. B's blob routing, SHA-256 keying, and unified `getAsset()` carry forward unchanged into C.

**Rationale:**
- B closes all 3 must-have gaps (R1, R2, R4) with zero new dependencies
- C1+C2 are zero-risk (read-only shadow, no migration, IDB remains source of truth)
- Once C1+C2 prove the Worker + SQLite path, C9 (SQL GC) can replace B8-B10 (manual GC) — ~1 session swap
- C10-C12 (vault in SQLite) unlocked for a future cycle with the infra already running

**What gets thrown away:** B8-B10 (manual set-diff GC) — ~1 session of code, replaced by C9 once SQLite is proven. Everything else carries forward.

### Selected Fit Check: R × B+C Foundation

| Req | Requirement | Status | B+C |
|-----|-------------|--------|:---:|
| R1 | Orphaned blobs reclaimed | Must-have | ✅ |
| R2 | No duplicate bytes | Must-have | ✅ |
| R4 | Large assets in OPFS | Must-have | ✅ |
| R0 | Vault partitioned into fragments | Deferred | ❌ (foundation laid) |
| R3 | Incremental save | Deferred | ❌ (foundation laid) |
| R5 | Restore from snapshots | Deferred | ❌ (foundation laid) |

### Build Sequence

| Phase | Parts | R's | Work | Risk | Session |
|-------|-------|-----|------|------|:-------:|
| **1** | B1-B4 | R4 | OPFS wiring + `_fileRef` fix + export fix | LOW | 1 |
| **2** | B5-B7 | R2 | SHA-256 on ingest + dedup check + ref rewrite | LOW-MED | 1 |
| **3** | B8-B10 | R1 | Reference scanner + orphan detector + GC executor | MED | 1 |
| **4** | C1-C2 | — | Web Worker + wa-sqlite + shadow index (read-only mirror) | LOW | 1 |

**Phase 4 demo criteria:**
- SQLite Worker initializes during app load (non-blocking)
- `assets` table mirrors IDB `files` store keys + sizes
- `SELECT count(*) FROM assets` returns correct count
- Shadow index rebuilds on page reload from IDB source of truth
- No user-visible behavior changes — pure infrastructure

**After Phase 4, unlocked (future cycles):**
- C9: Replace B8-B10 GC with SQL query (~1 session swap)
- C10-C12: Vault state migration to SQLite (needs vault adapter spike)
- R5: Snapshot mechanism via SQLite backup API

---

## Open Questions

1. **SW tile cache invalidation**: After GC deletes a source blob, should we proactively purge derived tiles from `iiif-tile-cache-v3`? Or let the LRU naturally evict them?
2. **Multi-manifest GC**: If multiple manifests share an IDB database, GC must scan all of them. Current `storage.saveProject()` uses a single `'root'` key — is there ever more than one manifest per database?
3. ~~**Migration path for Phase 2**~~: Greenfield — not applicable.
4. **COOP/COEP headers (Phase 4)**: `OPFSCoopSyncVFS` requires `SharedArrayBuffer`, which requires cross-origin isolation headers (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`). This blocks ALL cross-origin resources without CORS headers (fonts, CDN images, external IIIF manifests). Alternative: use `OPFSAdaptiveVFS` (no SharedArrayBuffer needed, slightly slower) to avoid the isolation requirement.
5. **Vault adapter feasibility (C10-C12)**: If pursuing Shape C Phase 4, the NormalizedState ↔ SQLite adapter needs its own spike. Key question: can `vault.dispatch(action)` round-trip through a Web Worker fast enough (<10ms) for reactive UI?
6. **wa-sqlite maintenance risk**: Single maintainer (Roy Hashimoto). If the project goes dormant, can we fall back to official `@sqlite.org/sqlite-wasm` without rewriting VFS-dependent code?
