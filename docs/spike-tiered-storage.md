---
shaping: true
---

## R4 Spike: Tiered Storage (OPFS Wiring)

### Context
`opfsStorage.ts` implements an OPFS storage class but it is not wired into the main save path. The service worker already reads OPFS-first (`getFileBlob()` checks OPFS before IDB). Mulch records flag two fragile points: (1) OPFS fallback has a 1-second timeout race (mx-18a254), (2) Canvas._fileRef not validated after JSON round-trip (mx-c64077). We need to understand the exact boundary between the app's write path and the service worker's read path, and whether OPFS can be wired in without breaking the image serving pipeline.

### Goal
Determine the exact wiring needed to route large files (>10MB) to OPFS on save, while ensuring the service worker can still serve them, and identify all fragile points in the current pipeline.

### Questions

| # | Question |
|---|----------|
| **S2-Q1** | What is the exact write path for an ingested image? Trace from user action (file picker / drag-drop) through staging → storage.saveAsset() → IDB. Where would the OPFS routing branch be inserted? |
| **S2-Q2** | What is the exact read path in the service worker? Trace `getFileBlob()` through OPFS check → IDB fallback. What happens when OPFS returns `null` due to the 1-second timeout race? Does the SW retry or fail silently? |
| **S2-Q3** | What is the `Canvas._fileRef` validation gap (mx-c64077)? After a manifest is saved to IDB as JSON and reloaded, does `_fileRef` (a `File` handle) survive the round-trip? If not, what breaks? |
| **S2-Q4** | Does the service worker have write access to OPFS, or only the main thread? If only main thread, how do we coordinate the write (main thread → OPFS) and read (SW → OPFS) without races? |
| **S2-Q5** | What is the current IDB `files` store size distribution? How many assets, what's the median/p95 size? This determines whether R4 is a real pain point or premature optimization. |

### Known Unknowns
| ID | Unknown | Impact | How to Resolve |
|----|---------|--------|----------------|
| S2-KU1 | Whether OPFS `createSyncAccessHandle` works in service workers | If not, SW must use async `getFile()` which may have different perf characteristics | Check spec + test in target browsers |
| S2-KU2 | Whether `navigator.storage.getDirectory()` is available in all target environments | Secure context required; may fail in some deployment scenarios | Check browser compat table |
| S2-KU3 | The 1-second timeout race mechanism — is it a `Promise.race` with a timer? | If the timeout fires before OPFS responds, the SW serves stale/missing data | Read the OPFS fallback code |

### Unknown Unknowns
- OPFS quota may be lower than IDB quota in some browsers (Safari has different limits)
- Writing large files to OPFS may block the main thread if using sync access handles
- The derivatives IDB store (`derivatives`) may also need OPFS routing for pre-computed thumbnails
- Export features read from `storage.getAsset()` which only checks IDB — would miss OPFS-stored files

### Acceptance
Spike is complete when we can describe: (1) the exact write-path insertion point for OPFS routing, (2) all read paths that need to be updated (SW, export, viewer), (3) whether the timeout race is a blocking issue or manageable, and (4) the `_fileRef` survival question is answered.
