---
shaping: true
---

## R2+R1 Spike: GC Pipeline & Deduplication

### Context
When a manifest or canvas is deleted (moved to trash, then emptied), the entity is removed from vault state. But the binary blobs in IDB `files` store (and potentially OPFS) are never cleaned up. There is no mechanism to determine which blobs are still referenced and which are orphaned. Additionally, importing the same image into multiple manifests stores duplicate bytes. Penpot solves both with a 4-stage GC pipeline and content-addressable dedup (BLAKE2b hashing). We need to understand how asset references work in field-studio to design a local-first equivalent.

### Goal
Determine how to identify orphaned blobs in the storage layer, what a local-first GC pipeline looks like, and whether content-addressable dedup is feasible client-side.

### Questions

| # | Question |
|---|----------|
| **S3-Q1** | How are image/media assets referenced in NormalizedState? What fields on IIIFItem/IIIFAnnotation contain asset IDs or URLs that map to IDB `files` store keys? Trace the full reference chain from annotation body → asset ID → storage key. |
| **S3-Q2** | Do trashed entities (in `trashedEntities`) still hold references to assets? If so, GC must exclude trashed-but-not-emptied asset refs. What happens to `_fileRef` and `_blobUrl` on trashed entities? |
| **S3-Q3** | Can we enumerate all asset keys currently stored in IDB `files` store without loading the blobs? (i.e., is there an index or do we need `getAllKeys()`?) What about OPFS — can we `listFiles()` without reading content? |
| **S3-Q4** | What is the performance cost of hashing a 50MB image file client-side? Compare `crypto.subtle.digest('SHA-256')` (native, async) vs BLAKE2b WASM. Is this fast enough to hash on ingest without blocking UI? |
| **S3-Q5** | How many unique assets does a typical field-studio project have? Is duplication actually a real-world problem, or is dedup solving a theoretical issue? |
| **S3-Q6** | Are there any asset references outside the vault? (e.g., cached in ViewRouter state, held by OpenSeadragon, in service worker cache, in `derivatives` store). These would be "live references" that GC must not collect. |

### Known Unknowns
| ID | Unknown | Impact | How to Resolve |
|----|---------|--------|----------------|
| S3-KU1 | Whether `_blobUrl` (object URLs) keep blobs alive via GC roots | If revoking object URLs is needed before blob deletion, there's a lifecycle coordination issue | Check `URL.revokeObjectURL` usage |
| S3-KU2 | Whether the SW tile cache (`iiif-tile-cache-v3`) holds references to source blobs or derived tiles | If source blobs, GC must also purge the SW cache | Read SW cache key structure |
| S3-KU3 | Whether IDB `files` store keys are the same as IIIF `id` URIs or transformed | Key mismatch would make reference scanning harder | Read staging ingest code |

### Unknown Unknowns
- Multiple manifests in the same IDB database may share assets (user imports same image into two projects) — GC must scan ALL manifests, not just the active one
- The `derivatives` store may hold pre-computed thumbnails keyed differently from source assets — a separate GC pass may be needed
- Running GC during active editing could cause races if the user is importing new assets while GC is scanning
- Browser storage eviction (IDB under pressure) may independently delete blobs that the vault still references — the inverse of the orphan problem

### Acceptance
Spike is complete when we can describe: (1) the complete reference chain from vault entity → storage key, (2) all storage locations that hold asset bytes (IDB files, IDB derivatives, OPFS, SW cache), (3) whether a "scan vault, diff against storage keys, delete orphans" algorithm is feasible and safe, and (4) whether client-side hashing is performant enough for ingest-time dedup.
