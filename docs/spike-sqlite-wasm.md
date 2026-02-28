---
shaping: true
---

## R0-R5 Spike: SQLite-WASM as Storage Backend

### Context
Field-studio uses IDB key-value stores for vault JSON and asset blobs, plus an unwired OPFS class. Shape B (Penpot-Inspired Storage Health) addresses R1/R2/R4 with targeted repairs, but R0 (fragment storage), R3 (incremental save), and R5 (snapshots) remain deferred due to 4 structural blockers in the vault normalization layer. SQLite-WASM backed by OPFS could bypass those blockers entirely — relational storage naturally supports fragments, dirty tracking, orphan detection, and snapshots.

### Goal
Determine whether SQLite-WASM is a viable storage substrate for field-studio, what it would replace, what it can't replace, and whether it changes the risk profile of deferred requirements.

### Questions

| # | Question |
|---|----------|
| **S4-Q1** | Which SQLite-WASM library fits? Compare official `@sqlite.org/sqlite-wasm` vs `wa-sqlite` (Roy Hashimoto) on: OPFS VFS options, service worker compatibility, bundle size, browser support, maintenance trajectory. |
| **S4-Q2** | Can the service worker read from a SQLite-WASM database? `createSyncAccessHandle` is unavailable in SWs. `OPFSAnyContextVFS` (wa-sqlite) works in any context but is slower. What's the read latency for the SW tile-serving hot path? |
| **S4-Q3** | Should large blobs (images) go INTO SQLite BLOBs or stay as raw OPFS/IDB files with SQLite holding only the index? What are the perf tradeoffs for 10-50MB images? |
| **S4-Q4** | How does SQLite-WASM change the GC story (R1)? Can orphan detection become `SELECT key FROM assets WHERE key NOT IN (SELECT asset_ref FROM entities)` instead of manual set-diff? |
| **S4-Q5** | How does SQLite-WASM change the fragment story (R0)? Can vault state be partitioned into per-canvas tables/rows with lazy `SELECT` instead of full `normalize()` load? Does this bypass the 4 structural blockers? |
| **S4-Q6** | What is the migration path from current IDB stores to SQLite-WASM? Can it be incremental (SQLite alongside IDB, migrate per-store) or must it be big-bang? |
| **S4-Q7** | What is the bundle size and initialization cost? Field-studio currently loads in <2s — would SQLite-WASM add perceptible startup latency? |

### Answers

#### S4-Q1: Library Comparison

| Criterion | Official `@sqlite.org/sqlite-wasm` | `wa-sqlite` (Hashimoto) |
|-----------|-------------------------------------|-------------------------|
| OPFS VFS | OPFS SyncAccessHandle (Worker only) | 6+ VFS options including OPFSCoopSyncVFS, OPFSAnyContextVFS, IDBBatchAtomicVFS |
| SW compat | No — requires dedicated Worker | OPFSAnyContextVFS works in SW (slow writes, OK reads) |
| Bundle | 602KB (barebones wasm) – 3.5MB (full) | Similar WASM core, more JS overhead for VFS |
| Browser | Chrome 102+, Firefox 111+, Safari 16.4+ | Same OPFS support + IDB fallback for older browsers |
| Maintenance | SQLite team (high confidence) | Single maintainer (active, but bus-factor risk) |
| Insert perf | Good with OPFS SyncAccessHandle | 2-3x faster inserts with IDBBatchAtomicVFS |

**Verdict:** `wa-sqlite` is more flexible (more VFS options, SW-compatible via OPFSAnyContextVFS, IDB fallback). Official build is more conservative. For field-studio's use case (needs SW reads + OPFS backing), wa-sqlite's VFS diversity is the deciding factor.

#### S4-Q2: Service Worker Access

**Critical constraint:** `createSyncAccessHandle` is NOT available in service workers. This means:

- Standard OPFS-backed SQLite VFS (OPFSCoopSyncVFS) **cannot run in the SW**
- `OPFSAnyContextVFS` CAN run in the SW, but:
  - Uses `FileSystemWritableFileStream` (not supported in Safari/Android Chrome for writes)
  - Read performance is "somewhat slower" than dedicated Worker VFS
  - Write performance is "much slower and increasingly slower for larger files"

**Architecture implication:** SQLite-WASM must run in a **dedicated Web Worker** on the main thread side. The service worker cannot directly query SQLite. Two patterns:

