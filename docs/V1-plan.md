# V1: OPFS Blob Routing — Implementation Plan

**Affordances:** Size-gated OPFS write routing, unified getAsset with OPFS→IDB fallback
**Demo criteria:** Import 15MB image → OPFS; 5MB → IDB; both display in viewer
**File scope:**
- `src/shared/services/storage.ts` — add OPFS routing + unified read
- `src/shared/services/opfsStorage.ts` — no changes (already implemented)
- `src/entities/manifest/model/builders/iiifBuilder.ts` — no changes (routing encapsulated in storage)

## Design Decision

Encapsulate OPFS routing inside `StorageService` rather than branching in iiifBuilder.
Callers continue calling `storage.saveAsset(id, blob)` — storage decides where to put it.
`storage.getAsset(id)` transparently checks OPFS first, then IDB.

## Steps

1. **storage.ts**: Import OPFSStorage, add lazy init, add size threshold constant
2. **storage.ts**: Modify `saveAsset()` — route blobs > 10MB to OPFS when supported
3. **storage.ts**: Modify `getAsset()` — check OPFS first, fall back to IDB
4. **Tests**: Unit tests for routing logic and fallback behavior
5. **Verify**: typecheck + lint + existing tests pass