1. **Blob-outside pattern**: Blobs stay in raw OPFS files (current SW read path unchanged). SQLite holds metadata/indexes only. SW reads blobs from OPFS directly, never touches SQLite.
2. **Message-relay pattern**: SW posts message to main thread Worker, which queries SQLite and returns result. Adds latency to every tile request — unacceptable for the IIIF hot path.

**Verdict:** Pattern 1 (blob-outside) is the only viable architecture. SQLite manages vault state + asset index, raw OPFS/IDB files hold the actual bytes. The SW tile-serving path is **unchanged** — it continues reading blobs from OPFS/IDB directly.

#### S4-Q3: Blobs Inside vs Outside SQLite

**Inside SQLite (BLOBs):**
- SQLite can handle BLOBs but performance degrades with large objects
- A 50MB BLOB requires reading through the WASM boundary — significant overhead
- Database file size grows with blobs, making WAL checkpoints slow
- Backup/snapshot includes all binary data (large)

**Outside SQLite (raw files):**
- Blobs stay in OPFS (large) / IDB (small) — current architecture preserved
- SQLite stores: `assets(hash TEXT PRIMARY KEY, size INTEGER, opfs BOOLEAN, created_at INTEGER)`
- SW reads blobs directly from OPFS/IDB — no SQLite in hot path
- GC queries SQLite for orphan detection, deletes from OPFS/IDB

**Verdict:** Blob-outside is strictly better for field-studio. SQLite is an **index + state store**, not a blob store. This aligns perfectly with the existing SW architecture.

#### S4-Q4: GC with SQLite (R1)

Current Shape B approach: manual set-diff (scan vault entities → collect refs → diff against storage keys → delete orphans).

With SQLite:
```sql
-- All stored blobs
SELECT hash FROM assets;

-- All referenced blobs (across all manifests)
SELECT DISTINCT asset_hash FROM entity_assets;

-- Orphans in one query
SELECT hash FROM assets
WHERE hash NOT IN (SELECT DISTINCT asset_hash FROM entity_assets)
AND hash NOT IN (SELECT DISTINCT asset_hash FROM trashed_entity_assets);
```

**Advantages:**
- Atomic — no race between scan and delete (transaction wraps both)
- Multi-manifest safe — SQL naturally queries across all data
- Extensible — add `last_accessed` column for LRU-based eviction
- Auditable — `EXPLAIN QUERY PLAN` shows exactly what's scanned

**Verdict:** SQLite makes GC dramatically simpler and safer. The manual set-diff approach (B8+B9+B10) is replaced by SQL queries with transactional guarantees.

#### S4-Q5: Fragment Storage with SQLite (R0)

Current blockers for R0 (fragment storage):
1. `normalize()` always starts from empty state — **bypassed**: load rows from SQLite, not a JSON blob
2. `references`/`reverseRefs` are cross-cutting — **bypassed**: SQL JOINs across tables replace in-memory maps
3. 8+ call sites need all canvases — **partially bypassed**: lazy SELECT per call site, but still need canvas data
4. JSON patches use 3-segment paths — **still a blocker**: undo/redo would need a different diff mechanism

**Schema sketch:**
```sql
CREATE TABLE manifests (id TEXT PRIMARY KEY, data JSON);
CREATE TABLE canvases (id TEXT PRIMARY KEY, manifest_id TEXT, data JSON, dirty BOOLEAN DEFAULT 0);
CREATE TABLE annotations (id TEXT PRIMARY KEY, canvas_id TEXT, data JSON);
CREATE TABLE entity_assets (entity_id TEXT, asset_hash TEXT);  -- reference index
CREATE TABLE assets (hash TEXT PRIMARY KEY, size INTEGER, storage TEXT);  -- 'opfs' | 'idb'
```

**What this enables:**
- Load manifest index without all canvases (`SELECT id, label FROM canvases WHERE manifest_id = ?`)
- Load single canvas on navigation (`SELECT * FROM canvases WHERE id = ?`)
- Dirty tracking per canvas (`UPDATE canvases SET dirty = 1 WHERE id = ?`)
- Save only dirty canvases (`SELECT * FROM canvases WHERE dirty = 1`)

**What it doesn't fix:**
- Vault's `normalize()` and action handlers expect `NormalizedState` in-memory — would need an adapter layer
- JSON patches for undo/redo still need rethinking
- 8+ call sites that iterate all canvases still load them (but via lazy SELECT, not monolithic parse)

**Verdict:** SQLite significantly reduces the R0 pain (3 of 4 blockers bypassed) but doesn't eliminate the vault adapter and undo/redo challenges. Changes R0 from "4 structural blockers" to "1 structural blocker + 1 adapter layer."

#### S4-Q6: Migration Path

**Greenfield — no existing user data to migrate.** This eliminates:
- Dual-key support (slug + hash)
- Lazy/eager migration passes
- Backward-compatible IDB reads
- Shadow index bootstrapping from existing IDB

SQLite can be the **primary store from day 1** for new projects. The only migration concern is the codebase itself (swapping IDB calls for SQLite queries), not user data.

#### S4-Q7: Bundle Size and Initialization

| Component | Size | Impact |
|-----------|------|--------|
| WASM binary (barebones) | ~600KB | One-time download, cached by SW |
| JS wrapper | ~190KB (minified) | Bundled with app |
| Initialization | ~500ms | Must happen in Web Worker, non-blocking |
| Total budget impact | ~800KB compressed | Adds ~200ms to cold start (gzipped transfer) |

**Current field-studio cold start:** <2s. Adding ~200ms transfer + ~500ms Worker init = ~700ms additional. Can be mitigated:
- Pre-cache WASM binary in service worker install event
- Initialize SQLite Worker during app load (parallel with DOM render)
- Lazy-init: don't start SQLite until first storage operation

**Verdict:** Manageable. The WASM binary is cacheable. Worker initialization is off-main-thread. Perceived startup impact should be <200ms after first visit.

### Known Unknowns

| ID | Unknown | Impact | How to Resolve |
|----|---------|--------|----------------|
| S4-KU1 | Whether wa-sqlite's OPFSCoopSyncVFS handles concurrent reads from SW + writes from Worker | If not, need SharedArrayBuffer or message-relay | **RESOLVED**: Blob-outside pattern — SW reads OPFS directly, never touches SQLite. No conflict. |
| S4-KU2 | Whether Safari supports wa-sqlite IDBBatchAtomicVFS as fallback when OPFS is unavailable | Safari OPFS support is newer — need fallback | Test Safari 16.4+ |
| S4-KU3 | Whether the vault adapter layer (NormalizedState ↔ SQLite rows) adds enough latency to break reactive UI updates | If vault.dispatch() must round-trip through Web Worker, could add 5-10ms per action | Deferred — vault-in-SQLite (C10-C12) is future cycle |
| S4-KU4 | Whether Vite bundles WASM correctly or needs special config | WASM imports may need `?url` or copy plugin | **RESOLVED**: `?url` suffix works, add `optimizeDeps.exclude: ['wa-sqlite']`. No plugin needed. |
| S4-KU5 | OPFSCoopSyncVFS requires COOP/COEP headers (SharedArrayBuffer) | Blocks ALL cross-origin resources without CORS headers | **RESOLVED**: Use OPFSAdaptiveVFS instead — no SharedArrayBuffer, no isolation headers. Upgrade later if safe. |

### Unknown Unknowns
- SQLite WAL mode creates `-wal` and `-shm` files in OPFS — do these count against quota differently?
- Browser dev tools may not inspect SQLite-in-OPFS easily — debugging story worse than IDB
- Hot module reload during dev may not work cleanly with persistent Worker + SQLite connection
- SQLite schema migrations in the browser — no Flyway/Alembic equivalent, must be hand-rolled
- OPFS storage eviction behavior with SQLite files vs raw files — does the browser treat them differently under pressure?

### Acceptance
Spike is complete when we can describe: (1) whether SQLite-WASM is viable as field-studio's storage substrate, (2) the blob-outside architecture for SW compatibility, (3) how it changes the risk profile of each R, (4) the incremental migration path, and (5) bundle/performance budget impact.

### Summary Verdict

**SQLite-WASM is viable and changes the game for deferred requirements.**

- **R0 (fragments)**: Drops from 4 blockers to 1 blocker + adapter layer
- **R1 (GC)**: SQL queries replace manual set-diff — simpler, safer, transactional
- **R2 (dedup)**: UNIQUE constraint on content hash — trivial
- **R3 (dirty tracking)**: Per-row `dirty` flag — native capability
- **R4 (OPFS)**: Orthogonal — blob-outside pattern means OPFS wiring is unchanged
- **R5 (snapshots)**: SQLite backup API or WAL checkpoints — native capability

**Architecture: "SQLite as brain, OPFS/IDB as muscles"** — SQLite manages all structured data (vault state, asset index, metadata). Raw files (OPFS for large, IDB for small) store binary blobs. Service worker reads blobs directly, never touches SQLite.
